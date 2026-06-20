// server/migrate.js
// CLI entry point — run this once before starting the server for the first time,
// and after pulling changes that include new migration files.
//
// Usage:
//   npm run migrate
//
// The script loads DATABASE_URL from .env via the Node --env-file flag
// (configured in the "migrate" npm script in package.json).

import { runMigrations } from './shared/migrations.js'
import sql               from './shared/db.js'

console.log('Bloom Together — database migrations\n')

let exitCode = 0

try {
  await runMigrations()
  console.log('\nDone.')
} catch (err) {
  console.error('\n✖  Migration failed:', err.message)
  exitCode = 1
} finally {
  // Close the connection pool so the process exits cleanly.
  // timeout: 5 s to allow in-flight queries to finish.
  await sql.end({ timeout: 5 })
}

process.exit(exitCode)
