# Vybeora — REST API Specification & Endpoint Documentation

This document defines the RESTful API architecture, authentication schemas, pagination standards, and endpoint specifications.

---

## 1. Global API Standards

- **Base URL:** `/api/`
- **Content-Type:** `application/json`
- **Authentication Header:** `Authorization: Bearer <access_token>`
- **Date & Time Standard:** ISO-8601 UTC (e.g., `2026-10-22T07:45:00Z`)

### Standard Success Response Format
```json
{
  "status": "healthy",
  "data": { ... }
}
```

### Standard Error Response Format
Handled uniformly by `common.exceptions.custom_exception_handler`:
```json
{
  "success": false,
  "error": {
    "status_code": 400,
    "message": "A request validation error occurred.",
    "details": {
      "field_name": ["This field is required."]
    }
  }
}
```

### Standard Pagination Response Format
Handled by `common.pagination.StandardResultsSetPagination`:
```json
{
  "pagination": {
    "count": 105,
    "total_pages": 6,
    "current_page": 1,
    "next": "/api/movies/?page=2",
    "previous": null
  },
  "results": [ ... ]
}
```

---

## 2. Implemented Endpoints (Phase 1)

### `GET /api/health/`
Performs live runtime diagnostics across database connectivity and Django Channels layer.

- **Authentication:** Public (No token required)
- **Response Codes:**
  - `200 OK`: All subsystems healthy.
  - `503 Service Unavailable`: Subsystem unreachable.

#### Example Response (`200 OK`):
```json
{
  "status": "healthy",
  "service": "vybeora-backend",
  "version": "1.0.0",
  "environment": "development",
  "timestamp": "2026-10-22T07:45:12.345678+00:00",
  "checks": {
    "database": "connected",
    "channel_layer": "active"
  }
}
```

---

## 3. Scheduled API Route Specifications (Phases 3 — 5)

### Authentication & Users (Phase 3)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/users/register/` | Create a new user account | Public |
| `POST` | `/api/users/login/` | Obtain JWT access and refresh token pair | Public |
| `POST` | `/api/users/token/refresh/` | Refresh expired access token | Public |
| `GET` | `/api/users/me/` | Retrieve authenticated profile | Bearer Token |
| `PATCH`| `/api/users/me/` | Update avatar, bio, or display name | Bearer Token |

### Movie Catalog (Phase 3)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/movies/` | List movies with search & genre filtering | Public / Read-Only |
| `GET` | `/api/movies/{id}/` | Retrieve full movie details & metadata | Public / Read-Only |
| `POST`| `/api/movies/suggest/` | Suggest a movie title for community watch | Bearer Token |

### Watch Rooms & Membership (Phase 4)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/rooms/` | Create a new watch room (assigns user as host) | Bearer Token |
| `GET` | `/api/rooms/{code}/` | Retrieve room status, host, and movie | Bearer Token |
| `POST`| `/api/rooms/{code}/join/` | Join a room with invite code or password | Bearer Token |
| `POST`| `/api/rooms/{code}/leave/` | Leave a room session | Bearer Token |
| `POST`| `/api/rooms/{code}/upload-video/`| Upload host-authorized video file | Host Only |

### Chat History (Phase 5)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/chat/{room_code}/messages/` | Paginated previous room chat messages | Room Member Only |
