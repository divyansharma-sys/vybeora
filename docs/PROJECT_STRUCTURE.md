# Vybeora — Comprehensive Project Structure & Architecture Guide

This document details the anatomy of the Vybeora codebase, explaining file responsibilities, data flow trajectories, WebSocket pipelines, and developer onboarding instructions.

---

## 1. Directory Tree & System Domains

```text
vybeora/
├── frontend/                       # [Frontend Domain] React 19 Single Page Application
│   ├── public/                     # Static public assets (favicon.svg, robots.txt, static images)
│   ├── src/
│   │   ├── app/                    # Top-level application shell, routing, and context providers
│   │   │   ├── App.jsx             # Main layout shell with sticky Navbar, main Outlet, and Footer
│   │   │   ├── router.jsx          # React Router route registry (declarative browser router)
│   │   │   └── providers.jsx       # Nested provider wrapper (Auth, Theme, Room state)
│   │   ├── assets/                 # SVGs, icons, and static image assets
│   │   ├── components/             # Reusable UI building blocks (presentational)
│   │   │   ├── common/             # Buttons, Modals, Badges, Loaders, Empty States
│   │   │   ├── layout/             # Navbar, Footer, Sidebar, PageContainer
│   │   │   ├── movie/              # MovieCard, MovieGrid, MovieDetailsModal
│   │   │   ├── room/               # RoomCard, ParticipantList, HostControls
│   │   │   └── chat/               # ChatPanel, ChatMessageItem, EmojiReactionPicker
│   │   ├── features/               # Feature-sliced complex stateful sub-trees
│   │   ├── hooks/                  # Custom React hooks (useAuth, useRoomSync, useWebSocket)
│   │   ├── pages/                  # Route entry views (HomePage, DiscoverPage, CreateRoomPage, WatchRoomPage, etc.)
│   │   ├── services/               # Centralized HTTP API clients (apiClient.js, authService.js, movieService.js)
│   │   ├── styles/                 # CSS Design System
│   │   │   ├── tokens.css          # Design tokens (colors, gradients, spacing, typography, radii)
│   │   │   ├── global.css          # CSS reset, typography base, scrollbar, accessibility
│   │   │   └── utilities.css       # Utility classes (.container, .btn-primary, .card-cinema, .badge)
│   │   ├── websocket/              # Real-time WebSocket connection managers and event dispatchers
│   │   ├── main.jsx                # DOM mount entry point
│   │   └── index.css               # Aggregator importing tokens, global, and utilities
│   ├── .env.example                # Frontend environment template
│   ├── .gitignore                  # Frontend-specific exclusions
│   ├── package.json                # NPM dependency manifest & build scripts
│   └── vite.config.js              # Vite bundler configuration & backend API/WS reverse proxy
│
├── backend/                        # [Backend Domain] Django REST Framework & Channels ASGI
│   ├── config/                     # Django project configuration module
│   │   ├── __init__.py
│   │   ├── settings/               # Environment-split settings package
│   │   │   ├── __init__.py
│   │   │   ├── base.py             # Common configurations, installed apps, DRF & JWT parameters
│   │   │   ├── development.py      # Dev settings (SQLite default, in-memory channels, debug on)
│   │   │   └── production.py       # Hardened settings (PostgreSQL, Redis channel layer, HTTPS)
│   │   ├── urls.py                 # Root URL router mapping /api/ routes to domain apps
│   │   ├── asgi.py                 # ASGI entrypoint handling HTTP & Channels WebSockets
│   │   └── wsgi.py                 # WSGI entrypoint for traditional HTTP deployments
│   ├── apps/                       # Domain modular Django apps
│   │   ├── users/                  # Custom user model, profiles, JWT registration & login
│   │   ├── movies/                 # Movie catalog, suggestions, metadata services
│   │   ├── rooms/                  # Watch rooms, invite links, participant access, playback consumers
│   │   └── chat/                   # Room chat messages, live reactions, chat consumers
│   ├── common/                     # Cross-cutting backend utilities
│   │   ├── views.py                # System health check view (/api/health/)
│   │   ├── permissions.py          # Object-level permissions (IsOwnerOrReadOnly, IsRoomHost)
│   │   ├── exceptions.py           # Standardized JSON error response handler
│   │   ├── pagination.py           # StandardResultsSetPagination utility
│   │   └── urls.py                 # Common diagnostic routes
│   ├── media/                      # Uploaded video files, posters, and user avatars (gitignored)
│   ├── manage.py                   # Django CLI executable with auto-loading .env
│   ├── requirements.txt            # Python dependencies (pinned stable versions)
│   ├── .env.example                # Backend environment template
│   └── .gitignore                  # Backend-specific exclusions
│
├── docs/                           # [Documentation Domain] Project architecture & developer guides
│   ├── PROJECT_OVERVIEW.md         # Vision, personas, and platform goals
│   ├── PROJECT_STRUCTURE.md        # Comprehensive folder & file blueprint (this file)
│   ├── SETUP_GUIDE.md              # Local machine setup and onboarding instructions
│   ├── API_DOCUMENTATION.md        # Complete REST API route specifications
│   ├── DATABASE_DESIGN.md          # ER diagrams and data model definitions
│   ├── WEBSOCKET_FLOW.md           # Real-time event protocol and synchronization algorithm
│   └── DEVELOPMENT_ROADMAP.md      # Detailed 7-phase progress tracker
│
├── .gitignore                      # Workspace-level version control exclusions
└── README.md                       # Repository entrance, architecture overview, and quickstart
```

---

## 2. File Responsibilities Classified by Domain

| Domain | Key Files | Responsibility |
| :--- | :--- | :--- |
| **Frontend UI** | `frontend/src/app/App.jsx`<br>`frontend/src/app/router.jsx`<br>`frontend/src/pages/HomePage.jsx` | Renders the visual interface, manages client-side navigation, and handles user interactions. |
| **Frontend Network** | `frontend/src/services/apiClient.js`<br>`frontend/src/websocket/roomSocket.js` | Dispatches authenticated HTTP requests via Fetch API and maintains resilient WebSocket streams. |
| **Frontend Styling** | `frontend/src/styles/tokens.css`<br>`frontend/src/styles/global.css`<br>`frontend/src/styles/utilities.css` | Enforces the cinematic visual design system through CSS custom properties without bulky external CSS frameworks. |
| **Backend Config** | `backend/config/settings/base.py`<br>`backend/config/settings/development.py`<br>`backend/config/settings/production.py` | Governs installed apps, middleware, security headers, database drivers, and channel layers. |
| **Backend Routing & ASGI** | `backend/config/urls.py`<br>`backend/config/asgi.py` | Routes inbound HTTP requests to DRF views and inbound WebSocket upgrade connections to Channels consumers. |
| **Backend Domain Apps** | `backend/apps/users/`<br>`backend/apps/movies/`<br>`backend/apps/rooms/`<br>`backend/apps/chat/` | Encapsulates specific domain business logic, data models, serializers, permissions, and consumers. |
| **Database & ORM** | `backend/apps/*/models.py`<br>`backend/apps/*/migrations/` | Defines relational schemas, field constraints, foreign keys, and manages reversible schema migrations. |
| **Deployment & Ops** | `docker-compose.yml`<br>`backend/requirements.txt`<br>`frontend/vite.config.js` | Standardizes containerized environments, dependency locks, and dev server reverse proxying. |

---

## 3. How an HTTP Request Travels from React to Django and Back

Here is the exact lifecycle of a request (for example, fetching system health or creating a room):

```
[Browser / User Action]
       │
       ▼
[React Page / Component]  (e.g., HomePage.jsx triggers checkServerHealth())
       │
       ▼
[apiClient.js]            (Injects 'Authorization: Bearer <token>', JSON headers, base URL)
       │
       ▼
[Vite Dev Server Proxy]   (Routes '/api/*' to 'http://127.0.0.1:8000/api/*')
       │
       ▼
[Django ASGI Server]      (Daphne receives the incoming HTTP request on port 8000)
       │
       ▼
[Django Middleware]       (CorsMiddleware verifies origin, SecurityMiddleware checks headers)
       │
       ▼
[config/urls.py]          (Matches '/api/health/' and dispatches to common.urls)
       │
       ▼
[HealthCheckView]         (APIView executes get(), queries DB via connection.cursor(), tests Channels layer)
       │
       ▼
[DRF Response]            (Serializes python dict to JSON with appropriate HTTP status code)
       │
       ▼
[apiClient.js]            (Validates response.ok; on error throws structured ApiError; on success returns JSON)
       │
       ▼
[React Component State]   (setHealthData(response) triggers re-render with fresh data)
```

---

## 4. How a Real-Time Room Event Travels from Host to Participants

When the room host presses "Play" or "Seek", the event must synchronize across all connected viewers without polling:

```
[Host Browser]           (Host clicks Play at video timestamp 00:42:15)
       │
       ▼
[Host roomSocket.js]     (Constructs event: { type: "playback.seek", payload: { timestamp: 2535, is_playing: true } })
       │
       ▼
[WebSocket Frame]        (Transmitted over ws://127.0.0.1:8000/ws/rooms/<room_code>/)
       │
       ▼
[Daphne ASGI Layer]      (Accepts WebSocket protocol frame)
       │
       ▼
[Auth & Host Validator]  (AllowedHostsOriginValidator + AuthMiddlewareStack identifies the authenticated user)
       │
       ▼
[RoomConsumer.py]        (Verifies sender is room host; records playback state in DB/Cache)
       │
       ▼
[Channel Layer (Redis)]  (Broadcasts message to group channel "room_<room_code>")
       │
  ┌────┴────────────────────────┬────────────────────────┐
  ▼                             ▼                        ▼
[Host's Connection]     [Participant A]          [Participant B]
(Acknowledges receipt)   (Receives frame)         (Receives frame)
                                │                        │
                                ▼                        ▼
                        [Participant React]      [Participant React]
                        (Compares player time;   (Adjusts video.currentTime;
                         drifts resolved)         starts video.play())
```

---

## 5. Developer Guide: Where to Add New Features

| To Add... | Where to Place Files | Steps to Take |
| :--- | :--- | :--- |
| **A New Frontend Page** | `frontend/src/pages/MyNewPage.jsx` | 1. Create page component.<br>2. Register route path in `frontend/src/app/router.jsx`.<br>3. Add navigation link in `frontend/src/components/layout/Navbar.jsx` if needed. |
| **A Reusable Component**| `frontend/src/components/<category>/` | 1. Place presentational JSX and companion CSS in `components/`.<br>2. Consume design tokens from `styles/tokens.css`. |
| **A New API Client Service** | `frontend/src/services/myService.js` | Import `apiClient` from `services/apiClient.js` and export named async functions (e.g., `getMovies()`, `createRoom()`). |
| **A New Database Model**| `backend/apps/<app_name>/models.py` | 1. Define Django model class inheriting `models.Model`.<br>2. Run `python manage.py makemigrations`.<br>3. Run `python manage.py migrate`. |
| **A New API Endpoint**  | `backend/apps/<app_name>/views.py` | 1. Implement DRF `APIView` or `ModelViewSet`.<br>2. Define serializer in `serializers.py`.<br>3. Register path in `backend/apps/<app_name>/urls.py`. |
| **A New WebSocket Event**| `backend/apps/rooms/consumers.py` | 1. Add handler method on consumer class (e.g. `receive_json()`).<br>2. Add group broadcast method (e.g. `playback_sync()`).<br>3. Handle event type in `frontend/src/websocket/roomSocket.js`. |

---

## 6. Beginner's Onboarding: Top 8 Files to Understand First

1. **`frontend/src/services/apiClient.js`**: Understands how every backend request is formatted, authenticated, and guarded against errors.
2. **`frontend/src/styles/tokens.css`**: Defines every color, gradient, spacing, and radius rule powering the cinematic UI.
3. **`frontend/src/app/router.jsx`**: Maps URL paths to React page components.
4. **`frontend/src/pages/HomePage.jsx`**: Demonstrates the bridge between React state and the backend health API.
5. **`backend/config/settings/base.py` & `development.py`**: Controls Django apps, database choice, CORS, and Channels configuration.
6. **`backend/config/asgi.py`**: Understands how Django handles both HTTP and WebSocket protocols simultaneously.
7. **`backend/common/views.py`**: Example of a clean, performant DRF endpoint performing runtime diagnostics.
8. **`backend/common/exceptions.py`**: Ensures consistent, informative JSON error payloads across the entire REST API.
