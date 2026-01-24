<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(true)
const errorMsg = ref('')

onMounted(async () => {
  try {
    // Initialize the user store (loads mario and friends)
    await userStore.init()
    // After successful init, redirect directly to the Host Session page
    router.replace({ name: 'host' })
  } catch (e) {
    console.error(e)
    errorMsg.value = e.message || 'Failed to initialize user'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-white flex items-center justify-center p-6">
    <div class="w-full max-w-md rounded-2xl border p-6 shadow-sm">
      <h1 class="text-2xl font-bold mb-4">Bloom Together</h1>
      <p class="text-sm text-black/60 mb-6">
        Initializing application...
      </p>
      <div v-if="loading" class="text-sm text-black/60">Loading user data...</div>
      <div v-else-if="errorMsg" class="text-sm text-red-600">{{ errorMsg }}</div>
      <div v-else class="text-sm text-black/60">Redirecting...</div>
    </div>
  </div>
</template>
