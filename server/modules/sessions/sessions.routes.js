// server/modules/sessions/sessions.routes.js
// Express router for session lifecycle endpoints.
//
// Mounted at /api/sessions in app.js:
//   GET    /api/sessions          — list active sessions (with optional filters)
//   POST   /api/sessions          — create a new session
//   GET    /api/sessions/:id      — get session details
//   PUT    /api/sessions/:id      — update session (admin only)
//   POST   /api/sessions/:id/end  — end session (admin only)
//
// All routes require authentication (requireAuth middleware).
// Session :id params are UUIDs — validated with a regex before reaching the DB.
// Zod schemas strip unknown keys; 'settings' in POST body is accepted but discarded.

import { Router } from 'express'
import { z }      from 'zod'

import * as sessionsService     from './sessions.service.js'
import { requireAuth }          from '../../shared/auth.middleware.js'
import { BadRequest, NotFound } from '../../shared/errors.js'

const router = Router()

// ── UUID validation ───────────────────────────────────────────────────────────

/**
 * Session IDs are UUIDs (not BIGINTs). This regex guards all /:id routes so
 * malformed values never reach the database (prevents postgres 22P02 errors).
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUUID(value) {
  return typeof value === 'string' && UUID_RE.test(value)
}

// ── Validation schemas ────────────────────────────────────────────────────────

/**
 * Shared duration sub-schema used by both create and update.
 * hours: 0–23, minutes: 0–59 (total checked at parent level).
 */
const durationSchema = z.object({
  hours:   z.number().int().min(0).max(23),
  minutes: z.number().int().min(0).max(59),
})

/**
 * GET /api/sessions query params.
 * minMinutes must be coerced — query string values arrive as strings.
 */
const listQuerySchema = z.object({
  privacy:    z.enum(['public', 'private']).optional(),
  minMinutes: z.coerce.number().int().positive().optional(),
})

/**
 * POST /api/sessions body.
 *
 * Refinements:
 *   - Total duration ≥ 1 minute
 *   - Total duration ≤ 1439 minutes (23 h 59 m)
 *
 * 'settings' is accepted and stripped before the service call so unknown
 * clients that send it don't get a 400, but it is never stored.
 */
const createSchema = z.object({
  privacy:     z.enum(['public', 'private']),
  topic:       z.string().min(1, 'Topic is required').max(200, 'Topic must be 200 chars or fewer'),
  duration:    durationSchema,
  invited_ids: z.array(z.number().int().positive()).optional().default([]),
  settings:    z.record(z.unknown()).optional(),
}).refine(
  d => d.duration.hours * 60 + d.duration.minutes >= 1,
  { message: 'Duration must be at least 1 minute', path: ['duration'] },
).refine(
  d => d.duration.hours * 60 + d.duration.minutes <= 1439,
  { message: 'Duration must be at most 23 hours 59 minutes', path: ['duration'] },
)

/**
 * PUT /api/sessions/:id body.
 * All fields optional — send only what needs to change.
 *
 * When duration is supplied the same 1–1439 minute total guards from
 * createSchema apply. When duration is absent the refines are skipped.
 */
const updateSchema = z.object({
  topic:       z.string().min(1).max(200).optional(),
  duration:    durationSchema.optional(),
  invited_ids: z.array(z.number().int().positive()).optional(),
}).refine(
  d => !d.duration || d.duration.hours * 60 + d.duration.minutes >= 1,
  { message: 'Duration must be at least 1 minute', path: ['duration'] },
).refine(
  d => !d.duration || d.duration.hours * 60 + d.duration.minutes <= 1439,
  { message: 'Duration must be at most 23 hours 59 minutes', path: ['duration'] },
)

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/sessions
 * Returns all active sessions (ended_at IS NULL), optionally filtered.
 *
 * Query params:
 *   privacy    — 'public' | 'private'
 *   minMinutes — positive integer (minimum session duration)
 *
 * Response: { data: [ { id, topic, privacy, duration, admin, start_time, member_count } ] }
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const result = listQuerySchema.safeParse(req.query)
    if (!result.success) {
      return next(new BadRequest(result.error.issues.map(i => i.message).join('; ')))
    }

    const sessions = await sessionsService.listSessions(result.data)
    res.json({ data: sessions })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/sessions
 * Creates a new session. The caller becomes the admin and first member.
 * Invited users receive a pending invitation.
 *
 * Body: { privacy, topic, duration: { hours, minutes }, invited_ids?, settings? }
 *
 * 'settings' is silently discarded — it is not stored in the database.
 *
 * Response 201: { id, topic, start_time }
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const result = createSchema.safeParse(req.body)
    if (!result.success) {
      return next(new BadRequest(result.error.issues.map(i => i.message).join('; ')))
    }

    // Destructure settings out — it must never reach the service layer.
    const { settings: _settings, ...fields } = result.data

    const session = await sessionsService.createSession({
      ...fields,
      adminId: req.user.userId,
    })

    res.status(201).json(session)
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/sessions/:id
 * Returns full session details including the members array.
 * Returns 404 if the session does not exist or has already ended.
 *
 * Response: { id, topic, privacy, duration, admin, start_time, ended_at,
 *             ai_generated, quiz_questions, members }
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!isValidUUID(req.params.id)) return next(new NotFound('Session not found'))

    const session = await sessionsService.getSessionById(req.params.id)
    if (!session) return next(new NotFound('Session not found'))

    res.json(session)
  } catch (err) {
    next(err)
  }
})

/**
 * PUT /api/sessions/:id
 * Updates a session's topic, duration, and/or member list.
 * Only the session admin may call this; returns 403 for any other caller.
 *
 * Body: { topic?, duration?: { hours, minutes }, invited_ids? }
 *
 * Response: { message: 'Session updated' }
 */
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!isValidUUID(req.params.id)) return next(new NotFound('Session not found'))

    const result = updateSchema.safeParse(req.body)
    if (!result.success) {
      return next(new BadRequest(result.error.issues.map(i => i.message).join('; ')))
    }

    const response = await sessionsService.updateSession(
      req.params.id,
      result.data,
      req.user.userId,
    )

    res.json(response)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/sessions/:id/end
 * Ends an active session. Computes bloom_level from elapsed/total, determines
 * outcome from todos, creates a garden flower, and emits session:ended.
 * Only the session admin may call this; returns 403 for any other caller.
 *
 * Response: { message: 'Session ended', flower: { bloom_level, outcome } }
 */
router.post('/:id/end', requireAuth, async (req, res, next) => {
  try {
    if (!isValidUUID(req.params.id)) return next(new NotFound('Session not found'))

    const result = await sessionsService.endSession(req.params.id, req.user.userId)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
