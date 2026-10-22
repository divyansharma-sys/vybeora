# Vybeora — Relational Database Architecture & Schema Design

This document details the PostgreSQL relational schema, entity relationships, constraints, and indexing strategies for the Vybeora platform.

---

## 1. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    USER ||--o{ ROOM : "hosts"
    USER ||--o{ ROOM_PARTICIPANT : "joins"
    USER ||--o{ CHAT_MESSAGE : "authors"
    USER ||--o{ MOVIE_SUGGESTION : "submits"
    
    MOVIE ||--o{ ROOM : "featured_in"
    
    ROOM ||--o{ ROOM_PARTICIPANT : "contains"
    ROOM ||--|| PLAYBACK_STATE : "maintains"
    ROOM ||--o{ CHAT_MESSAGE : "logs"

    USER {
        uuid id PK
        string username UK
        string email UK
        string password_hash
        string display_name
        string avatar_url
        datetime created_at
    }

    MOVIE {
        uuid id PK
        string title
        string description
        string genre
        int duration_seconds
        string poster_url
        string video_source_url
        boolean is_authorized
        datetime created_at
    }

    ROOM {
        uuid id PK
        string room_code UK
        string title
        uuid host_id FK
        uuid movie_id FK
        boolean is_private
        string password_hash
        string status
        int max_participants
        datetime created_at
    }

    ROOM_PARTICIPANT {
        uuid id PK
        uuid room_id FK
        uuid user_id FK
        string role
        boolean is_active
        datetime joined_at
    }

    PLAYBACK_STATE {
        uuid id PK
        uuid room_id FK,UK
        float current_time_seconds
        boolean is_playing
        float playback_rate
        datetime last_updated
    }

    CHAT_MESSAGE {
        uuid id PK
        uuid room_id FK
        uuid user_id FK
        text content
        string message_type
        datetime created_at
    }
```

---

## 2. Table Specifications & Indexing Strategies

### `users_user`
- **Primary Key:** `uuid` (UUIDv4 for secure non-enumerable IDs)
- **Indexes:**
  - `username` (Unique index)
  - `email` (Unique index)

### `movies_movie`
- **Fields:** Title, Description, Genre, Release Year, Duration, Poster URL, Video URL.
- **Indexes:**
  - `title` (B-tree index for search queries)
  - `genre` (Filter index)

### `rooms_room`
- **`room_code`:** Unique alphanumeric nanoid (e.g. `vybe-7x9q`) for clean invite URLs.
- **`status`:** Enum: `active`, `paused`, `closed`.
- **Indexes:**
  - `room_code` (Unique index for instantaneous URL lookups)
  - `host_id` (Foreign key index)
  - `status` (Query filter index for active rooms)

### `rooms_roomparticipant`
- **Unique Constraint:** `(room_id, user_id)` (A user can only have one active participant record per room).
- **Cascade Rule:** `CASCADE` on room deletion; `SET_NULL` or `CASCADE` on user deletion.

### `rooms_playbackstate`
- **One-to-One:** Direct link to `room_id`. Stores current playback position in seconds, play/pause flag, and server timestamp for latency compensation.

### `chat_chatmessage`
- **Fields:** `room_id`, `user_id`, `content`, `message_type` (`text`, `emoji_reaction`, `system_announcement`).
- **Indexes:**
  - `(room_id, created_at DESC)` (Compound index for fast paginated chat history retrieval).
