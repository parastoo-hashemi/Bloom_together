// server/modules/invitations/invitations.routes.js
// Express router for invitation lifecycle endpoints.
//
// Mounted at /api/invitations in app.js:
//   GET  /api/invitations             — list pending invitations for caller
//   POST /api/invitations             — create invitation (session admin only)
//   PUT  /api/invitations/:id/accept  — accept invitation (recipient only)
//   PUT  /api/invitations/:id/decline — decline invitation (recipient only)
//
// All routes require authentication. Authorization and ownership checks
// live in invitations.service.js — this file handles input validation only.
//
// Invitation :id params are UUIDs — validated with a regex before the DB is
// touched (prevents postgres 22P02 invalid_text_representation errors).

import { Router } from 'express'
import { z }      from 'zod'

import * as invitationsService  from './invitations.service.js'
import { requireAuth }          from '../../shared/auth.middleware.js'
import { BadRequest, NotFound } from '../../shared/errors.js'

const router = Router()

// ── UUID validation ───────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUUID(value) {
  return typeof value === 'string' && UUID_RE.test(value)
}

// ── Validation schemas ────────────────────────────────────────────────────────

/**
 * POST /api/invitations body.
 * session_id must be a valid UUID; to_id must be a positive integer user ID.
 */
const createSchema = z.object({
  session_id: z.string().uuid('session_id must be a valid UUID'),
  to_id:      z.number().int().positive('to_id must be a positive integer'),
})

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/invitations
 * Returns all pending invitations addressed to the authenticated user.
 *
 * Response: { data: [ { id, session, from, status, created_at } ] }
 *   session: { id, topic, privacy, duration, start_time }
 *   from:    { id, username }
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const data = await invitationsService.listInvitations(req.user.userId)
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/invitations
 * Creates a pending invitation. The caller must be the session admin.
 *
 * Idempotent: if a pending invitation already exists for the same
 * (session_id, to_id) pair, the existing row is returned with HTTP 200
 * rather than inserting a duplicate.
 *
 * Body: { session_id: UUID, to_id: positive integer }
 *
 * Response 201: { id, status: 'pending' }   — new invitation
 * Response 200: { id, status: 'pending' }   — existing invitation returned
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const result = createSchema.safeParse(req.body)
    if (!result.success) {
      return next(new BadRequest(result.error.issues.map(i => i.message).join('; ')))
    }

    const { session_id, to_id } = result.data
    const { id, status, alreadyExisted } = await invitationsService.createInvitation({
      sessionId: session_id,
      toId:      to_id,
      fromId:    req.user.userId,
    })

    res.status(alreadyExisted ? 200 : 201).json({ id, status })
  } catch (err) {
    next(err)
  }
})

/**
 * PUT /api/invitations/:id/accept
 * Accepts a pending invitation. Only the invitation recipient may call this.
 * Adds the recipient to session_members and emits member:joined.
 *
 * Response: { session_id }
 */
router.put('/:id/accept', requireAuth, async (req, res, next) => {
  try {
    if (!isValidUUID(req.params.id)) return next(new NotFound('Invitation not found'))

    const result = await invitationsService.acceptInvitation(req.params.id, req.user.userId)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

/**
 * PUT /api/invitations/:id/decline
 * Declines a pending invitation. Only the invitation recipient may call this.
 * No socket event is emitted.
 *
 * Response: { message: 'Declined' }
 */
router.put('/:id/decline', requireAuth, async (req, res, next) => {
  try {
    if (!isValidUUID(req.params.id)) return next(new NotFound('Invitation not found'))

    const result = await invitationsService.declineInvitation(req.params.id, req.user.userId)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
