// server/modules/users/users.service.js
// Business logic for user profile retrieval and update.
//
// Table ownership: this module reads and updates the users table for
// public-facing profile fields only.
//
// Fields this module NEVER returns: email, password_hash, role, created_at.
// Those are either private (password_hash) or internal (role).

import sql from '../../shared/db.js'

// ── Public service functions ───────────────────────────────────────────────────

/**
 * Returns a user's public profile by numeric ID.
 *
 * @param {number} id
 * @returns {object|null} Public profile or null if not found.
 */
export async function getUserById(id) {
  const [user] = await sql`
    SELECT id, username, avatar_url, flowers_count, focus_minutes
    FROM   users
    WHERE  id = ${id}
  `
  return user ?? null
}

/**
 * Updates the authenticated user's own profile.
 * Only avatar_url and focus_minutes are updated; callers must pre-validate
 * and strip all other fields before calling this function.
 *
 * Passing an empty patch (no valid fields) returns the current profile
 * unchanged without issuing a database write.
 *
 * @param {number} id
 * @param {{ avatar_url?: string|null, focus_minutes?: number }} patch
 *   Object containing only the fields to update (validated and stripped by the route).
 * @returns {object|null} Updated public profile, or null if user not found.
 */
export async function updateUser(id, patch) {
  // Build the update object from only the permitted fields that were supplied.
  const update = {}
  if (patch.avatar_url    !== undefined) update.avatar_url    = patch.avatar_url
  if (patch.focus_minutes !== undefined) update.focus_minutes = patch.focus_minutes

  // Nothing to update — return the current profile without a DB write.
  if (Object.keys(update).length === 0) {
    return getUserById(id)
  }

  // postgres.js interpolates a plain object as  column = value, ...  in a SET clause.
  const [user] = await sql`
    UPDATE users
    SET    ${sql(update)}
    WHERE  id = ${id}
    RETURNING id, username, avatar_url, flowers_count, focus_minutes
  `
  // RETURNING returns the updated row; null means the user was deleted mid-request.
  return user ?? null
}
