<script setup>
import { ref, computed, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"

import { useAuthStore } from "@/stores/auth.js"
import { api } from "@/Api/http.js"
import SessionTimer from "@/components/session/SessionTimer.vue"
import FlowerGrowth from "@/components/session/FlowerGrowth.vue"
import TodoDrawer from "@/components/session/TodoDrawer.vue"
import AddPeopleModal from "@/components/session/AddPeopleModal.vue"
import AddPeopleIcon from "@/components/icons/AddPeopleIcon.vue"
import EndSessionModal from "@/components/session/EndSessionModal.vue"
import FriendsProgressFlowers from "@/components/session/FriendsProgressFlowers.vue"
import { clamp01 } from "@/utils/flowerGrowth"
import { onBeforeRouteLeave } from "vue-router"

const authStore = useAuthStore()

async function ensureToken() {
  if (authStore.accessToken) return
  try {
    const res = await fetch("/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: import.meta.env.VITE_DEV_USERNAME ?? "mario",
        password: import.meta.env.VITE_DEV_PASSWORD ?? "12341234",
      }),
    })
    if (res.ok) {
      const data = await res.json()
      authStore.setAuth(data.user, data.accessToken)
    }
  } catch { /* backend unreachable */ }
}

// ================= ROUTE =================
const route = useRoute()
const router = useRouter()
const sessionId = String(route.params.id)

// ================= FRIENDS (options for AddPeopleModal) =================
// Loaded from GET /api/friends, mapped to { id, name, avatar }
const allUsers = ref([])

// ================= SESSION MEMBERS =================
// Current members from backend: [{ id, username, avatar_url }]
const sessionMembers = ref([])

// Unified lookup: id → { id, name, avatar }
const userInfoById = computed(() => {
  const map = new Map()
  allUsers.value.forEach(u => map.set(u.id, u))
  sessionMembers.value.forEach(u =>
    map.set(u.id, { id: u.id, name: u.username, avatar: u.avatar_url ?? null })
  )
  return map
})

// ================= SESSION =================
const session = ref(null)
const loading = ref(true)

// True when the logged-in user is the session admin
const isAdmin = computed(() =>
  session.value !== null &&
  authStore.user?.id != null &&
  Number(authStore.user.id) === session.value.adminId
)

onMounted(async () => {
  if (!sessionId) return router.replace("/host")
  await ensureToken()
  try {
    // Load session, todos, and friends in parallel
    const [raw, todosData, friendsData] = await Promise.all([
      api(`/api/sessions/${sessionId}`),
      api(`/api/sessions/${sessionId}/todos`),
      api("/api/friends"),
    ])

    session.value = {
      id:           raw.id,
      topic:        raw.topic,
      privacy:      raw.privacy,
      duration:     raw.duration,
      startTime:    raw.start_time ?? null,
      adminId:      Number(raw.admin.id),
      adminUsername: raw.admin.username,
      // Todos come from the dedicated todos endpoint
      todos:        todosData.session   ?? [],
      personalTodos: todosData.personal ?? [],
      aiGenerated:  raw.ai_generated === true,
      aiTodos:      todosData.ai        ?? [],
    }

    allUsers.value = (friendsData.data ?? []).map(f => ({
      id:     f.id,
      name:   f.username,
      avatar: f.avatar_url ?? null,
    }))

    sessionMembers.value = raw.members ?? []
    rebuildMembersFromData(sessionMembers.value)

  } catch {
    router.replace("/host")
  } finally {
    loading.value = false
  }
})

// ================= INVITES =================
const invitedIds = computed({
  get: () => sessionMembers.value.map(m => m.id),
  set: async (ids) => {
    if (!session.value) return
    const prevMembers = [...sessionMembers.value]

    // Optimistic: build new member list from known user info
    const newMembers = ids
      .map(id => {
        const info = userInfoById.value.get(id)
        return info ? { id: info.id, username: info.name, avatar_url: info.avatar ?? null } : null
      })
      .filter(Boolean)

    sessionMembers.value = newMembers
    rebuildMembersFromData(newMembers)

    try {
      await api(`/api/sessions/${session.value.id}`, {
        method: "PUT",
        body: JSON.stringify({ invited_ids: ids }),
      })
    } catch (e) {
      sessionMembers.value = prevMembers
      rebuildMembersFromData(prevMembers)
      console.error(e)
    }
  },
})

// ================= MEMBERS (UI animation) =================
const membersState = ref([])
const nowElapsedSec = ref(0)

const STAGGER_SEC = 5

function rebuildMembersFromData(memberObjects) {
  const prevById = new Map((membersState.value ?? []).map(m => [m.id, m]))

  const next = (memberObjects ?? []).map(u => {
    const old = prevById.get(u.id)
    return {
      id:         u.id,
      name:       u.username ?? u.name,
      avatar:     u.avatar_url ?? u.avatar ?? null,
      progress:   old?.progress ?? 0,
      startAtSec: old?.startAtSec ?? null,
    }
  })

  const existingMaxStart = Math.max(
    -Infinity,
    ...next.map(m => (typeof m.startAtSec === "number" ? m.startAtSec : -Infinity))
  )

  let k = 0
  for (const m of next) {
    if (typeof m.startAtSec !== "number") {
      const base = Math.max(existingMaxStart, nowElapsedSec.value) + STAGGER_SEC
      m.startAtSec = base + k * STAGGER_SEC
      k++
    }
  }

  membersState.value = next
}

const members = computed(() => membersState.value)

// Options for AddPeopleModal: friends + current session members (deduplicated)
// so that already-invited members always appear in the invited list
const addPeopleOptions = computed(() => {
  const map = new Map(allUsers.value.map(u => [u.id, u]))
  sessionMembers.value.forEach(u => {
    if (!map.has(u.id)) {
      map.set(u.id, { id: u.id, name: u.username, avatar: u.avatar_url ?? null })
    }
  })
  return Array.from(map.values())
})

// ================= TODOS (local state — persistence lives in TodoDrawer) =================
const sessionTodos = computed({
  get: () => session.value?.todos ?? [],
  set: (v) => { if (session.value) session.value.todos = v },
})

const personalTodos = computed({
  get: () => session.value?.personalTodos ?? [],
  set: (v) => { if (session.value) session.value.personalTodos = v },
})

const aiTodos = computed({
  get: () => session.value?.aiTodos ?? [],
  set: (v) => { if (session.value) session.value.aiTodos = v },
})

// ================= END SESSION =================
const endTriggered = ref(false)

async function endAndExit() {
  if (endTriggered.value || !session.value?.id) return
  endTriggered.value = true
  try {
    // Backend determines outcome from todos — no body needed
    await api(`/api/sessions/${session.value.id}/end`, { method: "POST" })
  } catch (e) {
    console.error(e)
  }
}

// ================= TIMER =================
const durationSec = computed(() => {
  const d = session.value?.duration
  return d ? Number(d.hours) * 3600 + Number(d.minutes) * 60 : 0
})

const timerPayload = ref({ remainingSec: 0, elapsedSec: 0, totalSec: 0 })
const lastProgress01 = ref(0)
const progress01 = computed(() => lastProgress01.value)

const endModalOpen = ref(false)
const sessionEnded = ref(false)
const freezeTimer = computed(() => sessionEnded.value || endModalOpen.value)

const expiredHandled = ref(false)
const timeUp = ref(false)


function onTimerTick(payload) {
  if (freezeTimer.value) return
  timerPayload.value = payload

  const total = payload?.totalSec ?? 0
  const elapsed = payload?.elapsedSec ?? 0

  nowElapsedSec.value = elapsed // ✅ critical for join scheduling

  lastProgress01.value = total > 0 ? clamp01(elapsed / total) : 0
  updateFriendsProgress(elapsed, total)
}

async function onTimerExpired(payload) {
  if (expiredHandled.value) return
  expiredHandled.value = true

  // If something already ended the session / opened modal, don't fight it
  if (freezeTimer.value) return

  timeUp.value = true

  // Timer finished => session ends, always
  endSessionNow() // sets sessionEnded = true

  // Pick screen based on completion
  if (allTodosDone.value) {
    endScreen.value = 1 // ✅ success
  } else {
    endScreen.value = 3 // ✅ failed/time up
  }

  // Show modal
  endModalOpen.value = true

  // Persist end on backend
  await endAndExit(allTodosDone.value)
}

const timerStatsText = computed(() => {
  const p = timerPayload.value
  if (!p.totalSec) return ""
  const fmt = (sec) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return h > 0
      ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }
  return `${fmt(p.elapsedSec)} / ${fmt(p.totalSec)}`
})

function updateFriendsProgress(elapsedSec, totalSec) {
  if (!totalSec || totalSec <= 0) return

  for (const m of membersState.value ?? []) {
    const start = typeof m.startAtSec === "number" ? m.startAtSec : 0

    if (elapsedSec < start) {
      m.progress = 0
      continue
    }

    const denom = Math.max(1, totalSec - start)  // all finish at session end
    const p01 = clamp01((elapsedSec - start) / denom)
    m.progress = Math.round(p01 * 100)
  }
}


// ================= DONE LOGIC =================
function isTodoDone(t) {
  if (typeof t?.done === "boolean") return t.done
  if (typeof t?.completed === "boolean") return t.completed
  return false
}

const allTodosDone = computed(() => {
  const a = sessionTodos.value ?? []
  const b = personalTodos.value ?? []
  const c = aiTodos.value ?? []
  const all = [...a, ...b, ...c]
  if (all.length === 0) return true
  return all.every(isTodoDone)
})

// ================= UI =================
const addPeopleOpen = ref(false)
const todoOpen = ref(false)
const todoMode = ref("manual")

function openTodo() {
  todoOpen.value = true
}

function openAddPeople() {
  addPeopleOpen.value = true
}

// ================= END SESSION FLOW =================
const endScreen = ref(1) // 1=success, 2=confirm early exit, 3=time-up/failed

function endSessionNow() {
  sessionEnded.value = true
}

const hasAnyTodos = computed(() => {
  const a = sessionTodos.value ?? []
  const b = personalTodos.value ?? []
  const c = aiTodos.value ?? []
  return (a.length + b.length + c.length) > 0
})

async function onEndSessionClick() {
  // If timer already expired and tasks not done => failed screen
  if (timeUp.value && hasAnyTodos.value && !allTodosDone.value) {
    endScreen.value = 3
    endModalOpen.value = true
    return
  }

  // Manual end BEFORE timer finishes:
  // If there are NO todos => confirmation modal (screen 2)
  if (!timeUp.value && !hasAnyTodos.value) {
    endScreen.value = 2
    endModalOpen.value = true
    return
  }

  // If there ARE todos and they are all done => success
  if (hasAnyTodos.value && allTodosDone.value) {
    await endAndExit(true)
    endScreen.value = 1
    endModalOpen.value = true
    return
  }

  // Otherwise (there are todos but not done) => confirmation modal (screen 2)
  endScreen.value = 2
  endModalOpen.value = true
}


async function confirmEarlyExit() {
  endSessionNow()
  endScreen.value = 3
  endModalOpen.value = true
  await endAndExit(false)
  // router.push("/host")
}

function goHome() {
  endModalOpen.value = false
  router.push("/home")
}

function goGarden() {
  endModalOpen.value = false
  router.push("/garden")
}

onBeforeRouteLeave(async () => {
  await endAndExit(false)
})

</script>

<template>
  <div v-if="!loading && session" class="min-h-screen bg-[#F7FAF8] text-black">
    <header class="border-b border-black/5 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
      <div class="mx-auto flex max-w-screen-md items-center justify-between">
        <div class="flex min-w-0 items-center gap-2">
          <h1 class="truncate text-lg font-bold tracking-tight">{{ session.topic || "Session" }}</h1>
          <div v-if="isAdmin" class="shrink-0 text-xs text-black/40">(admin)</div>
        </div>
        <button
          v-if="isAdmin"
          @click="openAddPeople"
          class="grid h-10 w-10 place-items-center rounded-full bg-white text-black shadow-sm ring-1 ring-black/10 transition hover:bg-[#F7FAF8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
          type="button"
        >
          <AddPeopleIcon class="h-6 w-6" />
        </button>
      </div>
    </header>

    <main class="mx-auto max-w-screen-md px-4 pb-8 pt-6">
      <div class="flex justify-center">
        <FlowerGrowth :progress="progress01" :size="220" />
      </div>
      <SessionTimer
        v-if="!freezeTimer"
        :duration-sec="durationSec"
        :start-time-ms="session.startTime"
        @tick="onTimerTick"
        @expired="onTimerExpired"
      />

      <button
        class="mx-auto mt-4 flex rounded-2xl bg-[#57B884] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#469D6F] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
        @click="openTodo"
        type="button"
      >
        To-Do List
      </button>

      <button
        class="mb-3 mt-3 w-full rounded-2xl bg-[#57B884] py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#469D6F] hover:scale-105 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
        @click="onEndSessionClick"
        type="button"
      >
        End The Session
      </button>

      <FriendsProgressFlowers
        title="Online Members"
        :friends="members"
        :max-visible="5"
      />
    </main>
    <!-- Drawers / Modals -->
    <TodoDrawer
      v-model:open="todoOpen"
      v-model:mode="todoMode"
      :session-id="session.id"
      :is-admin="isAdmin"
      :is-private="session.privacy === 'private'"
      :is-generate="session.aiGenerated"
      v-model:session-todos="sessionTodos"
      v-model:personal-todos="personalTodos"
       v-model:ai-todos="aiTodos"
       @generatedAi="session.aiGenerated = true" 
    />

    <AddPeopleModal
      v-model:open="addPeopleOpen"
      :options="addPeopleOptions"
      :model-value="invitedIds"
      v-model="invitedIds"
    />
    <EndSessionModal
      :open="endModalOpen"
      :screen="endScreen"
      :title="session.topic || 'Session'"
      :confirmTitle="session.topic || 'Session'"
      :failedTitle="session.topic || 'Session'"
      :stats-text="timerStatsText"
      @close="endModalOpen = false"
      @confirmEnd="confirmEarlyExit"
      @goHome="goHome"
      @goGarden="goGarden"
    />
  </div>
</template>
