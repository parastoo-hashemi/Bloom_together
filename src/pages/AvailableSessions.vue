<script setup>
import { computed, ref, onMounted } from "vue"
import { useRouter } from "vue-router"

import { useUserStore } from "@/stores/user"
import { useSessionStore } from "@/stores/session"

import Header from "../components/main/Header.vue"
import NavBar from "../components/main/NavBar.vue"
import SessionCard from "../components/AvailableSessions/SessionCard.vue"
import FilterBar from "../components/AvailableSessions/FilterBar.vue"
import ConfirmStartModal from "@/components/HostSession/ConfirmStartModal.vue"

const router = useRouter()
const userStore = useUserStore()
const sessionStore = useSessionStore()

// Filter states
const durationFilter = ref('all') // 'all' | '30' | '60' | '120'
const searchQuery = ref('')

// On mount, initialise user store and load sessions from backend
const loading = ref(true)
const errorMsg = ref('')
onMounted(async () => {
  try {
    if (!userStore.currentUser) {
      await userStore.init()
    }
    await sessionStore.fetchSessions()
  } catch (e) {
    console.error(e)
    errorMsg.value = e.message || 'Failed to load sessions'
  } finally {
    loading.value = false
  }
})

// Build an array of sessions for filtering.  Each session object
// contains id, topic, privacy, duration (hours and minutes) and
// onlineCount (number of invited friends plus admin, approximate).  We
// compute endsInMinutes as the remaining time until end (not yet
// available on the backend, so we approximate by duration).
// Build an array of sessions for filtering.  Each session object
// contains id, topic, privacy, duration (hours and minutes) and
// onlineCount (number of invited friends plus admin).  We compute
// endsInMinutes from the session's duration because the backend
// does not provide a remaining time yet.  Note: the session store
// normalises property names (invitedFriendIds instead of invited_ids,
// personalTodos instead of personal_todos) for easier use in the
// frontend.
const allSessions = computed(() => {
  return Object.values(sessionStore.byId).map((s) => {
    const endsInMinutes = (s.duration?.hours ?? 0) * 60 + (s.duration?.minutes ?? 0)
    const onlineCount = 1 + (s.invitedFriendIds?.length ?? 0) // admin + invited
    return {
      id: s.id,
      title: s.topic || 'Session',
      onlineCount,
      endsInMinutes,
      privacy: s.privacy,
    }
  })
})

const filteredSessions = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const min = durationFilter.value === 'all' ? 0 : Number(durationFilter.value)
  return allSessions.value.filter((s) => {
    const okName = !q || s.title.toLowerCase().includes(q)
    const okDur = s.endsInMinutes >= min
    return okName && okDur
  })
})

// Remove the start confirmation modal and directly enter the selected session.
const startModalOpen = ref(false)

function enterSession(id) {
  // Fetch the latest session data from the backend before navigating.
  // This ensures that the session will resume from the correct point.
  sessionStore.fetchSession(id).then(() => {
    router.push({ name: 'session-room', params: { id } })
  }).catch((e) => {
    console.error(e)
    // Optionally display an error message to the user
  })
}

function onStart(settings) {
  // Intentionally left blank.  Previously this function was used by
  // ConfirmStartModal, which is no longer needed for joining sessions.
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <Header title="Available Session" subtitle="Join a co-study room" />
    <main class="mx-auto max-w px-4 pt-16 pb-28">
      <div v-if="errorMsg" class="mb-4 text-red-600 text-sm">
        {{ errorMsg }}
      </div>
      <div v-else-if="loading" class="mb-4 text-black/60 text-sm">Loading sessions...</div>
      <FilterBar v-model:duration="durationFilter" v-model:query="searchQuery" />

      <div class="mt-3 rounded-xl bg-black/5 px-4 py-3 text-xs text-black/70">
        <span class="font-semibold">*</span>
        Warning: You can not join a session with duration less than 30 minutes.
      </div>

      <section class="mt-4 space-y-4">
        <SessionCard
          v-for="s in filteredSessions"
          :key="s.id"
          :title="s.title"
          :online-count="s.onlineCount"
          :ends-in-minutes="s.endsInMinutes"
          :disabled="false"
          @enter="() => enterSession(s.id)"
        />
      </section>

      <div v-if="filteredSessions.length === 0" class="mt-8 text-center text-sm text-black/50">
        No sessions match your filters.
      </div>
    </main>

    <ConfirmStartModal v-model:open="startModalOpen" @start="onStart" />
    <NavBar />
  </div>
</template>
