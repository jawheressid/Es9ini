# app.py
# FastAPI + MQTT local server for Smart Irrigation (no Blynk)
# - Serves dashboard at /ui (static/index.html)
# - API at /api/*
# - Ingests telemetry from ESP32 via MQTT and applies thirst hysteresis auto-control:
#     thirst = 100 - moisture(%)
#     if thirst < THIRST_OFF and pump==ON  -> turn OFF
#     if thirst > THIRST_ON  and pump==OFF -> turn ON

import os, json, datetime as dt
from collections import defaultdict, deque
from typing import Dict, Any, Deque, List
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

import paho.mqtt.client as mqtt  # pin 1.6.1 in requirements.txt

# -------------------------------------------------------------------
# Config
# -------------------------------------------------------------------
AREA_DEFAULT = os.getenv("AREA_ID", "area-tn-001")

MQTT_HOST = os.getenv("MQTT_HOST", "test.mosquitto.org")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))

# Auto policy (thirst hysteresis)
THIRST_ON  = float(os.getenv("THIRST_ON",  "70"))  # open pump when thirst > 70
THIRST_OFF = float(os.getenv("THIRST_OFF", "30"))  # close pump when thirst < 30
AUTO_ENABLED = True

# Paths
BASE_DIR   = Path(__file__).resolve().parent           # .../server
STATIC_DIR = BASE_DIR / "static"                       # .../server/static

# Topics (device also uses chrab/<area>/cfg for SAMPLE_MS)
TOPIC_TELE_WILDCARD = "chrab/+/telemetry"             # subscribe wildcard
def topic_cmd(area_id: str) -> str: return f"chrab/{area_id}/cmd"
def topic_cfg(area_id: str) -> str: return f"chrab/{area_id}/cfg"

# -------------------------------------------------------------------
# In-memory store
# -------------------------------------------------------------------
latest: Dict[str, Dict[str, Any]] = {}
history: Dict[str, Deque[Dict[str, Any]]] = defaultdict(lambda: deque(maxlen=10_000))
last_pump_state: Dict[str, int] = defaultdict(int)  # what we/they last set (0/1)

# -------------------------------------------------------------------
# MQTT setup (v1.6.1 API)
# -------------------------------------------------------------------
client = mqtt.Client()  # 1.6.1: no callback_api_version required
client.reconnect_delay_set(min_delay=1, max_delay=30)

def _publish_cmd(area_id: str, order: int):
    """Publish pump command '1' or '0'."""
    order = 1 if int(order) == 1 else 0
    client.publish(topic_cmd(area_id), b"1" if order else b"0", qos=1, retain=False)
    last_pump_state[area_id] = order
    print(f"[MANUAL] {topic_cmd(area_id)} {order}")

def on_connect(c, userdata, flags, rc):
    print(f"[MQTT] Connected rc={rc}")
    c.subscribe(TOPIC_TELE_WILDCARD, qos=1)

def on_disconnect(c, userdata, rc):
    print(f"[MQTT] Disconnected rc={rc}")

def on_message(c, userdata, msg):
    try:
        payload = msg.payload.decode("utf-8")
        data = json.loads(payload)
    except Exception as e:
        print("[RX] bad json:", e)
        return

    area_id = str(data.get("area_id") or AREA_DEFAULT)

    # stamp server time (UTC ISO)
    ts = dt.datetime.now(dt.timezone.utc).isoformat()
    data["ts"] = ts

    # compute thirst from moisture
    try:
        moist = float(data.get("moist", 0.0))
    except Exception:
        moist = 0.0
    thirst = max(0.0, min(100.0, 100.0 - moist))
    data["thirst"] = thirst

    # track pump state
    lp = int(data.get("last_pump") or 0)
    last_pump_state[area_id] = lp if lp in (0, 1) else last_pump_state.get(area_id, 0)

    # store
    latest[area_id] = data
    history[area_id].append(data)

    print(f"[RX] {msg.topic} {data}")

    # ----------------- AUTO DECISION -----------------
    if AUTO_ENABLED:
        if thirst < THIRST_OFF and last_pump_state[area_id] == 1:
            _publish_cmd(area_id, 0)
            print(f"[DECIDE] {area_id}: 0 (rule: thirst<{THIRST_OFF})")
        elif thirst > THIRST_ON and last_pump_state[area_id] == 0:
            _publish_cmd(area_id, 1)
            print(f"[DECIDE] {area_id}: 1 (rule: thirst>{THIRST_ON})")

def mqtt_start():
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    # connect_async + loop_start makes it resilient with reconnects
    client.connect_async(MQTT_HOST, MQTT_PORT, keepalive=60)
    client.loop_start()

def mqtt_stop():
    try:
        client.loop_stop()
    finally:
        try:
            client.disconnect()
        except Exception:
            pass

# -------------------------------------------------------------------
# FastAPI app
# -------------------------------------------------------------------
app = FastAPI(title="Smart Irrigation Local API")

@app.on_event("startup")
def _on_startup():
    # sanity check for static folder (so developer errors are obvious)
    if not STATIC_DIR.exists():
        print(f"[WARN] static directory missing: {STATIC_DIR}")
    mqtt_start()

@app.on_event("shutdown")
def _on_shutdown():
    mqtt_stop()

# ----------------- API -----------------
@app.get("/api/ping")
def api_ping():
    return {
        "ok": True,
        "mqtt": f"{MQTT_HOST}:{MQTT_PORT}",
        "auto": AUTO_ENABLED,
        "thr": {"on": THIRST_ON, "off": THIRST_OFF},
    }

@app.get("/api/latest")
def api_latest(area_id: str = AREA_DEFAULT):
    d = latest.get(area_id)
    return {"ok": bool(d), "data": d}

@app.get("/api/history")
def api_history(area_id: str = AREA_DEFAULT, minutes: int = 60):
    cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=minutes)
    out: List[Dict[str, Any]] = []
    for row in list(history.get(area_id, [])):
        try:
            ts = dt.datetime.fromisoformat(row["ts"])
        except Exception:
            continue
        if ts >= cutoff:
            out.append(row)
    return {"ok": True, "data": out}

@app.post("/api/cmd")
def api_cmd(area_id: str, order: int):
    _publish_cmd(area_id, order)
    return {"ok": True, "area_id": area_id, "order": 1 if int(order) == 1 else 0}

@app.post("/api/auto")
def api_auto(enabled: int):
    global AUTO_ENABLED
    AUTO_ENABLED = bool(int(enabled))
    return {"ok": True, "auto": AUTO_ENABLED}

@app.post("/api/set-sample-ms")
def api_set_sample(area_id: str, ms: int):
    ms = max(500, min(10000, int(ms)))
    client.publish(topic_cfg(area_id), json.dumps({"SAMPLE_MS": ms}).encode(), qos=1)
    return {"ok": True, "area_id": area_id, "ms": ms}

# ----------------- Static UI -----------------
@app.get("/")
def root():
    # nice default: redirect "/" -> "/ui"
    return RedirectResponse(url="/ui")

# Serve your dashboard (place index.html in server/static/)
app.mount("/ui", StaticFiles(directory=str(STATIC_DIR), html=True), name="ui")

# Optional: allow running directly (python app.py)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", reload=True)
