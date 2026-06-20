<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from "vue"
import { useRouter } from "vue-router"

import Header from "../components/main/Header.vue"
import NavBar from "../components/main/NavBar.vue"
import SessionCard from "../components/AvailableSessions/SessionCard.vue"
import FilterBar from "../components/AvailableSessions/FilterBar.vue"
import ConfirmStartModal from "@/components/HostSession/ConfirmStartModal.vue"

const router = useRouter()

// Filter states
const durationFilter = ref("all") // "all" | "30" | "60" | "120"
const searchQuery = ref("")

// Data
const rawSessions = ref([])  // as returned by API
const loading = ref(false)
const error = ref("")

// time ticker (updates remaining minutes without refetching)
const now = ref(Date.now())
let tick = null

async function loadSessions() {
  loading.value = true
  error.value = ""
  try {
    const res = await fetch("http://localhost:3001/api/sessions")
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    rawSessions.value = Array.isArray(json.data) ? json.data : []
  } catch (e) {
    error.value = e?.message || "Failed to load sessions"
    rawSessions.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadSessions()
  tick = setInterval(() => {
    now.value = Date.now()
  }, 10_000) // every 10s is plenty
})

onBeforeUnmount(() => {
  if (tick) clearInterval(tick)
})

// Map API -> UI card model
const sessions = computed(() => {
  return rawSessions.value
    .map((s) => {
      const title = (s.topic || "").trim() || "Session"

      const totalMin =
        Number(s?.duration?.hours ?? 0) * 60 +
        Number(s?.duration?.minutes ?? 0)

      const start = Number(s?.start_time ?? 0)
      const elapsedMin = start
        ? Math.floor((now.value - start) / 60000)
        : 0

      const endsInMinutes = Math.max(0, totalMin - elapsedMin)

      return {
        id: s.id,
        title,
        endsInMinutes,
        onlineCount: Array.isArray(s.invited_ids) ? s.invited_ids.length : 0,
        privacy: s.privacy,
        admin_username: s.admin_username,
      }
    })
    .filter((s) => s.endsInMinutes > 0)
})


// Filtering
const filteredSessions = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const min = durationFilter.value === "all" ? 0 : Number(durationFilter.value)

  return sessions.value.filter((s) => {
    const okName = !q || s.title.toLowerCase().includes(q)
    const okDur = s.endsInMinutes >= min
    return okName && okDur
  })
})

// Enter + modal
const startModalOpen = ref(false)
const selectedSessionId = ref(null)

function enterSession(id) {
  selectedSessionId.value = id
  startModalOpen.value = true
}

function onStart(_settings) {
  // Join the selected session
  if (!selectedSessionId.value) return
  router.push({ name: "session-room", params: { id: selectedSessionId.value } })
}
</script>

<template>
  <div class="min-h-screen bg-[#F7FAF8] text-black">
    <Header title="Available Session" subtitle="Join a co-study room" />

    <main class="mx-auto max-w-screen-md px-4 pb-28 pt-16">
      <FilterBar v-model:duration="durationFilter" v-model:query="searchQuery" />

      <aside class="mt-4 rounded-2xl bg-white px-4 py-3 text-xs text-black/60 shadow-sm ring-1 ring-black/5">
        <span class="font-semibold">*</span>
        Warning: You can not join a session with duration less than 15 minutes.
      </aside>

      <div v-if="loading" class="mt-6 text-sm text-black/50">Loading…</div>
      <div v-else-if="error" class="mt-6 text-sm text-red-600">{{ error }}</div>

      <section v-else class="mt-4 grid gap-3 sm:grid-cols-2">
        <SessionCard
          v-for="s in filteredSessions"
          :key="s.id"
          :title="s.title"
          :online-count="s.onlineCount"
          :ends-in-minutes="s.endsInMinutes"
          
          @enter="enterSession(s.id)"
        />
      </section>
<!-- :disabled="s.endsInMinutes < 15" -->
      <div v-if="!loading && !error && filteredSessions.length === 0" class="mt-8 rounded-2xl bg-white px-6 py-10 text-center text-sm text-black/50 shadow-sm ring-1 ring-black/5">
        No sessions match your filters.
      </div>
    </main>

    <ConfirmStartModal v-model:open="startModalOpen" @start="onStart" />
  </div>
</template>
