<script setup>
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"

import { useAuthStore } from "@/stores/auth.js"
import { api } from "@/Api/http.js"
import NavBar from "@/components/main/NavBar.vue"

const router = useRouter()
const authStore = useAuthStore()

// Garden stats populated from GET /api/garden
const flowersCount = ref(0)
const successHistory = ref([])   // garden history rows filtered to outcome === 'success'

const goAvailable = () => router.push("/sessions")
const goHost     = () => router.push("/host")
const goGarden   = () => router.push("/garden")

// ── Dev-only: silently log in the single known user so API calls carry a token.
// Remove / replace once a proper login page is wired up.
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
  } catch {
    // backend unreachable — page will show zeros, no crash
  }
}

// ── Fetch real garden data from backend
async function loadGardenStats() {
  await ensureToken()

  try {
    // GET /api/garden → { flowers_count, history: [{ outcome, ended_at, topic, ... }] }
    const { flowers_count, history } = await api("/api/garden")

    flowersCount.value = flowers_count ?? 0

    // Only successful sessions contribute to the bloom count and streak.
    successHistory.value = (history ?? [])
      .filter(f => f.outcome === "success")
      .map(f => ({
        ...f,
        completedAt: new Date(f.ended_at),  // ISO string → Date for streak calc
      }))
      .sort((a, b) => b.completedAt - a.completedAt)  // newest first

  } catch (err) {
    console.error("Failed to load garden stats:", err.message)
    flowersCount.value = 0
    successHistory.value = []
  }
}

// ── Streak helpers (unchanged logic — just moved to use successHistory)
function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function dayKey(date) {
  const d = startOfDay(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function calculateStreak(list) {
  if (list.length === 0) return 0

  const bloomDays = new Set(list.map(s => dayKey(s.completedAt)))
  const today = startOfDay(new Date())
  const latest = startOfDay(list[0].completedAt)
  const cursor = bloomDays.has(dayKey(today)) ? today : latest

  let count = 0
  while (bloomDays.has(dayKey(cursor))) {
    count++
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
}

// ── Computed stats
const totalBlooms = computed(() => flowersCount.value)
const streak      = computed(() => calculateStreak(successHistory.value))

// ── Dynamic greeting from the auth store (falls back to "Mario" if not yet loaded)
const displayName = computed(() => {
  const name = authStore.user?.username ?? "mario"
  return name.charAt(0).toUpperCase() + name.slice(1)
})
const avatarInitial = computed(() => (authStore.user?.username ?? "M").charAt(0).toUpperCase())

onMounted(loadGardenStats)
</script>

<template>
  <main class="min-h-screen bg-[#F7FAF8] px-4 pb-28 pt-6 text-black">
    <section class="mx-auto max-w-screen-md">
      <div class="flex items-center justify-between gap-4">
        <div class="min-w-0">
          <p class="text-xs font-semibold uppercase tracking-wide text-[#2F865B]">Bloom Together</p>
          <h1 class="mt-1 truncate text-3xl font-bold tracking-tight">Hello, {{ displayName }}</h1>
          <p class="mt-1 text-sm leading-6 text-black/50">Ready to grow your focus today?</p>
        </div>

        <div
          class="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-[#57B884] text-base font-bold text-white shadow-sm ring-4 ring-white"
          :aria-label="`${displayName} profile`"
          role="img"
        >
          {{ avatarInitial }}
        </div>
      </div>
    </section>

    <section class="mx-auto mt-6 grid max-w-screen-md grid-cols-2 gap-3" aria-label="Garden stats">
      <article class="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-black/40">Current Streak</p>
            <h2 class="mt-2 text-4xl font-bold tracking-tight">{{ streak }}</h2>
          </div>
          <span class="grid h-10 w-10 place-items-center rounded-2xl bg-[#57B884]/10 text-lg" aria-hidden="true">✓</span>
        </div>
        <p class="mt-3 text-xs font-medium text-black/45">Consecutive successful days</p>
      </article>

      <article class="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-black/40">Total Blooms</p>
            <h2 class="mt-2 text-4xl font-bold tracking-tight">{{ totalBlooms }}</h2>
          </div>
          <span class="grid h-10 w-10 place-items-center rounded-2xl bg-[#57B884]/10 text-lg" aria-hidden="true">🌱</span>
        </div>
        <p class="mt-3 text-xs font-medium text-black/45">Completed, successful sessions</p>
      </article>
    </section>

    <section class="mx-auto mt-7 max-w-screen-md" aria-labelledby="home-actions-title">
      <div class="mb-3 flex items-end justify-between">
        <div>
          <h2 id="home-actions-title" class="text-lg font-bold tracking-tight">Start studying</h2>
          <p class="mt-1 text-xs text-black/45">Choose what you want to do next.</p>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          class="group flex min-h-[132px] w-full items-center justify-between rounded-3xl bg-[#57B884] p-5 text-left text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#469D6F] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884] sm:col-span-2"
          aria-label="View available study sessions"
          @click="goAvailable"
        >
          <span class="min-w-0">
            <span class="block text-xl font-bold tracking-tight">Available Session</span>
            <span class="mt-2 block max-w-xs text-sm leading-6 text-white/85">Join an active co-study room and grow your focus with others.</span>
          </span>
          <span class="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/20 text-3xl transition group-hover:scale-105" aria-hidden="true">
            👥
          </span>
        </button>

        <button
          type="button"
          class="group flex min-h-[118px] w-full items-center justify-between rounded-3xl bg-white p-5 text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
          aria-label="Create and host a study session"
          @click="goHost"
        >
          <span class="min-w-0">
            <span class="block text-base font-bold tracking-tight">Host Session</span>
            <span class="mt-2 block text-sm leading-6 text-black/50">Create your own study room.</span>
          </span>
          <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#57B884]/10 text-2xl text-[#2F865B] transition group-hover:scale-105" aria-hidden="true">
            ＋
          </span>
        </button>

        <button
          type="button"
          class="group flex min-h-[118px] w-full items-center justify-between rounded-3xl bg-white p-5 text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
          aria-label="Open your garden"
          @click="goGarden"
        >
          <span class="min-w-0">
            <span class="block text-base font-bold tracking-tight">Garden</span>
            <span class="mt-2 block text-sm leading-6 text-black/50">Review your completed blooms.</span>
          </span>
          <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#57B884]/10 text-2xl transition group-hover:scale-105" aria-hidden="true">
            🌱
          </span>
        </button>
      </div>
    </section>
  </main>

  <NavBar />
</template>
