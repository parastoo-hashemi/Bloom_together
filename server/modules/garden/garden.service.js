// server/modules/garden/garden.service.js
// Garden module — flower creation and garden history.
//
// Table ownership: this module is the only writer to garden_flowers.
// The sessions module calls createFlower() as a cross-module service call —
// the same pattern as invitations calling sessions.service.addMember().
//
// Step 8 added: getGarden(userId) — powers GET /api/garden.

import sql from '../../shared/db.js'

// ── Public service functions ───────────────────────────────────────────────────

/**
 * Inserts one garden_flowers row when a session ends.
 * Called by sessions.service.endSession() after ended_at is committed.
 *
 * bloom_level is clamped to [0.000, 1.000] before insert to match the
 * NUMERIC(4,3) column constraint. The clamping mirrors the formula in
 * flowerGrowth.ts on the frontend.
 *
 * @param {{
 *   user_id:     number,
 *   session_id:  string,
 *   topic:       string|null,
 *   bloom_level: number,
 *   outcome:     'success' | 'failed' | 'abandoned'
 * }} opts
 * @returns {object} The inserted garden_flowers row.
 */
export async function createFlower({ user_id, session_id, topic, bloom_level, outcome }) {
  const clamped = Math.min(Math.max(Number(bloom_level), 0), 1)

  const [flower] = await sql`
    INSERT INTO garden_flowers (user_id, session_id, topic, bloom_level, outcome)
    VALUES (${user_id}, ${session_id}, ${topic ?? null}, ${clamped}, ${outcome})
    RETURNING id, bloom_level, outcome, ended_at
  `
  return flower
}

/**
 * Returns the authenticated user's garden: their current flowers_count and
 * full garden_flowers history ordered newest-first.
 *
 * Two separate queries are used rather than a LEFT JOIN so that a user with
 * no flowers still returns { flowers_count: N, history: [] } cleanly.
 *
 * Type casting notes:
 *   bloom_level — NUMERIC(4,3) is returned by postgres.js as a JS string
 *                 (OID 1700 is absent from the default number-type set).
 *                 Number() converts it to a float, e.g. "0.950" → 0.95.
 *   flowers_count — INTEGER (OID 23) is returned as a native JS number;
 *                   Number() is applied defensively for consistency.
 *   ended_at — TIMESTAMPTZ is returned as a JS Date; JSON.stringify()
 *              converts it to an ISO 8601 string automatically.
 *
 * @param {number} userId — req.user.userId
 * @returns {{ flowers_count: number, history: Array<object> }}
 */
export async function getGarden(userId) {
  // Query 1: flowers_count from users.
  // Defensive: if the user was deleted between token issuance and this request,
  // `user` is undefined — handled below with a 0 fallback.
  const [user] = await sql`
    SELECT flowers_count
    FROM   users
    WHERE  id = ${userId}
  `

  // Query 2: full garden history, newest first.
  const flowers = await sql`
    SELECT id, topic, bloom_level, outcome, ended_at, session_id
    FROM   garden_flowers
    WHERE  user_id  = ${userId}
    ORDER BY ended_at DESC
  `

  return {
    flowers_count: user ? Number(user.flowers_count) : 0,
    history: flowers.map(f => ({
      id:          f.id,
      topic:       f.topic,
      bloom_level: Number(f.bloom_level),  // NUMERIC → string → cast to float
      outcome:     f.outcome,
      ended_at:    f.ended_at,             // Date → ISO string via JSON.stringify
      session_id:  f.session_id,
    })),
  }
}
