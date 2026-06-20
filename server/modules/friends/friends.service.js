// server/modules/friends/friends.service.js
// Business logic for the friend list.
//
// Strategy (interim): all users with role = 'bot' are returned as every
// authenticated user's friend list. There is no friendship graph table in this
// version — bot users serve as simulated friends seeded in the Step 1 migration.
//
// Long-term design note (BACKEND_SPEC §8.4): a friendships table with
// (user_id, friend_id, status) is the correct permanent design. Do not
// implement that table here — this module intentionally stays simple until the
// friendship graph is needed.

import sql from '../../shared/db.js'

// ── Public service functions ───────────────────────────────────────────────────

/**
 * Returns all bot users as the caller's simulated friend list.
 * The result is the same for every authenticated user (no per-user filtering).
 *
 * @returns {Array<{ id: number, username: string, avatar_url: string|null }>}
 */
export async function getFriends() {
  const rows = await sql`
    SELECT   id, username, avatar_url
    FROM     users
    WHERE    role = 'bot'
    ORDER BY username
  `
  return rows
}
