// server/modules/auth/auth.service.js
// Business logic for user registration, login, token refresh, and profile lookup.
//
// Token helpers (issueAccessToken, issueRefreshToken) are intentionally NOT
// exported — they are private to this module. No other module should issue tokens.

import bcrypt from 'bcryptjs'
import jwt    from 'jsonwebtoken'

import sql from '../../shared/db.js'
import { BadRequest, Forbidden, NotFound, Unauthorized } from '../../shared/errors.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const SALT_ROUNDS       = 12
const ACCESS_TOKEN_TTL  = '15m'
const REFRESH_TOKEN_TTL = '7d'

// Known JWT error names — distinguishes bad/expired tokens from config or runtime errors.
const JWT_ERROR_NAMES   = new Set(['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'])

// ── Private token helpers ─────────────────────────────────────────────────────

function issueAccessToken(user) {
  return jwt.sign(
    { userId: Number(user.id), username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  )
}

function issueRefreshToken(user) {
  return jwt.sign(
    { userId: Number(user.id), username: user.username },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL }
  )
}

// ── Public service functions ───────────────────────────────────────────────────

/**
 * Creates a new user account.
 *
 * @param {{ username: string, email?: string, password: string }} fields
 * @returns {{ user: object, accessToken: string, refreshToken: string }}
 * @throws {BadRequest} if username or email is already taken
 */
export async function register({ username, email, password }) {
  const [existing] = await sql`
    SELECT 1 FROM users WHERE username = ${username}
  `
  if (existing) throw new BadRequest('Username already taken')

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

  let user
  try {
    const rows = await sql`
      INSERT INTO users (username, email, password_hash, role)
      VALUES            (${username}, ${email ?? null}, ${passwordHash}, 'user')
      RETURNING         id, username, email
    `
    user = rows[0]
  } catch (err) {
    // 23505 = unique_violation — the email column has a UNIQUE constraint.
    if (err.code === '23505') throw new BadRequest('Email already in use')
    throw err
  }

  return {
    user,
    accessToken:  issueAccessToken(user),
    refreshToken: issueRefreshToken(user),
  }
}

/**
 * Authenticates a user by username + password.
 *
 * Returns the same 403 for both "user not found" and "wrong password" to
 * prevent username enumeration attacks.
 *
 * @param {{ username: string, password: string }} credentials
 * @returns {{ user: object, accessToken: string, refreshToken: string }}
 * @throws {Forbidden} on invalid credentials
 */
export async function login({ username, password }) {
  const [row] = await sql`
    SELECT id, username, avatar_url, password_hash
    FROM   users
    WHERE  username = ${username} AND role = 'user'
  `

  // Resolve the same error for both missing user and wrong password.
  // Evaluate bcrypt regardless of whether the user exists to prevent
  // timing-based enumeration (constant-time comparison via dummy hash).
  const DUMMY_HASH    = '$2b$12$invalidsaltinvalidsaltinvalidsa'
  const hashToCompare = row?.password_hash ?? DUMMY_HASH
  const passwordMatch = await bcrypt.compare(password, hashToCompare)

  if (!row || !passwordMatch) {
    throw new Forbidden('Invalid credentials')
  }

  return {
    user:         { id: row.id, username: row.username, avatar_url: row.avatar_url },
    accessToken:  issueAccessToken(row),
    refreshToken: issueRefreshToken(row),
  }
}

/**
 * Issues a new access token from a valid refresh token.
 * Does not rotate the refresh token (can be added later).
 *
 * @param {string} token — the refresh token from the HttpOnly cookie
 * @returns {{ accessToken: string }}
 * @throws {Unauthorized} if the token is invalid or expired
 */
export function refresh(token) {
  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
    return {
      accessToken: issueAccessToken({ id: payload.userId, username: payload.username }),
    }
  } catch (err) {
    // Swallow only known JWT token errors — let config/runtime errors propagate as 500.
    if (JWT_ERROR_NAMES.has(err.name)) throw new Unauthorized('Refresh token invalid or expired')
    throw err
  }
}

/**
 * Returns a user's public profile by ID.
 *
 * @param {number} id
 * @returns {object|null}
 */
export async function getUserById(id) {
  const [user] = await sql`
    SELECT id, username, email, avatar_url, flowers_count, focus_minutes
    FROM   users
    WHERE  id = ${id}
  `
  return user ?? null
}
