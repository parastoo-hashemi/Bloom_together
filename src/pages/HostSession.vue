<script setup>
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"

import { useAuthStore } from "@/stores/auth.js"
import { api } from "@/Api/http.js"

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

const router = useRouter()
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

// ---------------------------
//  State
// ---------------------------
const privacy = ref("public") // "public" | "private"

// Loaded from GET /api/friends — mapped to { id, name, avatar } for InviteFriends
const friends = ref([])


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

// Public: friends optional. Private: friends + todos required.
const canCreateSession = computed(() => {
  if (privacy.value === "public") return hasDuration.value && hasTopic.value
  return hasDuration.value && hasTopic.value && hasFriend.value && hasTodo.value
})

// ---------------------------
//  Load friends on mount
// ---------------------------
onMounted(async () => {
  await ensureToken()
  try {
    // GET /api/friends → { data: [{ id, username, avatar_url }] }
    const { data } = await api("/api/friends")
    friends.value = (data ?? []).map(f => ({
      id:     f.id,
      name:   f.username,
      avatar: f.avatar_url ?? null,
    }))
  } catch {
    friends.value = []
  }
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
    // POST /api/sessions → { id, topic, start_time }
    const { id } = await api("/api/sessions", {
      method: "POST",
      body: JSON.stringify({
        privacy:     privacy.value,
        topic:       form.value.topic.trim(),
        duration:    { hours: form.value.hours, minutes: form.value.minutes },
        invited_ids: form.value.selectedFriendIds.map(Number),
      }),
    })

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
  <div class="min-h-screen bg-[#F7FAF8] text-black">
    <Header title="Host Session" subtitle="Set up your co-study room" />

    <main class="mx-auto max-w-screen-md px-4 pb-28 pt-16">
      <!-- Tabs -->
      <div class="mt-4 flex rounded-2xl bg-white p-1 shadow-sm ring-1 ring-black/5" role="tablist" aria-label="Session privacy">
        <button
          class="flex flex-1 items-center justify-center rounded-xl py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
          :class="privacy === 'public' ? 'bg-[#57B884] text-white shadow-sm' : 'text-black/60 hover:bg-black/5 hover:text-black'"
          @click="privacy = 'public'"
          type="button"
          role="tab"
          :aria-selected="privacy === 'public'"
        >
          <PublicIcon
            :class="privacy === 'public' ? 'text-white' : 'text-black'"
            class="mr-2"
          />
          Public
        </button>

        <button
          class="flex flex-1 items-center justify-center rounded-xl py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
          :class="privacy === 'private' ? 'bg-[#57B884] text-white shadow-sm' : 'text-black/60 hover:bg-black/5 hover:text-black'"
          @click="privacy = 'private'" 
          type="button"
          role="tab"
          :aria-selected="privacy === 'private'"
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
          class="mt-2 w-full rounded-2xl bg-[#57B884] py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#469D6F] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#57B884]"
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
  </div>
</template>
