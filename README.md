# Bloom Together

A full-stack collaborative focus session app built to production-grade standards: JWT auth with silent token refresh, optimistic UI with rollback, PostgreSQL-backed session lifecycle, and a Socket.IO event layer primed for real-time client integration.

---

## Table of Contents

- [Engineering Highlights](#engineering-highlights)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Screenshots](#screenshots)
- [Known Limitations](#known-limitations)

---

## Engineering Highlights

> The decisions that reflect how this project was designed, not just what it does.

**JWT auth with silent token refresh**
Access tokens (15 min) are stored in Pinia memory — never `localStorage`. A shared `api()` helper in `src/Api/http.js` intercepts every `401`, silently calls `POST /auth/refresh` using an `HttpOnly` cookie, and retries the original request once before clearing auth state. The consumer never handles token logic.

**Optimistic UI with rollback**
All todo mutations — create, toggle, delete — update local state before the network request resolves. On failure, the previous state is restored and the error surfaced. No loading spinners on interactions the user already perceives as complete.

**BIGINT/string boundary**
`postgres.js` returns BIGINT columns as JavaScript strings. Every service function casts affected fields (`user_id`, `admin_id`, `start_time`, `ended_at`) to `Number()` before the response leaves the layer, preventing silent identity comparison bugs between JWT payload values and database IDs.

**Idempotent migrations**
SQL migrations use `IF NOT EXISTS` throughout and run automatically on server startup. Safe to replay against any database state; no migration state table or lock is required.

**Socket.IO event layer**
`member:joined`, `member:left`, `session:ended`, and `invitation:received` are emitted server-side after every relevant database commit, inside a `safeEmit` wrapper that swallows missing-instance errors. The HTTP response is never blocked by socket state.

**Request validation at boundary**
Zod schemas validate and strip all incoming request bodies at the route layer before any data reaches service functions. Unknown keys are removed; type errors return structured `400` responses with field-level messages.

---

## Architecture

```
┌─────────────────────────────────────┐
│         Vue 3 SPA (Browser)         │
│  Pinia · Vue Router · Tailwind CSS  │
└────────────────┬────────────────────┘
                 │ fetch() + Bearer token
                 │ Vite proxy: /api, /auth → :3001
                 ▼
┌─────────────────────────────────────┐
│         Express 5  (:3001)          │
│                                     │
│  /auth/*        JWT auth lifecycle  │
│  /api/sessions  CRUD + members      │
│  /api/todos     Scoped todo CRUD    │
│  /api/invitations  Lifecycle        │
│  /api/garden    Bloom history       │
│  /api/friends   Bot user pool       │
└──────────┬──────────────┬───────────┘
           │ SQL          │ emit (after commit)
           ▼              ▼
  ┌──────────────┐  ┌──────────────────┐
  │ PostgreSQL   │  │   Socket.IO      │
  │   (Docker)   │  │  session:{id}    │
  │              │  │  user:{id} rooms │
  └──────────────┘  └──────────────────┘
```

**Request flow:**
1. `api(path, opts)` attaches the Bearer token and `credentials: 'include'` for the refresh cookie.
2. On `401`: silently calls `POST /auth/refresh`, then retries. On a second `401`: clears auth state.
3. Express validates the body with Zod, calls the service function, returns the result.
4. Service functions write to PostgreSQL and emit Socket.IO events in the same logical flow.

---

## Tech Stack

### Frontend

| Tool | Version | Notes |
|---|---|---|
| Vue 3 | `^3.5` | Composition API, `<script setup>` throughout |
| Pinia | `^3.0` | Auth token stored in memory, not localStorage |
| Vue Router 4 | `^4.6` | SPA routing with history mode |
| Tailwind CSS | `^3.4` | Utility-first via PostCSS |
| Vite (rolldown-vite) | `7.2.5` | Dev server + `/api` proxy to `:3001` |

### Backend

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 22 | Native ESM, `--env-file`, `--watch` |
| Express | `^5.2` | Async error propagation built-in |
| Zod | `^4.4` | Schema validation + unknown-key stripping at route boundary |
| jsonwebtoken | `^9.0` | HS256 access + refresh tokens, separate secrets |
| bcryptjs | `^2.4` | Password hashing at rest, cost factor 10 |
| postgres (porsager) | `^3.4` | Tagged template literals; no ORM |
| Socket.IO | `^4.8` | Event emission server-side; client not yet connected |

### Database & Infrastructure

| Tool | Notes |
|---|---|
| PostgreSQL 16 | UUID primary keys for sessions, BIGINT identity for users |
| Docker | Single `docker run` command; no local PostgreSQL install needed |
| Custom migration runner | Sequential SQL files, idempotent, auto-run at startup |

---

## Features

**Session lifecycle**
Users host or join timed focus sessions (public or private). Public sessions are immediately discoverable on the browse page. Private sessions require an invitation — the host selects participants, who receive a pending invite they can accept or decline. The backend determines session outcome (success/failed/abandoned) from todo completion state when the session ends, and records a `garden_flower` with a `bloom_level` proportional to elapsed time.

**Three-scope todo system**
Each session carries three distinct todo scopes: `session` (shared across all members, admin-managed), `personal` (private per user), and `ai` (generated once per session, toggle-only). Todos are individual REST resources — create, toggle, and delete each go through separate API calls with optimistic local updates and rollback.

**Garden and streak tracking**
Every ended session produces a `garden_flower` record. `bloom_level` is a `NUMERIC(4,3)` value between 0 and 1. The garden page groups flowers by recency. Streak is calculated from consecutive days with at least one successful bloom. `flowers_count` on the user record is incremented atomically — only on `outcome = 'success'`.

**Invitation system**
Creating a private session dispatches pending invitations to selected user IDs. Recipients see sessions with full detail (topic, duration, shared task list) before accepting. Accepting an invitation atomically inserts a row into `session_members` and emits `member:joined` to the session room.

**Auth**
Standard register/login with bcrypt-hashed passwords. Two-token strategy: short-lived access token in memory, long-lived refresh token in an `HttpOnly` cookie. Silent refresh is handled transparently by the API helper.

---

## Project Structure

```
bloom_together/
├── migrations/                 # SQL migration files (run in order at startup)
│   ├── 001_initial.sql
│   └── 002_garden_invitations.sql
│
├── server/                     # Express backend (Node.js ESM)
│   ├── server.js               # Entry point: migrate → bind HTTP → init Socket.IO
│   ├── app.js                  # Express factory, middleware, route mounting
│   ├── shared/                 # db pool, auth middleware, error classes, socket singleton
│   └── modules/                # One directory per domain
│       ├── auth/               # register · login · refresh · /me
│       ├── sessions/           # CRUD · member management · end
│       ├── todos/              # Scoped todo CRUD
│       ├── invitations/        # Create · accept · decline
│       ├── garden/             # Bloom history
│       ├── friends/            # Bot user pool
│       ├── users/              # Profile
│       └── ai/                 # Task generation (static fallback)
│
├── src/                        # Vue 3 frontend
│   ├── Api/http.js             # api() helper — token attachment, silent refresh, retry
│   ├── stores/auth.js          # Pinia auth store (user, accessToken)
│   ├── router/index.js         # Route definitions
│   ├── pages/                  # One .vue file per route
│   └── components/             # session/ · HostSession/ · AvailableSessions/ · main/ · icons/
│
├── screenshots/
├── vite.config.js              # Dev proxy: /api + /auth → :3001
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 22
- Docker
- npm

### 1. Clone and install

```bash
git clone https://github.com/parastoo-hashemi/Bloom_together.git
cd Bloom_together
npm install
```

### 2. Start PostgreSQL

```bash
docker run -d --name bloom-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=bloom \
  -p 5432:5432 \
  postgres:16-alpine
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values — see [Environment Variables](#environment-variables) below. At minimum set `DATABASE_URL`, `JWT_SECRET`, and `JWT_REFRESH_SECRET`.

### 4. Run migrations

```bash
npm run migrate
```

Migrations are idempotent — safe to run more than once.

### 5. Start the backend

```bash
npm run server:dev
```

Express starts on `http://localhost:3001` with `--watch`.

### 6. Start the frontend

```bash
npm run dev
```

Vite starts on `http://localhost:5173`. `/api/*` and `/auth/*` requests are proxied to `:3001` automatically.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | e.g. `postgresql://postgres:postgres@localhost:5432/bloom` |
| `JWT_SECRET` | Yes | Signs 15-minute access tokens. Use a 64-byte random hex string. |
| `JWT_REFRESH_SECRET` | Yes | Signs 7-day refresh tokens. Must differ from `JWT_SECRET`. |
| `PORT` | No | Express port. Default: `3001`. |
| `CLIENT_ORIGIN` | No | CORS allowed origin. Default: `http://localhost:5173`. |
| `ANTHROPIC_API_KEY` | No | Reserved for AI module. Currently unused — endpoint returns static templates. |
| `VITE_DEV_USERNAME` | No | Dev-only auto-login username. Remove before any multi-user deployment. |
| `VITE_DEV_PASSWORD` | No | Dev-only auto-login password. |

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## API Reference

All `/api/*` routes require `Authorization: Bearer <accessToken>`.

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Authenticate; sets refresh cookie |
| `POST` | `/auth/refresh` | Issue new access token from refresh cookie |
| `GET` | `/auth/me` | Authenticated user profile |
| `GET` | `/api/friends` | Bot user pool (invitation picker) |
| `GET` | `/api/sessions` | List active sessions (`privacy`, `minMinutes` filters) |
| `POST` | `/api/sessions` | Create session; dispatches invitations to `invited_ids` |
| `GET` | `/api/sessions/:id` | Session detail with members array |
| `PUT` | `/api/sessions/:id` | Update topic, duration, or member list (admin only) |
| `POST` | `/api/sessions/:id/end` | End session; creates garden flower (admin only) |
| `GET` | `/api/sessions/:id/todos` | All todos grouped by scope |
| `POST` | `/api/sessions/:id/todos` | Create todo (`scope`: `session` or `personal`) |
| `PUT` | `/api/sessions/:id/todos/:todoId` | Toggle done or update text |
| `DELETE` | `/api/sessions/:id/todos/:todoId` | Delete todo |
| `POST` | `/api/sessions/:id/ai/generate` | Generate AI task list (admin only) |
| `GET` | `/api/invitations` | Pending invitations for caller |
| `PUT` | `/api/invitations/:id/accept` | Accept; inserts into `session_members` |
| `PUT` | `/api/invitations/:id/decline` | Decline |
| `GET` | `/api/garden` | Caller's flower history and `flowers_count` |

---

## Database Schema

```
users
  id            BIGINT IDENTITY PK
  username      TEXT UNIQUE NOT NULL
  email         TEXT UNIQUE
  password_hash TEXT NOT NULL
  role          TEXT  -- 'user' | 'bot'
  avatar_url    TEXT
  flowers_count INTEGER DEFAULT 0

sessions
  id             UUID PK  -- gen_random_uuid()
  privacy        TEXT     -- 'public' | 'private'
  topic          TEXT
  duration_hours INTEGER
  duration_mins  INTEGER
  admin_id       BIGINT → users.id
  start_time     BIGINT   -- epoch ms
  ended_at       BIGINT   -- epoch ms; NULL = active
  ai_generated   BOOLEAN
  quiz_questions JSONB

session_members
  session_id  UUID   → sessions.id  CASCADE
  user_id     BIGINT → users.id
  PRIMARY KEY (session_id, user_id)

todos
  id          UUID PK
  session_id  UUID   → sessions.id  CASCADE
  owner_id    BIGINT → users.id     -- NULL for session-scoped todos
  scope       TEXT   -- 'session' | 'personal' | 'ai'
  text        TEXT
  done        BOOLEAN DEFAULT FALSE
  immutable   BOOLEAN DEFAULT FALSE  -- AI todos: text locked after generation
  position    INTEGER

garden_flowers
  id          UUID PK
  user_id     BIGINT → users.id
  session_id  UUID   → sessions.id
  topic       TEXT
  bloom_level NUMERIC(4,3)  -- [0, 1]; elapsed ÷ total duration
  outcome     TEXT          -- 'success' | 'failed' | 'abandoned'
  ended_at    TIMESTAMPTZ

invitations
  id          UUID PK
  session_id  UUID   → sessions.id  CASCADE
  from_id     BIGINT → users.id
  to_id       BIGINT → users.id
  status      TEXT   -- 'pending' | 'accepted' | 'declined'
```

---

## Screenshots

<table>
  <tr>
    <td align="center" valign="top">
      <img src="screenshots/session%20room.png" width="220"/><br/>
      <sub><b>Session room</b><br/>Live timer, flower growth animation, and member list. The richest screen in the app.</sub>
    </td>
    <td align="center" valign="top">
      <img src="screenshots/add%2C%20remove%20session%20tasks%20by%20admin%20(private).png" width="220"/><br/>
      <sub><b>Shared task list</b><br/>Admin-managed session todos in a private session. Three scopes: session, personal, AI.</sub>
    </td>
    <td align="center" valign="top">
      <img src="screenshots/host%20page(private).png" width="220"/><br/>
      <sub><b>Create session</b><br/>Private session form — invite friends and pre-populate shared tasks before starting.</sub>
    </td>
  </tr>
</table>

<table>
  <tr>
    <td align="center" valign="top">
      <img src="screenshots/available%20sessions.png" width="220"/><br/>
      <sub><b>Browse sessions</b><br/>Active public sessions with topic and duration filter.</sub>
    </td>
    <td align="center" valign="top">
      <img src="screenshots/generated%20AI%20tasks.png" width="220"/><br/>
      <sub><b>AI task panel</b><br/>Generated once per session. AI todos are immutable after creation — only done state can be toggled.</sub>
    </td>
    <td align="center" valign="top">
      <img src="screenshots/Garden.png" width="220"/><br/>
      <sub><b>Garden</b><br/>One flower per successful session. Bloom level reflects elapsed-to-total time ratio. Drives streak counter.</sub>
    </td>
  </tr>
</table>

---

## Known Limitations

These are documented accurately — they reflect decisions not yet made, not oversights.

**Frontend Socket.IO client not connected**
The server emits `member:joined`, `member:left`, `session:ended`, and `invitation:received` after every relevant database write. The Vue frontend does not yet connect a `socket.io-client` instance. Live updates require a page refresh. Wiring the client is the highest-priority next step.

**Dev-only auth bypass**
`Login.vue` and all `/auth/*` endpoints are fully implemented, but each page component currently calls a dev-only `ensureToken()` helper that silently authenticates as a hardcoded user. Vue Router navigation guards and a proper unauthenticated redirect are needed before multi-user deployment.

**AI todo generation returns static content**
`POST /api/sessions/:id/ai/generate` returns a fixed task list regardless of topic. `ANTHROPIC_API_KEY` is wired into the environment but unused. The `AiTodoPanel` component also uses a hardcoded base URL without an auth header, making the AI tab non-functional end-to-end in its current form.

**Minor UI gaps**
- `NavBar` is not rendered on `HostSession.vue` and `AvailableSessions.vue`.
- The "End Session" button is visible to all members. The backend rejects non-admin requests with `403`, but the button should be conditionally hidden on the frontend.
