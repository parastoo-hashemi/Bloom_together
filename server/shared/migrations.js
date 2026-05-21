// server/shared/migrations.js
// Applies pending SQL migration files and seeds the five bot users.
//
// Usage (from server.js on startup):
//   import { runMigrations } from './shared/migrations.js'
//   await runMigrations()

import { readdir, readFile } from 'node:fs/promises'
import { dirname, join }     from 'node:path'
import { fileURLToPath }     from 'node:url'

import bcrypt from 'bcryptjs'
import sql    from './db.js'

// ─── Constants ────────────────────────────────────────────────────────────────

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',   // server/
  '..',   // project root
  'migrations'
)

// Bot users replace the hardcoded friend arrays in the prototype.
// They carry role = 'bot' and never authenticate — their password_hash is a
// placeholder that cannot be reverse-engineered into a usable password.
const BOT_USERS = [
  { username: 'alice', avatar_url: 'https://i.pravatar.cc/64?img=1'  },
  { username: 'bob',   avatar_url: 'https://i.pravatar.cc/64?img=3'  },
  { username: 'carol', avatar_url: 'https://i.pravatar.cc/64?img=5'  },
  { username: 'dan',   avatar_url: 'https://i.pravatar.cc/64?img=8'  },
  { username: 'eve',   avatar_url: 'https://i.pravatar.cc/64?img=9'  },
]

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Ensures the migration-tracking table exists.
 * This is the very first SQL statement that runs, so it cannot be inside a
 * migration file (the runner needs the table to decide what to run).
 */
async function ensureTrackingTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename   TEXT        PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}

/**
 * Returns the sorted list of *.sql filenames inside MIGRATIONS_DIR.
 * Alphabetical order is the correct application order (001 before 002, etc.).
 */
async function pendingMigrationFiles() {
  const all = await readdir(MIGRATIONS_DIR)
  return all.filter(f => f.endsWith('.sql')).sort()
}

/**
 * Applies a single migration file inside a transaction.
 * The migration SQL and the tracking-table INSERT share the same transaction,
 * so a partial failure leaves no trace — re-running will retry cleanly.
 */
async function applyMigration(filename) {
  const sqlText = await readFile(join(MIGRATIONS_DIR, filename), 'utf8')

  await sql.begin(async tx => {
    await tx.unsafe(sqlText)
    await tx`INSERT INTO _migrations (filename) VALUES (${filename})`
  })
}

/**
 * Seeds the five bot users on first boot.
 *
 * The count check avoids the bcrypt computation on every subsequent startup
 * (bcrypt at cost 12 takes ~300 ms — noticeable during frequent dev restarts).
 * The INSERT still uses ON CONFLICT DO NOTHING as a safety net in case the
 * count is stale (e.g. only some bots were seeded due to a previous failure).
 */
async function seedBotUsers() {
  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count FROM users WHERE role = 'bot'
  `

  if (count >= BOT_USERS.length) {
    console.log('  skip  bot users (already seeded)')
    return
  }

  // Bots all share one placeholder hash — computing it once is sufficient.
  const placeholderHash = await bcrypt.hash('bot-account-never-used', 12)

  for (const bot of BOT_USERS) {
    await sql`
      INSERT INTO users (username, password_hash, role, avatar_url)
      VALUES (${bot.username}, ${placeholderHash}, 'bot', ${bot.avatar_url})
      ON CONFLICT (username) DO NOTHING
    `
  }

  console.log('  seed  bot users — 5 rows inserted')
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Runs all pending migration files in alphabetical order, then seeds bot users.
 *
 * Called once at process startup (in server.js and in server/migrate.js).
 * Safe to call multiple times — already-applied migrations are skipped.
 *
 * Throws on any SQL error so the process fails fast rather than starting with
 * a broken schema.
 */
export async function runMigrations() {
  await ensureTrackingTable()

  const files = await pendingMigrationFiles()

  for (const filename of files) {
    const [applied] = await sql`
      SELECT 1 FROM _migrations WHERE filename = ${filename}
    `

    if (applied) {
      console.log(`  skip  ${filename}`)
      continue
    }

    await applyMigration(filename)
    console.log(`  apply ${filename}`)
  }

  await seedBotUsers()
}
