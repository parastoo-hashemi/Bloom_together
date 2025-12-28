<script setup>
import { computed, ref } from "vue"
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

// Mock sessions (replace with API later)
const sessions = ref([
  { id: "a1", title: "Math Session", onlineCount: 7, endsInMinutes: 151 },
  { id: "b2", title: "Physics Session", onlineCount: 3, endsInMinutes: 25 },
  { id: "c3", title: "Chemistry Session", onlineCount: 10, endsInMinutes: 95 },
])

const filteredSessions = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const min = durationFilter.value === "all" ? 0 : Number(durationFilter.value)

  return sessions.value.filter((s) => {
    const okName = !q || s.title.toLowerCase().includes(q)
    const okDur = s.endsInMinutes >= min
    return okName && okDur
  })
})
const startModalOpen = ref(false)
function enterSession(id) {
   startModalOpen.value = true
}

function onStart(settings) {
  // const payload = {
  //   privacy: privacy.value,
  //   duration: { hours: form.value.hours, minutes: form.value.minutes },
  //   topic: form.value.topic,
  //   invitedFriendIds: form.value.selectedFriendIds,
  //   todos: privacy.value === "private" ? form.value.todos : [],
  //   settings,
  //   createdAt: Date.now(),
  // }

  // const id = sessionStore.createSession(payload)
  // router.push({ name: "session-room", params: { id } })
}

</script>
<template>
  <div class="min-h-screen bg-white">
    <Header title="Available Session" subtitle="Join a co-study room" />
    <main class="mx-auto max-w px-4 pt-16 pb-28">
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
          :disabled="s.endsInMinutes < 30"
          @enter="enterSession(s.id)"
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
