<script setup>
import { computed, ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import { useSessionStore } from "@/stores/session"
import { useUserStore } from "@/stores/user"

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
const sessionStore = useSessionStore()
const userStore = useUserStore()

const privacy = ref("public")
const startModalOpen = ref(false)

// ✅ save default focus time
const saveAsDefault = ref(true)

// Generate the list of friends from the userStore.  Fake users do
// not have avatars stored in the database, so we derive a unique
// placeholder avatar from the username.
// Derive the list of available friends from the userStore.  If the
// backend fails to return any friends (e.g. due to a network or JSON
// parsing error), provide a fallback list of demo names so that the
// invitation list is not empty.  Each friend entry has an id, name
// and avatar generated using the pravatar.cc service.
const fallbackFriends = [
  { id: 'Alice', username: 'Alice' },
  { id: 'Bob', username: 'Bob' },
  { id: 'Carol', username: 'Carol' },
  { id: 'Dave', username: 'Dave' },
  { id: 'Eve', username: 'Eve' },
  { id: 'Frank', username: 'Frank' },
  { id: 'Grace', username: 'Grace' },
  { id: 'Heidi', username: 'Heidi' },
  { id: 'Ivan', username: 'Ivan' },
  { id: 'Judy', username: 'Judy' },
]

const friends = computed(() => {
  const list = userStore.friends && userStore.friends.length > 0 ? userStore.friends : fallbackFriends
  return list.map((f) => ({
    id: f.id,
    name: f.username,
    avatar: `https://i.pravatar.cc/64?u=${encodeURIComponent(f.username)}`,
  }))
})

const publicForm = ref({
  hours: 0,
  minutes: 15,
  topic: "",
  selectedFriendIds: [],
  // Include a todos array for public sessions so that tasks can be added
  // and persisted just like private sessions.  Without this property,
  // the TodoList component will not have a place to store tasks for
  // public sessions, leading to lost tasks.
  todos: [],
})

const privateForm = ref({
  hours: 0,
  minutes: 15,
  topic: "",
  selectedFriendIds: [],
  todos: [],
})

const form = computed(() => (privacy.value === "private" ? privateForm.value : publicForm.value))

const hasDuration = computed(() => form.value.hours * 60 + form.value.minutes > 0)
const hasTopic = computed(() => form.value.topic.trim().length > 0)
const hasFriend = computed(() => form.value.selectedFriendIds.length > 0)
const hasTodo = computed(() => privacy.value !== "private" || (form.value.todos?.length > 0))

const canCreateSession = computed(() => hasDuration.value && hasTopic.value && hasFriend.value && hasTodo.value)

// ✅ Always load focus_time from DB on mount
onMounted(async () => {
  // Ensure the user store is initialised (loads mario and friends).  If
  // already initialised, this call returns immediately.  If it fails,
  // redirect to the Home page so the user can see the error message.
  if (!userStore.currentUser) {
    try {
      await userStore.init()
    } catch (e) {
      console.error(e)
      router.replace({ name: 'home' })
      return
    }
  }
  // Set the form default duration from the current user's focus_time
  const fresh = userStore.currentUser
  const defMin = Number(fresh.focus_time ?? 25)
  const h = Math.floor(defMin / 60)
  const m = defMin % 60
  publicForm.value.hours = h
  publicForm.value.minutes = m
  privateForm.value.hours = h
  privateForm.value.minutes = m
})

function createSession() {
  if (!canCreateSession.value) return
  startModalOpen.value = true
}

async function onStart(settings) {
  const totalMin = form.value.hours * 60 + form.value.minutes

  // Persist focus_time before creating a session
  if (saveAsDefault.value) {
    try {
      await userStore.updateCurrentUser({ focus_time: totalMin })
    } catch (e) {
      console.warn('Failed to save focus_time:', e)
    }
  }

  const payload = {
    privacy: privacy.value,
    duration: { hours: form.value.hours, minutes: form.value.minutes },
    topic: form.value.topic,
    invitedFriendIds: form.value.selectedFriendIds,
    // Always include the todos array so tasks persist for public sessions.
    todos: form.value.todos ?? [],
    // Start with an empty list for the admin's personal todo list.
    personal_todos: [],
  }

  try {
    const id = await sessionStore.createSession(payload)
    router.push({ name: 'session-room', params: { id } })
  } catch (e) {
    console.error(e)
    // Optionally display an error message to the user
  }
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <Header title="Host Session" subtitle="Set up your study room" />

    <main class="mx-auto max-w px-4 pt-16 pb-28">
      <div class="flex rounded-full bg-black/5 p-1">
        <button
          class="flex flex-1 items-center justify-center rounded-full py-2 text-sm font-medium"
          :class="privacy === 'public' ? 'bg-[#111] text-white' : 'text-black'"
          @click="privacy = 'public'"
        >
          <PublicIcon :class="privacy === 'public' ? 'text-white' : 'text-black'" class="mr-2" />
          Public
        </button>

        <button
          class="flex flex-1 items-center justify-center rounded-full py-2 text-sm font-medium"
          :class="privacy === 'private' ? 'bg-[#111] text-white' : 'text-black'"
          @click="privacy = 'private'"
        >
          <PrivateIcon :class="privacy === 'private' ? 'text-white' : 'text-black'" class="mr-2" />
          Private
        </button>
      </div>

      <section>
        <StudyDuration v-model:hours="form.hours" v-model:minutes="form.minutes" />
        <Topic v-model="form.topic" />

        <!-- Always show the task list so that tasks can be added and persisted
             for both public and private sessions.  The "todos" array is defined
             on the form for public sessions (publicForm.todos) and private
             sessions (privateForm.todos), so v-model binds correctly. -->
        <TodoList v-model="form.todos" title="To Do" />

        <InviteFriends :options="friends" v-model="form.selectedFriendIds" :max-selected="10" />

        <label class="mt-4 flex items-center gap-2 text-sm text-black/70">
          <input type="checkbox" v-model="saveAsDefault" />
          Save this duration as my default focus time
        </label>

        <button
          :disabled="!canCreateSession"
          class="mt-4 w-full rounded-2xl bg-[#111] py-3 text-sm font-semibold text-white hover:bg-black/90
                 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#111]"
          @click="createSession"
        >
          Create The Session
        </button>
      </section>
    </main>

    <ConfirmStartModal v-model:open="startModalOpen" @start="onStart" />
    <NavBar />
  </div>
</template>