// server/modules/todos/todos.socket.js
// Socket.IO registration stub for the todos module.
//
// There are NO client → server socket events for todos.
// All todo mutations go through the REST layer:
//   POST   /api/sessions/:id/todos
//   PUT    /api/sessions/:id/todos/:todoId
//   DELETE /api/sessions/:id/todos/:todoId
//
// After each REST mutation succeeds and the DB write is committed,
// todos.service.js emits server → client events via getIO():
//   todo:created  → session:{id}  { todo }
//   todo:updated  → session:{id}  { todo }
//   todo:deleted  → session:{id}  { todoId }
//
// Those getIO() calls are added to todos.service.js in Step 9.
// This file exists now so server.js can import it without error.
//
// Spec reference: BACKEND_SPEC §12.6

/**
 * Registers todos socket handlers.
 * Currently a no-op — emitters live in todos.service.js (Step 9).
 *
 * @param {import('socket.io').Server} _io
 */
export function registerTodoSockets(_io) {
  // No client→server events for todos.
}
