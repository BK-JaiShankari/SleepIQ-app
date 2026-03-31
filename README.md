# SleepIQ — Sleep Quality Prediction App

A web application that predicts sleep quality based on your daily health and lifestyle metrics.

---

## Requirements

Before running the app, make sure you have these installed on your machine:

- Python 3.10 or higher — https://www.python.org/downloads/
- Node.js 18 or higher — https://nodejs.org/

---

## Setup Instructions

### Step 1 — Download the project

Click the green **Code** button on this page → **Download ZIP** → extract the folder.

Or if you have Git installed:
```bash
git clone https://github.com/BK-JaiShankari/Sleepiq-app.git
cd Sleepiq-app
```

---

### Step 2 — Start the Backend

Open a terminal and run:
```bash
cd Sleepiq-app

python3 -m venv venv
source venv/bin/activate

pip install fastapi uvicorn joblib scikit-learn xgboost pandas numpy

cd backend
uvicorn main:app --reload
```

Leave this terminal running. Backend is ready at **http://localhost:8000**

---

### Step 3 — Start the Frontend

Open a new terminal tab and run:
```bash
cd Sleepiq-app/frontend

npm install
npm run dev
```

Frontend is ready at **http://localhost:5173**

---

### Step 4 — Open the App

Go to **http://localhost:5173** in your browser.

---

## Login

- Register a new account, or
- Click **Continue as Guest** to try without an account
