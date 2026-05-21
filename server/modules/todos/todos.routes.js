// server/modules/todos/todos.routes.js
// Express router for the todos module.
//
// Mounted at /api/sessions in app.js alongside sessionsRoutes and aiRoutes:
//   GET    /api/sessions/:id/todos           — list grouped todos (member only)
//   POST   /api/sessions/:id/todos           — create a todo
//   PUT    /api/sessions/:id/todos/:todoId   — update a todo
//   DELETE /api/sessions/:id/todos/:todoId   — delete a todo
//
// Route-conflict notes:
//   sessionsRoutes has GET /:id  — matches only /some-uuid, NOT /some-uuid/todos.
//   aiRoutes       has POST /:id/ai/generate — no overlap with /:id/todos.
//   All four paths here are unambiguous; Express falls through cleanly.
//
// Authorization is delegated entirely to todos.service — this file owns
// input validation (Zod) and UUID format guarding only.
//
// Session :id and todo :todoId params are UUIDs — validated with a regex
// before touching the DB to prevent postgres 22P02 errors.
//
// Spec reference: BACKEND_SPEC §12

import { Router } from 'express'
import { z }      from 'zod'

import * as todosService         from './todos.service.js'
import { requireAuth }           from '../../shared/auth.middleware.js'
import { BadRequest, NotFound }  from '../../shared/errors.js'

const router = Router()

// ── UUID validation ───────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUUID(value) {
  return typeof value === 'string' && UUID_RE.test(value)
}

// ── Validation schemas ────────────────────────────────────────────────────────

/**
 * POST /api/sessions/:id/todos body.
 *
 * scope is deliberately limited to 'session' | 'personal'.
 * 'ai' is excluded from the enum so any attempt to create an AI todo via
 * this endpoint is rejected with 400 before reaching the service layer.
 */
const createSchema = z.object({
  text:  z.string().min(1, 'text is required').max(500, 'text must be 500 characters or fewer'),
  scope: z.enum(['session', 'personal']),
})

/**
 * PUT /api/sessions/:id/todos/:todoId body.
 *
 * Both fields are optional individually, but at least one must be present.
 * An empty body {} is rejected with 400 by the refine guard.
 */
const updateSchema = z.object({
  done: z.boolean().optional(),
  text: z.string().min(1, 'text must be at least 1 character').max(500, 'text must be 500 characters or fewer').optional(),
}).refine(
  data => data.done !== undefined || data.text !== undefined,
  { message: 'At least one of done or text must be provided' },
)

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/sessions/:id/todos
 * Returns all todos for the session, grouped by scope.
 * Caller must be an active member of the session.
 *
 * Response 200:
 * {
 *   "session":  [ { id, text, done, scope, immutable, position, owner_id } ],
 *   "personal": [ { id, text, done, scope, immutable, position, owner_id } ],
 *   "ai":       [ { id, text, done, scope, immutable, position, owner_id } ]
 * }
 * All arrays are ordered by position ASC. Each array is present even when empty.
 */
router.get('/:id/todos', requireAuth, async (req, res, next) => {
  try {
    if (!isValidUUID(req.params.id)) return next(new NotFound('Session not found'))

    const data = await todosService.listTodos(req.params.id, req.user.userId)
    res.json(data)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/sessions/:id/todos
 * Creates a new todo in an active session.
 *
 * scope='session'  — admin only; owner_id stored as NULL.
 * scope='personal' — any member; owner_id stored as req.user.userId.
 * scope='ai'       — rejected by Zod with 400.
 *
 * Body:     { text: string (1–500), scope: 'session'|'personal' }
 * Response: 201 { id, text, done, scope, immutable, position, owner_id }
 */
router.post('/:id/todos', requireAuth, async (req, res, next) => {
  try {
    if (!isValidUUID(req.params.id)) return next(new NotFound('Session not found'))

    const result = createSchema.safeParse(req.body ?? {})
    if (!result.success) {
      return next(new BadRequest(result.error.issues.map(i => i.message).join('; ')))
    }

    const todo = await todosService.createTodo(req.params.id, req.user.userId, result.data)
    res.status(201).json(todo)
  } catch (err) {
    next(err)
  }
})

/**
 * PUT /api/sessions/:id/todos/:todoId
 * Updates an existing todo. Authorization rules are scope-dependent:
 *
 *   scope='ai' / immutable=true — any member may toggle done; text ignored.
 *   scope='session'             — admin: done + text; non-admin: done only.
 *   scope='personal'            — owner only: done + text.
 *
 * Body:     { done?: boolean, text?: string (1–500) }
 * Response: 200 { id, text, done, scope, immutable, position, owner_id }
 *
 * Errors:
 *   400 — empty body / validation failure
 *   403 — caller lacks permission for this scope
 *   404 — session not found, ended, or todo not found
 */
router.put('/:id/todos/:todoId', requireAuth, async (req, res, next) => {
  try {
    if (!isValidUUID(req.params.id))     return next(new NotFound('Session not found'))
    if (!isValidUUID(req.params.todoId)) return next(new NotFound('Todo not found'))

    const result = updateSchema.safeParse(req.body ?? {})
    if (!result.success) {
      return next(new BadRequest(result.error.issues.map(i => i.message).join('; ')))
    }

    const todo = await todosService.updateTodo(
      req.params.id,
      req.params.todoId,
      req.user.userId,
      result.data,
    )
    res.json(todo)
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /api/sessions/:id/todos/:todoId
 * Deletes a todo. Authorization rules are scope-dependent:
 *
 *   scope='ai'       — always 403 (immutable).
 *   scope='session'  — admin only.
 *   scope='personal' — owner only.
 *
 * Response: 204 no body.
 *
 * Errors:
 *   403 — caller lacks permission for this scope
 *   404 — session not found, ended, or todo not found
 */
router.delete('/:id/todos/:todoId', requireAuth, async (req, res, next) => {
  try {
    if (!isValidUUID(req.params.id))     return next(new NotFound('Session not found'))
    if (!isValidUUID(req.params.todoId)) return next(new NotFound('Todo not found'))

    await todosService.deleteTodo(req.params.id, req.params.todoId, req.user.userId)
    res.sendStatus(204)
  } catch (err) {
    next(err)
  }
})

export default router
