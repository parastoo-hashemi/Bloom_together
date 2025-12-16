<script setup>
import { computed, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useSessionStore } from "@/stores/session"

import SessionTimer from "@/components/session/SessionTimer.vue"
import TodoDrawer from "@/components/session/TodoDrawer.vue"
import AddPeopleModal from "@/components/session/AddPeopleModal.vue"

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()

const sessionId = computed(() => route.params.id)
const session = computed(() => sessionStore.getSession(sessionId.value))

// mock user list (replace with API later)
const allUsers = ref([
  { id: 1, name: "Daniel", avatar: "https://i.pravatar.cc/64?img=12", email: "daniel@info.com" },
  { id: 2, name: "John", avatar: "https://i.pravatar.cc/64?img=3", email: "john@info.com" },
  { id: 3, name: "Nat", avatar: "https://i.pravatar.cc/64?img=5", email: "nat@info.com" },
  { id: 4, name: "Sam", avatar: "https://i.pravatar.cc/64?img=8", email: "sam@info.com" },
  { id: 5, name: "Joe", avatar: "https://i.pravatar.cc/64?img=10", email: "joe@info.com" },
  { id: 6, name: "Jac", avatar: "https://i.pravatar.cc/64?img=11", email: "jac@info.com" },
])

const todoOpen = ref(false)
const addPeopleOpen = ref(false)

onMounted(() => {
  if (!session.value) router.replace("/host")
})

const durationSec = computed(() => {
  if (!session.value) return 0
  return session.value.duration.hours * 3600 + session.value.duration.minutes * 60
})

const invitedIds = computed(() => session.value?.invitedFriendIds || [])

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
  // TODO: API call
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- top bar -->
    <div class="flex items-center justify-between border-b px-4 py-3">
      <div>
        <div class="text-lg font-semibold">{{ session?.topic || "Session" }}</div>
        <div v-if="session?.privacy === 'private'" class="text-xs text-black/40">( Session Admin )</div>
      </div>

      <button
        class="grid h-10 w-10 place-items-center rounded-full ring-1 ring-black/10 hover:bg-black/5"
        @click="openTodo"
        aria-label="Open To-Do"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M4 6h16M4 12h10M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <div class="mx-auto max-w px-4 pt-8 pb-24">
      <div class="flex justify-center">
        <div class="h-24 w-24 rounded-full bg-black/5"></div>
      </div>

      <div class="mt-6">
        <SessionTimer :duration-sec="durationSec" />
      </div>

      <!-- ONLY private -->
      <button
        v-if="session?.privacy === 'private'"
        class="mt-5 w-full rounded-2xl bg-black py-3 text-sm font-semibold text-white"
        @click="openAddPeople"
      >
        Add People
      </button>

      <button class="mt-3 w-full rounded-2xl bg-black py-3 text-sm font-semibold text-white">
        End The Session
      </button>
    </div>

    <TodoDrawer v-model:open="todoOpen" :todos="session?.todos || []" @update:todos="(t)=>sessionStore.updateTodos(sessionId,t)" />

    <AddPeopleModal
      v-model:open="addPeopleOpen"
      :options="allUsers"
      :model-value="invitedIds"
      @update:modelValue="updateInvited"
      @send="onSendUsername"
    />
  </div>
</template>
