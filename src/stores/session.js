import { defineStore } from "pinia"

export const useSessionStore = defineStore("session", {
  state: () => ({
    byId: {}, // { [id]: sessionPayload }
  }),

  actions: {
    createSession(payload) {
      const id = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now())

      // Ensure required fields exist (prevents undefined bugs)
      this.byId[id] = {
        id,
        privacy: payload.privacy ?? "public",
        topic: payload.topic ?? "",
        duration: payload.duration ?? { hours: 0, minutes: 0 },
        invitedFriendIds: payload.invitedFriendIds ?? [],

        // Separate scopes
        todos: payload.todos ?? [],                // session todos (shared)
        personalTodos: payload.personalTodos ?? [],// individual todos

        settings: payload.settings ?? {},
        createdAt: payload.createdAt ?? Date.now(),
      }

      return id
    },

    getSession(id) {
      return this.byId[id] ?? null
    },

    clearSession(id) {
      if (this.byId[id]) delete this.byId[id]
    },

    updateSession(id, patch) {
      const s = this.byId[id]
      if (!s) return
      this.byId[id] = { ...s, ...patch }
    },

    // Convenience wrappers (optional but clean)
    updateInvitedFriendIds(id, invitedFriendIds) {
      this.updateSession(id, { invitedFriendIds })
    },

    updateTodos(id, todos) {
      this.updateSession(id, { todos })
    },

    updatePersonalTodos(id, personalTodos) {
      this.updateSession(id, { personalTodos })
    },
  },
})
