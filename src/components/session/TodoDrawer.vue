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
  // - non-admin always sees personal only (cleanest rule)
  if (props.mode !== "manual") return []
  if (props.isAdmin) return manualScope.value === "session" ? localSessionTodos.value : localPersonalTodos.value
  return localPersonalTodos.value
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
      <div class="absolute inset-0 bg-black/40" @click="close" />
      <div
        class="absolute right-0 top-0 h-full w-full bg-white"
        @click.stop
      >
        <div class="flex items-center justify-between border-b px-4 py-4">
          <button
            class="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5 active:scale-95"
            @click="close"
            aria-label="Back"
          >
            <ArrowLeft />
          </button>
          <div class="text-base font-semibold">To-do list</div>
          <div class="h-9 w-9" />
        </div>
        <div class="px-4 pt-3">
          <div class="flex rounded-full bg-black/5 p-1">
            <button
              class="flex-1 rounded-full py-2 text-sm font-medium"
              :class="mode === 'manual' ? 'bg-[#57B884] text-white' : 'text-black/70'"
              @click="setMode('manual')"
            >
              Manual
            </button>
            <button
              class="flex-1 rounded-full py-2 text-sm font-medium"
              :class="mode === 'ai' ? 'bg-[#57B884] text-white' : 'text-black/70'"
              @click="setMode('ai')"
            >
              ✨ AI
            </button>
          </div>

          <div v-if="mode === 'manual' && isAdmin" class="mt-3 flex gap-2">
            <button
              class="flex-1 rounded-full border py-2 text-xs font-semibold"
              :class="manualScope === 'session' ? 'bg-[#57B884] text-white border-transparent' : 'bg-white text-black/70'"
              @click="manualScope = 'session'"
            >
              Session
            </button>

            <button 
              class="flex-1 rounded-full border py-2 text-xs font-semibold"
              :class="manualScope === 'personal' ? 'bg-[#57B884] text-white border-transparent' : 'bg-white text-black/70'"
              @click="manualScope = 'personal'"
            >
              Individual
            </button>
          </div>
        </div>

        <div class="px-4 pb-6 pt-4">
          <div v-if="mode === 'manual'">
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
