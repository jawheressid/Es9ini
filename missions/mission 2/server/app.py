import os, json, sqlite3, math
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional

import numpy as np
import joblib
from fastapi import FastAPI, Query, Body
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

# MQTT (paho v2) — specify callback API version
import paho.mqtt.client as mqtt

# -------------------- Config --------------------
AREA_ID = os.getenv("AREA_ID", "area-tn-001")
MQTT_HOST = os.getenv("MQTT_HOST", "test.mosquitto.org")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))

TOPIC_TELE = f"chrab/{AREA_ID}/telemetry"
TOPIC_CMD  = f"chrab/{AREA_ID}/cmd"

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "best_model.pkl")
MODEL_FEATURES = ["temp_c","rh","water_level","N","P","K","last_pump"]  # order for inference
PTHR = float(os.getenv("PUMP_THRESHOLD", "0.5"))                      # proba threshold

AUTO_MODE = True   # server will auto-command pump using model if True

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, "telemetry.sqlite")

# -------------------- DB ------------------------
def db_conn():
    c = sqlite3.connect(DB_PATH, check_same_thread=False)
    c.execute("""
    CREATE TABLE IF NOT EXISTS telemetry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT,
        area_id TEXT,
        moist REAL,
        temp_c REAL,
        rh REAL,
        water_level REAL,
        N REAL,
        P REAL,
        K REAL,
        last_pump INTEGER,
        pred_prob REAL,
        pred_on INTEGER
    )""")
    c.commit()
    return c

SQL = db_conn()
LATEST: Dict[str, dict] = {}

# -------------------- Model ---------------------
class ModelWrapper:
    def __init__(self, path: str):
        self.model = None
        self.ok = False
        self.info = "no model"
        if os.path.exists(path):
            try:
                self.model = joblib.load(path)
                self.ok = True
                self.info = f"loaded {type(self.model).__name__}"
            except Exception as e:
                self.info = f"load error: {e}"

    def predict_proba(self, x: np.ndarray) -> float:
        """
        x shape: (n_samples, len(MODEL_FEATURES))
        returns p(pump_on=1) for each row; if model lacks predict_proba, fallback.
        """
        if not self.ok or self.model is None:
            # fallback: super-simple rule (logical & “safe”)
            # ON if water level >= 10 AND (last_pump==1 or (moist < 35 and rh < 85))
            # -> map to probability for UI
            probs = []
            for row in x:
                temp, rh, level, N, P, K, last = row.tolist()
                score = 0.3
                if level >= 10: score += 0.3
                if last >= 0.5: score += 0.2
                if rh < 60:     score += 0.1
                probs.append(min(max(score, 0.01), 0.99))
            return np.array(probs)
        m = self.model
        if hasattr(m, "predict_proba"):
            p = m.predict_proba(x)
            if p.ndim == 2 and p.shape[1] == 2:
                return p[:,1]
            # some models return (n,1)
            return p.ravel()
        if hasattr(m, "decision_function"):
            z = m.decision_function(x).astype(float)
            # logistic squashing
            return 1.0 / (1.0 + np.exp(-z))
        # last resort: predict() returns 0/1
        y = m.predict(x).astype(float)
        return y

MODEL = ModelWrapper(MODEL_PATH)

# -------------------- MQTT ----------------------
client: mqtt.Client = None

def on_connect(c, userdata, flags, reason_code, properties=None):
    print("[MQTT] Connected:", reason_code)
    c.subscribe(TOPIC_TELE, qos=1)
    print("[MQTT] Subscribed:", TOPIC_TELE)

def predict_and_maybe_command(area: str, rec: dict):
    """
    Run model inference using the required features and publish a command if AUTO_MODE.
    """
    # Ensure all features exist; if missing set to NaN -> replaced later
    feats = {k: rec.get(k, np.nan) for k in MODEL_FEATURES}
    # quick NaN fill to something neutral
    if math.isnan(feats["last_pump"]): feats["last_pump"] = 0.0
    vec = np.array([[feats[f] for f in MODEL_FEATURES]], dtype=float)
    proba = float(MODEL.predict_proba(vec)[0])
    pred_on = 1 if proba >= PTHR else 0

    # cache into rec for storage & UI
    rec["pred_prob"] = proba
    rec["pred_on"] = pred_on

    if AUTO_MODE:
        payload = "1" if pred_on else "0"
        client.publish(TOPIC_CMD, payload, qos=1, retain=False)
        print(f"[AUTO] {area}: pump={payload} (p={proba:.2f} thr={PTHR:.2f})")

def on_message(c, userdata, msg):
    try:
        payload = msg.payload.decode("utf-8")
        d = json.loads(payload)
        area = d.get("area_id", AREA_ID)
        ts = d.get("ts") or datetime.utcnow().replace(tzinfo=timezone.utc).isoformat()
        d["ts"] = ts
        # massage types / defaults
        moist = float(d.get("moist", np.nan))
        temp_c = float(d.get("temp_c", np.nan))
        rh = float(d.get("rh", np.nan))
        level = float(d.get("water_level", np.nan))
        N = float(d.get("N", np.nan))
        P = float(d.get("P", np.nan))
        K = float(d.get("K", np.nan))
        last_pump = int(d.get("last_pump", 0))

        rec = dict(ts=ts, area_id=area, moist=moist, temp_c=temp_c, rh=rh,
                   water_level=level, N=N, P=P, K=K, last_pump=last_pump)

        # inference + maybe publish cmd
        predict_and_maybe_command(area, rec)

        # cache latest
        LATEST[area] = rec.copy()

        # persist
        SQL.execute("""INSERT INTO telemetry
            (ts, area_id, moist, temp_c, rh, water_level, N, P, K, last_pump, pred_prob, pred_on)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (ts, area, moist, temp_c, rh, level, N, P, K, last_pump, rec["pred_prob"], rec["pred_on"])
        )
        SQL.commit()

        print("[RX]", msg.topic, rec)
    except Exception as e:
        print("[ERR] on_message:", e)

def mqtt_start():
    global client
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1,
                         client_id=f"smart-ml-server-{int(datetime.now().timestamp())}")
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
    client.loop_start()

# -------------------- Web App -------------------
app = FastAPI(title="Smart Irrigation ML")

@app.on_event("startup")
def _startup():
    mqtt_start()
    print(f"[APP] Startup complete. Model: {MODEL.info}")

@app.on_event("shutdown")
def _shutdown():
    try:
        client.loop_stop()
        client.disconnect()
    except Exception:
        pass

@app.get("/api/ping")
def ping():
    return {"ok": True, "model": MODEL.info, "auto": AUTO_MODE, "thr": PTHR}

@app.get("/api/latest")
def api_latest(area_id: str = Query(AREA_ID)):
    d = LATEST.get(area_id)
    if d: return {"ok": True, "data": d}
    cur = SQL.execute("""SELECT ts, area_id, moist, temp_c, rh, water_level, N, P, K, last_pump, pred_prob, pred_on
                         FROM telemetry WHERE area_id=? ORDER BY id DESC LIMIT 1""", (area_id,))
    r = cur.fetchone()
    if not r: return {"ok": False}
    keys = ["ts","area_id","moist","temp_c","rh","water_level","N","P","K","last_pump","pred_prob","pred_on"]
    return {"ok": True, "data": dict(zip(keys, r))}

@app.get("/api/history")
def api_history(area_id: str = Query(AREA_ID), minutes: int = 60):
    since = datetime.utcnow().replace(tzinfo=timezone.utc) - timedelta(minutes=minutes)
    cur = SQL.execute("""SELECT ts, moist, temp_c, rh, water_level, N, P, K, last_pump, pred_prob, pred_on
                         FROM telemetry WHERE area_id=? AND ts>=? ORDER BY id ASC""",
                      (area_id, since.isoformat()))
    rows = cur.fetchall()
    keys = ["ts","moist","temp_c","rh","water_level","N","P","K","last_pump","pred_prob","pred_on"]
    data = [dict(zip(keys, r)) for r in rows]
    return {"ok": True, "count": len(data), "data": data}

@app.post("/api/cmd")
def api_cmd(area_id: str = Query(AREA_ID), order: int = Query(..., ge=0, le=1)):
    payload = "1" if order else "0"
    client.publish(f"chrab/{area_id}/cmd", payload, qos=1, retain=False)
    return {"ok": True, "sent": payload}

@app.post("/api/auto")
def api_auto(enabled: int = Query(..., ge=0, le=1)):
    global AUTO_MODE
    AUTO_MODE = bool(enabled)
    return {"ok": True, "auto": AUTO_MODE}

# ---------- STATIC SITE ----------
static_dir = os.path.join(os.path.dirname(__file__), "static")

@app.get("/")
def root_html():
    return FileResponse(os.path.join(static_dir, "index.html"))

app.mount("/static", StaticFiles(directory=static_dir), name="static")
