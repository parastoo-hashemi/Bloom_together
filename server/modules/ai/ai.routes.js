// server/modules/ai/ai.routes.js
// Express router for AI task generation.
//
// Mounted at /api/sessions in app.js (alongside sessions.routes.js):
//   POST /api/sessions/:id/ai/generate — generate static AI todos (admin only)
//
// Routing note: Express tries sessionsRoutes first for /api/sessions/* requests.
// POST /:id/ai/generate matches no route in sessionsRoutes, so Express falls
// through to this router automatically — no conflict.
//
// Request: application/json only.
//   No multipart/form-data. No file uploads. No external AI API.
//
// Authorization: requireAuth (route) + admin check (ai.service).
// Session :id params are UUIDs — validated with a regex before the DB is touched
// (prevents postgres 22P02 invalid_text_representation errors).
//
// Spec reference: BACKEND_SPEC §10, §13.6

import { Router } from 'express'
import { z }      from 'zod'

import * as aiService          from './ai.service.js'
import { requireAuth }         from '../../shared/auth.middleware.js'
import { BadRequest, NotFound } from '../../shared/errors.js'

const router = Router()

// ── UUID validation ───────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUUID(value) {
  return typeof value === 'string' && UUID_RE.test(value)
}

// ── Validation schema ─────────────────────────────────────────────────────────

/**
 * POST /api/sessions/:id/ai/generate body.
 * note is optional — lightly personalises static task templates via session topic.
 * Capped at 2000 chars; truncation beyond that is the caller's responsibility.
 */
const generateSchema = z.object({
  note: z.string().max(2000, 'note must be 2000 characters or fewer').default(''),
})

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/sessions/:id/ai/generate
 * Generates five static study todos for the session. Admin only.
 *
 * Idempotency: returns 400 if ai_generated is already TRUE for this session.
 *
 * Body:     { note?: string }   (application/json, all fields optional)
 * Response: { todos: [ { id, text, done, scope, immutable } ] }
 *
 * Errors:
 *   400 — invalid note / ai already generated
 *   403 — caller is not the session admin
 *   404 — session not found or already ended
 */
router.post('/:id/ai/generate', requireAuth, async (req, res, next) => {
  try {
    if (!isValidUUID(req.params.id)) return next(new NotFound('Session not found'))

    const result = generateSchema.safeParse(req.body ?? {})
    if (!result.success) {
      return next(new BadRequest(result.error.issues.map(i => i.message).join('; ')))
    }

    const data = await aiService.generateAI({
      sessionId: req.params.id,
      note:      result.data.note,
      adminId:   req.user.userId,
    })

    res.json(data)
  } catch (err) {
    next(err)
  }
})

export default router
