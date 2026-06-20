// server/shared/auth.middleware.js
// Reusable Express middleware for JWT authentication.
//
// Apply per-router, never globally:
//   import { requireAuth } from '../../shared/auth.middleware.js'
//   router.get('/me', requireAuth, handler)

import jwt from 'jsonwebtoken'
import { Unauthorized } from './errors.js'

// JWT library error names that represent expected auth failures.
// Any other error name is unexpected and must not be swallowed.
const JWT_ERROR_NAMES = new Set([
  'JsonWebTokenError',
  'TokenExpiredError',
  'NotBeforeError',
])

/**
 * Extracts the Bearer token from the Authorization header.
 * Returns null if the header is absent or malformed.
 */
function extractBearer(req) {
  const header = req.headers.authorization ?? ''
  return header.startsWith('Bearer ') ? header.slice(7) : null
}

// ── Exported middleware ───────────────────────────────────────────────────────

/**
 * requireAuth — protects routes that require a valid access token.
 *
 * On success: attaches `req.user = { userId, username }` and calls next().
 * On failure: calls next(new Unauthorized(...)) → 401 response.
 * On unexpected error: propagates via next(err) → 500 response.
 */
export function requireAuth(req, _res, next) {
  const token = extractBearer(req)
  if (!token) return next(new Unauthorized('No token provided'))

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch (err) {
    if (JWT_ERROR_NAMES.has(err.name)) {
      return next(new Unauthorized('Invalid or expired token'))
    }
    next(err)
  }
}

/**
 * optionalAuth — populates req.user when a valid token is present,
 * but lets the request proceed without one.
 *
 * Used for endpoints where the caller's identity is useful but not required
 * (e.g. listing public sessions with personalized data when logged in).
 */
export function optionalAuth(req, _res, next) {
  const token = extractBearer(req)
  if (!token) return next()

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
  } catch (err) {
    if (!JWT_ERROR_NAMES.has(err.name)) {
      return next(err) // Unexpected — propagate
    }
    // Invalid token: silently ignore, req.user stays undefined
  }
  next()
}
