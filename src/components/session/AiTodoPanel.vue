<script setup>
import { computed, ref } from "vue"
import PopQuizModal from "@/components/session/PopQuizModal.vue"

const props = defineProps({
  /**
   * AI todos – controlled via v-model:todos
   * [{ id, text, done }]
   */
  todos: { type: Array, default: () => [] },
  sessionId: { type: String, required: true },

  disabled: { type: Boolean, default: false },
  title: { type: String, default: "AI tasks" },

  /**
   * Provide questions dynamically (recommended).
   * Signature: (todo) => Question[]
   * If not provided, fallbackQuestions(todo) is used.
   */
  getQuestions: { type: Function, default: null },
  aiGenerated: { type: Boolean, default: false },
  successSeconds: { type: Number, default: 2 },
})

const emit = defineEmits([
  "update:todos",
  "generate",
  "generated",   // ✅ ADD THIS
])

// ----------------------------
// AI composer state
// ----------------------------
const composerOpen = ref(false)
const loading = ref(false)

const note = ref("")
const files = ref([]) // [{ id, file, name, size }]

const canSend = computed(() => !!note.value.trim() || files.value.length > 0)

// ----------------------------
// Quiz gating state
// ----------------------------
const quizOpen = ref(false)
const quizQuestions = ref([])
const pendingTodoId = ref(null)

// ----------------------------
// Composer helpers
// ----------------------------
function openComposer() {
  if (props.disabled) return
  composerOpen.value = true
}
function closeComposer() {
  composerOpen.value = false
}
function resetComposer() {
  note.value = ""
  files.value = []
}
function onPickFiles(e) {
  const picked = Array.from(e?.target?.files || [])
  if (!picked.length) return

  const mapped = picked.map((file) => ({
    id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    file,
    name: file.name,
    size: file.size,
  }))

  files.value = [...files.value, ...mapped]
  e.target.value = ""
}
function removeFile(id) {
  files.value = files.value.filter((f) => f.id !== id)
}

// ----------------------------
// AI generation (placeholder)
// ----------------------------

const API_BASE = "http://localhost:3001"

async function send() {
  if (!canSend.value || props.disabled) return

  loading.value = true
  try {
    const r = await fetch(`${API_BASE}/api/sessions/${props.sessionId}/ai/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note.value.trim(), filesCount: files.value.length }),
    })
    if (!r.ok) throw new Error("AI generate failed")
    const data = await r.json()
    emit("update:todos", data.todos)
    emit("generated")

    closeComposer()
    resetComposer()
  } finally {
    loading.value = false
  }
}



// ----------------------------
// Quiz questions provider
// ----------------------------
function fallbackQuestions(todo) {
  // You WILL replace this with real questions from backend later.
  const topic = (todo?.text || "this topic").slice(0, 80)

  return [
    {
      id: "q1",
      text: `Which is the best next step for: "${topic}"?`,
      options: [
        { id: "a", text: "Break it into smaller sub-tasks" },
        { id: "b", text: "Ignore it" },
        { id: "c", text: "Randomly guess" },
        { id: "d", text: "Delete the todo" },
      ],
      correctOptionId: "a",
      explanation: "Ensure strong addition, subtraction, multiplication, and division.",
      explanationMore: "The foundation, using basic operations (+, -, ×, ÷) on numbers like whole numbers, fractions, and decimals for everyday tasks and complex calculations like interest."
    },
    {
      id: "q2",
      text: "A common problem in basic RNNs is:",
      options: [
        { id: "a", text: "Vanishing gradients" },
        { id: "b", text: "Perfect accuracy" },
        { id: "c", text: "No need for training" },
        { id: "d", text: "Too many colors in images" },
      ],
      correctOptionId: "a",
      explanation:"In RNNs, gradients are multiplied many times during backpropagation through time. These products can shrink toward zero, so the model struggles to learn long-term dependencies.",
      explanationMore: "The main problems with basic RNNs are the vanishing and exploding gradient problems, making them struggle with long-term dependencies (forgetting early info) or becoming unstable/hard to train. This prevents them from learning patterns over long sequences, like distant words in a sentence, leading to poor performance, though solutions like LSTMs, GRUs, and Transformers now largely address these. "
    },
    {
      id: "q3",
      text: "Vanishing gradients directly makes it hard to:",
      options: [
        { id: "a", text: "Learn long-term dependencies" },
        { id: "b", text: "Open a drawer UI" },
        { id: "c", text: "Load PDFs" },
        { id: "d", text: "Render Tailwind" },
      ],
      correctOptionId: "a",
      explanation: "The vanishing gradient problem is a core challenge in training deep neural networks where gradients",
      explanationMore: "The problem is most pronounced in networks with many layers or activation functions prone to small derivatives. For instance, traditional recurrent neural networks (RNNs) processing long sequences often suffer from vanishing gradients because the same weights are reused across time steps."
    },
    {
      id: "q4",
      text: "Which model helps with long-term dependencies?",
      options: [
        { id: "a", text: "LSTM" },
        { id: "b", text: "KNN" },
        { id: "c", text: "PCA" },
        { id: "d", text: "Naive Bayes" },
      ],
      correctOptionId: "a",
      explanation: "Long-term dependencies refer to the challenge in modeling data sequences where relevant information from much earlier steps significantly impacts current predictions",
      explanationMore: "This gated structure lets the LSTM learn when to remember important context (like the subject of a long sentence) and when to forget irrelevant data, a crucial ability for understanding complex sequences."
    },
    {
      id: "q5",
      text: "If you answer all questions correctly, what happens?",
      options: [
        { id: "a", text: "You return automatically after a short delay" },
        { id: "b", text: "The app logs you out" },
        { id: "c", text: "Todos disappear forever" },
        { id: "d", text: "Nothing changes" },
      ],
      correctOptionId: "a",
        explanation: "what happens if you answer all three questions correctly in a diagnostic assessment",
        explanationMore: "Diagnostic assessment examples include informal checks like exit tickets & discussions, quizzes & surveys, skill-based tasks using rubrics (reading fluency, sports skills), concept maps & KWL charts"
    },
  ]
}

function questionsFor(todo) {
  return props.getQuestions ? props.getQuestions(todo) : fallbackQuestions(todo)
}

// ----------------------------
// Todo toggling with quiz gate
// ----------------------------
function requestToggle(todoId, e) {
  const todo = (props.todos || []).find((t) => t.id === todoId)
  if (!todo) return

  const checked = !!e?.target?.checked

  // If user is UN-checking -> allow immediately, no quiz
  if (!checked) {
    const next = props.todos.map((t) => (t.id === todoId ? { ...t, done: false } : t))
    emit("update:todos", next)
    return
  }

  // If user is CHECKing -> quiz gate
  pendingTodoId.value = todoId
  quizQuestions.value = questionsFor(todo)
  quizOpen.value = true
}


async function commitPendingDone() {
  const id = pendingTodoId.value
  pendingTodoId.value = null
  if (!id) return

  const next = (props.todos || []).map((t) => (t.id === id ? { ...t, done: true } : t))
  emit("update:todos", next)

  try {
    await persistAiTodos(next)
  } catch (e) {
    console.error(e)
  }
}


function cancelPendingDone() {
  pendingTodoId.value = null
}

async function cancelQuize() {
  const id = pendingTodoId.value
  pendingTodoId.value = null
  quizOpen.value = false

  if (!id) return

  // Mark that todo as done
  const next = (props.todos || []).map((t) =>
    t.id === id ? { ...t, done: true } : t
  )

  // Update UI immediately
  emit("update:todos", next)

  // Persist to backend
  try {
    await persistAiTodos(next)
  } catch (e) {
    console.error(e)
    // If you want: revert on failure (optional)
    // emit("update:todos", props.todos)
  }
}

async function persistAiTodos(nextTodos) {
  const r = await fetch(`${API_BASE}/api/sessions/${props.sessionId}/ai/todos`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ todos: nextTodos }),
  })
  if (!r.ok) throw new Error("Persist ai todos failed")
  const data = await r.json()
  // optional: sync with server’s merged version
  emit("update:todos", data.todos)
}
</script>

<template>
  <div>
    <!-- Generate CTA -->
    <button
      class="w-full rounded-2xl bg-[#111] py-3 text-sm font-semibold text-white active:scale-[0.99] disabled:opacity-60"
      @click="openComposer"
      :disabled="disabled || loading"
    >
      {{ loading ? "Generating..." : "Generate" }}
    </button>

    <!-- Tasks list -->
    <div class="mt-4">
      <div v-if="!aiGenerated" class="rounded-2xl bg-black/5 p-4 text-sm text-black/70">
        Upload a file or write a note, then press <span class="font-semibold">Generate</span>.
        The AI will create a task list here.
      </div>

      <div v-else class="rounded-2xl border bg-white p-3">
        <div class="mb-2 text-xs font-semibold text-black/50">{{ title }}</div>

        <div class="space-y-2">
          <label
            v-for="t in todos"
            :key="t.id"
            class="flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-black/5"
          >
            <input
              type="checkbox"
              class="mt-1 h-4 w-4"
              :checked="t.done"
              @change="(e) => requestToggle(t.id, e)"
              :disabled="disabled"
            />
            <span class="text-sm" :class="t.done ? 'line-through text-black/40' : 'text-black/90'">
              {{ t.text }}
            </span>
          </label>
        </div>
      </div>
    </div>

    <!-- Composer modal (upload/note) -->
    <teleport to="body">
      <div v-if="composerOpen" class="fixed inset-0 z-[10000]">
        <div class="absolute inset-0 bg-black/40" @click="closeComposer" />

        <div class="absolute left-1/2 top-1/2 w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2">
          <div class="rounded-3xl bg-white p-4 shadow-xl" @click.stop>
            <div class="mb-3 text-base font-semibold">To-do list</div>

            <!-- Upload -->
            <div class="rounded-2xl bg-black/5 p-3">
              <div class="text-xs font-semibold text-black/60">Upload file</div>

              <div class="mt-2 flex items-center justify-between gap-3">
                <label class="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#111] px-3 py-2 text-xs font-semibold text-white">
                  <input type="file" class="hidden" multiple @change="onPickFiles" style="background-color: #57B884;"/>
                  Choose files
                </label>

                <div class="text-xs text-black/50">
                  {{ files.length }} selected
                </div>
              </div>

              <div v-if="files.length" class="mt-3 space-y-2">
                <div
                  v-for="f in files"
                  :key="f.id"
                  class="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2"
                >
                  <div class="min-w-0">
                    <div class="truncate text-xs font-medium text-black/80">{{ f.name }}</div>
                    <div class="text-[11px] text-black/40">{{ Math.ceil(f.size / 1024) }} KB</div>
                  </div>

                  <button
                    class="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-black/50 hover:bg-black/5"
                    @click="removeFile(f.id)"
                    aria-label="Remove file"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            <!-- Note -->
            <div class="mt-4">
              <div class="mb-2 text-xs font-semibold text-black/60">Add note</div>
              <textarea
                v-model="note"
                rows="4"
                class="w-full resize-none rounded-2xl border px-3 py-2 text-sm outline-none focus:border-black/40"
                placeholder="Write context for the AI (topic, goal, deadline...)"
              />
            </div>

            <!-- Actions -->
            <div class="mt-4 flex gap-3">
              <button
                class="flex-1 rounded-2xl border py-2 text-sm font-semibold text-black/70 hover:bg-black/5 disabled:opacity-60"
                @click="closeComposer"
                :disabled="loading"
              >
                Back
              </button>

              <button
                class="flex-1 rounded-2xl bg-[#111] py-2 text-sm font-semibold text-white disabled:opacity-60"
                @click="send"
                :disabled="loading || disabled || !canSend"
              >
                {{ loading ? "Sending..." : "Send" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Quiz modal -->
    <PopQuizModal
      v-model:open="quizOpen"
      :questions="quizQuestions"
      :success-seconds="successSeconds"
      @completed="commitPendingDone"
      @canceled="cancelQuize"
      @failed="cancelPendingDone"
    />
  </div>
</template>
