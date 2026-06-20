// server/modules/invitations/invitations.service.js
// Business logic for invitation lifecycle management.
//
// Table ownership: this module is the sole owner of the invitations READ and
// status-update lifecycle. sessions.service.js writes pending/accepted rows
// during session creation and admin-direct-add (spec-sanctioned exceptions,
// BACKEND_SPEC §6.3, §6.5). This module handles the four REST endpoints.
//
// Cross-module call: acceptInvitation() calls sessions.service.addMember()
// to insert into session_members — the only cross-module write in this file.
// Invitations never imports db.js to write session_members directly.
//
// Socket events emitted:
//   invitation:received → user:{toId}        after POST insert
//   member:joined       → session:{sessionId} after PUT /accept
//
// BIGINT handling: from_id, to_id, admin_id are BIGINT → JS strings from
// postgres.js. Always cast with Number() before comparison or in responses.

import sql          from '../../shared/db.js'
import { getIO }    from '../../shared/socket.js'
import { BadRequest, Forbidden, NotFound } from '../../shared/errors.js'
import { addMember } from '../sessions/sessions.service.js'

// ── Socket helper ─────────────────────────────────────────────────────────────

/**
 * Emits a Socket.IO event without throwing if the server is not initialised
 * (e.g. during supertest integration tests that call createApp() without a
 * running Socket.IO server). Must always be called AFTER the DB write commits.
 */
function safeEmit(room, event, payload) {
  try {
    getIO().to(room).emit(event, payload)
  } catch (err) {
    console.error(`[invitations.service] socket emit failed (${event}):`, err.message)
  }
}

// ── Public service functions ───────────────────────────────────────────────────

/**
 * Returns all pending invitations addressed to userId.
 * Joins sessions and users to assemble the full response shape.
 *
 * @param {number} userId — req.user.userId
 * @returns {Array<object>}
 */
export async function listInvitations(userId) {
  const rows = await sql`
    SELECT  i.id,
            i.status,
            i.created_at,
            s.id             AS session_id,
            s.topic,
            s.privacy,
            s.duration_hours,
            s.duration_mins,
            s.start_time,
            u.id             AS from_user_id,
            u.username       AS from_username
    FROM    invitations i
    JOIN    sessions    s ON s.id = i.session_id
    JOIN    users       u ON u.id = i.from_id
    WHERE   i.to_id  = ${userId}
      AND   i.status = 'pending'
    ORDER BY i.created_at DESC
  `

  return rows.map(r => ({
    id:      r.id,
    session: {
      id:         r.session_id,
      topic:      r.topic,
      privacy:    r.privacy,
      duration:   { hours: r.duration_hours, minutes: r.duration_mins },
      start_time: Number(r.start_time),
    },
    from:       { id: Number(r.from_user_id), username: r.from_username },
    status:     r.status,
    created_at: r.created_at,   // TIMESTAMPTZ → Date → ISO string in JSON
  }))
}

/**
 * Creates a pending invitation from fromId (session admin) to toId.
 *
 * Idempotent: if a pending invitation already exists for the same
 * (session_id, to_id) pair it is returned without a new insert.
 * The invitations table has no UNIQUE constraint, so this guard lives
 * in application code (SELECT-before-INSERT).
 *
 * Emits invitation:received to user:{toId} after a new insert.
 *
 * @param {{ sessionId: string, toId: number, fromId: number }} opts
 * @returns {{ id: string, status: string, alreadyExisted: boolean }}
 */
export async function createInvitation({ sessionId, toId, fromId }) {
  // Verify session exists and is active.
  const [session] = await sql`
    SELECT id, admin_id
    FROM   sessions
    WHERE  id = ${sessionId} AND ended_at IS NULL
  `
  if (!session) throw new NotFound('Session not found')

  // Only the session admin may create invitations.
  if (Number(session.admin_id) !== fromId) {
    throw new Forbidden('Only the session admin can send invitations')
  }

  // Idempotency guard — return the existing pending invitation without inserting
  // a duplicate row. (The invitations table has no UNIQUE constraint.)
  const [existing] = await sql`
    SELECT id, status
    FROM   invitations
    WHERE  session_id = ${sessionId}
      AND  to_id      = ${toId}
      AND  status     = 'pending'
  `
  if (existing) {
    return { id: existing.id, status: existing.status, alreadyExisted: true }
  }

  // Insert the new invitation, catching FK violation for non-existent to_id.
  let inv
  try {
    const [inserted] = await sql`
      INSERT INTO invitations (session_id, from_id, to_id, status)
      VALUES      (${sessionId}, ${fromId}, ${toId}, 'pending')
      RETURNING   id, status
    `
    inv = inserted
  } catch (err) {
    // 23503 = foreign_key_violation — toId does not exist in users.
    if (err.code === '23503') throw new BadRequest('User does not exist')
    throw err
  }

  // Emit after DB write commits.
  // Payload matches the shape already emitted by sessions.service.createSession()
  // for consistency with whatever the frontend is already consuming.
  safeEmit(`user:${toId}`, 'invitation:received', {
    invitation: {
      id:         inv.id,
      session_id: sessionId,
      from_id:    fromId,
      to_id:      toId,
      status:     'pending',
    },
  })

  return { id: inv.id, status: inv.status, alreadyExisted: false }
}

/**
 * Accepts a pending invitation.
 *
 * Steps (in order):
 *   1. Fetch invitation — 404 if absent.
 *   2. Verify caller is the recipient — 403 otherwise.
 *   3. Verify status is 'pending' — 400 if already acted on.
 *   4. Mark invitation as 'accepted'.
 *   5. Insert user into session_members via sessions.service.addMember().
 *   6. Emit member:joined to session:{session_id}.
 *   7. Return { session_id }.
 *
 * @param {string} invitationId — UUID
 * @param {number} userId       — req.user.userId
 * @returns {{ session_id: string }}
 */
export async function acceptInvitation(invitationId, userId) {
  const [inv] = await sql`
    SELECT id, session_id, to_id, status
    FROM   invitations
    WHERE  id = ${invitationId}
  `
  if (!inv) throw new NotFound('Invitation not found')

  if (Number(inv.to_id) !== userId) {
    throw new Forbidden('Only the recipient can accept this invitation')
  }

  if (inv.status !== 'pending') {
    throw new BadRequest('Invitation is no longer pending')
  }

  // Mark accepted before calling addMember so the status is committed even if
  // the member insert is somehow retried later.
  await sql`UPDATE invitations SET status = 'accepted' WHERE id = ${invitationId}`

  // Cross-module: insert session_members row via sessions service — never write
  // to session_members directly from the invitations module.
  await addMember(inv.session_id, userId)

  // Fetch user details for the socket event payload.
  const [user] = await sql`
    SELECT id, username, avatar_url FROM users WHERE id = ${userId}
  `
  if (user) {
    safeEmit(`session:${inv.session_id}`, 'member:joined', {
      user: { id: Number(user.id), username: user.username, avatar_url: user.avatar_url },
    })
  }

  return { session_id: inv.session_id }
}

/**
 * Declines a pending invitation.
 * No socket event is emitted on decline (BACKEND_SPEC §9.5).
 *
 * @param {string} invitationId — UUID
 * @param {number} userId       — req.user.userId
 * @returns {{ message: string }}
 */
export async function declineInvitation(invitationId, userId) {
  const [inv] = await sql`
    SELECT id, to_id, status
    FROM   invitations
    WHERE  id = ${invitationId}
  `
  if (!inv) throw new NotFound('Invitation not found')

  if (Number(inv.to_id) !== userId) {
    throw new Forbidden('Only the recipient can decline this invitation')
  }

  if (inv.status !== 'pending') {
    throw new BadRequest('Invitation is no longer pending')
  }

  await sql`UPDATE invitations SET status = 'declined' WHERE id = ${invitationId}`

  return { message: 'Declined' }
}
