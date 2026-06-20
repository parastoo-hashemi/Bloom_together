// server/modules/users/users.routes.js
// Express router for user profile endpoints.
//
// Mounted at /api/users in app.js:
//   GET  /api/users/:id   — public profile (any authenticated user)
//   PUT  /api/users/:id   — update own profile only

import { Router } from 'express'
import { z }      from 'zod'

import * as usersService               from './users.service.js'
import { requireAuth }                 from '../../shared/auth.middleware.js'
import { BadRequest, Forbidden, NotFound } from '../../shared/errors.js'

const router = Router()

// ── Validation schema ─────────────────────────────────────────────────────────

// Only avatar_url and focus_minutes are accepted; all other fields are stripped
// by Zod's default strip mode (unknown keys never reach the service layer).
const updateSchema = z.object({
  // Present + valid URL → update. Present + null → clear avatar. Absent → no change.
  avatar_url:    z.string().url('avatar_url must be a valid URL').nullable().optional(),

  // Present → must be a whole number 1–180. Absent → no change.
  focus_minutes: z
    .number()
    .int('focus_minutes must be an integer')
    .min(1,   'focus_minutes must be at least 1')
    .max(180, 'focus_minutes must be at most 180')
    .optional(),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parses the :id route param to a positive integer.
 * Returns null for non-numeric or non-positive strings.
 */
function parseUserId(paramStr) {
  const id = parseInt(paramStr, 10)
  return Number.isInteger(id) && id > 0 ? id : null
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/users/:id
 * Returns the public profile of any user. Any authenticated user may call this.
 *
 * Response: { id, username, avatar_url, flowers_count, focus_minutes }
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseUserId(req.params.id)
    if (!id) return next(new NotFound('User not found'))

    const user = await usersService.getUserById(id)
    if (!user) return next(new NotFound('User not found'))

    res.json(user)
  } catch (err) {
    next(err)
  }
})

/**
 * PUT /api/users/:id
 * Updates the authenticated user's own profile.
 * Callers may only update their own record; attempting to update another user's
 * profile returns 403.
 *
 * Allowed fields: avatar_url, focus_minutes. All other fields are silently ignored.
 *
 * Response: { id, username, avatar_url, flowers_count, focus_minutes }
 */
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseUserId(req.params.id)
    if (!id) return next(new NotFound('User not found'))

    // Ownership check — req.user.userId is the integer from the JWT payload.
    if (req.user.userId !== id) {
      return next(new Forbidden('You may only update your own profile'))
    }

    // Validate and strip. Unknown fields (username, email, role, etc.) are
    // dropped by Zod without throwing an error.
    const result = updateSchema.safeParse(req.body)
    if (!result.success) {
      return next(new BadRequest(result.error.issues.map(i => i.message).join('; ')))
    }

    const user = await usersService.updateUser(id, result.data)
    if (!user) return next(new NotFound('User not found'))

    res.json(user)
  } catch (err) {
    next(err)
  }
})

export default router
