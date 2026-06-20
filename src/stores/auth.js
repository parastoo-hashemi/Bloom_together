import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)          // { id, username, avatar_url }
  const accessToken = ref(null)   // short-lived JWT string (kept in memory only)

  const isAuthenticated = computed(() => !!accessToken.value)

  function setAuth(newUser, token) {
    user.value = newUser
    accessToken.value = token
  }

  function clear() {
    user.value = null
    accessToken.value = null
  }

  return { user, accessToken, isAuthenticated, setAuth, clear }
})
