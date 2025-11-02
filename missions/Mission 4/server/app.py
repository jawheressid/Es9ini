# server/app.py
import os, json, datetime as dt
from collections import defaultdict, deque
from typing import Dict, Any, Deque, List
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

import paho.mqtt.client as mqtt  # pin 1.6.1

# -------- Config --------
AREA_DEFAULT = os.getenv("AREA_ID", "area-tn-001")
MQTT_HOST    = os.getenv("MQTT_HOST", "test.mosquitto.org")
MQTT_PORT    = int(os.getenv("MQTT_PORT", "1883"))

THIRST_ON  = float(os.getenv("THIRST_ON",  "70"))  # >70  => pump ON
THIRST_OFF = float(os.getenv("THIRST_OFF", "30"))  # <30  => pump OFF
AUTO_DEFAULT = bool(int(os.getenv("AUTO_ENABLED", "1")))  # default automatic mode per zone
AUTO_ENABLED = AUTO_DEFAULT  # legacy global toggle; influences new zones

BASE_DIR   = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"  # optional dashboard (can be empty)

# Topics
def t_tele(area_id="*"): return f"chrab/{area_id}/telemetry"
def t_cmd(area_id):      return f"chrab/{area_id}/cmd"
def t_cfg(area_id):      return f"chrab/{area_id}/cfg"

# -------- In-memory state --------
latest: Dict[str, Dict[str, Any]] = {}
history: Dict[str, Deque[Dict[str, Any]]] = defaultdict(lambda: deque(maxlen=10_000))
last_pump_state: Dict[str, int] = defaultdict(int)
zone_modes: Dict[str, str] = defaultdict(lambda: "auto" if AUTO_ENABLED else "manual")

def get_zone_mode(area_id: str) -> str:
    if area_id not in zone_modes:
        zone_modes[area_id] = "auto" if AUTO_ENABLED else "manual"
    return zone_modes[area_id]

def set_zone_mode(area_id: str, mode: str):
    mode = "auto" if mode not in ("auto", "manual") else mode
    zone_modes[area_id] = mode

# -------- MQTT client --------
client = mqtt.Client()
client.reconnect_delay_set(1, 30)

def _publish_cmd(area_id: str, order: int):
    order = 1 if int(order) == 1 else 0
    client.publish(t_cmd(area_id), b"1" if order else b"0", qos=1, retain=False)
    last_pump_state[area_id] = order
    print(f"[CMD] {area_id} -> {order}")

def on_connect(c, u, flags, rc):
    print(f"[MQTT] Connected rc={rc}")
    c.subscribe(t_tele("+"), qos=1)

def on_message(c, u, msg):
    try:
        data = json.loads(msg.payload.decode("utf-8"))
    except Exception as e:
        print("[RX] bad json:", e); return

    area_id = str(data.get("area_id") or AREA_DEFAULT)
    ts = dt.datetime.now(dt.timezone.utc).isoformat()
    data["ts"] = ts

    # Mission 1: dryness = 100 - moisture(%)
    try:
        moist = float(data.get("moist", 0.0))
    except:
        moist = 0.0
    dryness = max(0.0, min(100.0, 100.0 - moist))
    data["dryness"] = dryness  # aka "thirst"

    # track pump state from device if provided
    lp = int(data.get("last_pump") or 0)
    last_pump_state[area_id] = lp if lp in (0, 1) else last_pump_state.get(area_id, 0)

    mode = get_zone_mode(area_id)
    data["mode"] = mode
    latest[area_id] = data
    history[area_id].append(data)
    print(f"[RX] {msg.topic} {data}")

    # Mission 2: auto pumping (30/70 hysteresis)
    if AUTO_ENABLED and mode == "auto":
        if dryness < THIRST_OFF and last_pump_state[area_id] == 1:
            _publish_cmd(area_id, 0)
            print(f"[AUTO] {area_id}: OFF (dryness<{THIRST_OFF})")
        elif dryness > THIRST_ON and last_pump_state[area_id] == 0:
            _publish_cmd(area_id, 1)
            print(f"[AUTO] {area_id}: ON (dryness>{THIRST_ON})")

# WS subscribers per zone
subscribers: Dict[str, set] = defaultdict(set)

def _broadcast(area_id: str, data: dict):
    if not subscribers.get(area_id): return
    dead = []
    for ws in list(subscribers[area_id]):
        try:
            ws.send_text(json.dumps(data))
        except Exception:
            dead.append(ws)
    for ws in dead:
        subscribers[area_id].discard(ws)

# Hook broadcast inside on_message after storing latest:
orig_on_message = on_message
def wrapped_on_message(c, u, msg):
    # call original
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
        area_id = str(payload.get("area_id") or AREA_DEFAULT)
    except:
        area_id = AREA_DEFAULT
    orig_on_message(c, u, msg)
    # now broadcast stored latest
    if area_id in latest:
        _broadcast(area_id, latest[area_id])
client.on_message = wrapped_on_message

def mqtt_start():
    client.on_connect = on_connect
    client.connect_async(MQTT_HOST, MQTT_PORT, 60)
    client.loop_start()

def mqtt_stop():
    try:
        client.loop_stop()
        client.disconnect()
    except Exception:
        pass

# -------- FastAPI app --------
app = FastAPI(title="Irrigation API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def _startup():
    if not STATIC_DIR.exists(): print(f"[WARN] no static dir at {STATIC_DIR}")
    mqtt_start()

@app.on_event("shutdown")
def _shutdown():
    mqtt_stop()

# ---------- REST (mobile will use these) ----------
@app.get("/api/ping")
def ping():
    zones_list = list(latest.keys()) or [AREA_DEFAULT]
    modes = {zone: get_zone_mode(zone) for zone in zones_list}
    return {"ok": True, "mqtt": f"{MQTT_HOST}:{MQTT_PORT}", "auto": AUTO_ENABLED,
            "thr": {"on": THIRST_ON, "off": THIRST_OFF},
            "zones": zones_list, "modes": modes}

@app.get("/api/latest")
def get_latest(area_id: str = AREA_DEFAULT):
    data = latest.get(area_id)
    if data:
        return {"ok": True, "data": {**data, "mode": get_zone_mode(area_id)}}
    return {"ok": False, "data": {"area_id": area_id, "mode": get_zone_mode(area_id)}}

@app.get("/api/history")
def get_history(area_id: str = AREA_DEFAULT, minutes: int = 60):
    cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=minutes)
    out: List[Dict[str, Any]] = []
    for row in list(history.get(area_id, [])):
        try:
            if dt.datetime.fromisoformat(row["ts"]) >= cutoff:
                out.append(row)
        except: pass
    return {"ok": True, "data": out}

@app.post("/api/cmd")
def set_cmd(area_id: str, order: int):
    _publish_cmd(area_id, order)
    return {"ok": True, "area_id": area_id, "order": 1 if int(order)==1 else 0}

@app.post("/api/auto")
def set_auto(enabled: int):
    global AUTO_ENABLED
    AUTO_ENABLED = bool(int(enabled))
    return {"ok": True, "auto": AUTO_ENABLED}

@app.post("/api/set-thresholds")
def set_thr(thirst_on: float, thirst_off: float):
    global THIRST_ON, THIRST_OFF
    THIRST_ON, THIRST_OFF = float(thirst_on), float(thirst_off)
    return {"ok": True, "thr": {"on": THIRST_ON, "off": THIRST_OFF}}

@app.post("/api/set-mode")
def set_mode(area_id: str, mode: str):
    set_zone_mode(area_id, mode)
    current_mode = get_zone_mode(area_id)
    if area_id in latest:
        latest[area_id]["mode"] = current_mode
    return {"ok": True, "area_id": area_id, "mode": current_mode}

# ---------- WebSocket (stream telemetry) ----------
@app.websocket("/ws/telemetry")
async def ws_telemetry(ws: WebSocket, area_id: str = AREA_DEFAULT):
    await ws.accept()
    subscribers[area_id].add(ws)
    # send current snapshot
    if area_id in latest:
        await ws.send_text(json.dumps(latest[area_id]))
    try:
        while True:
            await ws.receive_text()  # keepalive
    except WebSocketDisconnect:
        subscribers[area_id].discard(ws)

# -------- Optional UI (if you want a web dashboard too) --------
@app.get("/")
def root():
    # if UI exists, send users there; else send to docs
    return RedirectResponse(url="/ui" if STATIC_DIR.exists() else "/docs")

if STATIC_DIR.exists():
    app.mount("/ui", StaticFiles(directory=str(STATIC_DIR), html=True), name="ui")
else:
    print(f"[INFO] UI disabled: {STATIC_DIR} not found. Create it to enable /ui.")
