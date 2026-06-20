<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const router = useRouter()
const authStore = useAuthStore()

const mode = ref('login')   // 'login' | 'register'
const username = ref('')
const password = ref('')
const errorMsg = ref('')
const loading = ref(false)

async function submit() {
  if (loading.value) return
  errorMsg.value = ''
  loading.value = true

  try {
    const endpoint = mode.value === 'login' ? '/auth/login' : '/auth/register'
    const res = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, password: password.value }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Something went wrong')

    authStore.setAuth(data.user, data.accessToken)
    router.replace({ name: 'home' })
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-[#F7FAF8] px-4">
    <div class="w-full max-w-sm">
      <div class="mb-8 text-center">
        <h1 class="text-3xl font-black lowercase tracking-tight text-[#07543B]">bloom</h1>
        <p class="mt-1 text-sm text-black/50">Grow your focus, one session at a time.</p>
      </div>

      <div class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div class="mb-5 flex rounded-xl bg-[#F7FAF8] p-1">
          <button
            type="button"
            class="flex-1 rounded-lg py-2 text-sm font-semibold transition"
            :class="mode === 'login' ? 'bg-white shadow-sm text-black' : 'text-black/50'"
            @click="mode = 'login'; errorMsg = ''"
          >
            Log In
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg py-2 text-sm font-semibold transition"
            :class="mode === 'register' ? 'bg-white shadow-sm text-black' : 'text-black/50'"
            @click="mode = 'register'; errorMsg = ''"
          >
            Register
          </button>
        </div>

        <form @submit.prevent="submit" class="space-y-3">
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-black/40">
              Username
            </label>
            <input
              v-model="username"
              type="text"
              autocomplete="username"
              required
              class="w-full rounded-xl border border-black/10 bg-[#F7FAF8] px-4 py-3 text-sm outline-none focus:border-[#57B884] focus:ring-2 focus:ring-[#57B884]/20"
              placeholder="your_username"
            />
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-black/40">
              Password
            </label>
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              required
              class="w-full rounded-xl border border-black/10 bg-[#F7FAF8] px-4 py-3 text-sm outline-none focus:border-[#57B884] focus:ring-2 focus:ring-[#57B884]/20"
              placeholder="••••••••"
            />
          </div>

          <p v-if="mode === 'register'" class="text-xs text-black/40">
            Password must be at least 8 characters.
          </p>

          <p v-if="errorMsg" class="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
            {{ errorMsg }}
          </p>

          <button
            type="submit"
            :disabled="loading"
            class="mt-1 w-full rounded-xl bg-[#57B884] py-3 text-sm font-bold text-white transition hover:bg-[#469D6F] disabled:opacity-50"
          >
            {{ loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account' }}
          </button>
        </form>
      </div>
    </div>
  </main>
</template>
