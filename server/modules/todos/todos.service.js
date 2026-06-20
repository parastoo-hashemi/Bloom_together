// server/modules/todos/todos.service.js
// Business logic for the todos table.
//
// Table ownership: this module is the sole writer to the todos table.
// No other module writes to todos directly — cross-module writes go through
// the exported functions here.
//
// Cross-module caller (Step 7):
//   ai.service.js calls createAITodos() after static task generation.
//   This is architecture-sanctioned (same pattern as invitations calling
//   sessions.service.addMember).
//
// Step 9: added listTodos, createTodo, updateTodo, deleteTodo.
//
// BIGINT handling: postgres.js returns BIGINT columns (owner_id, admin_id,
// COUNT) as JavaScript strings. Every numeric field cast with Number().

import sql from '../../shared/db.js'
import { getIO }                from '../../shared/socket.js'
import { Forbidden, NotFound }  from '../../shared/errors.js'
import { isMember }             from '../sessions/sessions.service.js'

// ── Socket helper ─────────────────────────────────────────────────────────────

/**
 * Emits a Socket.IO event without throwing if the server is not yet
 * initialised (e.g. during supertest integration tests).
 * Must always be called AFTER the relevant DB write has committed.
 */
function safeEmit(room, event, payload) {
  try {
    getIO().to(room).emit(event, payload)
  } catch (err) {
    console.error(`[todos.service] socket emit failed (${event}):`, err.message)
  }
}

// ── Row normaliser ────────────────────────────────────────────────────────────

/**
 * Converts a raw postgres.js todos row into the canonical API response shape.
 * owner_id is BIGINT (OID 20) — returned as string or null by postgres.js.
 * Number() cast is applied when not null; null is preserved.
 */
function formatTodo(row) {
  return {
    id:        row.id,
    text:      row.text,
    done:      row.done,
    scope:     row.scope,
    immutable: row.immutable,
    position:  row.position,
    owner_id:  row.owner_id !== null ? Number(row.owner_id) : null,
  }
}

// ── Cross-module exports ───────────────────────────────────────────────────────

/**
 * Inserts five AI-generated todos for a session.
 * Called by ai.service.generateAI() after static task generation.
 *
 * All rows are inserted with:
 *   scope     = 'ai'
 *   immutable = TRUE  (enforced by todos module at update/delete in Step 9)
 *   done      = FALSE
 *   owner_id  = NULL  (AI todos are session-shared, not personally owned)
 *   position  = array index 0–4 (preserves display order)
 *
 * @param {string}   sessionId — UUID of the active session
 * @param {string[]} taskTexts — exactly five task strings
 * @returns {Array<{ id: string, text: string, done: boolean, scope: string, immutable: boolean }>}
 */
export async function createAITodos(sessionId, taskTexts) {
  const inserted = []

  for (let i = 0; i < taskTexts.length; i++) {
    const [row] = await sql`
      INSERT INTO todos (session_id, owner_id, scope, text, done, immutable, position)
      VALUES            (${sessionId}, NULL, 'ai', ${taskTexts[i]}, FALSE, TRUE, ${i})
      RETURNING id, text, done, scope, immutable
    `
    inserted.push(row)
  }

  return inserted
}

// ── REST-layer service functions (Step 9) ─────────────────────────────────────

/**
 * Returns all todos for an active session, grouped by scope.
 * Caller must be a session member.
 *
 * @param {string} sessionId — Session UUID
 * @param {number} userId    — req.user.userId
 * @returns {{ session: Array, personal: Array, ai: Array }}
 */
export async function listTodos(sessionId, userId) {
  const [session] = await sql`
    SELECT id FROM sessions
    WHERE  id = ${sessionId} AND ended_at IS NULL
  `
  if (!session) throw new NotFound('Session not found or already ended')

  const member = await isMember(sessionId, userId)
  if (!member) throw new Forbidden('You are not a member of this session')

  const rows = await sql`
    SELECT id, text, done, scope, immutable, position, owner_id
    FROM   todos
    WHERE  session_id = ${sessionId}
    ORDER  BY position ASC
  `

  const grouped = { session: [], personal: [], ai: [] }
  for (const r of rows) {
    grouped[r.scope].push(formatTodo(r))
  }
  return grouped
}

/**
 * Creates a new todo in an active session.
 * scope='session' requires the caller to be the admin.
 * scope='personal' is allowed for any member; owner_id is set to userId.
 * scope='ai' is rejected by the route's Zod schema before reaching here.
 *
 * Position is computed as the current count of todos in the same scope bucket,
 * giving sequential 0-based ordering within each scope.
 *
 * Emits todo:created to session:{sessionId} after the DB write.
 *
 * @param {string} sessionId
 * @param {number} userId
 * @param {{ text: string, scope: 'session'|'personal' }} data
 * @returns {object} The created todo row.
 */
export async function createTodo(sessionId, userId, { text, scope }) {
  const [session] = await sql`
    SELECT id, admin_id FROM sessions
    WHERE  id = ${sessionId} AND ended_at IS NULL
  `
  if (!session) throw new NotFound('Session not found or already ended')

  const member = await isMember(sessionId, userId)
  if (!member) throw new Forbidden('You are not a member of this session')

  if (scope === 'session' && Number(session.admin_id) !== userId) {
    throw new Forbidden('Only the session admin can create session-scoped todos')
  }

  // owner_id: NULL for session scope (session-wide); userId for personal.
  const ownerId = scope === 'personal' ? userId : null

  // Count existing todos in the same scope bucket for stable sequential position.
  // COUNT(*) returns BIGINT — cast with Number().
  const [countRow] = await sql`
    SELECT COUNT(*) AS count
    FROM   todos
    WHERE  session_id = ${sessionId} AND scope = ${scope}
  `
  const position = Number(countRow.count)

  const [row] = await sql`
    INSERT INTO todos (session_id, owner_id, scope, text, done, immutable, position)
    VALUES            (${sessionId}, ${ownerId}, ${scope}, ${text}, FALSE, FALSE, ${position})
    RETURNING id, text, done, scope, immutable, position, owner_id
  `

  const todo = formatTodo(row)
  safeEmit(`session:${sessionId}`, 'todo:created', { todo })
  return todo
}

/**
 * Updates an existing todo. Authorization rules vary by scope:
 *
 *   scope='ai' or immutable=true
 *     — any member may toggle done; text is silently ignored.
 *   scope='session'
 *     — admin may update done and text; non-admin member may update done only
 *       (text is silently ignored, not an error).
 *   scope='personal'
 *     — only the owner (owner_id) may update anything.
 *
 * Emits todo:updated only when at least one column was actually written.
 * If the effective update set is empty (e.g. non-admin sent text only for a
 * session todo), the current state is returned without a DB write or emit.
 *
 * @param {string} sessionId
 * @param {string} todoId
 * @param {number} userId
 * @param {{ done?: boolean, text?: string }} data
 * @returns {object} The current todo state (updated or unchanged).
 */
export async function updateTodo(sessionId, todoId, userId, data) {
  const [session] = await sql`
    SELECT id, admin_id FROM sessions
    WHERE  id = ${sessionId} AND ended_at IS NULL
  `
  if (!session) throw new NotFound('Session not found or already ended')

  // todo must belong to this exact session (prevents cross-session access).
  const [existing] = await sql`
    SELECT id, text, done, scope, immutable, position, owner_id
    FROM   todos
    WHERE  id          = ${todoId}
      AND  session_id  = ${sessionId}
  `
  if (!existing) throw new NotFound('Todo not found')

  const update = {}

  if (existing.scope === 'ai' || existing.immutable) {
    // Immutable todos: any member may toggle done; text is silently discarded.
    const member = await isMember(sessionId, userId)
    if (!member) throw new Forbidden('You are not a member of this session')
    if (data.done !== undefined) update.done = data.done
    // data.text silently ignored

  } else if (existing.scope === 'session') {
    // Session todos: all members may toggle done; only admin may change text.
    const member = await isMember(sessionId, userId)
    if (!member) throw new Forbidden('You are not a member of this session')
    const isAdmin = Number(session.admin_id) === userId
    if (data.done !== undefined) update.done = data.done
    if (data.text !== undefined && isAdmin) update.text = data.text
    // non-admin text silently ignored

  } else {
    // Personal todos: owner only.
    if (Number(existing.owner_id) !== userId) {
      throw new Forbidden('Only the todo owner can update it')
    }
    if (data.done !== undefined) update.done = data.done
    if (data.text !== undefined) update.text = data.text
  }

  // Only hit the DB if there is something to write.
  if (Object.keys(update).length > 0) {
    const [updatedRow] = await sql`
      UPDATE todos
      SET    ${sql(update)}
      WHERE  id = ${todoId}
      RETURNING id, text, done, scope, immutable, position, owner_id
    `
    const todo = formatTodo(updatedRow)
    safeEmit(`session:${sessionId}`, 'todo:updated', { todo })
    return todo
  }

  // Nothing changed — return current state (no emit).
  return formatTodo(existing)
}

/**
 * Deletes a todo. Authorization rules:
 *   scope='ai'       — always 403 (immutable).
 *   scope='session'  — admin only.
 *   scope='personal' — owner only.
 *
 * Emits todo:deleted after the DB delete.
 *
 * @param {string} sessionId
 * @param {string} todoId
 * @param {number} userId
 */
export async function deleteTodo(sessionId, todoId, userId) {
  const [session] = await sql`
    SELECT id, admin_id FROM sessions
    WHERE  id = ${sessionId} AND ended_at IS NULL
  `
  if (!session) throw new NotFound('Session not found or already ended')

  const [existing] = await sql`
    SELECT id, scope, owner_id
    FROM   todos
    WHERE  id         = ${todoId}
      AND  session_id = ${sessionId}
  `
  if (!existing) throw new NotFound('Todo not found')

  if (existing.scope === 'ai') {
    throw new Forbidden('AI-generated todos cannot be deleted')
  } else if (existing.scope === 'session') {
    if (Number(session.admin_id) !== userId) {
      throw new Forbidden('Only the session admin can delete session todos')
    }
  } else {
    // personal
    if (Number(existing.owner_id) !== userId) {
      throw new Forbidden('Only the todo owner can delete it')
    }
  }

  await sql`DELETE FROM todos WHERE id = ${todoId}`
  safeEmit(`session:${sessionId}`, 'todo:deleted', { todoId })
}
