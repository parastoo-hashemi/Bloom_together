// server/shared/socket.js
// Socket.IO server singleton.
//
// Usage:
//   server.js (entry point):
//     const io = initSocket(httpServer)
//
//   Any service that needs to emit after a DB write:
//     import { getIO } from '../shared/socket.js'
//     getIO().to(`session:${sessionId}`).emit('todo:created', { todo })
//
// getIO() throws if called before initSocket() — this catches wiring mistakes
// during development rather than silently emitting to nothing.

import { Server } from 'socket.io'

let _io = null

/**
 * Creates and stores the Socket.IO server instance.
 * Must be called exactly once in server.js, after http.createServer().
 *
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
export function initSocket(httpServer) {
  _io = new Server(httpServer, {
    cors: {
      origin:      process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
      credentials: true,
    },
  })
  return _io
}

/**
 * Returns the Socket.IO server instance.
 * Call from service functions to emit events after database writes.
 *
 * @returns {import('socket.io').Server}
 * @throws {Error} if initSocket() has not been called yet
 */
export function getIO() {
  if (!_io) throw new Error('Socket.IO not initialised — call initSocket() first')
  return _io
}
