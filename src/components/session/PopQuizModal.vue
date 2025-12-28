<script setup>
import { computed, onBeforeUnmount, watch, ref } from "vue"

const props = defineProps({
  open: { type: Boolean, default: false },
  questions: { type: Array, default: () => [] },
  successSeconds: { type: Number, default: 2 },
})

const emit = defineEmits([
  "update:open",
  "completed",
  "canceled",
])
const screen = ref("prompt")

const idx = ref(0)
const selected = ref(null) // optionId
const countdown = ref(props.successSeconds)
let timer = null

// Answers and mistakes
const answers = ref({}) // { [questionId]: optionId }
const wrongItems = ref([]) // [{ qid, questionText, chosenText, correctText, explanation, moreExplanation }]

// per-card expanded "more" (reactive and reliable)
const expandedMore = ref({}) // { [qid]: boolean }

const total = computed(() => props.questions?.length || 0)
const current = computed(() => (total.value ? props.questions[idx.value] : null))
const progressLabel = computed(() => `${Math.min(idx.value + 1, total.value)}/${total.value}`)

// Only prompt screen is dismissible (overlay/ESC)
const canDismiss = computed(() => screen.value === "prompt")

function close() {
  emit("update:open", false)
}

function stopTimer() {
  if (timer) clearInterval(timer)
  timer = null
}

function resetAll() {
  screen.value = "prompt"
  idx.value = 0
  selected.value = null
  countdown.value = props.successSeconds
  answers.value = {}
  wrongItems.value = []
  expandedMore.value = {}
  stopTimer()
}

function onKeydown(e) {
  if (e.key !== "Escape") return
  if (canDismiss.value) close()
  // otherwise ignore ESC
}

watch(
  () => props.open,
  (v) => {
    if (v) {
      resetAll()
      window.addEventListener("keydown", onKeydown)
    } else {
      stopTimer()
      window.removeEventListener("keydown", onKeydown)
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  stopTimer()
  window.removeEventListener("keydown", onKeydown)
})

function onNo() {
  emit("canceled")
  close()
}

function onLetsGo() {
  screen.value = "quiz"
}

function pick(optionId) {
  selected.value = optionId
}

function backOne() {
  if (idx.value <= 0) return
  idx.value -= 1
  const q = props.questions[idx.value]
  selected.value = answers.value[q?.id] ?? null
}

function startSuccessCountdown() {
  stopTimer()
  countdown.value = props.successSeconds

  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      stopTimer()
      emit("completed")
      close()
    }
  }, 1000)
}

function buildWrongItems() {
  const qs = props.questions || []
  const items = []

  for (const q of qs) {
    const chosenId = answers.value[q.id]
    if (!chosenId) continue

    const correctId = q.correctOptionId
    if (chosenId === correctId) continue

    const chosenText = (q.options || []).find((o) => o.id === chosenId)?.text ?? "—"
    const correctText = (q.options || []).find((o) => o.id === correctId)?.text ?? "—"

    items.push({
      qid: q.id,
      questionText: q.text,
      chosenText,
      correctText,
      explanation: q.explanation || "No explanation provided.",
      moreExplanation: q.explanationMore || "",
    })
  }

  wrongItems.value = items
}

function submitAndNext() {
  if (!current.value || selected.value == null) return

  // record answer
  answers.value = { ...answers.value, [current.value.id]: selected.value }

  // next question
  if (idx.value < total.value - 1) {
    idx.value += 1
    const nextQ = props.questions[idx.value]
    selected.value = answers.value[nextQ?.id] ?? null
    return
  }

  // finish and evaluate
  buildWrongItems()

  if (wrongItems.value.length === 0) {
    screen.value = "success"
    startSuccessCountdown()
  } else {
    screen.value = "failSummary"
  }
}

function retry() {
  // restart quiz from scratch
  screen.value = "quiz"
  idx.value = 0
  selected.value = null
  answers.value = {}
  wrongItems.value = []
  expandedMore.value = {}
}

function analyze() {
  screen.value = "analysis"
}

function understood() {
  emit("completed")
    close()
}

// per-card "Explain more" toggling
function isExpanded(qid) {
  return !!expandedMore.value[qid]
}

function toggleMore(qid) {
  expandedMore.value = {
    ...expandedMore.value,
    [qid]: !expandedMore.value[qid],
  }
}

function moreFor(w) {
  if (w.moreExplanation) return w.moreExplanation

  // fallback content if backend doesn't provide explanationMore
  return [
    `Deeper intuition: focus on why "${w.correctText}" addresses the mechanism in the question.`,
    `Common trap: picking an option that sounds related but doesn't solve the core issue.`,
    `Memory hook: rephrase the question as “what prevents the failure mode here?” then map to the correct answer.`,
  ].join(" ")
}
</script>

<template>
  <teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[12000]">
      <!-- overlay: only dismissible on prompt -->
      <div
        class="absolute inset-0 bg-black/40"
        @click="canDismiss ? close() : null"
      />

      <div class="absolute left-1/2 top-1/2 w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2">
        <div class="rounded-3xl bg-white p-4 shadow-xl" @click.stop>
          <!-- PROMPT -->
          <div v-if="screen === 'prompt'" class="py-2">
            <div class="mb-6 text-center text-base font-semibold text-black/80">
              Let's have a pop quiz to make sure you learned. Shall we?
            </div>

            <div class="mt-6 flex gap-3">
              <button
                class="flex-1 rounded-2xl bg-[#111] py-2 text-sm font-semibold text-white hover:opacity-95"
                @click="onNo"
              >
                NO
              </button>

              <button
                class="flex-1 rounded-2xl bg-[#111] py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
                @click="onLetsGo"
                :disabled="total === 0"
              >
                Let's go
              </button>
            </div>

            <div v-if="total === 0" class="mt-3 text-center text-xs text-black/50">
              No questions provided.
            </div>
          </div>

          <!-- QUIZ -->
          <div v-else-if="screen === 'quiz'">
            <div class="mb-3 flex items-center justify-between">
              <div class="text-xs font-semibold text-black/50">{{ progressLabel }}</div>
              <div class="text-xs text-black/40">Pick one answer</div>
            </div>

            <div class="mb-3 text-sm font-semibold text-black/90">
              {{ current?.text }}
            </div>

            <div class="space-y-2">
              <button
                v-for="opt in current?.options || []"
                :key="opt.id"
                class="w-full rounded-2xl border px-3 py-3 text-left text-sm hover:bg-black/5"
                :class="selected === opt.id ? 'bg-[#111] text-white border-transparent' : 'bg-white text-black/80'"
                @click="pick(opt.id)"
              >
                {{ opt.text }}
              </button>
            </div>

            <div class="mt-4 flex gap-3">
              <!-- No back on first question -->
              <button
                v-if="idx > 0"
                class="flex-1 rounded-2xl border py-2 text-sm font-semibold text-black/70 hover:bg-black/5"
                @click="backOne"
              >
                Back
              </button>

              <button
                class="rounded-2xl bg-[#111] py-2 text-sm font-semibold text-white disabled:opacity-60"
                :class="idx > 0 ? 'flex-1' : 'w-full'"
                @click="submitAndNext"
                :disabled="selected == null"
              >
                {{ idx === total - 1 ? "Finish" : "Next" }}
              </button>
            </div>
          </div>

          <!-- SUCCESS -->
          <div v-else-if="screen === 'success'" class="py-8 text-center">
            <div class="text-4xl font-extrabold tracking-wide text-[#111]">WELL DONE!</div>
            <div class="mt-6 text-sm text-black/70">
              You answered all questions correctly.
            </div>

            <div class="mt-8 text-xs text-black/50">
              Returning in <span class="font-semibold">{{ countdown }}s</span>
            </div>
          </div>

          <!-- FAIL SUMMARY (Oops) -->
          <div v-else-if="screen === 'failSummary'" class="py-8 text-center">
            <div class="text-4xl font-extrabold tracking-wide text-[#111]">Oops!</div>

            <div class="mt-6 text-sm text-black/70">
              You had <span class="font-semibold">{{ wrongItems.length }}</span>
              mistake{{ wrongItems.length === 1 ? "" : "s" }}.
            </div>

            <div class="mt-8 flex gap-3">
              <button
                class="flex-1 rounded-2xl bg-[#111] py-2 text-sm font-semibold text-white"
                @click="analyze"
              >
                Analyze the mistake
              </button>

              <button
                class="flex-1 rounded-2xl bg-[#111] py-2 text-sm font-semibold text-white"
                @click="retry"
              >
                Try again
              </button>
            </div>
          </div>

          <!-- ANALYSIS SCREEN -->
          <div v-else class="py-2">
            <div class="mb-3 text-xs font-semibold text-black/50">
              Mistakes ({{ wrongItems.length }})
            </div>

            <div class="space-y-3 max-h-[55vh] overflow-auto pr-1">
              <div
                v-for="w in wrongItems"
                :key="w.qid"
                class="rounded-2xl border p-3"
              >
                <div class="text-sm font-semibold text-black/90">
                  {{ w.questionText }}
                </div>

                <div class="mt-2 text-xs text-black/50">Correct answer</div>
                <div class="mt-1 rounded-xl bg-black/5 px-3 py-2 text-sm text-black/80">
                  {{ w.correctText }}
                </div>

                <div class="mt-2 text-xs text-black/50">Explanation</div>
                <div class="mt-1 text-sm text-black/70 leading-relaxed">
                  {{ w.explanation }}
                </div>

                <div class="mt-3 flex justify-end">
                  <button
                    class="rounded-xl bg-[#111] px-3 py-2 text-xs font-semibold text-white"
                    @click.stop.prevent="toggleMore(w.qid)"
                  >
                    {{ isExpanded(w.qid) ? "Hide" : "Explain more" }}
                  </button>
                </div>

                <div
                  v-if="isExpanded(w.qid)"
                  class="mt-3 rounded-2xl bg-black/5 px-3 py-3 text-sm text-black/70 leading-relaxed"
                >
                  {{ moreFor(w) }}
                </div>
              </div>
            </div>

            <div class="mt-4 flex gap-3">
              <button
                class="flex-1 rounded-2xl border py-2 text-sm font-semibold text-black/70 hover:bg-black/5"
                @click="understood"
              >
                Understood
              </button>

              <button
                class="flex-1 rounded-2xl bg-[#111] py-2 text-sm font-semibold text-white"
                @click="retry"
              >
                Try again
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  </teleport>
</template>
