// server/modules/ai/ai.service.js
// Business logic for AI study task generation.
//
// Static/mock only — no external API is called.
// ANTHROPIC_API_KEY is not required and is never read.
//
// Cross-module calls (both are architecture-sanctioned patterns):
//   createAITodos()   → todos.service   (sole writer to todos table)
//   markAIGenerated() → sessions.service (sole writer to sessions table)
//
// Socket events emitted:
//   ai:ready → session:{id}   after all DB writes commit
//
// BIGINT handling: admin_id is a BIGINT column — cast with Number() before
// comparing to req.user.userId (which is already a JS number from the JWT).

import sql                from '../../shared/db.js'
import { getIO }          from '../../shared/socket.js'
import { BadRequest, Forbidden, NotFound } from '../../shared/errors.js'
import { createAITodos }  from '../todos/todos.service.js'
import { markAIGenerated } from '../sessions/sessions.service.js'
import { buildStaticTasks } from './ai.prompts.js'

// ── Socket helper ─────────────────────────────────────────────────────────────

/**
 * Emits a Socket.IO event without throwing if the server is not yet
 * initialised (e.g. during supertest integration tests that call createApp()
 * without a running Socket.IO server).
 *
 * Must always be called AFTER the relevant DB writes have committed.
 */
function safeEmit(room, event, payload) {
  try {
    getIO().to(room).emit(event, payload)
  } catch (err) {
    console.error(`[ai.service] socket emit failed (${event}):`, err.message)
  }
}

// ── Public service functions ───────────────────────────────────────────────────

/**
 * Generates five static study todos for a session and marks it as AI-generated.
 *
 * Steps (in order):
 *   1. Fetch session — 404 if absent or already ended.
 *   2. Verify caller is the session admin — 403 otherwise.
 *   3. Guard against double generation — 400 if ai_generated already TRUE.
 *   4. Build five task strings from local templates (topic-aware, no external API).
 *   5. Insert todos via todos.service.createAITodos() — never write to todos directly.
 *   6. Update sessions via sessions.service.markAIGenerated() — never write to sessions directly.
 *   7. Emit ai:ready to session:{id} via safeEmit.
 *   8. Return { todos }.
 *
 * @param {{ sessionId: string, note: string, adminId: number }} opts
 * @returns {{ todos: Array<{ id: string, text: string, done: boolean, scope: string, immutable: boolean }> }}
 */
export async function generateAI({ sessionId, note, adminId }) {
  // 1. Fetch session — must be active (ended_at IS NULL)
  const [session] = await sql`
    SELECT id, admin_id, topic, ai_generated
    FROM   sessions
    WHERE  id = ${sessionId} AND ended_at IS NULL
  `
  if (!session) throw new NotFound('Session not found')

  // 2. Admin-only — BIGINT admin_id cast with Number() before comparison
  if (Number(session.admin_id) !== adminId) {
    throw new Forbidden('Only the session admin can generate AI tasks')
  }

  // 3. Idempotency guard — prevents a second call from inserting duplicate AI todos
  if (session.ai_generated) {
    throw new BadRequest('AI tasks have already been generated for this session')
  }

  // 4. Build static task texts — deterministic, local, topic-personalised
  const taskTexts = buildStaticTasks(session.topic, note)

  // 5. Insert todos (via todos.service — never write to todos table directly)
  const todos = await createAITodos(sessionId, taskTexts)

  // 6. Mark session as AI-generated (via sessions.service — never write to sessions directly)
  await markAIGenerated(sessionId)

  // 7. Emit after all DB writes commit — safeEmit so HTTP never fails if Socket.IO unavailable
  //    Payload {} signals clients to re-fetch todos (BACKEND_SPEC §12.4)
  safeEmit(`session:${sessionId}`, 'ai:ready', {})

  return { todos }
}
