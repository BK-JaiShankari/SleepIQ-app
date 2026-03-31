# SleepIQ — Sleep Quality Prediction App

A web application that predicts sleep quality based on your daily health and lifestyle metrics.

---

## Requirements

Before running the app, make sure you have these installed:

- Python 3.10 or higher — https://www.python.org/downloads/
- Node.js 18 or higher — https://nodejs.org/

---

## Setup Instructions

### Step 1 — Download the project

Click the green **Code** button → **Download ZIP** → extract the folder.

Or clone it:
```bash
git clone https://github.com/BK-JaiShankari/Sleepiq-app.git
cd Sleepiq-app-main
```

---

### Step 2 — Start the Backend

Open a terminal and run:
```bash
cd ~/Downloads/Sleepiq-app-main

python3 -m venv venv
source venv/bin/activate

pip install fastapi uvicorn joblib scikit-learn xgboost pandas numpy

cd backend
uvicorn main:app --reload
```

Leave this terminal running. Backend is ready at **http://localhost:8000**

---

### Step 3 — Start the Frontend

Open a **new terminal tab** and run:
```bash
cd ~/Downloads/Sleepiq-app-main/frontend

npm install
npm install axios recharts
npm run dev
```

Frontend is ready at **http://localhost:5173**

---

### Step 4 — Open the App

Go to **http://localhost:5173** in your browser.

---

## Login

- Register a new account, or
- Click **Continue as Guest** to use without an account

## Admin Access

| Username | Password |
|---|---|
| admin | admin123 |

---

## Notes

- The ML model is trained on a synthetic dataset — predictions are directionally useful but not clinically accurate
- Basic mode is designed for everyday users, Advanced mode exposes the full ML feature set
- Prediction history is saved per user account
