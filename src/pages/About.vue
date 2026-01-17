<script setup>
import { onMounted } from "vue"
import { useRouter } from "vue-router"
import { useUserStore } from "@/stores/user"
import NavBar from "@/components/main/NavBar.vue"

const router = useRouter()
const userStore = useUserStore()

onMounted(async () => {
  await userStore.restoreLogin()
  if (!userStore.isLoggedIn) router.replace({ name: "home" })
})
</script>

<template>
  <div class="min-h-screen bg-white p-6 pb-24">
    <h1 class="text-2xl font-bold mb-2">About</h1>
    <p class="text-sm text-black/60 mb-6">
      Bloom Together — University demo app.
    </p>

    <div class="border rounded-xl p-4">
      <p class="text-sm">
        Current user: <b>{{ userStore.username }}</b>
      </p>
    </div>

    <NavBar />
  </div>
</template>
