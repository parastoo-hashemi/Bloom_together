<script setup>
import { onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { useUserStore } from "@/stores/user"

const router = useRouter()
const userStore = useUserStore()

const selectedUsername = ref("")
const password = ref("")
const msg = ref("")

onMounted(async () => {
  msg.value = ""
  await userStore.fetchUsers()
  await userStore.restoreLogin()

  if (userStore.isLoggedIn) {
    router.push({ name: "host" })
    return
  }

  if (userStore.users.length > 0) {
    selectedUsername.value = userStore.users[0].username
  }
})

const selectedUserMeta = () => {
  return userStore.users.find(u => u.username === selectedUsername.value) || null
}

async function doLogin() {
  msg.value = ""
  const ok = await userStore.login(selectedUsername.value, password.value)
  if (!ok) {
    msg.value = userStore.authError || "Login failed"
    return
  }
  router.push({ name: "host" })
}
</script>

<template>
  <div class="min-h-screen bg-white flex items-center justify-center p-6">
    <div class="w-full max-w-md rounded-2xl border p-6 shadow-sm">
      <h1 class="text-2xl font-bold mb-2">Bloom Together</h1>
      <p class="text-sm text-black/60 mb-6">
        Demo login (users loaded from backend + SQLite).
      </p>

      <label class="block text-sm font-medium mb-1">User</label>
      <select
        v-model="selectedUsername"
        class="w-full rounded-xl border px-3 py-2 mb-2"
      >
        <option
          v-for="u in userStore.users"
          :key="u.username"
          :value="u.username"
        >
          {{ u.username }}
        </option>
      </select>

      <div v-if="selectedUserMeta()" class="text-xs text-black/60 mb-4">
        flowers: {{ selectedUserMeta().flowers }} • default focus: {{ selectedUserMeta().focus_time }} min
      </div>

      <label class="block text-sm font-medium mb-1">Password</label>
      <input
        v-model="password"
        type="password"
        class="w-full rounded-xl border px-3 py-2 mb-4"
        placeholder="Enter password"
      />

      <button
        class="w-full rounded-2xl bg-black py-3 text-sm font-semibold text-white disabled:opacity-50"
        :disabled="userStore.loading || !selectedUsername || !password"
        @click="doLogin"
      >
        {{ userStore.loading ? "Logging in..." : "Login" }}
      </button>

      <p v-if="msg" class="mt-3 text-sm text-red-600">{{ msg }}</p>
    </div>
  </div>
</template>
