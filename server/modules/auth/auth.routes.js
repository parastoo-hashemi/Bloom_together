// server/modules/auth/auth.routes.js
// Express router for authentication endpoints.
//
// Mounted at /auth in app.js:
//   POST /auth/register
//   POST /auth/login
//   POST /auth/refresh
//   POST /auth/logout
//   GET  /auth/me

import { Router } from 'express'
import { z }      from 'zod'

import * as authService from './auth.service.js'
import { requireAuth }  from '../../shared/auth.middleware.js'
import { BadRequest, Unauthorized, NotFound } from '../../shared/errors.js'

const router = Router()

// ── Validation schemas ────────────────────────────────────────────────────────

const registerSchema = z.object({
  username: z
    .string()
    .min(3,  'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers and underscores'),
  email:    z.string().email('Invalid email address').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

// ── Cookie helpers ────────────────────────────────────────────────────────────

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure:   process.env.NODE_ENV === 'production',
    path:     '/auth/refresh',
    maxAge:   SEVEN_DAYS_MS,
  })
}

function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    sameSite: 'strict',
    secure:   process.env.NODE_ENV === 'production',
    path:     '/auth/refresh',
  })
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /auth/register
 * Creates a new user account and returns an access token + sets a refresh cookie.
 */
router.post('/register', async (req, res, next) => {
  try {
    const result = registerSchema.safeParse(req.body)
    if (!result.success) {
      return next(new BadRequest(result.error.issues.map(i => i.message).join('; ')))
    }

    const { user, accessToken, refreshToken } = await authService.register(result.data)
    setRefreshCookie(res, refreshToken)
    res.status(201).json({ user, accessToken })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /auth/login
 * Authenticates with username + password. Returns an access token + sets a refresh cookie.
 */
router.post('/login', async (req, res, next) => {
  try {
    const result = loginSchema.safeParse(req.body)
    if (!result.success) {
      return next(new BadRequest(result.error.issues.map(i => i.message).join('; ')))
    }

    const { user, accessToken, refreshToken } = await authService.login(result.data)
    setRefreshCookie(res, refreshToken)
    res.json({ user, accessToken })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /auth/refresh
 * Issues a new access token from the HttpOnly refresh cookie.
 * The refresh cookie path is /auth/refresh so browsers send it only here.
 */
router.post('/refresh', (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken
    if (!token) return next(new Unauthorized('No refresh token'))

    const { accessToken } = authService.refresh(token)
    res.json({ accessToken })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /auth/logout
 * Clears the refresh cookie. No body in response.
 */
router.post('/logout', (_req, res) => {
  clearRefreshCookie(res)
  res.sendStatus(204)
})

/**
 * GET /auth/me
 * Returns the authenticated user's profile.
 * Protected: requires a valid Bearer access token.
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user.userId)
    if (!user) return next(new NotFound('User not found'))
    res.json(user)
  } catch (err) {
    next(err)
  }
})

export default router
