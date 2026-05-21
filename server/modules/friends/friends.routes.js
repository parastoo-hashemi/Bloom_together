// server/modules/friends/friends.routes.js
// Express router for the friends list endpoint.
//
// Mounted at /api/friends in app.js:
//   GET /api/friends

import { Router } from 'express'

import * as friendsService from './friends.service.js'
import { requireAuth }     from '../../shared/auth.middleware.js'

const router = Router()

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/friends
 * Returns all bot users as the authenticated user's friend list.
 *
 * Response: { "data": [ { "id": 1, "username": "alice", "avatar_url": "..." } ] }
 *
 * The list is not filtered per user — every authenticated caller sees the same
 * set of bot users. This replaces the hardcoded friend arrays in the prototype
 * frontend (HostSession.vue, SessionRoom.vue).
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const data = await friendsService.getFriends()
    res.json({ data })
  } catch (err) {
    next(err)
  }
})

export default router
