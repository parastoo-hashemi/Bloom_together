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

const privacy = ref("public") // "public" | "private"
const startModalOpen = ref(false)

// NEW: optionally persist chosen duration as default focus time
const saveAsDefault = ref(true)

const friends = ref([
  { id: 1, name: "Daniel", avatar: "https://i.pravatar.cc/64?img=12" },
  { id: 2, name: "John", avatar: "https://i.pravatar.cc/64?img=3" },
  { id: 3, name: "Sara", avatar: "https://i.pravatar.cc/64?img=5" },
  { id: 4, name: "Mina", avatar: "https://i.pravatar.cc/64?img=8" },
])

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

const form = computed(() =>
  privacy.value === "private" ? privateForm.value : publicForm.value
)

const hasDuration = computed(() => (form.value.hours * 60 + form.value.minutes) > 0)
const hasTopic = computed(() => form.value.topic.trim().length > 0)
const hasFriend = computed(() => form.value.selectedFriendIds.length > 0)
const hasTodo = computed(() => privacy.value !== "private" || (form.value.todos?.length > 0))

const canCreateSession = computed(() => {
  return hasDuration.value && hasTopic.value && hasFriend.value && hasTodo.value
})

onMounted(async () => {
  // restore login if page refreshed
  await userStore.restoreLogin()
  if (!userStore.isLoggedIn) {
    router.replace({ name: "home" })
    return
  }

  // apply default focus_time (minutes) to both forms
  const defMin = Number(userStore.currentUser?.focus_time ?? 15)
  publicForm.value.hours = Math.floor(defMin / 60)
  publicForm.value.minutes = defMin % 60
  privateForm.value.hours = Math.floor(defMin / 60)
  privateForm.value.minutes = defMin % 60
})

function createSession() {
  if (!canCreateSession.value) return
  startModalOpen.value = true
}

async function onStart(settings) {
  // persist default focus time (optional)
  if (saveAsDefault.value && userStore.currentUser) {
    const totalMin = (form.value.hours * 60 + form.value.minutes)
    try {
      await userStore.updateCurrentUser({ focus_time: totalMin })
    } catch (e) {
      console.warn("Failed to save default focus time:", e)
    }
  }

  const payload = {
    privacy: privacy.value,
    duration: { hours: form.value.hours, minutes: form.value.minutes },
    topic: form.value.topic,
    invitedFriendIds: form.value.selectedFriendIds,
    todos: privacy.value === "private" ? form.value.todos : [],
    settings,
    createdAt: Date.now(),
  }

  const id = sessionStore.createSession(payload)
  router.push({ name: "session-room", params: { id } })
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <Header
      title="Host Session"
      :subtitle="userStore.username ? `Logged in as ${userStore.username}` : 'Set up your study room'"
    />

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

        <TodoList
          v-if="privacy === 'private'"
          v-model="form.todos"
          title="To Do"
        />

        <InviteFriends
          :options="friends"
          v-model="form.selectedFriendIds"
          :max-selected="10"
        />

        <!-- NEW: persist default setting -->
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
