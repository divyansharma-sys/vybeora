# Vybeora — Product & Architectural Overview

> **Tagline:** *“Your people. Your vibe. Your movie night.”*

---

## 1. Vision & Core Value Proposition

**Vybeora** is a real-time virtual cinema hangout platform designed to bridge physical distance between friends, families, and communities through synchronized entertainment. Rather than relying on clunky third-party screensharing tools with lag, audio echo, and out-of-sync reactions, Vybeora provides a dedicated, cinematic browser experience with:

1. **Sub-second playback synchronization** across all room participants.
2. **Interactive social immersion** with live chat, floating emoji reactions, and attendee presence.
3. **Authorized media hosting** allowing room hosts to stream legally permitted videos and personal media securely.
4. **Frictionless joining** via short room codes or instant invite links without requiring complex software installations.

---

## 2. Target User Personas

| Persona | Needs & Goals | Vybeora Solution |
| :--- | :--- | :--- |
| **Long-Distance Friends & Couples** | Seeking intimate, synchronized movie nights without awkward "3-2-1 play" countdowns. | Host-driven synchronized playback, real-time presence indicators, and seamless catch-up for late joiners. |
| **Film Clubs & Community Watchers** | Hosting curated screenings, indie premieres, or group discussions. | Discoverable film catalog, movie suggestions, public or password-protected rooms, and chat moderation. |
| **Independent Creators & Animators** | Presenting authorized work-in-progress screenings to private focus groups. | Secure host media upload, access validation, and timestamped comment feedback. |

---

## 3. Guiding Architectural Tenets

- **Separation of Concerns:** Clear demarcation between presentation logic (React/Vite), REST API services (Django REST Framework), real-time message brokering (Django Channels ASGI), and persistence (PostgreSQL / SQLite).
- **Security-First Authorization:** Room membership, host playback privileges, and media asset access are strictly validated on the backend. Frontend state never dictates authorization.
- **Fail-Safe & Drift-Tolerant Playback:** WebSockets carry playback state vectors (`{ is_playing, timestamp, host_time }`). If an individual participant suffers network lag, the client reconciles against host time automatically with intelligent drift thresholds.
- **Zero Placeholder Culture:** Real, working code with informative errors, graceful fallbacks, loading states, and robust test suites.

---

## 4. Phase Milestones Summary

- **Phase 1 (Current):** Workspace inspection, architecture design, docs suite, Django settings, Channels ASGI setup, React Vite setup, centralized API client, design tokens, and live health diagnostic.
- **Phase 2:** Cinematic UI foundation, logo design, reusable components (cards, modals, badges, inputs), responsive layouts.
- **Phase 3:** Authentication (JWT), user profiles, movie catalog, search, and suggestions.
- **Phase 4:** Watch room management, host controls, invite code generator, participant access lists.
- **Phase 5:** Video player, frame sync engine, Channels WebSocket consumers, live chat, and floating emoji reactions.
- **Phase 6:** Automated testing, security hardening, drift benchmarking, upload verification.
- **Phase 7:** Production readiness, Docker Compose configuration, Redis channel layer, Nginx proxy setup.
