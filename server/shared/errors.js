// server/shared/errors.js
// Unified error hierarchy for the Express application.
//
// Usage in a route or service:
//   import { BadRequest, NotFound } from '../shared/errors.js'
//   throw new NotFound('Session not found')
//
// Usage in app.js (register last):
//   import { errorHandler } from './shared/errors.js'
//   app.use(errorHandler)

// ── Base class ────────────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message)
    this.name        = this.constructor.name
    this.statusCode  = statusCode
  }
}

// ── Derived HTTP error classes ────────────────────────────────────────────────

/** 400 — invalid input, failed validation, duplicate username */
export class BadRequest   extends AppError { constructor(m) { super(m, 400) } }

/** 401 — missing or invalid authentication token */
export class Unauthorized extends AppError { constructor(m) { super(m, 401) } }

/** 403 — authenticated but not permitted (ownership violations, bad credentials) */
export class Forbidden    extends AppError { constructor(m) { super(m, 403) } }

/** 404 — resource does not exist */
export class NotFound     extends AppError { constructor(m) { super(m, 404) } }

// ── Global error handler ──────────────────────────────────────────────────────

/**
 * Returns true when `err` is a raw postgres.js error rather than an AppError.
 *
 * postgres.js attaches a `code` property that matches SQLSTATE format:
 *   - 5-digit numeric codes  e.g. '23505' (unique_violation)
 *   - 5-character mixed codes e.g. '22P02' (invalid_text_representation)
 *
 * AppError subclasses always carry `statusCode`; postgres errors never do.
 * The combination uniquely identifies an uncaught database error.
 */
function isRawPgError(err) {
  return (
    typeof err.code === 'string' &&
    /^[0-9A-Z]{5}$/.test(err.code) &&
    err.statusCode == null
  )
}

/**
 * Express 5-compatible error handler — must be registered LAST in app.js.
 * All route handlers propagate errors via next(error); never call
 * res.status().json() directly inside a catch block.
 *
 * Raw postgres errors are intentionally replaced with a generic message
 * to prevent schema information (table names, constraint names, column names)
 * from leaking to clients. The full error is still logged server-side.
 */
export function errorHandler(err, _req, res, _next) {
  const status = err.statusCode ?? 500

  // Raw postgres errors must not send err.message to clients — it can contain
  // table names, constraint names, and other schema details.
  const message = isRawPgError(err)
    ? 'Internal server error'
    : (err.message ?? 'Internal server error')

  // Log the full error object (including postgres details) for all 500s.
  if (status >= 500) console.error(err)

  res.status(status).json({ error: message })
}
