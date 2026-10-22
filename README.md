# Vybeora — Virtual Movie Hangout Platform

<div align="center">
  <img src="frontend/public/favicon.svg" alt="Vybeora Logo" width="80" height="80" />
  <h3><em>“Your people. Your vibe. Your movie night.”</em></h3>
  <p>A professional, full-stack real-time virtual cinema platform for watching authorized movies together in perfect synchronization, chatting, and reacting live with friends.</p>
</div>

---

## 🎬 Project Architecture

Vybeora is built with a strictly decoupled architecture:
- **Frontend:** React 19 (Vite), JavaScript ES modules, React Router, Plain CSS with bespoke design tokens, native Fetch API client.
- **Backend:** Python, Django 4.2+, Django REST Framework, Django Channels (ASGI), Daphne server, SimpleJWT.
- **Database & Messaging:** PostgreSQL (SQLite for effortless local development), Redis for distributed Channel Layers (InMemoryChannelLayer for local dev).

---

## 📁 Repository Structure

```text
vybeora/
├── frontend/               # React + Vite Single Page Application
│   ├── public/             # Static public assets (favicon.svg, posters)
│   ├── src/
│   │   ├── app/            # App shell, Router registry, Context Providers
│   │   ├── components/     # Reusable UI components (layout, movie, room, chat)
│   │   ├── pages/          # Route views (HomePage, Discover, Room, Auth)
│   │   ├── services/       # Centralized API client (apiClient.js)
│   │   └── styles/         # Tokens (tokens.css), Global (global.css), Utilities
│   └── vite.config.js      # Bundler config & reverse proxy (/api & /ws)
│
├── backend/                # Django REST Framework & Channels ASGI
│   ├── config/             # Settings (base, development, production), URLs, ASGI
│   ├── apps/               # Domain apps (users, movies, rooms, chat)
│   ├── common/             # Diagnostics, permissions, error handlers, health check
│   ├── manage.py           # CLI entrypoint with auto .env loading
│   └── requirements.txt    # Pinned dependency manifest
│
├── docs/                   # Full Technical Documentation Suite
│   ├── PROJECT_OVERVIEW.md # Vision, personas, and architectural tenets
│   ├── PROJECT_STRUCTURE.md# Folder breakdown, request lifecycle, WebSocket flow
│   ├── SETUP_GUIDE.md      # Step-by-step local development setup
│   ├── API_DOCUMENTATION.md# REST API route specifications
│   ├── DATABASE_DESIGN.md  # Relational schema & Mermaid ER diagram
│   ├── WEBSOCKET_FLOW.md   # Protocol framing & sub-second drift algorithm
│   └── DEVELOPMENT_ROADMAP.md # 7-phase implementation tracker
│
└── README.md               # Repository entry point
```

---

## 🚀 Quick Start (Running Locally)

### 1. Start the Django Backend
```bash
cd backend
python manage.py migrate
python manage.py runserver
```
*Backend runs on `http://127.0.0.1:8000/`. Health check available at `http://127.0.0.1:8000/api/health/`.*

### 2. Start the React Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173/`.*

---

## 🔍 Verification & Diagnostics

1. Navigate to **`http://localhost:5173/`**.
2. The **Backend System Health** panel on the home page queries `/api/health/` and confirms:
   - Status: **`● HEALTHY`**
   - Database: **`● connected`**
   - Channel Layer: **`● active`**
3. Run automated backend tests:
   ```bash
   cd backend
   python manage.py test
   ```

---

## 📽️ Verified Legal Free Movies & Watch Together

Vybeora integrates official, verified open media sources with explicit copyright provenance and rights checks:

1. **Internet Archive (`archive.org`) Advanced Search API:**
   - Discovers public domain feature films via the official API endpoint `https://archive.org/advancedsearch.php?q=mediatype:movies&output=json`.
   - Embeds authorized items via `https://archive.org/embed/<identifier>` using official responsive iframes.
2. **Open Content & Creative Commons:**
   - High-definition direct streams (e.g., Blender Foundation films licensed under Creative Commons Attribution 3.0) with zero DRM barriers.
3. **`MovieSource` Legal Verification Records:**
   - Every catalog movie maintains a verifiable provenance record documenting: `license_type`, `license_evidence`, `attribution_requirements`, `streaming_permitted`, `embedding_permitted`, and `verification_status`.
   - Movies with unclear rights or commercial restrictions are strictly flagged as `restricted` and prohibited from in-app playback.
4. **Authoritative Sub-Second Synchronization:**
   - Watch party rooms coordinate playback via Django Channels WebSockets (`ws/rooms/<room_code>/`). The host controls authoritative playback (`playback.play`, `playback.pause`, `playback.seek`) with automatic client synchronization, floating reactions, and persistent room chat.

---

## 📚 Complete Documentation Links

- [Project Overview](docs/PROJECT_OVERVIEW.md)
- [Project Structure & Architecture Blueprint](docs/PROJECT_STRUCTURE.md)
- [Local Setup Guide](docs/SETUP_GUIDE.md)
- [API Route Documentation](docs/API_DOCUMENTATION.md)
- [Database Schema & ER Diagram](docs/DATABASE_DESIGN.md)
- [WebSocket Synchronization Flow](docs/WEBSOCKET_FLOW.md)
- [Development Roadmap](docs/DEVELOPMENT_ROADMAP.md)

---

<div align="center">
  <p>Vybeora © 2026. Made for cinematic movie nights with friends.</p>
</div>

