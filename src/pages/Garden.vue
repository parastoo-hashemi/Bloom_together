<script setup>
import { computed, defineComponent, h, onMounted, ref } from "vue"

import { api } from "@/Api/http.js"
import Header from "@/components/main/Header.vue"
import NavBar from "@/components/main/NavBar.vue"

const sessions = ref([])
const loading = ref(false)
const error = ref("")
const activeRange = ref("week")

const tabs = [
  { key: "week", label: "Last Week" },
  { key: "month", label: "Last Month" },
  { key: "all", label: "All Time" },
]

async function loadSessions() {
  loading.value = true
  error.value = ""

  try {
    sessions.value = await fetchCompletedSessions()
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to load garden"
    sessions.value = []
  } finally {
    loading.value = false
  }
}

async function fetchCompletedSessions() {
  try {
    const completedResponse = await api("/api/sessions/completed")
    return normalizeCompletedPayload(completedResponse)
  } catch {
    const tableResponse = await api("/api/db/table/sessions")
    return normalizeCompletedPayload(tableResponse)
  }
}

function normalizeCompletedPayload(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.rows)
        ? payload.rows
        : []

  return rows
    .filter(isCompletedSession)
    .filter(isSuccessfulSession)
    .map(normalizeSession)
    .filter(Boolean)
    .sort((a, b) => b.completedAt - a.completedAt)
}

function isCompletedSession(session) {
  return Boolean(
    session?.ended_at ??
      session?.endedAt ??
      session?.completed_at ??
      session?.completedAt ??
      session?.date
  )
}

function isSuccessfulSession(session) {
  const value =
    session?.completion_success ??
    session?.completionSuccess ??
    session?.success ??
    session?.completed_successfully ??
    session?.completedSuccessfully

  return value === true || value === 1 || value === "1"
}

function normalizeSession(session, index) {
  const completedAt = getSessionCompletedAt(session)
  if (!completedAt) return null

  const todos = [
    ...parseList(session.todos),
    ...parseList(session.personal_todos ?? session.personalTodos),
    ...parseList(session.ai_todos ?? session.aiTodos),
  ]

  return {
    id: session.id ?? `${completedAt.getTime()}-${index}`,
    topic: session.topic?.trim() || "Study Session",
    completedAt,
    tasksCompleted: getTasksCompleted(session, todos),
  }
}

function getSessionCompletedAt(session) {
  const raw =
    session.ended_at ??
    session.endedAt ??
    session.completed_at ??
    session.completedAt ??
    session.date ??
    session.start_time ??
    session.startTime ??
    session.createdAt

  if (!raw) return null

  const date = typeof raw === "number" ? new Date(raw) : new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseList(value) {
  if (Array.isArray(value)) return value
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function isTodoDone(todo) {
  if (typeof todo?.done === "boolean") return todo.done
  if (typeof todo?.completed === "boolean") return todo.completed
  return false
}

function getTasksCompleted(session, todos) {
  const explicitCount =
    session.tasksCompleted ??
    session.tasks_completed ??
    session.completedTasks ??
    session.completed_tasks

  if (explicitCount !== undefined) {
    return Math.max(1, Number(explicitCount) || 1)
  }

  const doneCount = todos.filter(isTodoDone).length
  if (doneCount > 0) return doneCount

  return Math.max(1, todos.length || 1)
}

function startOfDay(date) {
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)
  return day
}

function dayKey(date) {
  const day = startOfDay(date)
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`
}

function isWithinLastDays(date, days) {
  const today = startOfDay(new Date())
  const earliest = new Date(today)
  earliest.setDate(today.getDate() - (days - 1))

  const checkedDay = startOfDay(date)
  return checkedDay >= earliest && checkedDay <= today
}

function calculateStreak(sessionList) {
  if (sessionList.length === 0) return 0

  const bloomDays = new Set(sessionList.map((session) => dayKey(session.completedAt)))
  const today = startOfDay(new Date())
  const latestBloomDay = startOfDay(sessionList[0].completedAt)
  const cursor = bloomDays.has(dayKey(today)) ? today : latestBloomDay

  let count = 0
  while (bloomDays.has(dayKey(cursor))) {
    count += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return count
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function bloomTitle(session) {
  const tasks = `${session.tasksCompleted} completed task${session.tasksCompleted === 1 ? "" : "s"}`
  return `${session.topic} · ${tasks} · ${formatDate(session.completedAt)}`
}

function tabClass(key) {
  return activeRange.value === key
    ? "bg-[#57B884] text-white shadow-sm"
    : "text-black/60 hover:bg-white hover:text-black"
}

function flowerSize(session) {
  if (session.tasksCompleted >= 6) return 86
  if (session.tasksCompleted >= 3) return 74
  return 62
}

function plantStyle(index) {
  const offsets = [0, 18, 7, 26, 12, 32, 4, 22]
  const rotations = [-3, 2, -1, 4, -4, 1, 3, -2]

  return {
    transform: `translateY(${offsets[index % offsets.length]}px) rotate(${rotations[index % rotations.length]}deg)`,
  }
}

const totalBlooms = computed(() => sessions.value.length)
const streak = computed(() => calculateStreak(sessions.value))
const bloomsLastWeek = computed(() => sessions.value.filter((session) => isWithinLastDays(session.completedAt, 7)).length)
const bloomsLastMonth = computed(() => sessions.value.filter((session) => isWithinLastDays(session.completedAt, 30)).length)

const displayedSessions = computed(() => {
  if (activeRange.value === "all") return sessions.value

  const days = activeRange.value === "week" ? 7 : 30
  return sessions.value.filter((session) => isWithinLastDays(session.completedAt, days))
})

const activeRangeLabel = computed(() => tabs.find((tab) => tab.key === activeRange.value)?.label ?? "Last Week")

const FlowerLocal = defineComponent({
  name: "FlowerLocal",
  props: {
    tasksCompleted: { type: Number, default: 1 },
    size: { type: Number, default: 64 },
  },
  setup(props) {
    return () => {
      const petalCount = Math.min(10, Math.max(5, props.tasksCompleted + 4))
      const petalScale = Math.min(1.25, 0.75 + props.tasksCompleted * 0.08)
      const petals = Array.from({ length: petalCount }, (_, index) => {
        const angle = (360 / petalCount) * index

        return h("ellipse", {
          cx: 50,
          cy: 22,
          rx: 8.5 * petalScale,
          ry: 17 * petalScale,
          fill: index % 2 === 0 ? "#F7A8C7" : "#F7C66A",
          transform: `rotate(${angle} 50 50)`,
        })
      })

      return h(
        "div",
        {
          class: "relative mx-auto grid place-items-center",
          style: { width: `${props.size}px`, height: `${props.size}px` },
        },
        [
          h(
            "svg",
            {
              class: "drop-shadow-sm",
              width: props.size,
              height: props.size,
              viewBox: "0 0 100 100",
              role: "img",
              "aria-label": `${props.tasksCompleted} completed task bloom`,
            },
            [
              h("line", {
                x1: 50,
                y1: 58,
                x2: 50,
                y2: 94,
                stroke: "#57B884",
                "stroke-width": 5,
                "stroke-linecap": "round",
              }),
              h("ellipse", {
                cx: 39,
                cy: 76,
                rx: 8,
                ry: 15,
                fill: "#8DD7A4",
                transform: "rotate(-42 39 76)",
              }),
              h("g", null, petals),
              h("circle", {
                cx: 50,
                cy: 50,
                r: 13 + Math.min(props.tasksCompleted, 8),
                fill: "#FFE8A3",
                stroke: "#111111",
                "stroke-width": 2,
              }),
              h(
                "text",
                {
                  x: 50,
                  y: 55,
                  "text-anchor": "middle",
                  "font-size": 17,
                  "font-weight": 700,
                  fill: "#111111",
                },
                String(props.tasksCompleted)
              ),
            ]
          ),
        ]
      )
    }
  },
})

onMounted(loadSessions)
</script>

<template>
  <div class="min-h-screen bg-[#F7FAF8] text-black">
    <Header title="Garden" subtitle="Successful study blooms" />

    <main class="mx-auto max-w-screen-md px-4 pb-28 pt-16">
      <section
        class="mt-4 rounded-[1.6rem] bg-white/90 p-2 shadow-sm ring-1 ring-black/5 backdrop-blur"
        aria-label="Garden summary"
      >
        <div class="grid grid-cols-[1fr_auto_1fr] items-center rounded-[1.25rem] bg-gradient-to-b from-[#F7FAF8] to-[#E7F5EC] px-3 py-2 ring-1 ring-black/5">
          <article class="flex items-center justify-center gap-3">
            
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-wide text-black/40">Blooms</p>
              <p class="text-[2rem] font-black leading-none tracking-tight text-black">{{ totalBlooms }}</p>
            </div>
          </article>

          <div class="mx-2 h-11 w-px bg-black/10" aria-hidden="true" />

          <article class="flex items-center justify-center gap-3">
            
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-wide text-black/40">Streak</p>
              <p class="text-[2rem] font-black leading-none tracking-tight text-black">{{ streak }}</p>
            </div>
          </article>
        </div>
      </section>

      <section class="mt-4 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-black/5" role="tablist" aria-label="Garden range">
        <div class="grid grid-cols-3 gap-1">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
            :class="tabClass(tab.key)"
            @click="activeRange = tab.key"
            role="tab"
            :aria-selected="activeRange === tab.key"
          >
            {{ tab.label }}
          </button>
        </div>
      </section>

      <section class="mt-5">

        <div v-if="loading" class="rounded-3xl bg-white py-12 text-center text-sm text-black/50 shadow-sm ring-1 ring-black/5">
          Loading blooms...
        </div>

        <div v-else-if="error" class="rounded-3xl bg-red-50 px-4 py-5 text-sm text-red-700 shadow-sm ring-1 ring-red-100">
          {{ error }}
        </div>

        <div v-else-if="sessions.length === 0" class="rounded-3xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-black/5">
          <div class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#57B884]/10 text-3xl">
            🌱
          </div>
          <h3 class="mt-4 text-base font-bold">No blooms yet</h3>
          <p class="mx-auto mt-2 max-w-xs text-sm leading-6 text-black/50">
            Complete every task before the timer ends to plant your first successful bloom.
          </p>
        </div>

        <div v-else-if="displayedSessions.length === 0" class="rounded-3xl bg-white px-6 py-10 text-center shadow-sm ring-1 ring-black/5">
          <h3 class="text-base font-bold">No blooms in this range</h3>
          <p class="mt-2 text-sm text-black/50">Try Last Month or All Time to see older successful sessions.</p>
        </div>

        <div
          v-else
          class="relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-white via-[#F7FAF8] to-[#DFF1E5] px-4 pb-8 pt-6 shadow-sm ring-1 ring-black/5"
          aria-label="Bloom garden bed"
        >
        <div class="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#DFF1E5]/80 via-[#DFF1E5]/50 to-transparent" aria-hidden="true"></div>

          <div class="relative z-[1] flex min-h-[360px] flex-wrap items-end justify-center gap-x-5 gap-y-7 pb-6 sm:gap-x-7 md:gap-x-9">
            <article
            v-for="(session, index) in displayedSessions"
            :key="session.id"
            tabindex="0"
              class="group relative flex w-[128px] flex-col items-center text-center transition hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#57B884] sm:w-[142px]"
              :style="plantStyle(index)"
            :title="bloomTitle(session)"
            :aria-label="bloomTitle(session)"
          >
              <div class="relative grid h-26 w-full place-items-end">
                <FlowerLocal
                  :tasks-completed="session.tasksCompleted"
                  :size="flowerSize(session)"
                />
              </div>

              <div class="-mt-1 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-black shadow-sm ring-1 ring-black/5 backdrop-blur">
                {{ session.tasksCompleted }} task{{ session.tasksCompleted === 1 ? "" : "s" }}
              </div>

              <div class="mt-2 w-full rounded-2xl bg-white/80 px-3 py-2 shadow-sm ring-1 ring-black/5 backdrop-blur transition group-hover:bg-white group-hover:shadow-md">
                <h3 class="truncate text-sm font-bold tracking-tight">{{ session.topic }}</h3>
                <p class="mt-1 text-[11px] font-medium text-black/50">{{ formatDate(session.completedAt) }}</p>
              </div>

              <div
                class="pointer-events-none absolute left-1/2 top-0 z-10 w-max max-w-[220px] -translate-x-1/2 -translate-y-full rounded-2xl bg-black px-3 py-2 text-xs leading-5 text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                {{ bloomTitle(session) }}
              </div>
            </article>
          </div>
        </div>
      </section>
    </main>

    <NavBar />
  </div>
</template>

<style scoped>
.drop-shadow-sm {
  filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.12));
}
</style>
