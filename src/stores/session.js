import { defineStore } from "pinia"

export const useSessionStore = defineStore("session", {
  state: () => ({
    byId: {}, // { [id]: payload }
  }),
  actions: {
    createSession(payload) {
      const id = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now())
      this.byId[id] = { id, ...payload }
      return id
    },
    getSession(id) {
      return this.byId[id] || null
    },
    clearSession(id) {
      delete this.byId[id]
    },
    updateTodos(id, todos) {
  if (!this.byId[id]) return
  this.byId[id] = { ...this.byId[id], todos }
},
    updateInvitedFriendIds(id, invitedFriendIds) {
  if (!this.byId[id]) return
  this.byId[id] = { ...this.byId[id], invitedFriendIds }
},
  },
})
