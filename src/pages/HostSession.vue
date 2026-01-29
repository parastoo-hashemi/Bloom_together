<script setup>
import { computed, ref } from "vue"
import { useRouter } from "vue-router"

// UI components
import Header from "../components/main/Header.vue"
import PrivateIcon from "../components/icons/PrivateIcon.vue"
import PublicIcon from "../components/icons/PublicIcon.vue"
import StudyDuration from "../components/HostSession/StudyDuration.vue"
import Topic from "../components/HostSession/Topic.vue"
import TodoList from "../components/HostSession/TodoList.vue"
import InviteFriends from "../components/HostSession/InviteFriends.vue"
import NavBar from "../components/main/NavBar.vue"
import ConfirmStartModal from "@/components/HostSession/ConfirmStartModal.vue"

// ---------------------------
//  API client (fetch)
// ---------------------------
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001"

async function apiCreateSession(payload) {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    let msg = `Failed to create session (${res.status})`
    try {
      const err = await res.json()
      if (err?.error) msg = err.error
    } catch {
      // ignore
    }
    throw new Error(msg)
  }

  return await res.json() // { id }
}

// ---------------------------
//  State
// ---------------------------
const router = useRouter()

// Default tab (match your screenshot logic)
const privacy = ref("public") // "public" | "private"

// Demo friends (replace later with GET /api/friends)
const friends = ref([
  { id: 1, name: "Daniel", avatar: "https://i.pravatar.cc/64?img=12", email: "daniel@info.com" },
  { id: 2, name: "John", avatar: "https://i.pravatar.cc/64?img=3", email: "john@info.com" },
  { id: 3, name: "Nat", avatar: "https://i.pravatar.cc/64?img=5", email: "nat@info.com" },
  { id: 4, name: "Sam", avatar: "https://i.pravatar.cc/64?img=8", email: "sam@info.com" },
  { id: 5, name: "Sara", avatar: "https://i.pravatar.cc/64?img=9", email: "sara@info.com" },
  { id: 6, name: "Mina", avatar: "https://i.pravatar.cc/64?img=10", email: "mina@info.com" },
])


// Separate state per tab
const publicForm = ref({
  hours: 0,
  minutes: 15,
  topic: "",
  selectedFriendIds: [],
})

const privateForm = ref({
  hours: 0,
  minutes: 15,
  topic: "",
  selectedFriendIds: [],
  todos: [],
})

// Active form
const form = computed(() =>
  privacy.value === "private" ? privateForm.value : publicForm.value
)

// ---------------------------
//  Creation rules (match mock)
// ---------------------------
// Public: duration required, topic required, friends OPTIONAL, no todos
// Private: duration required, topic required, friends REQUIRED, todos REQUIRED
const totalMinutes = computed(() => form.value.hours * 60 + form.value.minutes)

const hasDuration = computed(() => totalMinutes.value > 0)
const hasTopic = computed(() => form.value.topic.trim().length > 0)
const hasFriend = computed(() => form.value.selectedFriendIds.length > 0)
const hasTodo = computed(() => privacy.value !== "private" || (form.value.todos?.length > 0))

const canCreateSession = computed(() => {
  return hasDuration.value && hasTopic.value && hasFriend.value && hasTodo.value
})

// ---------------------------
//  Modal + submit
// ---------------------------
const startModalOpen = ref(false)
const isSubmitting = ref(false)
const submitError = ref("")

function createSession() {
  submitError.value = ""
  if (!canCreateSession.value) return
  startModalOpen.value = true
}

async function onStart(settings) {
  if (isSubmitting.value) return
  submitError.value = ""
  isSubmitting.value = true

  try {
    const payload = {
      privacy: privacy.value,
      duration: { hours: form.value.hours, minutes: form.value.minutes },
      topic: form.value.topic.trim(),
      invitedFriendIds: form.value.selectedFriendIds,
      // Store todos only for private sessions (as your UI implies)
      todos: privacy.value === "private" ? form.value.todos : [],
      // Keep it empty for now; your backend supports it but UI doesn't yet
      personal_todos: [],
      settings,
      createdAt: Date.now(),
    }

    const { id } = await apiCreateSession(payload)

    // Backend is source of truth: navigate using backend session id
    router.push({ name: "session-room", params: { id } })
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : "Failed to create session"
  } finally {
    isSubmitting.value = false
    startModalOpen.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <Header title="Host Session" subtitle="Set up your co-study room" />

    <main class="mx-auto max-w px-4 pt-16 pb-28">
      <!-- Tabs -->
      <div class="flex rounded-full bg-black/5 p-1">
        <button
          class="flex flex-1 items-center justify-center rounded-full py-2 text-sm font-medium"
          :class="privacy === 'public' ? 'bg-[#111] text-white' : 'text-black'"
          @click="privacy = 'public'"
          type="button"
        >
          <PublicIcon
            :class="privacy === 'public' ? 'text-white' : 'text-black'"
            class="mr-2"
          />
          Public
        </button>

        <button
          class="flex flex-1 items-center justify-center rounded-full py-2 text-sm font-medium"
          :class="privacy === 'private' ? 'bg-[#111] text-white' : 'text-black'"
          @click="privacy = 'private'"
          type="button"
        >
          <PrivateIcon
            :class="privacy === 'private' ? 'text-white' : 'text-black'"
            class="mr-2"
          />
          Private
        </button>
      </div>

      <!-- Form -->
      <section class="mt-4 space-y-4">
        <StudyDuration v-model:hours="form.hours" v-model:minutes="form.minutes" />

        <Topic v-model="form.topic" />

        <TodoList
          v-if="privacy === 'private'"
          v-model="form.todos"
          title="To Do"
        />

        <InviteFriends
          :options="friends"
          v-model="form.selectedFriendIds"
          :max-selected="10"
          :title="privacy === 'public' ? 'Invite Friends (Optional)' : 'Invite Friends'"
        />

        <!-- Error -->
        <p v-if="submitError" class="text-sm text-red-600">
          {{ submitError }}
        </p>

        <button
          :disabled="!canCreateSession || isSubmitting"
          class="mt-2 w-full rounded-2xl bg-[#111] py-3 text-sm font-semibold text-white hover:bg-black/90
                 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#111]"
          @click="createSession"
          type="button"
        >
          <span v-if="isSubmitting">Creating…</span>
          <span v-else>
            {{ privacy === "public" ? "Create and Enter the Session" : "Create The Session" }}
          </span>
        </button>
      </section>
    </main>

    <ConfirmStartModal v-model:open="startModalOpen" @start="onStart" />

    <NavBar />
  </div>
</template>
