<script setup>
import { ref, watch } from "vue"
import TodoAddRow from "@/components/session/TodoAddRow.vue"

const props = defineProps({
  open: { type: Boolean, default: false },     // v-model:open
  todos: { type: Array, default: () => [] },   // [{id, text, done?}]
})

const emit = defineEmits(["update:open", "update:todos"])

const localTodos = ref([])

watch(
  () => props.todos,
  (v) => {
    localTodos.value = (v || []).map((x) => ({ ...x, done: !!x.done }))
  },
  { immediate: true }
)

function close() {
  emit("update:open", false)
}

function addTask(text) {
  const t = text.trim()
  if (!t) return
  const item = {
    id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
    text: t,
    done: false,
  }
  localTodos.value = [item, ...localTodos.value]
  emit("update:todos", localTodos.value)
}

function toggleDone(id) {
  localTodos.value = localTodos.value.map((x) =>
    x.id === id ? { ...x, done: !x.done } : x
  )
  emit("update:todos", localTodos.value)
}

function removeTask(id) {
  localTodos.value = localTodos.value.filter((x) => x.id !== id)
  emit("update:todos", localTodos.value)
}
</script>

<template>
  <teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[9999]">
      <!-- overlay -->
      <div class="absolute inset-0 bg-black/40" @click="close"></div>

      <!-- right drawer -->
      <div class="absolute right-0 top-0 h-full w-[78%] max-w-[360px] bg-white shadow-2xl">
        <div class="flex items-center justify-between border-b px-4 py-4">
          <div class="text-sm font-extrabold tracking-wide">MY TO-DO</div>
          <button
            class="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5"
            @click="close"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <div class="p-4">
          <TodoAddRow @add="addTask" />

          <div class="mt-4 space-y-2">
            <div
              v-for="t in localTodos"
              :key="t.id"
              class="flex items-center justify-between rounded-xl bg-black/5 px-3 py-2"
            >
              <button
                class="mr-3 grid h-6 w-6 place-items-center rounded-md bg-white ring-1 ring-black/20"
                @click="toggleDone(t.id)"
                aria-label="Toggle done"
              >
                <svg v-if="t.done" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>

              <p class="flex-1 text-sm" :class="t.done ? 'text-black/50 line-through' : 'text-black/80'">
                {{ t.text }}
              </p>

              <button
                class="ml-3 grid h-7 w-7 place-items-center rounded-full bg-white/70 hover:bg-white"
                @click="removeTask(t.id)"
                aria-label="Remove"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            </div>

            <div v-if="!localTodos.length" class="text-sm text-black/40">
              No tasks yet.
            </div>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>
