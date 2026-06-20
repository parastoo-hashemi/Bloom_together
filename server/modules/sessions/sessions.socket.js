// server/modules/sessions/sessions.socket.js
// Socket.IO event handlers for session room management.
//
// Client → Server events handled here:
//   session:join  { sessionId }  — validates membership, joins socket room
//   session:leave { sessionId }  — leaves socket room (does not end the session)
//
// Server → Client events emitted from sessions.service.js (Step 5+):
//   member:joined  { user }              → session:{id}
//   member:left    { userId }            → session:{id}
//   session:ended  { outcome, bloom_level } → session:{id}
//
// Room naming: session:{sessionId}  (UUID string)
//
// Spec reference: BACKEND_SPEC §12.2, §12.5

import sql from '../../shared/db.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Loosely validates that sessionId looks like a UUID.
 * Prevents obviously bad values from reaching the database.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUUID(value) {
  return typeof value === 'string' && UUID_RE.test(value)
}

// ── Registration ──────────────────────────────────────────────────────────────

/**
 * Registers session room event handlers on the Socket.IO server.
 * Called once at startup from server.js.
 *
 * @param {import('socket.io').Server} io
 */
export function registerSessionSockets(io) {
  io.on('connection', (socket) => {
    // ── session:join ──────────────────────────────────────────────────────────
    /**
     * Payload: { sessionId: string }
     *
     * Guards (all silent — no event emitted on failure per spec §12.2):
     *   1. sessionId is a valid UUID string
     *   2. Session exists and is still active (ended_at IS NULL)
     *   3. socket.user.userId is listed in session_members for this session
     *
     * On success: socket joins room `session:{sessionId}`. No reply emitted.
     *
     * Note: session_members rows only exist after Step 5 creates REST endpoints
     * for sessions and invitations. Until then this handler always silently
     * rejects. See Step 4 limitations in the implementation notes.
     */
    socket.on('session:join', async (payload) => {
      const { sessionId } = payload ?? {}
      try {
        if (!isValidUUID(sessionId)) return

        // Guard 1 — session must exist and be active
        const [session] = await sql`
          SELECT id
          FROM   sessions
          WHERE  id        = ${sessionId}
            AND  ended_at IS NULL
        `
        if (!session) return

        // Guard 2 — caller must be a member
        const [member] = await sql`
          SELECT 1
          FROM   session_members
          WHERE  session_id = ${sessionId}
            AND  user_id    = ${socket.user.userId}
        `
        if (!member) return

        socket.join(`session:${sessionId}`)
      } catch (err) {
        // Log unexpected errors (e.g. DB connection failure) but do not crash
        // the socket or expose internals to the client.
        console.error('[sessions.socket] session:join error:', err.message)
      }
    })

    // ── session:leave ─────────────────────────────────────────────────────────
    /**
     * Payload: { sessionId: string }
     *
     * Leaves the socket room without ending the session.
     * socket.leave() is a no-op if the socket is not in the named room —
     * safe to call with any value.
     */
    socket.on('session:leave', (payload) => {
      const { sessionId } = payload ?? {}
      if (typeof sessionId === 'string') {
        socket.leave(`session:${sessionId}`)
      }
    })
  })
}
