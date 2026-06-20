# Bloom Together

A full-stack collaborative focus session web application. Users create timed study or work sessions, manage shared and personal to-do lists within each session, and track their productivity through a visual garden that grows as sessions are completed successfully.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Known Limitations & Future Work](#known-limitations--future-work)

---

## Project Overview

Bloom Together lets users host or join timed focus sessions — either public (open to anyone) or private (invite-only). During a session, participants work through shared and personal to-do lists. When a session ends, the app determines whether it was successful (all todos completed) or not, then plants a flower in the user's garden with a bloom level reflecting how much of the session time was used.

The garden acts as a persistent, visual record of a user's focus history — streaks, total blooms, and session topics are all tracked.

---

## Tech Stack

### Frontend
| Tool | Version | Purpose |
|---|---|---|
| Vue 3 | `^3.5` | UI framework, Composition API + `<script setup>` |
| Pinia | `^3.0` | Global state (auth token, user identity) |
| Vue Router 4 | `^4.6` | Client-side routing |
| Vite (rolldown-vite) | `7.2.5` | Dev server, build tool |
| Tailwind CSS | `^3.4` | Utility-first styling via PostCSS |

### Backend
| Tool | Version | Purpose |
|---|---|---|
| Node.js | ≥ 22 (ESM) | Runtime |
| Express | `^5.2` | HTTP server and routing |
| Socket.IO | `^4.8` | Real-time event emission (server-side) |
| Zod | `^4.4` | Request body validation |
| jsonwebtoken | `^9.0` | JWT issuance and verification |
| bcryptjs | `^2.4` | Password hashing |
| postgres (porsager) | `^3.4` | PostgreSQL client |

### Database
| Tool | Purpose |
|---|---|
| PostgreSQL 16 | Primary data store |
| Custom migration runner | Sequential SQL migrations (`migrations/`) |

### Infrastructure
| Tool | Purpose |
|---|---|
| Docker | Run PostgreSQL locally without a system install |
| Node `--env-file` | Load `.env` for server without a third-party package |
| Node `--watch` | Hot-restart the server during development |

---

## Features

### Session Lifecycle
- **Create a session** — choose public or private, set a topic, duration (up to 23h 59m), and optionally invite friends.
- **Join a public session** — browse active public sessions filtered by duration or topic; join with one click.
- **Join a private session** — receive an invitation, review session details, accept or decline.
- **Session room** — timed view with a live flower growth animation reflecting elapsed time. Admin can add or remove members mid-session.
- **End a session** — admin ends the session manually or the timer expires. The backend determines the outcome (success/failed) from todo state.

### To-Do System
Each session supports three scopes of todos:
- **Session todos** — shared across all members, created and managed by the admin.
- **Personal todos** — private to each member, visible only to themselves.
- **AI-generated todos** — suggested task list based on the session topic (static generation; Anthropic API integration is optional).

Todos are created, toggled, and deleted via individual REST calls. Changes are optimistic in the UI with automatic rollback on failure.

### Garden & Bloom Tracking
- Every ended session creates a `garden_flower` record with a `bloom_level` (0–1, computed from elapsed/total time) and an outcome (`success`, `failed`, or `abandoned`).
- The garden page visualises successful flowers, grouped by last week, last month, or all time.
- Streak calculation is based on consecutive days with at least one successful bloom.
- `flowers_count` on the user record is incremented atomically for successful sessions only.

### Invitations
- Private session creators send pending invitations to selected friends.
- Recipients see pending invitations with session details (topic, duration, time remaining).
- Accepting an invitation atomically adds the user to `session_members`.
- Declining removes the invitation without affecting the session.

### Friends
- A fixed pool of bot users (role `= 'bot'`) acts as the friend list, visible to all authenticated users.
- Used to populate the invite picker on session creation and the Add People modal in the session room.

### Authentication
- **Register / Login** — `POST /auth/register`, `POST /auth/login`.
- **Access token** — short-lived JWT (15 min), stored in memory (Pinia store), attached to every API request as a `Bearer` token.
- **Refresh token** — long-lived JWT (7 days), stored in an `HttpOnly` cookie. The frontend API helper silently refreshes on a 401 and retries the original request once.
- **Socket.IO handshake** — sockets authenticate by passing the access token in `socket.handshake.auth.token`; unauthenticated connections are rejected before any event handler runs.

### Real-Time (Server-Side)
Socket.IO is fully wired on the backend. The following events are emitted after database writes:

| Event | Room | Trigger |
|---|---|---|
| `invitation:received` | `user:{id}` | New pending invitation created |
| `member:joined` | `session:{id}` | Member added via AddPeople or invitation accept |
| `member:left` | `session:{id}` | Member removed via AddPeople |
| `session:ended` | `session:{id}` | Session ended by admin or timer |

The frontend does not yet connect a Socket.IO client — see [Known Limitations](#known-limitations--future-work).

---

## Architecture Overview

```
Browser (Vue 3 SPA)
    │
    │  HTTP (fetch + Vite proxy /api → :3001, /auth → :3001)
    │
Express 5 server (server.js)
    ├── /auth/*          Auth routes (register, login, refresh, me)
    ├── /api/sessions    Session CRUD + member management
    ├── /api/sessions    Todo CRUD (:id/todos, :id/todos/:todoId)
    ├── /api/sessions    AI generation (:id/ai/generate)
    ├── /api/invitations Invitation lifecycle
    ├── /api/garden      User garden history
    ├── /api/friends     Bot user list
    └── /api/users       User profile
    │
PostgreSQL (Docker)
    └── Tables: users, sessions, session_members, todos,
               garden_flowers, invitations
```

**Request flow:**
1. The frontend calls `api(path, options)` from `src/Api/http.js`.
2. The helper attaches the Bearer token, sets `credentials: 'include'` for the refresh cookie, and parses the JSON response.
3. On a `401`, it attempts `POST /auth/refresh` silently and retries once. On a second `401`, it clears the auth store.
4. The Express route validates the request body with Zod, calls the relevant service function, and returns the result.
5. Service functions write to the database via `postgres.js` and emit Socket.IO events after commits.

**Key design choices:**
- Migrations are idempotent (`IF NOT EXISTS`) and run automatically on server startup.
- All BIGINT columns (`user_id`, `admin_id`, `start_time`, `ended_at`) are cast with `Number()` before leaving the service layer, because `postgres.js` returns BIGINTs as strings.
- Session IDs are UUIDs; user IDs are BIGINT identity columns. UUID format is validated at the route level to prevent `22P02` database errors.
- Zod schemas strip unknown keys before data reaches service functions.
- Socket emissions use a `safeEmit` wrapper so a missing Socket.IO instance (e.g. during tests) never crashes the HTTP response.

---

## Project Structure

```
bloom_together/
├── migrations/
│   ├── 001_initial.sql          # users, sessions, session_members, todos
│   └── 002_garden_invitations.sql # garden_flowers, invitations
│
├── server/
│   ├── server.js                # Entry point: migrations → Express → HTTP → Socket.IO
│   ├── app.js                   # Express factory (routes, middleware)
│   ├── migrate.js               # CLI migration runner (npm run migrate)
│   ├── shared/
│   │   ├── db.js                # postgres.js connection pool
│   │   ├── socket.js            # Socket.IO singleton (initSocket / getIO)
│   │   ├── auth.middleware.js   # requireAuth — verifies JWT, attaches req.user
│   │   ├── errors.js            # Custom error classes + global error handler
│   │   └── migrations.js        # Migration runner logic
│   └── modules/
│       ├── auth/                # register, login, refresh, profile
│       ├── users/               # user profile endpoints
│       ├── friends/             # bot user list
│       ├── sessions/            # session CRUD, member management, socket handlers
│       ├── invitations/         # invitation lifecycle
│       ├── todos/               # todo CRUD + socket handlers
│       ├── garden/              # garden history
│       └── ai/                  # AI todo generation (static fallback)
│
├── src/
│   ├── main.js                  # App bootstrap (createPinia, createRouter, mount)
│   ├── App.vue
│   ├── router/index.js          # Route definitions
│   ├── stores/auth.js           # Pinia auth store (user, accessToken)
│   ├── Api/http.js              # api() helper with 401-refresh logic
│   ├── pages/
│   │   ├── Home.vue             # Dashboard: garden stats, streak, quick actions
│   │   ├── HostSession.vue      # Create a public or private session
│   │   ├── AvailableSessions.vue # Browse and join public sessions
│   │   ├── Invitation.vue       # Pending invitation list
│   │   ├── SessionRoom.vue      # Active session: timer, todos, members
│   │   ├── Garden.vue           # Visual bloom history
│   │   ├── Login.vue            # Login / register form
│   │   └── IntroPage.vue        # Landing / splash page
│   ├── components/
│   │   ├── session/             # SessionTimer, TodoDrawer, AddPeopleModal,
│   │   │                        # FlowerGrowth, EndSessionModal, AiTodoPanel, …
│   │   ├── HostSession/         # StudyDuration, Topic, TodoList, InviteFriends, …
│   │   ├── AvailableSessions/   # SessionCard, FilterBar
│   │   ├── main/                # Header, NavBar
│   │   └── icons/               # SVG icon components
│   └── utils/
│       └── flowerGrowth.js      # bloom progress utilities (clamp01, …)
│
├── index.html
├── vite.config.js               # Vite + dev proxy (/api, /auth → :3001)
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

---

## Setup Instructions

### Prerequisites
- Node.js ≥ 22
- Docker (for PostgreSQL)
- npm

### 1. Clone the repository

```bash
git clone https://github.com/parastoo-hashemi/Bloom_together.git
cd Bloom_together
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start PostgreSQL with Docker

```bash
docker run -d --name bloom-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=bloom \
  -p 5432:5432 \
  postgres:16-alpine
```

> If you prefer a different port, update `DATABASE_URL` in `.env` accordingly.

### 4. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the required values (see [Environment Variables](#environment-variables) below). At minimum, set `DATABASE_URL`, `JWT_SECRET`, and `JWT_REFRESH_SECRET`.

### 5. Run database migrations

```bash
npm run migrate
```

This runs all SQL files in `migrations/` in order. The command is idempotent — safe to run multiple times.

### 6. Start the backend

```bash
npm run server:dev
```

The server starts on `http://localhost:3001` with `--watch` for auto-restart on file changes.

### 7. Start the frontend

In a separate terminal:

```bash
npm run dev
```

The Vite dev server starts on `http://localhost:5173`. Requests to `/api/*` and `/auth/*` are proxied automatically to the backend.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string. Example: `postgresql://postgres:postgres@localhost:5432/bloom` |
| `JWT_SECRET` | Yes | — | Secret for signing short-lived access tokens (15 min). Use a random 64-byte hex string. |
| `JWT_REFRESH_SECRET` | Yes | — | Secret for signing long-lived refresh tokens (7 days). Must be different from `JWT_SECRET`. |
| `ANTHROPIC_API_KEY` | No | — | If set, may be used by the AI module in future. Currently the AI endpoint returns static task templates regardless. |
| `PORT` | No | `3001` | Port the Express server listens on. |
| `CLIENT_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin for the browser client and Socket.IO. |
| `VITE_DEV_USERNAME` | No | `mario` | **Dev only.** Username for the auto-login fallback in each page (bypasses the login UI). Remove when a real auth flow is wired up. |
| `VITE_DEV_PASSWORD` | No | `12341234` | **Dev only.** Password for the auto-login fallback. |

Generate strong secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## API Reference

All `/api/*` routes require a valid `Authorization: Bearer <accessToken>` header.

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Create a new user account |
| `POST` | `/auth/login` | Authenticate and receive tokens |
| `POST` | `/auth/refresh` | Issue a new access token from the refresh cookie |
| `GET` | `/auth/me` | Return the authenticated user's profile |
| `GET` | `/api/friends` | List all bot users (friend pool) |
| `GET` | `/api/sessions` | List active sessions (query: `privacy`, `minMinutes`) |
| `POST` | `/api/sessions` | Create a session; sends invitations to `invited_ids` |
| `GET` | `/api/sessions/:id` | Get session details including members array |
| `PUT` | `/api/sessions/:id` | Update topic, duration, or member list (admin only) |
| `POST` | `/api/sessions/:id/end` | End the session; creates a garden flower (admin only) |
| `GET` | `/api/sessions/:id/todos` | List todos grouped by scope |
| `POST` | `/api/sessions/:id/todos` | Create a todo (`scope`: `session` or `personal`) |
| `PUT` | `/api/sessions/:id/todos/:todoId` | Toggle done or update text |
| `DELETE` | `/api/sessions/:id/todos/:todoId` | Delete a todo |
| `POST` | `/api/sessions/:id/ai/generate` | Generate a static AI todo list (admin only) |
| `GET` | `/api/invitations` | List pending invitations for the caller |
| `PUT` | `/api/invitations/:id/accept` | Accept an invitation; joins `session_members` |
| `PUT` | `/api/invitations/:id/decline` | Decline an invitation |
| `GET` | `/api/garden` | Return the caller's flower history and `flowers_count` |

---

## Database Schema

```
users
  id            BIGINT IDENTITY PK
  username      TEXT UNIQUE NOT NULL
  email         TEXT UNIQUE
  password_hash TEXT NOT NULL
  role          TEXT ('user' | 'bot')
  avatar_url    TEXT
  flowers_count INTEGER DEFAULT 0

sessions
  id             UUID PK DEFAULT gen_random_uuid()
  privacy        TEXT ('public' | 'private')
  topic          TEXT
  duration_hours INTEGER
  duration_mins  INTEGER
  admin_id       BIGINT → users.id
  start_time     BIGINT (epoch ms)
  ended_at       BIGINT (epoch ms, NULL while active)
  ai_generated   BOOLEAN
  quiz_questions JSONB

session_members
  session_id  UUID → sessions.id  (CASCADE)
  user_id     BIGINT → users.id
  PK (session_id, user_id)

todos
  id          UUID PK
  session_id  UUID → sessions.id (CASCADE)
  owner_id    BIGINT → users.id (NULL for session-scoped)
  scope       TEXT ('session' | 'personal' | 'ai')
  text        TEXT
  done        BOOLEAN DEFAULT FALSE
  immutable   BOOLEAN DEFAULT FALSE
  position    INTEGER

garden_flowers
  id          UUID PK
  user_id     BIGINT → users.id
  session_id  UUID → sessions.id
  topic       TEXT
  bloom_level NUMERIC(4,3) [0, 1]
  outcome     TEXT ('success' | 'failed' | 'abandoned')
  ended_at    TIMESTAMPTZ

invitations
  id          UUID PK
  session_id  UUID → sessions.id (CASCADE)
  from_id     BIGINT → users.id
  to_id       BIGINT → users.id
  status      TEXT ('pending' | 'accepted' | 'declined')
```

---

## Known Limitations & Future Work

### Not Yet Implemented

- **Frontend Socket.IO client** — The backend is fully wired: `member:joined`, `member:left`, `session:ended`, and `invitation:received` events are emitted after every relevant database write. However, the Vue frontend does not yet connect a `socket.io-client` instance. Session rooms and invitation pages currently rely on the initial HTTP load only — live updates require a page refresh.

- **Real authentication flow** — A `Login.vue` page exists and the `/auth/login` and `/auth/register` endpoints are fully functional. The frontend pages currently bypass it with a dev-only auto-login helper (`ensureToken`) that silently authenticates as a hardcoded user. This must be replaced with navigation guards and a proper login redirect before a multi-user deployment.

- **AI todo generation** — `POST /api/sessions/:id/ai/generate` returns a static list of task templates. The `ANTHROPIC_API_KEY` environment variable is accepted but currently unused. The `AiTodoPanel` component also calls with a hardcoded base URL and no auth header, making the AI tab non-functional in its current form.

### UI Gaps

- The `NavBar` component is imported but not rendered in `HostSession.vue` and `AvailableSessions.vue`, so those pages lack bottom navigation.
- The "End The Session" button is visible to all session members. The backend correctly rejects non-admin end requests with a `403`, but the button ideally should be hidden from non-admins entirely.

### Possible Improvements

- Add `socket.io-client` to the frontend and implement live member presence and invitation badge updates.
- Add a navigation guard in Vue Router to redirect unauthenticated users to `/login`.
- Integrate the Anthropic API for real AI-generated todo lists based on session topic.
- Persist a user's real friend connections rather than using a shared bot user pool.
- Add quiz functionality (`quiz_questions` column exists in the schema but is not yet surfaced in the UI).
- Rotate refresh tokens on each use to reduce the window for token replay attacks.

---

## Final Notes

Bloom Together is a full-stack learning project built to production-grade standards: proper JWT auth with HttpOnly refresh cookies, Zod-validated request bodies, idempotent database migrations, atomic transactions for critical writes, and a module-per-domain backend structure. The frontend uses the Vue 3 Composition API throughout with optimistic UI updates and rollback on failure.

The project is suitable as a portfolio piece demonstrating end-to-end API integration, real-time architecture preparation, and a complete session-based product flow from creation through to garden history.
