-- migrations/002_garden_invitations.sql
-- Garden history and invitations tables.
-- Depends on: 001_initial.sql (users, sessions).

-- ── Garden flowers ────────────────────────────────────────────────────────────
-- One row is written for every session that ends (success, failed, or abandoned).
-- bloom_level mirrors the frontend flowerGrowth.ts formula: elapsed / total, [0,1].
CREATE TABLE IF NOT EXISTS garden_flowers (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     BIGINT       NOT NULL REFERENCES users(id),
  session_id  UUID         REFERENCES sessions(id),
  topic       TEXT,
  bloom_level NUMERIC(4,3) NOT NULL DEFAULT 0
                           CHECK (bloom_level >= 0 AND bloom_level <= 1),
  outcome     TEXT         NOT NULL
              CHECK (outcome IN ('success', 'failed', 'abandoned')),
  ended_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Invitations ───────────────────────────────────────────────────────────────
-- Accepting an invitation inserts a row into session_members and sets status =
-- 'accepted'. Declining sets status = 'declined'. Only 'pending' rows are
-- returned by GET /api/invitations.
CREATE TABLE IF NOT EXISTS invitations (
  id         UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID   NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  from_id    BIGINT NOT NULL REFERENCES users(id),
  to_id      BIGINT NOT NULL REFERENCES users(id),
  status     TEXT   NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
-- Most invitation queries filter by recipient + status.
CREATE INDEX IF NOT EXISTS idx_invitations_recipient
  ON invitations (to_id, status);
