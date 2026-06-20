// server/server.js
// HTTP + Socket.IO entry point.
//
// Startup order (order matters — do not rearrange):
//   1. Run DB migrations   — schema must be ready before any request is served
//   2. Create Express app  — pure function, no side effects
//   3. Create HTTP server  — wraps the Express app
//   4. Attach Socket.IO    — must bind to the HTTP server, not the Express app
//   5. JWT handshake       — io.use() must run before io.on('connection')
//   6. Connection handler  — auto-joins user:{id} personal room
//   7. Module socket regs  — each module registers its own event handlers
//   8. Listen             — only after everything above is wired up
//
// Development:
//   npm run server:dev      (node --env-file=.env --watch server/server.js)

import http from 'node:http'
import jwt  from 'jsonwebtoken'

import { runMigrations }          from './shared/migrations.js'
import { createApp }              from './app.js'
import { initSocket }             from './shared/socket.js'
import { registerSessionSockets } from './modules/sessions/sessions.socket.js'
import { registerTodoSockets }    from './modules/todos/todos.socket.js'

// JWT error names that represent expected auth failures on the socket handshake.
// Mirrors the same set used in shared/auth.middleware.js for the HTTP layer.
const JWT_ERROR_NAMES = new Set(['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'])

// Step 1 — Run migrations before accepting any request.
// Throws on failure — deliberate: a broken schema should stop the process.
await runMigrations()

// Steps 2–4 — Express → HTTP → Socket.IO
const app    = createApp()
const server = http.createServer(app)
const io     = initSocket(server)

// Step 5 — Socket.IO JWT handshake middleware.
// Runs before every connection event. Sockets that fail are rejected here;
// no event handler ever sees an unauthenticated socket.
//
// The client must pass the short-lived access token (not the refresh token):
//   socket = io('http://localhost:3001', { auth: { token: accessToken } })
io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) return next(new Error('No token'))
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch (err) {
    if (!JWT_ERROR_NAMES.has(err.name)) {
      console.error('[socket] JWT verify unexpected error:', err)
    }
    next(new Error('Invalid token'))
  }
})

// Step 6 — Connection handler.
// Runs for every socket that passes the handshake.
// Joins the socket to its personal room immediately so invitation:received
// events (Step 6+) and any other per-user pushes reach all open tabs.
io.on('connection', (socket) => {
  socket.join(`user:${socket.user.userId}`)
})

// Step 7 — Register module-level socket handlers.
// Each registration function calls io.on('connection', ...) internally.
// Multiple connection listeners are supported and intentional.
//
// Future steps will add to this list:
//   registerInvitationSockets(io)  — Step 6
registerSessionSockets(io)
registerTodoSockets(io)

// Step 8 — Start listening.
const PORT = process.env.PORT ?? 3001
server.listen(PORT, () => {
  console.log(`\nServer listening on http://localhost:${PORT}`)
})
