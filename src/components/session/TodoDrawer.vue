<script setup>
import { computed, ref, watch } from "vue"
import ArrowLeft from "@/components/icons/ArrowLeft.vue"
import TodoAddRow from "@/components/session/TodoAddRow.vue"
import TodoListPanel from "@/components/session/TodoListPanel.vue"
import AiTodoPanel from "@/components/session/AiTodoPanel.vue"

// Props
const props = defineProps({
  open: { type: Boolean, default: false },              // v-model:open
  mode: { type: String, default: "manual" },            // v-model:mode ("manual" | "ai")
  isAdmin: { type: Boolean, default: false },
  isPrivate: { type: Boolean, default: false },
  aiTodos: { type: Array, default: () => [] },
  sessionId: { type: String, required: true },
  isGenerate: { type: Boolean, required: true },
  // Two scopes (so you can support "Session" + "Individual")
  sessionTodos: { type: Array, default: () => [] },     // shared tasks
  personalTodos: { type: Array, default: () => [] },    // user-only tasks
})

// Emits
const emit = defineEmits([
  "update:open",
  "update:mode",
  "update:sessionTodos",
  "update:personalTodos",
  "update:aiTodos",
  "generatedAi"
])

// Manual sub-tab: only meaningful for admin (Session vs Individual)
const manualScope = ref("session") // "session" | "personal"

// local copies (avoid mutating props)
const localSessionTodos = ref([])
const localPersonalTodos = ref([])

watch(
  () => props.sessionTodos,
  (v) => (localSessionTodos.value = normalize(v)),
  { immediate: true }
)

watch(
  () => props.personalTodos,
  (v) => (localPersonalTodos.value = normalize(v)),
  { immediate: true }
)

const aiTodosModel = computed({
  get: () => props.aiTodos,
  set: (v) => emit("update:aiTodos", v),
});

function normalize(v) {
  return (v || []).map((x) => ({
    id: x.id ?? String(Date.now()),
    text: String(x.text ?? ""),
    done: !!x.done,
  }))
}

function close() {
  emit("update:open", false)
}

function setMode(next) {
  emit("update:mode", next)
}

const activeTodos = computed(() => {
  // Manual tab:
  // - admin can choose session vs personal
  // - non-admin edits personal only, while session tasks are shown read-only
  if (props.mode !== "manual") return []
  if (props.isAdmin) return manualScope.value === "session" ? localSessionTodos.value : localPersonalTodos.value
  return localPersonalTodos.value
})

const readOnlySessionTodos = computed(() => {
  if (props.mode !== "manual" || props.isAdmin) return []
  return localSessionTodos.value
})

function commitTodos(next) {
  if (props.mode !== "manual") return

  if (props.isAdmin) {
    if (manualScope.value === "session") emit("update:sessionTodos", next)
    else emit("update:personalTodos", next)
  } else {
    emit("update:personalTodos", next)
  }
}

const API_BASE = "http://localhost:3001"

async function persistManualTodos(next) {
  // decide which field we are editing
  const isSessionScope = props.isAdmin && manualScope.value === "session"
  const payload = isSessionScope
    ? { todos: next }                 // session shared todos
    : { personal_todos: next }        // personal todos

  const r = await fetch(`${API_BASE}/api/sessions/${props.sessionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!r.ok) {
    const text = await r.text().catch(() => "")
    throw new Error(`Persist manual todos failed: ${r.status} ${text}`)
  }
}

async function toggleSessionTaskDone(id) {
  const next = localSessionTodos.value.map((x) =>
    x.id === id ? { ...x, done: !x.done } : x
  )

  localSessionTodos.value = next
  emit("update:sessionTodos", next)

  try {
    await persistSessionTodos(next)
  } catch (e) {
    console.error(e)
  }
}

async function persistSessionTodos(next) {
  const r = await fetch(`${API_BASE}/api/sessions/${props.sessionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ todos: next }),
  })

  if (!r.ok) {
    const text = await r.text().catch(() => "")
    throw new Error(`Persist session todos failed: ${r.status} ${text}`)
  }
}


async function addTask(text) {
  const t = text.trim()
  if (!t) return

  const item = {
    id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
    text: t,
    done: false,
  }

  const next = [item, ...activeTodos.value]

  if (props.isAdmin && manualScope.value === "session") localSessionTodos.value = next
  else localPersonalTodos.value = next

  commitTodos(next)

  try {
    await persistManualTodos(next)
  } catch (e) {
    console.error(e)
    // optional: revert UI if you want strict consistency
  }
}


async function toggleDone(id) {
  const next = activeTodos.value.map((x) => (x.id === id ? { ...x, done: !x.done } : x))

  if (props.isAdmin && manualScope.value === "session") localSessionTodos.value = next
  else localPersonalTodos.value = next

  commitTodos(next)

  try {
    await persistManualTodos(next)
  } catch (e) {
    console.error(e)
  }
}


async function removeTask(id) {
  const next = activeTodos.value.filter((x) => x.id !== id)

  if (props.isAdmin && manualScope.value === "session") localSessionTodos.value = next
  else localPersonalTodos.value = next

  commitTodos(next)

  try {
    await persistManualTodos(next)
  } catch (e) {
    console.error(e)
  }
}
</script>

<template>
  <teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[9999]">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-[1px]" @click="close" />
      <div
        class="absolute right-0 top-0 h-full w-full bg-[#F7FAF8]"
        @click.stop
      >
        <div class="flex items-center justify-between border-b border-black/5 bg-white/95 px-4 py-4 shadow-sm backdrop-blur">
          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-full transition hover:bg-black/5 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
            @click="close"
            aria-label="Back"
          >
            <ArrowLeft />
          </button>
          <div class="text-base font-bold tracking-tight">To-do list</div>
          <div class="h-9 w-9" />
        </div>
        <div class="px-4 pt-3">
          <div class="flex rounded-2xl bg-white p-1 shadow-sm ring-1 ring-black/5">
            <button
              type="button"
              class="flex-1 rounded-xl py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
              :class="mode === 'manual' ? 'bg-[#57B884] text-white shadow-sm' : 'text-black/70 hover:bg-black/5'"
              @click="setMode('manual')"
            >
              Manual
            </button>
            <button
              type="button"
              class="flex-1 rounded-xl py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
              :class="mode === 'ai' ? 'bg-[#57B884] text-white shadow-sm' : 'text-black/70 hover:bg-black/5'"
              @click="setMode('ai')"
            >
              ✨ AI
            </button>
          </div>
          <div v-if="!readOnlySessionTodos.length">
<div v-if="mode === 'manual' && isPrivate" class="mt-3 flex gap-2">
            <button
              type="button"
              class="flex-1 rounded-full border py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
              :class="manualScope === 'session' ? 'bg-[#57B884] text-white border-transparent' : 'bg-white text-black/70 hover:bg-black/5'"
              @click="manualScope = 'session'"
            >
              Session
            </button>

            <button 
              type="button"
              class="flex-1 rounded-full border py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
              :class="manualScope === 'personal' ? 'bg-[#57B884] text-white border-transparent' : 'bg-white text-black/70 hover:bg-black/5'"
              @click="manualScope = 'personal'"
            >
              Individual
            </button>
          </div>
          </div>
        </div>

        <div class="px-4 pb-6 pt-4">
          <div v-if="mode === 'manual'">
            <section
              v-if="readOnlySessionTodos.length"
              class="mb-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
              aria-label="Host session tasks"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-sm font-bold tracking-tight">Session Tasks</h3>
                  <p class="mt-1 text-xs text-black/45">Created by the host. You should mark them complete.</p>
                </div>
              </div>

              <ul class="mt-3 space-y-2">
                <li
                  v-for="task in readOnlySessionTodos"
                  :key="task.id"
                  class="rounded-xl bg-[#F7FAF8] text-sm text-black/75 ring-1 ring-black/5 transition hover:bg-white hover:shadow-sm"
                >
                  <button
                    type="button"
                    class="flex w-full items-start gap-2 px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
                    :aria-label="`${task.done ? 'Mark incomplete' : 'Mark complete'}: ${task.text}`"
                    @click="toggleSessionTaskDone(task.id)"
                  >
                    <span
                      class="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-md bg-white ring-1 ring-black/15"
                      aria-hidden="true"
                    >
                      <svg v-if="task.done" width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </span>
                    <span :class="task.done ? 'text-black/45 line-through' : ''">{{ task.text }}</span>
                  </button>
                </li>
              </ul>
            </section>

            <div v-if="!isAdmin" class="mb-3">
              <h3 class="text-sm font-bold tracking-tight">My Tasks</h3>
              <p class="mt-1 text-xs text-black/45">Add personal tasks for your own study flow.</p>
            </div>

            <TodoAddRow @add="addTask" />

            <TodoListPanel
              class="mt-4"
              :todos="activeTodos"
              @toggle="toggleDone"
              @remove="removeTask"
            />
          </div>

          <!-- AI (placeholder for your next message UI) -->
         <div  v-else class="mt-4">
              <AiTodoPanel 
              :session-id="props.sessionId"
              :aiGenerated="props.isGenerate"
               @generated="emit('generatedAi')" 
                v-model:todos="aiTodosModel"
              />
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>
