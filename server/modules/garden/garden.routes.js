// server/modules/garden/garden.routes.js
// Express router for the garden module.
//
// Mounted at /api/garden in app.js:
//   GET /api/garden — return the authenticated user's flower history and count
//
// No request body, no query params, no :id param.
// The caller always sees only their own garden — user identity comes from
// req.user.userId (the JWT payload), never from a URL parameter.
//
// Spec reference: BACKEND_SPEC §11, §13.7

import { Router } from 'express'

import * as gardenService from './garden.service.js'
import { requireAuth }   from '../../shared/auth.middleware.js'

const router = Router()

/**
 * GET /api/garden
 * Returns the authenticated user's flowers_count and full garden_flowers
 * history, newest flower first.
 *
 * Response 200:
 * {
 *   "flowers_count": 7,
 *   "history": [
 *     {
 *       "id":          "uuid",
 *       "topic":       "Math finals",
 *       "bloom_level": 0.95,
 *       "outcome":     "success",
 *       "ended_at":    "2026-05-20T14:00:00.000Z",
 *       "session_id":  "uuid"
 *     }
 *   ]
 * }
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const data = await gardenService.getGarden(req.user.userId)
    res.json(data)
  } catch (err) {
    next(err)
  }
})

export default router
