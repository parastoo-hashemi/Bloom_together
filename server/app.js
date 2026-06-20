// server/app.js
// Express application factory.
//
// Separating app creation from server.listen() keeps the factory testable
// (supertest can import createApp without binding a port).

import express      from 'express'
import cors         from 'cors'
import cookieParser from 'cookie-parser'

import { errorHandler } from './shared/errors.js'
import authRoutes       from './modules/auth/auth.routes.js'
import usersRoutes      from './modules/users/users.routes.js'    // Step 3
import friendsRoutes    from './modules/friends/friends.routes.js' // Step 3
import sessionsRoutes     from './modules/sessions/sessions.routes.js'     // Step 5
import invitationsRoutes from './modules/invitations/invitations.routes.js' // Step 6
import aiRoutes          from './modules/ai/ai.routes.js'              // Step 7

import gardenRoutes       from './modules/garden/garden.routes.js'      // Step 8
import todosRoutes        from './modules/todos/todos.routes.js'         // Step 9

export function createApp() {
  const app = express()

  // ── Global middleware ───────────────────────────────────────────────────────
  app.use(cors({
    origin:      process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    credentials: true,  // required so Set-Cookie headers reach the browser
  }))
  app.use(express.json())
  app.use(cookieParser())

  // ── Routes ─────────────────────────────────────────────────────────────────
  app.use('/auth',        authRoutes)
  app.use('/api/users',    usersRoutes)
  app.use('/api/friends',  friendsRoutes)
  app.use('/api/sessions',     sessionsRoutes)
  app.use('/api/sessions',     aiRoutes)           // Step 7 — POST /:id/ai/generate falls through from sessionsRoutes
  app.use('/api/sessions',     todosRoutes)        // Step 9 — /:id/todos routes fall through from sessionsRoutes
  app.use('/api/invitations',  invitationsRoutes)
  app.use('/api/garden',       gardenRoutes)       // Step 8

  // ── Error handler — must be the very last middleware ───────────────────────
  app.use(errorHandler)

  return app
}
