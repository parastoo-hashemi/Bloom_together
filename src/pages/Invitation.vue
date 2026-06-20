<script setup>
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"

import { api } from "@/Api/http.js"
import Header from "@/components/main/Header.vue"
import NavBar from "@/components/main/NavBar.vue"

const router = useRouter()

const invitations = ref([])
const loading = ref(false)
const error = ref("")
const selectedInvitation = ref(null)

const hasInvitations = computed(() => invitations.value.length > 0)

async function loadInvitations() {
  loading.value = true
  error.value = ""

  try {
    const response = await api("/api/demo/invitations")
    const rows = Array.isArray(response?.data) ? response.data : []

    invitations.value = rows.map((invitation) => ({
      id: invitation.id,
      sessionId: invitation.sessionId ?? invitation.id,
      title: invitation.title || "Private Study Session",
      privacy: invitation.privacy || "private",
      adminName: invitation.adminName || "A friend",
      duration: invitation.duration || { hours: 1, minutes: 0 },
      startTime: invitation.start_time ?? invitation.startTime ?? Date.now(),
      tasks: Array.isArray(invitation.tasks) ? invitation.tasks : [],
      friends: Array.isArray(invitation.friends) ? invitation.friends : [],
    }))
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to load invitations"
    invitations.value = []
  } finally {
    loading.value = false
  }
}

function formatRemaining(invitation) {
  const totalMinutes =
    Number(invitation?.duration?.hours ?? 0) * 60 +
    Number(invitation?.duration?.minutes ?? 0)

  const elapsedMinutes = invitation.startTime
    ? Math.floor((Date.now() - Number(invitation.startTime)) / 60000)
    : 0
  const remaining = Math.max(0, totalMinutes - elapsedMinutes)

  const hours = Math.floor(remaining / 60)
  const minutes = remaining % 60

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h`
  return `${minutes}m`
}

function formatDuration(invitation) {
  const hours = Number(invitation?.duration?.hours ?? 0)
  const minutes = Number(invitation?.duration?.minutes ?? 0)

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h`
  return `${minutes}m`
}

function taskLabel(invitation) {
  const count = invitation.tasks.length
  return `${count} task${count === 1 ? "" : "s"}`
}

function friendsLabel(invitation) {
  const count = invitation.friends.length
  return `${count} friend${count === 1 ? "" : "s"} invited`
}

function openJoinModal(invitation) {
  selectedInvitation.value = invitation
}

function closeJoinModal() {
  selectedInvitation.value = null
}

async function joinInvite(invitation) {
  selectedInvitation.value = null
  invitations.value = invitations.value.filter((item) => item.id !== invitation.id)
  router.push({ name: "session-room", params: { id: invitation.sessionId } })
}

async function declineInvite(invitation) {
  invitations.value = invitations.value.filter((item) => item.id !== invitation.id)
}

onMounted(loadInvitations)
</script>

<template>
  <div class="min-h-screen bg-[#F7FAF8] text-black">
    <Header title="Invitations" subtitle="Private study rooms" />

    <main class="mx-auto max-w-screen-md px-4 pb-28 pt-16">

      <section class="mt-4 grid gap-4 sm:grid-cols-2" aria-label="Private session invitations">
        <div
          v-if="loading"
          class="rounded-3xl bg-white px-6 py-10 text-center text-sm text-black/50 shadow-sm ring-1 ring-black/5 sm:col-span-2"
        >
          Loading invitations...
        </div>

        <div
          v-else-if="error"
          class="rounded-3xl bg-red-50 px-6 py-5 text-sm text-red-700 shadow-sm ring-1 ring-red-100 sm:col-span-2"
          role="alert"
        >
          {{ error }}
        </div>

        <div
          v-else-if="!hasInvitations"
          class="rounded-3xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-black/5 sm:col-span-2"
        >
          <div class="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#57B884]/10 text-2xl" aria-hidden="true">
            ✉
          </div>
          <h2 class="mt-4 text-base font-bold">No invitations right now</h2>
        </div>

        <article
          v-for="invitation in invitations"
          :key="invitation.id"
          class="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md focus-within:ring-[#57B884]/30"
          role="article"
          :aria-label="`${invitation.title}, private invitation from ${invitation.adminName}`"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <h2 class="truncate text-lg font-bold tracking-tight">
                {{ invitation.title }}
              </h2>

              <p class="mt-1 truncate text-sm text-black/55">
                {{ invitation.adminName }} · {{ formatRemaining(invitation) }} left
              </p>
            </div>

            <span class="shrink-0 rounded-full bg-[#57B884]/10 px-3 py-1 text-xs font-bold text-[#2F865B]">
              {{ invitation.tasks.length }} tasks
            </span>
          </div>

          <div class="mt-4 flex items-center justify-between gap-3">
            <p class="text-xs font-medium text-black/40">
              {{ formatDuration(invitation) }} duration
            </p>

            <div class="flex gap-2">
              <button
                type="button"
                class="min-h-10 rounded-2xl bg-[#57B884] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#469D6F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
                :aria-label="`Review and join ${invitation.title}`"
                @click="openJoinModal(invitation)"
              >
                Join
              </button>

              <button
                type="button"
                class="min-h-10 rounded-2xl bg-black px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
                :aria-label="`Decline ${invitation.title}`"
                @click="declineInvite(invitation)"
              >
                Decline
              </button>
            </div>
          </div>
        </article>
      </section>
    </main>

    <teleport to="body">
      <div
        v-if="selectedInvitation"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 backdrop-blur-[1px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-invitation-title"
        aria-describedby="join-invitation-description"
        @click.self="closeJoinModal"
      >
        <section class="max-h-[88vh] w-full max-w-md overflow-auto rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-black/10">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <h2 id="join-invitation-title" class="mt-1 truncate text-2xl font-bold tracking-tight">
                {{ selectedInvitation.title }}
              </h2>
              <div class="flex mt-2">
              <p id="join-invitation-description" class=" text-sm leading-6 text-black/55">
                Hosted by <span class="font-semibold text-black">{{ selectedInvitation.adminName }}</span>.
              </p>
              <span class="shrink-0 rounded-full bg-[#57B884]/10 px-3 py-1 text-xs font-bold text-[#2F865B] my-3 mx-1">
                Private session
              </span>
              </div>
            </div>

            <button
              type="button"
              class="grid h-10 w-10 shrink-0 place-items-center rounded-full transition hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
              aria-label="Close invitation details"
              @click="closeJoinModal"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <div class="mt-5 grid grid-cols-3 gap-2">
            <div class="rounded-2xl bg-[#F7FAF8] px-3 py-3 text-center ring-1 ring-black/5">
              <div class="text-sm font-bold">{{ formatRemaining(selectedInvitation) }}</div>
              <div class="mt-0.5 text-[10px] font-semibold text-black/40">left</div>
            </div>
            <div class="rounded-2xl bg-[#F7FAF8] px-3 py-3 text-center ring-1 ring-black/5">
              <div class="text-sm font-bold">{{ formatDuration(selectedInvitation) }}</div>
              <div class="mt-0.5 text-[10px] font-semibold text-black/40">duration</div>
            </div>
            <div class="rounded-2xl bg-[#F7FAF8] px-3 py-3 text-center ring-1 ring-black/5">
              <div class="text-sm font-bold">{{ selectedInvitation.tasks.length }}</div>
              <div class="mt-0.5 text-[10px] font-semibold text-black/40">tasks</div>
            </div>
          </div>

          <div class="mt-5 rounded-2xl bg-[#F7FAF8] p-3 ring-1 ring-black/5">
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-xs font-bold uppercase tracking-wide text-black/45">Session tasks</h3>
            </div>

            <ul class="mt-3 space-y-2">
              <li
                v-for="task in selectedInvitation.tasks"
                :key="task.id"
                class="flex items-start gap-2 rounded-xl bg-white px-3 py-2 text-sm text-black/70 shadow-sm ring-1 ring-black/5"
              >
                <span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#57B884]" aria-hidden="true"></span>
                <span>{{ task.text }}</span>
              </li>
            </ul>
          </div>

          <div class="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              class="min-h-11 rounded-2xl bg-[#57B884] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#469D6F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
              :aria-label="`Join ${selectedInvitation.title}`"
              @click="joinInvite(selectedInvitation)"
            >
              Join
            </button>

            <button
              type="button"
              class="min-h-11 rounded-2xl bg-black px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
              @click="closeJoinModal"
            >
              Cancel
            </button>
          </div>
        </section>
      </div>
    </teleport>

    <NavBar />
  </div>
</template>

<style scoped>
</style>
