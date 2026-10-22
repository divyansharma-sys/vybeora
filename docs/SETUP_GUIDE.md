# Vybeora — Local Development Setup Guide

Follow this guide to get the Vybeora full-stack environment running locally.

---

## 1. Prerequisites

Before starting, ensure your system has the following tools installed:

- **Python:** Version 3.11 or newer (Python 3.13 / 3.14 supported)
- **Node.js:** Version 20.0 or newer (v24.x LTS tested)
- **NPM:** Version 10.0 or newer
- **Git:** Version 2.30 or newer

---

## 2. Backend Setup (Django + Django Channels)

### Step 2.1 — Navigate to the backend directory
Open your terminal and navigate to the backend folder:
```bash
cd backend
```

### Step 2.2 — Create and activate a Python virtual environment (Optional if using global environment)
On Windows (PowerShell):
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```
On macOS / Linux:
```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 2.3 — Install dependencies
```bash
pip install -r requirements.txt
```

### Step 2.4 — Configure environment variables
Copy the template file to `.env`:
```bash
cp .env.example .env
```
*(On Windows PowerShell, use `copy .env.example .env`)*. The default `.env` is pre-configured for local SQLite and in-memory Channels, requiring zero extra setup.

### Step 2.5 — Run database migrations
```bash
python manage.py migrate
```

### Step 2.6 — Run automated tests
Verify backend integrity:
```bash
python manage.py test
```

### Step 2.7 — Start the ASGI development server
Start Daphne (handles both HTTP and WebSockets):
```bash
python manage.py runserver
```
The backend API will be available at: **`http://127.0.0.1:8000/`**
Health check endpoint: **`http://127.0.0.1:8000/api/health/`**

---

## 3. Frontend Setup (React + Vite)

### Step 3.1 — Navigate to the frontend directory
Open a second terminal window and navigate to the frontend folder:
```bash
cd frontend
```

### Step 3.2 — Install Node packages
```bash
npm install
```

### Step 3.3 — Configure environment variables
Verify `.env` exists:
```bash
cp .env.example .env
```

### Step 3.4 — Start the Vite development server
```bash
npm run dev
```
The frontend application will start at: **`http://localhost:5173/`**

---

## 4. Verifying End-to-End Connectivity

1. Open your browser and navigate to **`http://localhost:5173/`**.
2. Look at the **Backend System Health** panel on the home page.
3. You should see a green badge: **`● HEALTHY`** with active checks for both the database and the channel layer.
4. Click **"Ping API /api/health/"** to trigger an on-demand round-trip request.

Alternatively, test from the command line:
```bash
curl http://127.0.0.1:8000/api/health/
```
Expected response:
```json
{
  "status": "healthy",
  "service": "vybeora-backend",
  "version": "1.0.0",
  "environment": "development",
  "timestamp": "...",
  "checks": {
    "database": "connected",
    "channel_layer": "active"
  }
}
```

---

## 5. Troubleshooting & FAQs

- **Port 8000 or 5173 already in use:**
  Specify custom ports:
  - Backend: `python manage.py runserver 8001` (update Vite proxy in `vite.config.js`)
  - Frontend: `npm run dev -- --port 5174`
- **CORS error on API requests:**
  Ensure `backend/.env` has `CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173` or `DJANGO_DEBUG=True`.
- **Channels in development without Redis:**
  By default, `development.py` falls back to `channels.layers.InMemoryChannelLayer` when `REDIS_URL` is empty, allowing single-process WebSocket rooms without running Redis.
