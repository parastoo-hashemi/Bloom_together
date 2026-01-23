import { defineStore } from "pinia"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000"

export const useUserStore = defineStore("user", {
  state: () => ({
    users: [],                 // list of { username, flowers, focus_time, config }
    currentUser: null,         // full user from GET /api/users/:username (includes password in this demo)
    authError: null,
    loading: false,
  }),

  getters: {
    isLoggedIn: (s) => !!s.currentUser,
    username: (s) => s.currentUser?.username ?? null,
  },

  actions: {
    _saveSession(username) {
      localStorage.setItem("bt_username", username)
    },
    _clearSession() {
      localStorage.removeItem("bt_username")
    },

    async fetchUsers() {
      this.loading = true
      this.authError = null
      try {
        const res = await fetch(`${API_BASE}/api/users`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Failed to fetch users")
        this.users = json.data || []
        return this.users
      } finally {
        this.loading = false
      }
    },

    async fetchUser(username) {
      const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(username)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load user")
      return json
    },

    async restoreLogin() {
      const saved = localStorage.getItem("bt_username")
      if (!saved) return null
      try {
        const user = await this.fetchUser(saved)
        this.currentUser = user
        return user
      } catch {
        this._clearSession()
        this.currentUser = null
        return null
      }
    },

    // Demo login: compare password client-side (NOT secure, but ok for class demo)
    async login(username, password) {
      this.authError = null
      this.loading = true
      try {
        const user = await this.fetchUser(username)
        if (String(user.password) !== String(password)) {
          this.authError = "Wrong password"
          this.currentUser = null
          this._clearSession()
          return false
        }
        this.currentUser = user
        this._saveSession(username)
        return true
      } catch (err) {
        this.authError = err?.message || "Login failed"
        this.currentUser = null
        this._clearSession()
        return false
      } finally {
        this.loading = false
      }
    },

    logout() {
      this.currentUser = null
      this.authError = null
      this._clearSession()
    },

    async updateUser(username, patch) {
      const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(username)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to update user")
      return true
    },

    async updateCurrentUser(patch) {
      if (!this.currentUser?.username) throw new Error("No logged-in user")
      const username = this.currentUser.username

      await this.updateUser(username, patch)

      // refresh from backend so state matches DB
      const fresh = await this.fetchUser(username)
      this.currentUser = fresh

      // also refresh users list (so Home page shows updated flowers, etc.)
      await this.fetchUsers()

      return fresh
    },
  },
})
