<script setup>
import { computed, onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useSessionStore } from "@/stores/session"
import { useUserStore } from "@/stores/user" // ✅ added
import NavBar from "../components/main/NavBar.vue" // ✅ added

import SessionTimer from "@/components/session/SessionTimer.vue"
import FlowerGrowth from "@/components/session/FlowerGrowth.vue"
import TodoDrawer from "@/components/session/TodoDrawer.vue"
import AddPeopleModal from "@/components/session/AddPeopleModal.vue"
import AddPeopleIcon from "@/components/icons/AddPeopleIcon.vue"
import EndSessionModal from "@/components/session/EndSessionModal.vue"
import FriendsProgressFlowers from "@/components/session/FriendsProgressFlowers.vue"
import { clamp01 } from "@/utils/flowerGrowth"

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const userStore = useUserStore() // ✅ added

const sessionEnded = ref(false)
const sessionId = computed(() => route.params.id)
const session = computed(() => sessionStore.getSession(sessionId.value))

const allUsers = ref([
  { id: 1, name: "Daniel", avatar: "https://i.pravatar.cc/64?img=12", email: "daniel@info.com" },
  { id: 2, name: "John", avatar: "https://i.pravatar.cc/64?img=3", email: "john@info.com" },
  { id: 3, name: "Nat", avatar: "https://i.pravatar.cc/64?img=5", email: "nat@info.com" },
  { id: 4, name: "Sam", avatar: "https://i.pravatar.cc/64?img=8", email: "sam@info.com" },
  { id: 5, name: "Joe", avatar: "https://i.pravatar.cc/64?img=10", email: "joe@info.com" },
  { id: 6, name: "Jac", avatar: "https://i.pravatar.cc/64?img=11", email: "jac@info.com" },
])

const friends = ref([
  { id: 1, name: "John", progress: 95 },
  { id: 2, name: "Daniel", progress: 15 },
  { id: 3, name: "Joe", progress: 5 },
  { id: 4, name: "Jae", progress: 55 },
  { id: 5, name: "Sam", progress: 95 },
  { id: 6, name: "Mina", progress: 35 },
  { id: 7, name: "Sara", progress: 70 },
  { id: 8, name: "Leo", progress: 10 },
])

function handleSelect(friend) {
  // optional: open profile drawer, show tooltip, etc.
  console.log("Selected friend:", friend)
}

// UI state
const todoOpen = ref(false)
const addPeopleOpen = ref(false)
const todoMode = ref("manual")

// ✅ v-model bindings
const sessionTodos = computed({
  get: () => session.value?.todos ?? [],
  set: (v) => {
    if (!session.value) return
    sessionStore.updateTodos(session.value.id, v)
  },
})

const personalTodos = computed({
  get: () => session.value?.personalTodos ?? [],
  set: (v) => {
    if (!session.value) return
    sessionStore.updatePersonalTodos(session.value.id, v)
  },
})

// ✅ Redirect if invalid session + ✅ login guard added (without deleting your logic)
onMounted(async () => {
  await userStore.restoreLogin()
  if (!userStore.isLoggedIn) {
    router.replace({ name: "home" })
    return
  }

  if (!session.value) router.replace("/host")
})

// Keep local refs in sync when session changes
watch(
  () => session.value,
  (s) => {
    if (!s) return
    sessionTodos.value = (s.todos ?? []).map(t => ({ ...t }))
    personalTodos.value = (s.personalTodos ?? []).map(t => ({ ...t }))
  },
  { immediate: true }
)

// Derived values
const durationSec = computed(() => {
  const s = session.value
  if (!s) return 0
  return (s.duration?.hours ?? 0) * 3600 + (s.duration?.minutes ?? 0) * 60
})

const timerPayload = ref({ remainingSec: 0, elapsedSec: 0, totalSec: 0 })
const freezeTimer = computed(() => sessionEnded.value || endModalOpen.value)
const lastProgress01 = ref(0)
const progress01 = computed(() => lastProgress01.value)
const expiredHandled = ref(false)

function onTimerTick(payload) {
  if (freezeTimer.value) return
  timerPayload.value = payload
  const total = payload?.totalSec ?? 0
  const elapsed = payload?.elapsedSec ?? 0
  lastProgress01.value = total > 0 ? clamp01(elapsed / total) : 0
}

function onTimerExpired(payload) {
  if (expiredHandled.value) return
  expiredHandled.value = true
  if (freezeTimer.value) return

  timerPayload.value = payload
  const total = payload?.totalSec ?? 0
  const elapsed = payload?.elapsedSec ?? 0
  lastProgress01.value = total > 0 ? clamp01(elapsed / total) : 1

  timeUp.value = true
  if (!allTodosDone.value && !sessionEnded.value) {
    endSessionNow()
    endScreen.value = 3
    endModalOpen.value = true
  }
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

const invitedIds = computed(() => session.value?.invitedFriendIds ?? [])

// ✅ Define what “done” means (assumes todo item has `done` or `completed`)
function isTodoDone(t) {
  // normalize common naming
  if (typeof t?.done === "boolean") return t.done
  if (typeof t?.completed === "boolean") return t.completed
  return false
}

const allTodosDone = computed(() => {
  const a = sessionTodos.value ?? []
  const b = personalTodos.value ?? []
  const all = [...a, ...b]
  if (all.length === 0) return true
  return all.every(isTodoDone)
})

// ✅ End-session flow state machine
const endModalOpen = ref(false)
const endScreen = ref(1) // 1=success, 2=confirm early exit, 3=time-up / failed end
const timeUp = ref(false)

function openTodo() {
  todoOpen.value = true
}

function openAddPeople() {
  addPeopleOpen.value = true
}

function updateInvited(ids) {
  sessionStore.updateInvitedFriendIds(sessionId.value, ids)
}

function onSendUsername(username) {
  console.log("Send invite to username:", username)
}

// User taps "End The Session"
function onEndSessionClick() {
  if (timeUp.value && !allTodosDone.value) {
    endScreen.value = 3
  } else if (allTodosDone.value) {
    endScreen.value = 1
  } else {
    endScreen.value = 2
  }
  endModalOpen.value = true
}

function endSessionNow() {
  sessionEnded.value = true
}

// User confirms early exit with unfinished todos
function confirmEarlyExit() {
  endSessionNow()
  endScreen.value = 3
  endModalOpen.value = true
}

// Timer finished event from SessionTimer
function onTimerFinished() {
  timeUp.value = true
  if (!allTodosDone.value) {
    endScreen.value = 3
    endModalOpen.value = true
  }
}

// ✅ NEW: give flower if session ended successfully (screen 1) and then user goes home
async function awardFlowerIfSuccess() {
  if (!userStore.currentUser) return
  if (endScreen.value !== 1) return

  try {
    const current = Number(userStore.currentUser.flowers ?? 0)
    await userStore.updateCurrentUser({ flowers: current + 1 })
  } catch (e) {
    console.warn("Failed to update flowers:", e)
  }
}

// Navigate out after “Home Page” / close modal action
async function goHome() {
  // if success screen, update flowers
  await awardFlowerIfSuccess()

  endModalOpen.value = false
  router.push("/host")
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <div class="flex items-center justify-between border-b px-4 py-3">
      <div class="flex items-center">
        <div class="text-lg font-semibold">{{ session?.topic || "Session" }}</div>
        <div v-if="session?.privacy === 'private'" class="ml-1 text-xs text-black/40">
          ( Session Admin )
        </div>
      </div>

      <button
        v-if="session?.privacy === 'private'"
        class="grid h-10 w-10 place-items-center rounded-full ring-1 ring-black/10 hover:bg-black/5"
        @click="openAddPeople"
        aria-label="Add People"
      >
        <AddPeopleIcon class="h-6 w-6" />
      </button>
    </div>

    <div class="mx-auto max-w px-4 pb-24 pt-8">
      <div class="flex justify-center">
        <FlowerGrowth :progress="progress01" :size="250" :stroke-scale="1" />
      </div>

      <div class="mt-6">
        <SessionTimer
          v-if="!freezeTimer"
          :duration-sec="durationSec"
          @expired="onTimerExpired"
          @tick="onTimerTick"
          @finished="onTimerFinished"
        />
      </div>

      <button
        @click="openTodo"
        class="mx-auto mt-3 flex rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white"
      >
        To-Do List
      </button>

      <button
        @click="onEndSessionClick"
        class="mt-3 mb-4 w-full rounded-2xl bg-black py-3 text-sm font-semibold text-white"
      >
        End The Session
      </button>

      <FriendsProgressFlowers
        title="Online Members"
        :friends="friends"
        :max-visible="5"
        @select="handleSelect"
      />
    </div>

    <TodoDrawer
      v-model:open="todoOpen"
      v-model:mode="todoMode"
      :is-admin="session?.privacy === 'private'"
      v-model:session-todos="sessionTodos"
      v-model:personal-todos="personalTodos"
    />

    <AddPeopleModal
      v-model:open="addPeopleOpen"
      :options="allUsers"
      :model-value="invitedIds"
      @update:modelValue="updateInvited"
      @send="onSendUsername"
    />

    <EndSessionModal
      :open="endModalOpen"
      :screen="endScreen"
      :title="session?.topic || 'Session'"
      :stats-text="timerStatsText"
      @close="endModalOpen = false"
      @confirmEnd="confirmEarlyExit"
      @goHome="goHome"
    />

    <!-- ✅ add navbar (logout + navigation) -->
    <NavBar />
  </div>
</template>
