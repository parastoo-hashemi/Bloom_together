// server/modules/sessions/sessions.service.js
// Business logic for session lifecycle management.
//
// Table ownership: sessions, session_members.
// This module also writes to invitations at session creation and member-add
// time — a spec-sanctioned exception (BACKEND_SPEC §6.3, §6.5) because
// invitation rows depend on a sessions.id FK and must be created in the
// same flow. The invitations module owns READ / ACCEPT / DECLINE (Step 6).
//
// Socket events are emitted via safeEmit() after every DB write. The REST
// layer is always the source of truth — socket emissions are notifications
// only and never fail the HTTP response.
//
// BIGINT handling: postgres.js returns all BIGINT columns (admin_id,
// user_id, start_time, ended_at, COUNT()) as JavaScript strings.
// Every numeric field that leaves this module is cast with Number().

import sql          from '../../shared/db.js'
import { getIO }    from '../../shared/socket.js'
import { BadRequest, Forbidden, NotFound } from '../../shared/errors.js'
import * as gardenService from '../garden/garden.service.js'

// ── Socket helper ─────────────────────────────────────────────────────────────

/**
 * Emits a Socket.IO event without throwing if the server is not yet
 * initialised (e.g. during supertest integration tests that call createApp()
 * without a running Socket.IO server).
 *
 * Must always be called AFTER the relevant DB write has committed.
 */
function safeEmit(room, event, payload) {
  try {
    getIO().to(room).emit(event, payload)
  } catch (err) {
    console.error(`[sessions.service] socket emit failed (${event}):`, err.message)
  }
}

// ── Public service functions ───────────────────────────────────────────────────

/**
 * Returns all active sessions (ended_at IS NULL) with optional filters.
 *
 * @param {{ privacy?: 'public'|'private', minMinutes?: number }} opts
 * @returns {Array<object>}
 */
export async function listSessions({ privacy, minMinutes } = {}) {
  const privacyFilter = privacy
    ? sql`AND s.privacy = ${privacy}`
    : sql``
  const durationFilter = minMinutes
    ? sql`AND (s.duration_hours * 60 + s.duration_mins) >= ${minMinutes}`
    : sql``

  const rows = await sql`
    SELECT   s.id,
             s.topic,
             s.privacy,
             s.duration_hours,
             s.duration_mins,
             s.admin_id,
             u.username        AS admin_username,
             s.start_time,
             COUNT(sm.user_id) AS member_count
    FROM     sessions s
    JOIN     users u          ON u.id          = s.admin_id
    LEFT JOIN session_members sm ON sm.session_id = s.id
    WHERE    s.ended_at IS NULL
    ${privacyFilter}
    ${durationFilter}
    GROUP BY s.id, u.id, u.username
    ORDER BY s.start_time DESC
  `

  return rows.map(r => ({
    id:           r.id,
    topic:        r.topic,
    privacy:      r.privacy,
    duration:     { hours: r.duration_hours, minutes: r.duration_mins },
    admin:        { id: Number(r.admin_id), username: r.admin_username },
    start_time:   Number(r.start_time),
    member_count: Number(r.member_count),
  }))
}

/**
 * Creates a session, inserts the admin as the first member, and creates
 * pending invitations for each invited user.
 *
 * All three writes (session + member + invitations) are atomic inside a
 * postgres.js transaction — if any invitation FK fails, the whole session
 * creation is rolled back.
 *
 * invitation:received is emitted to user:{toId} for each invited user after
 * the transaction commits.
 *
 * @param {{ privacy, topic, duration, adminId, invited_ids? }} opts
 * @returns {{ id: string, topic: string, start_time: number }}
 */
export async function createSession({ privacy, topic, duration, adminId, invited_ids = [] }) {
  const { hours, minutes } = duration
  const startTime = Date.now()

  // Deduplicate invited IDs and exclude admin (who is already inserted as member).
  const uniqueInvitedIds = [...new Set(invited_ids)].filter(id => id !== adminId)

  let session
  const insertedInvitations = []

  try {
    await sql.begin(async sql => {
      const [sess] = await sql`
        INSERT INTO sessions (privacy, topic, duration_hours, duration_mins, admin_id, start_time)
        VALUES      (${privacy}, ${topic}, ${hours}, ${minutes}, ${adminId}, ${startTime})
        RETURNING   id, topic, start_time
      `
      session = sess

      // Admin is always the first member.
      await sql`
        INSERT INTO session_members (session_id, user_id)
        VALUES      (${sess.id}, ${adminId})
        ON CONFLICT DO NOTHING
      `

      // Create pending invitations inside the same transaction so a bad
      // invited_id rolls back the entire session creation.
      for (const toId of uniqueInvitedIds) {
        const [inv] = await sql`
          INSERT INTO invitations (session_id, from_id, to_id, status)
          VALUES      (${sess.id}, ${adminId}, ${toId}, 'pending')
          RETURNING   id
        `
        insertedInvitations.push({ invId: inv.id, toId })
      }
    })
  } catch (err) {
    // 23503 = foreign_key_violation — an invited_id does not exist in users.
    if (err.code === '23503') throw new BadRequest('One or more invited users do not exist')
    throw err
  }

  // Emit after transaction commits — DB writes are guaranteed at this point.
  for (const { invId, toId } of insertedInvitations) {
    safeEmit(`user:${toId}`, 'invitation:received', {
      invitation: {
        id:         invId,
        session_id: session.id,
        from_id:    adminId,
        to_id:      toId,
        status:     'pending',
      },
    })
  }

  return {
    id:         session.id,
    topic:      session.topic,
    start_time: Number(session.start_time),
  }
}

/**
 * Returns a full session object including its members array.
 * Returns null if the session does not exist or has already ended.
 *
 * @param {string} id — Session UUID
 * @returns {object|null}
 */
export async function getSessionById(id) {
  const [raw] = await sql`
    SELECT s.id,
           s.topic,
           s.privacy,
           s.duration_hours,
           s.duration_mins,
           s.admin_id,
           u.username    AS admin_username,
           s.start_time,
           s.ended_at,
           s.ai_generated,
           s.quiz_questions
    FROM   sessions s
    JOIN   users u ON u.id = s.admin_id
    WHERE  s.id = ${id} AND s.ended_at IS NULL
  `
  if (!raw) return null

  const members = await sql`
    SELECT u.id, u.username, u.avatar_url
    FROM   session_members sm
    JOIN   users u ON u.id = sm.user_id
    WHERE  sm.session_id = ${id}
  `

  return {
    id:             raw.id,
    topic:          raw.topic,
    privacy:        raw.privacy,
    duration:       { hours: raw.duration_hours, minutes: raw.duration_mins },
    admin:          { id: Number(raw.admin_id), username: raw.admin_username },
    start_time:     Number(raw.start_time),
    ended_at:       raw.ended_at !== null ? Number(raw.ended_at) : null,
    ai_generated:   raw.ai_generated,
    quiz_questions: raw.quiz_questions,
    members:        members.map(m => ({
      id:         Number(m.id),
      username:   m.username,
      avatar_url: m.avatar_url,
    })),
  }
}

/**
 * Updates an active session. Only the admin may call this.
 *
 * If invited_ids is present in the patch, a diff is computed against the
 * current session_members and members are added or removed accordingly.
 * The admin is never removed even if omitted from invited_ids.
 *
 * member:joined / member:left are emitted after each membership change.
 *
 * @param {string} id        — Session UUID
 * @param {object} patch     — Validated fields from the request body
 * @param {number} adminId   — req.user.userId
 * @returns {{ message: string }}
 */
export async function updateSession(id, patch, adminId) {
  const [raw] = await sql`
    SELECT id, admin_id
    FROM   sessions
    WHERE  id = ${id} AND ended_at IS NULL
  `
  if (!raw) throw new NotFound('Session not found')
  if (Number(raw.admin_id) !== adminId) throw new Forbidden('Only the session admin can update it')

  // Build the SET object from only the fields that were supplied.
  const update = {}
  if (patch.topic    !== undefined) update.topic          = patch.topic
  if (patch.duration !== undefined) {
    update.duration_hours = patch.duration.hours
    update.duration_mins  = patch.duration.minutes
  }

  if (Object.keys(update).length > 0) {
    await sql`UPDATE sessions SET ${sql(update)} WHERE id = ${id}`
  }

  // ── invited_ids diff ────────────────────────────────────────────────────────
  if (patch.invited_ids !== undefined) {
    const memberRows = await sql`
      SELECT user_id FROM session_members WHERE session_id = ${id}
    `
    // Normalize to numbers; exclude admin from the diff (admin is permanent).
    const currentNonAdminIds = new Set(
      memberRows.map(r => Number(r.user_id)).filter(uid => uid !== adminId),
    )
    const newNonAdminIds = new Set(patch.invited_ids.filter(uid => uid !== adminId))

    const toAdd    = [...newNonAdminIds].filter(uid => !currentNonAdminIds.has(uid))
    const toRemove = [...currentNonAdminIds].filter(uid => !newNonAdminIds.has(uid))

    for (const uid of toAdd) {
      // Each added member's writes are atomic: if either the session_members
      // insert or the invitation insert fails, neither is committed.
      //
      // The invitation insert uses INSERT … SELECT … WHERE NOT EXISTS so that
      // re-adding a previously removed user does not create a duplicate row
      // (there is no UNIQUE constraint on invitations to rely on).
      try {
        await sql.begin(async sql => {
          await sql`
            INSERT INTO session_members (session_id, user_id)
            VALUES      (${id}, ${uid})
            ON CONFLICT DO NOTHING
          `
          // Admin-added directly → invitation recorded as 'accepted'.
          // Skip if any invitation row already exists for this (session, user)
          // pair to prevent duplicates when a user is removed then re-added.
          await sql`
            INSERT INTO invitations (session_id, from_id, to_id, status)
            SELECT ${id}, ${adminId}, ${uid}, 'accepted'
            WHERE  NOT EXISTS (
              SELECT 1 FROM invitations
              WHERE  session_id = ${id} AND to_id = ${uid}
            )
          `
        })
      } catch (err) {
        // 23503 = foreign_key_violation — uid does not exist in users.
        if (err.code === '23503') throw new BadRequest('One or more users do not exist')
        throw err
      }

      const [user] = await sql`
        SELECT id, username, avatar_url FROM users WHERE id = ${uid}
      `
      if (user) {
        safeEmit(`session:${id}`, 'member:joined', {
          user: { id: Number(user.id), username: user.username, avatar_url: user.avatar_url },
        })
      }
    }

    for (const uid of toRemove) {
      await sql`
        DELETE FROM session_members
        WHERE  session_id = ${id} AND user_id = ${uid}
      `
      safeEmit(`session:${id}`, 'member:left', { userId: uid })
    }
  }

  return { message: 'Session updated' }
}

/**
 * Ends a session. Only the admin may call this.
 *
 * Steps (in order):
 *   1. Validate session exists and is active; verify admin.
 *   2. Compute bloom_level = elapsed / total, clamped [0, 1].
 *   3. Determine outcome: 'success' if all todos done or no todos; else 'failed'.
 *   4. Set ended_at = Date.now().
 *   5. Call garden.service.createFlower() (best-effort — session is already ended).
 *   6. If success: increment users.flowers_count.
 *   7. Emit session:ended after all writes.
 *
 * @param {string} id      — Session UUID
 * @param {number} adminId — req.user.userId
 * @returns {{ message: string, flower: { bloom_level: number, outcome: string } }}
 */
export async function endSession(id, adminId) {
  const [raw] = await sql`
    SELECT id, admin_id, topic, duration_hours, duration_mins, start_time
    FROM   sessions
    WHERE  id = ${id} AND ended_at IS NULL
  `
  if (!raw) throw new NotFound('Session not found or already ended')
  if (Number(raw.admin_id) !== adminId) throw new Forbidden('Only the session admin can end it')

  // bloom_level: elapsed / total, clamped to [0, 1]
  const startTime  = Number(raw.start_time)
  const elapsedMs  = Date.now() - startTime
  const totalMs    = (raw.duration_hours * 3600 + raw.duration_mins * 60) * 1000
  const bloomLevel = totalMs > 0 ? Math.min(Math.max(elapsedMs / totalMs, 0), 1) : 0

  // outcome: success if every todo is done, or there are no todos
  const todos   = await sql`SELECT done FROM todos WHERE session_id = ${id}`
  const outcome = todos.length === 0 || todos.every(t => t.done) ? 'success' : 'failed'

  // Mark session ended — committed independently so subsequent errors
  // (garden insert, flowers_count) cannot reopen the session.
  const endedAt = Date.now()
  await sql`UPDATE sessions SET ended_at = ${endedAt} WHERE id = ${id}`

  // Create garden flower (best-effort — session already committed as ended).
  try {
    await gardenService.createFlower({
      user_id:     adminId,
      session_id:  id,
      topic:       raw.topic,
      bloom_level: bloomLevel,
      outcome,
    })
  } catch (err) {
    console.error('[sessions.service] createFlower failed:', err.message)
  }

  // Increment flowers_count only on success.
  if (outcome === 'success') {
    await sql`UPDATE users SET flowers_count = flowers_count + 1 WHERE id = ${adminId}`
  }

  // Emit after all writes.
  safeEmit(`session:${id}`, 'session:ended', { outcome, bloom_level: bloomLevel })

  return {
    message: 'Session ended',
    flower:  { bloom_level: bloomLevel, outcome },
  }
}

// ── Cross-module exports ───────────────────────────────────────────────────────
// These are called by other modules; do not remove when their callers are built.

/**
 * Adds a user to a session's member list.
 * Called by invitations.service (Step 6) when an invitation is accepted.
 *
 * @param {string} sessionId
 * @param {number} userId
 */
export async function addMember(sessionId, userId) {
  await sql`
    INSERT INTO session_members (session_id, user_id)
    VALUES      (${sessionId}, ${userId})
    ON CONFLICT DO NOTHING
  `
}

/**
 * Returns true if userId is a member of sessionId.
 * Called by todos.service (Step 9) to enforce member-only todo access.
 *
 * @param {string} sessionId
 * @param {number} userId
 * @returns {boolean}
 */
export async function isMember(sessionId, userId) {
  const [row] = await sql`
    SELECT 1
    FROM   session_members
    WHERE  session_id = ${sessionId}
      AND  user_id    = ${userId}
  `
  return Boolean(row)
}

/**
 * Marks a session as AI-generated and resets quiz_questions to [].
 * Called by ai.service (Step 7) after todos have been inserted.
 *
 * quiz_questions is always set to [] for the static mock path.
 * A future real-AI path can extend this signature to accept quiz data.
 *
 * @param {string} sessionId
 */
export async function markAIGenerated(sessionId) {
  await sql`
    UPDATE sessions
    SET    ai_generated   = TRUE,
           quiz_questions  = '[]'::jsonb
    WHERE  id = ${sessionId}
  `
}
