<script setup>
import { ref, computed, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"

import SessionTimer from "@/components/session/SessionTimer.vue"
import FlowerGrowth from "@/components/session/FlowerGrowth.vue"
import TodoDrawer from "@/components/session/TodoDrawer.vue"
import AddPeopleModal from "@/components/session/AddPeopleModal.vue"
import AddPeopleIcon from "@/components/icons/AddPeopleIcon.vue"
import EndSessionModal from "@/components/session/EndSessionModal.vue"
import FriendsProgressFlowers from "@/components/session/FriendsProgressFlowers.vue"
import { clamp01 } from "@/utils/flowerGrowth"
import { onBeforeRouteLeave } from "vue-router"

// ================= API =================
const API_BASE = "http://localhost:3001"

async function apiGetSession(id) {
  const r = await fetch(`${API_BASE}/api/sessions/${id}`)
  if (!r.ok) throw new Error("load failed")
  return r.json()
}

async function apiUpdateSession(id, patch) {
  const r = await fetch(`${API_BASE}/api/sessions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  })
  if (!r.ok) throw new Error("update failed")
}

async function apiEndSession(id) {
  const r = await fetch(`${API_BASE}/api/sessions/${id}/end`, { method: "POST" })
  if (!r.ok) throw new Error("end failed")
}

const endTriggered = ref(false)

async function endAndExit() {
  if (endTriggered.value || !session.value?.id) return
  endTriggered.value = true
  try {
    await apiEndSession(session.value.id)
  } catch (e) {
    console.error(e)
  }
}

// ================= ROUTE =================
const route = useRoute()
const router = useRouter()
const sessionId = String(route.params.id)

// ================= STATIC USERS =================
const allUsers = ref([
  { id: 1, name: "Daniel", avatar: "https://i.pravatar.cc/64?img=12" },
  { id: 2, name: "John", avatar: "https://i.pravatar.cc/64?img=3" },
  { id: 3, name: "Nat", avatar: "https://i.pravatar.cc/64?img=5" },
  { id: 4, name: "Sam", avatar: "https://i.pravatar.cc/64?img=8" },
  { id: 5, name: "Sara", avatar: "https://i.pravatar.cc/64?img=9" },
  { id: 6, name: "Mina", avatar: "https://i.pravatar.cc/64?img=10" },
])

const userById = (id) => allUsers.value.find(u => u.id === id)

// ================= SESSION =================
const session = ref(null)
const loading = ref(true)

onMounted(async () => {
  if (!sessionId) return router.replace("/host")
  try {
    const raw = await apiGetSession(sessionId)
    session.value = {
      id: raw.id,
      topic: raw.topic,
      privacy: raw.privacy,
      duration: raw.duration,
      startTime: raw.start_time ?? null,
      invitedFriendIds: raw.invited_ids ?? [],
      todos: raw.todos ?? [],
      personalTodos: raw.personal_todos ?? [],
      aiGenerated: raw.ai_generated === true,
      aiTodos: raw.ai_todos ?? [],
      adminUsername: raw.admin_username
    }
    rebuildMembers(session.value.invitedFriendIds)
  } catch {
    router.replace("/host")
  } finally {
    loading.value = false
  }
})

// ================= INVITES (SOURCE OF TRUTH) =================
const invitedIds = computed({
  get: () => session.value?.invitedFriendIds ?? [],
  set: async (ids) => {
  if (!session.value) return
  const prev = session.value.invitedFriendIds
  session.value.invitedFriendIds = ids
  rebuildMembers(ids) // ✅ keep UI in sync immediately
  try {
    await apiUpdateSession(session.value.id, { invitedFriendIds: ids })
  } catch (e) {
    session.value.invitedFriendIds = prev
    rebuildMembers(prev) // rollback
    console.error(e)
  }
},
})


// ================= MEMBERS (UI) =================
const membersState = ref([])
const nowElapsedSec = ref(0) 

function rebuildMembers(ids) {
  const prevById = new Map((membersState.value ?? []).map(m => [m.id, m]))

  const next = (ids ?? [])
    .map(id => userById(id))
    .filter(Boolean)
    .map(u => {
      const old = prevById.get(u.id)
      return {
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        progress: old?.progress ?? 0,
        startAtSec: old?.startAtSec ?? null, // ✅ persist start schedule
      }
    })

  // ✅ assign startAtSec ONLY for newly added members
  // rule: new member should start after 5s from "first" => interpret as "5s from now"
  // plus keep staggering if multiple new users are added at once
  const existingMaxStart = Math.max(
    -Infinity,
    ...next.map(m => (typeof m.startAtSec === "number" ? m.startAtSec : -Infinity))
  )

  let k = 0
  for (const m of next) {
    if (typeof m.startAtSec !== "number") {
      // start after 5 seconds from current moment, and stagger new ones
      const base = Math.max(existingMaxStart, nowElapsedSec.value) + STAGGER_SEC
      m.startAtSec = base + k * STAGGER_SEC
      k++
    }
  }

  membersState.value = next
}
const members = computed(() => membersState.value)



// ================= TODOS (BACKEND SYNC) =================
const aiTodos = computed({
  get: () => session.value?.aiTodos ?? [],
  set: async (v) => {
    if (!session.value) return
    const prev = session.value.aiTodos
    session.value.aiTodos = v
    try {
      await apiUpdateSession(session.value.id, { ai_todos: v })
    } catch (e) {
      session.value.aiTodos = prev
      console.error(e)
    }
  },
})

const sessionTodos = computed({
  get: () => session.value?.todos ?? [],
  set: async (v) => {
    if (!session.value) return
    const prev = session.value.todos
    session.value.todos = v
    await persist(
      { todos: v },
      () => (session.value.todos = prev)
    )
  },
})

const personalTodos = computed({
  get: () => session.value?.personalTodos ?? [],
  set: async (v) => {
    if (!session.value) return
    const prev = session.value.personalTodos
    session.value.personalTodos = v
    await persist(
      { personal_todos: v }, // backend key
      () => (session.value.personalTodos = prev)
    )
  },
})

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
  await endAndExit()
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

const STAGGER_SEC = 5
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
    await endAndExit()
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
  await endAndExit()
  // router.push("/host")
}

function goHome() {
  endModalOpen.value = false
  router.push("/host")
}

onBeforeRouteLeave(async () => {
  await endAndExit()
})

</script>

<template>
  <div v-if="!loading && session" class="min-h-screen bg-white">
    <div class="flex items-center justify-between border-b px-4 py-3">
      <div class="flex items-center gap-2">
        <div class="text-lg font-semibold">{{ session.topic || "Session" }}</div>
        <div v-if="session.adminUsername === 'mario'" class="text-xs text-black/40">(admin)</div>
      </div>
      <button
        v-if="session.adminUsername === 'mario'"
        @click="openAddPeople"
        class="grid h-10 w-10 place-items-center rounded-full hover:bg-black/5 ring-1 ring-black/10"
        type="button"
      >
        <AddPeopleIcon class="h-6 w-6" />
      </button>
    </div>

    <div class="px-4 pt-6">
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

      <button style="background-color: #57B884;"
        class="mx-auto mt-3 flex rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white"
        @click="openTodo"
        type="button"
      >
        To-Do List
      </button>

      <button style="background-color: #57B884;"
        class="mt-3 mb-2 w-full rounded-2xl bg-black py-3 text-sm font-semibold text-white"
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
    </div>

    <!-- Drawers / Modals -->
    <TodoDrawer
      v-model:open="todoOpen"
      v-model:mode="todoMode"
      :session-id="session.id"
      :is-admin="session.adminUsername === 'mario'"
      :is-generate="session.aiGenerated"
      v-model:session-todos="sessionTodos"
      v-model:personal-todos="personalTodos"
       v-model:ai-todos="aiTodos"
       @generatedAi="session.aiGenerated = true" 
    />

    <AddPeopleModal
      v-model:open="addPeopleOpen"
      :options="allUsers"
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
    />
  </div>
</template>
