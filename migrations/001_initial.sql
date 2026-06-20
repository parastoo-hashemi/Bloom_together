-- migrations/001_initial.sql
-- Initial schema: users, sessions, session_members, todos
-- All DDL is wrapped in the migration transaction by migrations.js.

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username      TEXT        NOT NULL UNIQUE,
  email         TEXT        UNIQUE,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'user'
                            CHECK (role IN ('user', 'bot')),
  avatar_url    TEXT,
  flowers_count INTEGER     NOT NULL DEFAULT 0,
  focus_minutes INTEGER     NOT NULL DEFAULT 25,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Sessions ──────────────────────────────────────────────────────────────────
-- start_time / ended_at are epoch-ms (BIGINT) to match the existing JS timer
-- that uses Date.now(). ended_at IS NULL while the session is active.
CREATE TABLE IF NOT EXISTS sessions (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  privacy        TEXT    NOT NULL DEFAULT 'public'
                         CHECK (privacy IN ('public', 'private')),
  topic          TEXT    NOT NULL DEFAULT '',
  duration_hours INTEGER NOT NULL DEFAULT 0,
  duration_mins  INTEGER NOT NULL DEFAULT 25,
  admin_id       BIGINT  NOT NULL REFERENCES users(id),
  start_time     BIGINT  NOT NULL,
  ended_at       BIGINT,
  ai_generated   BOOLEAN NOT NULL DEFAULT FALSE,
  quiz_questions JSONB   NOT NULL DEFAULT '[]'
);

-- ── Session membership ────────────────────────────────────────────────────────
-- The admin is always inserted as a member on session creation.
CREATE TABLE IF NOT EXISTS session_members (
  session_id UUID   NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, user_id)
);

-- ── Todos ─────────────────────────────────────────────────────────────────────
-- scope   = 'session'  → shared; only admin may change text
-- scope   = 'personal' → owner_id is the creating member
-- scope   = 'ai'       → immutable = TRUE; only 'done' may be toggled
CREATE TABLE IF NOT EXISTS todos (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  owner_id   BIGINT  REFERENCES users(id),
  scope      TEXT    NOT NULL CHECK (scope IN ('session', 'personal', 'ai')),
  text       TEXT    NOT NULL,
  done       BOOLEAN NOT NULL DEFAULT FALSE,
  immutable  BOOLEAN NOT NULL DEFAULT FALSE,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_todos_session
  ON todos (session_id);

CREATE INDEX IF NOT EXISTS idx_todos_owner
  ON todos (owner_id);

-- Partial index: only active sessions are ever queried by list endpoints.
CREATE INDEX IF NOT EXISTS idx_sessions_active
  ON sessions (ended_at)
  WHERE ended_at IS NULL;
