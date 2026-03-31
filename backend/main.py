from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import joblib
import numpy as np
import pandas as pd
import sqlite3
import hashlib
import secrets
from datetime import datetime

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── MODEL ──
model = joblib.load("model.pkl")

FEATURES = [
    'Age','Weight','Height','Body_Fat_Percentage','Muscle_Mass',
    'Medication','Smoker','Alcohol_Consumption','Stress_Level','Mood',
    'Exercise_Intensity','Exercise_Duration','Steps','Calories_Burned',
    'Distance_Covered','Calories_Intake','Water_Intake','Heart_Rate',
    'Blood_Oxygen_Level','Skin_Temperature','Screen_Time',
    'Notifications_Received','Gender_Male','Gender_Other',
    'Medical_Conditions_Hypertension','Medical_Conditions_None',
    'Day_of_Week_Monday','Day_of_Week_Saturday','Day_of_Week_Sunday',
    'Day_of_Week_Thursday','Day_of_Week_Tuesday','Day_of_Week_Wednesday',
    'Exercise_Type_Running','Exercise_Type_Strength Training','Exercise_Type_Yoga'
]

# ── DATABASE ──
DB_PATH = "sleepiq.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def init_db():
    conn = get_db()
    # Users table — role: "user" | "admin"
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            username     TEXT UNIQUE NOT NULL,
            email        TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role         TEXT DEFAULT 'user',
            created_at   TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # Sessions
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            token      TEXT PRIMARY KEY,
            user_id    INTEGER NOT NULL,
            username   TEXT NOT NULL,
            role       TEXT DEFAULT 'user',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # Predictions (registered users)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id          INTEGER NOT NULL,
            username         TEXT NOT NULL,
            prediction       TEXT NOT NULL,
            score            INTEGER NOT NULL,
            confidence       REAL NOT NULL,
            good_pct         REAL NOT NULL,
            fair_pct         REAL NOT NULL,
            poor_pct         REAL NOT NULL,
            stress_level     REAL,
            screen_time      REAL,
            steps            REAL,
            water_intake     REAL,
            mood             REAL,
            exercise_duration REAL,
            heart_rate       REAL,
            blood_oxygen     REAL,
            created_at       TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # Guest logs (anonymous — only guest_id stored, no personal info)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS guest_logs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            guest_id    TEXT NOT NULL,
            prediction  TEXT NOT NULL,
            score       INTEGER NOT NULL,
            confidence  REAL NOT NULL,
            good_pct    REAL NOT NULL,
            fair_pct    REAL NOT NULL,
            poor_pct    REAL NOT NULL,
            stress_level REAL,
            screen_time  REAL,
            steps        REAL,
            water_intake REAL,
            mood         REAL,
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()

    # Auto-create admin account if it doesn't exist
    existing = conn.execute("SELECT id FROM users WHERE username='admin'").fetchone()
    if not existing:
        conn.execute(
            "INSERT INTO users (username, email, password_hash, role) VALUES (?,?,?,?)",
            ("admin", "admin@sleepiq.app", hash_pw("admin123"), "admin")
        )
        conn.commit()
        print("✅ Admin account created — username: admin | password: admin123")

    conn.close()

init_db()

# ── HELPERS ──
def get_user_from_token(token: str):
    if not token:
        return None
    conn = get_db()
    row = conn.execute(
        "SELECT user_id, username, role FROM sessions WHERE token=?", (token,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None

def require_admin(authorization: str):
    token = authorization.replace("Bearer ", "") if authorization else None
    user = get_user_from_token(token)
    if not user or user["role"] != "admin":
        raise HTTPException(403, "Admin access required")
    return user

# ── SCHEMAS ──
class RegisterInput(BaseModel):
    username: str
    password: str

class LoginInput(BaseModel):
    username: str
    password: str

class ResetPasswordInput(BaseModel):
    new_password: str

class SleepInput(BaseModel):
    Age: float; Weight: float; Height: float; Body_Fat_Percentage: float
    Muscle_Mass: float; Medication: float; Smoker: float
    Alcohol_Consumption: float; Stress_Level: float; Mood: float
    Exercise_Intensity: float; Exercise_Duration: float; Steps: float
    Calories_Burned: float; Distance_Covered: float; Calories_Intake: float
    Water_Intake: float; Heart_Rate: float; Blood_Oxygen_Level: float
    Skin_Temperature: float; Screen_Time: float; Notifications_Received: float
    Gender_Male: int; Gender_Other: int
    Medical_Conditions_Hypertension: int; Medical_Conditions_None: int
    Day_of_Week_Monday: int; Day_of_Week_Saturday: int; Day_of_Week_Sunday: int
    Day_of_Week_Thursday: int; Day_of_Week_Tuesday: int; Day_of_Week_Wednesday: int
    Exercise_Type_Running: int; Exercise_Type_Strength_Training: int; Exercise_Type_Yoga: int

class GuestPredictInput(BaseModel):
    guest_id: str
    form: SleepInput

# ────────────────────────────────
# AUTH ENDPOINTS
# ────────────────────────────────
@app.get("/")
def root():
    return {"status": "SleepIQ API running"}

@app.post("/register")
def register(data: RegisterInput):
    if len(data.username.strip()) < 3:
        raise HTTPException(400, "Username must be at least 3 characters")
    if len(data.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if data.username.lower() == "admin":
        raise HTTPException(400, "Username 'admin' is reserved")
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (?,?,?)",
            (data.username.strip(), f"{data.username.strip()}@sleepiq.app", hash_pw(data.password))
        )
        conn.commit()
        user_id = conn.execute("SELECT id FROM users WHERE username=?", (data.username,)).fetchone()["id"]
        token = secrets.token_hex(32)
        conn.execute("INSERT INTO sessions (token, user_id, username, role) VALUES (?,?,?,?)",
                     (token, user_id, data.username, "user"))
        conn.commit()
        return {"token": token, "username": data.username, "role": "user"}
    except sqlite3.IntegrityError:
        raise HTTPException(409, "Username already exists")
    finally:
        conn.close()

@app.post("/login")
def login(data: LoginInput):
    conn = get_db()
    user = conn.execute(
        "SELECT id, username, role FROM users WHERE username=? AND password_hash=?",
        (data.username.strip(), hash_pw(data.password))
    ).fetchone()
    if not user:
        conn.close()
        raise HTTPException(401, "Invalid username or password")
    token = secrets.token_hex(32)
    conn.execute("INSERT INTO sessions (token, user_id, username, role) VALUES (?,?,?,?)",
                 (token, user["id"], user["username"], user["role"]))
    conn.commit()
    conn.close()
    return {"token": token, "username": user["username"], "role": user["role"]}

@app.post("/logout")
def logout(authorization: Optional[str] = Header(None)):
    token = authorization.replace("Bearer ", "") if authorization else None
    if token:
        conn = get_db()
        conn.execute("DELETE FROM sessions WHERE token=?", (token,))
        conn.commit()
        conn.close()
    return {"ok": True}

@app.get("/me")
def me(authorization: Optional[str] = Header(None)):
    token = authorization.replace("Bearer ", "") if authorization else None
    user = get_user_from_token(token)
    if not user:
        raise HTTPException(401, "Not authenticated")
    return user

# ────────────────────────────────
# PREDICT
# ────────────────────────────────
def run_model(data: SleepInput):
    d = {
        'Age':data.Age,'Weight':data.Weight,'Height':data.Height,
        'Body_Fat_Percentage':data.Body_Fat_Percentage,'Muscle_Mass':data.Muscle_Mass,
        'Medication':data.Medication,'Smoker':data.Smoker,
        'Alcohol_Consumption':data.Alcohol_Consumption,'Stress_Level':data.Stress_Level,
        'Mood':data.Mood,'Exercise_Intensity':data.Exercise_Intensity,
        'Exercise_Duration':data.Exercise_Duration,'Steps':data.Steps,
        'Calories_Burned':data.Calories_Burned,'Distance_Covered':data.Distance_Covered,
        'Calories_Intake':data.Calories_Intake,'Water_Intake':data.Water_Intake,
        'Heart_Rate':data.Heart_Rate,'Blood_Oxygen_Level':data.Blood_Oxygen_Level,
        'Skin_Temperature':data.Skin_Temperature,'Screen_Time':data.Screen_Time,
        'Notifications_Received':data.Notifications_Received,
        'Gender_Male':data.Gender_Male,'Gender_Other':data.Gender_Other,
        'Medical_Conditions_Hypertension':data.Medical_Conditions_Hypertension,
        'Medical_Conditions_None':data.Medical_Conditions_None,
        'Day_of_Week_Monday':data.Day_of_Week_Monday,'Day_of_Week_Saturday':data.Day_of_Week_Saturday,
        'Day_of_Week_Sunday':data.Day_of_Week_Sunday,'Day_of_Week_Thursday':data.Day_of_Week_Thursday,
        'Day_of_Week_Tuesday':data.Day_of_Week_Tuesday,'Day_of_Week_Wednesday':data.Day_of_Week_Wednesday,
        'Exercise_Type_Running':data.Exercise_Type_Running,
        'Exercise_Type_Strength Training':data.Exercise_Type_Strength_Training,
        'Exercise_Type_Yoga':data.Exercise_Type_Yoga
    }
    df = pd.DataFrame([d])[FEATURES]
    pred = model.predict(df)[0]
    probs = model.predict_proba(df)[0]
    label = {0:"Poor",1:"Fair",2:"Good"}.get(int(pred),"Unknown")
    good_pct = round(float(probs[2])*100,1)
    fair_pct = round(float(probs[1])*100,1)
    poor_pct = round(float(probs[0])*100,1)
    conf = round(float(probs.max())*100,1)
    return label, round(good_pct), conf, good_pct, fair_pct, poor_pct, data

@app.post("/predict")
def predict(data: SleepInput, authorization: Optional[str] = Header(None)):
    label, score, conf, good_pct, fair_pct, poor_pct, d = run_model(data)
    token = authorization.replace("Bearer ", "") if authorization else None
    user = get_user_from_token(token)
    if user:
        conn = get_db()
        conn.execute("""
            INSERT INTO predictions
            (user_id,username,prediction,score,confidence,good_pct,fair_pct,poor_pct,
             stress_level,screen_time,steps,water_intake,mood,exercise_duration,heart_rate,blood_oxygen)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (user["user_id"],user["username"],label,score,conf,good_pct,fair_pct,poor_pct,
              d.Stress_Level,d.Screen_Time,d.Steps,d.Water_Intake,d.Mood,
              d.Exercise_Duration,d.Heart_Rate,d.Blood_Oxygen_Level))
        conn.commit()
        conn.close()
    return {"prediction":label,"confidence":conf,"score":score,
            "probabilities":{"Good":good_pct,"Fair":fair_pct,"Poor":poor_pct}}

@app.post("/guest/predict")
def guest_predict(body: GuestPredictInput):
    """Guest prediction — saved with guest_id, no personal info"""
    label, score, conf, good_pct, fair_pct, poor_pct, d = run_model(body.form)
    conn = get_db()
    conn.execute("""
        INSERT INTO guest_logs
        (guest_id,prediction,score,confidence,good_pct,fair_pct,poor_pct,
         stress_level,screen_time,steps,water_intake,mood)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    """, (body.guest_id,label,score,conf,good_pct,fair_pct,poor_pct,
          d.Stress_Level,d.Screen_Time,d.Steps,d.Water_Intake,d.Mood))
    conn.commit()
    conn.close()
    return {"prediction":label,"confidence":conf,"score":score,
            "probabilities":{"Good":good_pct,"Fair":fair_pct,"Poor":poor_pct}}

# ────────────────────────────────
# USER HISTORY
# ────────────────────────────────
@app.get("/predictions/stats")
def stats(authorization: Optional[str] = Header(None)):
    token = authorization.replace("Bearer ", "") if authorization else None
    user = get_user_from_token(token)
    if not user:
        raise HTTPException(401, "Not authenticated")
    conn = get_db()
    rows = conn.execute("""
        SELECT prediction,score,stress_level,steps,water_intake,mood,created_at
        FROM predictions WHERE user_id=? ORDER BY created_at DESC LIMIT 30
    """, (user["user_id"],)).fetchall()
    conn.close()
    data = [dict(r) for r in rows]
    if not data:
        return {"total":0,"avg_score":0,"breakdown":{},"weekly":[]}
    total = len(data)
    avg_score = round(sum(d["score"] for d in data)/total)
    breakdown = {"Good":0,"Fair":0,"Poor":0}
    for d in data:
        breakdown[d["prediction"]] = breakdown.get(d["prediction"],0)+1
    weekly = [{"day":d["created_at"][:10],"score":d["score"],"prediction":d["prediction"]}
              for d in reversed(data[:7])]
    return {"total":total,"avg_score":avg_score,"breakdown":breakdown,"weekly":weekly}

# ────────────────────────────────
# ADMIN ENDPOINTS
# ────────────────────────────────
@app.get("/admin/users")
def admin_list_users(authorization: Optional[str] = Header(None)):
    require_admin(authorization)
    conn = get_db()
    users = conn.execute("""
        SELECT u.id, u.username, u.role, u.created_at,
               COUNT(p.id) as prediction_count,
               MAX(p.created_at) as last_prediction
        FROM users u
        LEFT JOIN predictions p ON p.user_id = u.id
        GROUP BY u.id ORDER BY u.created_at DESC
    """).fetchall()
    conn.close()
    return [dict(u) for u in users]

@app.delete("/admin/users/{user_id}")
def admin_delete_user(user_id: int, authorization: Optional[str] = Header(None)):
    require_admin(authorization)
    conn = get_db()
    user = conn.execute("SELECT username, role FROM users WHERE id=?", (user_id,)).fetchone()
    if not user:
        raise HTTPException(404, "User not found")
    if user["role"] == "admin":
        raise HTTPException(403, "Cannot delete admin account")
    conn.execute("DELETE FROM predictions WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM sessions WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM users WHERE id=?", (user_id,))
    conn.commit()
    conn.close()
    return {"ok": True, "deleted": user["username"]}

@app.put("/admin/users/{user_id}/reset-password")
def admin_reset_password(user_id: int, body: ResetPasswordInput, authorization: Optional[str] = Header(None)):
    require_admin(authorization)
    if len(body.new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    conn = get_db()
    user = conn.execute("SELECT username FROM users WHERE id=?", (user_id,)).fetchone()
    if not user:
        raise HTTPException(404, "User not found")
    conn.execute("UPDATE users SET password_hash=? WHERE id=?", (hash_pw(body.new_password), user_id))
    conn.execute("DELETE FROM sessions WHERE user_id=?", (user_id,))
    conn.commit()
    conn.close()
    return {"ok": True, "username": user["username"]}

@app.get("/admin/guests")
def admin_guest_logs(authorization: Optional[str] = Header(None)):
    require_admin(authorization)
    conn = get_db()
    # Aggregate by guest_id
    summary = conn.execute("""
        SELECT guest_id,
               COUNT(*) as sessions,
               ROUND(AVG(score),0) as avg_score,
               SUM(CASE WHEN prediction='Good' THEN 1 ELSE 0 END) as good_count,
               SUM(CASE WHEN prediction='Fair' THEN 1 ELSE 0 END) as fair_count,
               SUM(CASE WHEN prediction='Poor' THEN 1 ELSE 0 END) as poor_count,
               MIN(created_at) as first_seen,
               MAX(created_at) as last_seen
        FROM guest_logs
        GROUP BY guest_id ORDER BY last_seen DESC
    """).fetchall()
    total_sessions = conn.execute("SELECT COUNT(*) as n FROM guest_logs").fetchone()["n"]
    conn.close()
    return {"total_sessions": total_sessions, "guests": [dict(r) for r in summary]}

@app.delete("/admin/guests")
def admin_clear_guests(authorization: Optional[str] = Header(None)):
    require_admin(authorization)
    conn = get_db()
    count = conn.execute("SELECT COUNT(*) as n FROM guest_logs").fetchone()["n"]
    conn.execute("DELETE FROM guest_logs")
    conn.commit()
    conn.close()
    return {"ok": True, "deleted": count}

@app.delete("/admin/guests/{guest_id}")
def admin_delete_guest(guest_id: str, authorization: Optional[str] = Header(None)):
    require_admin(authorization)
    conn = get_db()
    count = conn.execute("SELECT COUNT(*) as n FROM guest_logs WHERE guest_id=?", (guest_id,)).fetchone()["n"]
    conn.execute("DELETE FROM guest_logs WHERE guest_id=?", (guest_id,))
    conn.commit()
    conn.close()
    return {"ok": True, "deleted_sessions": count}