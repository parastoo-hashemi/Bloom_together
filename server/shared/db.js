// server/shared/db.js
// Shared PostgreSQL connection pool.
//
// Import `sql` wherever you need to run a query:
//
//   import sql from '../shared/db.js'
//
//   const rows = await sql`SELECT * FROM users WHERE id = ${id}`
//
// Never create a second pool. Never import postgres directly in a module file.

import postgres from 'postgres'

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set.\n' +
    'Copy .env.example to .env and fill in your PostgreSQL connection string.'
  )
}

const sql = postgres(process.env.DATABASE_URL, {
  max:             10,  // maximum simultaneous connections in the pool
  idle_timeout:    30,  // close connections idle for more than 30 s
  connect_timeout: 10,  // fail fast if PostgreSQL is unreachable
})

export default sql
