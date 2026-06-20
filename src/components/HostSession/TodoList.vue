<script setup>
import { computed, ref } from "vue"
import ToDoListIcon from '../icons/ToDoListIcon.vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [], // [{ id, text }]
  },
  title: {
    type: String,
    default: "To Do",
  },
  placeholder: {
    type: String,
    default: "Add a task ....",
  },
  addLabel: {
    type: String,
    default: "Add",
  },
  maxItems: {
    type: Number,
    default: Infinity,
  },
})

const emit = defineEmits(["update:modelValue"])

const input = ref("")

const canAdd = computed(() => input.value.trim().length > 0 && props.modelValue.length < props.maxItems)

function addTask() {
  const text = input.value.trim()
  if (!text) return
  if (props.modelValue.length >= props.maxItems) return

  const newItem = {
    id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
    text,
  }

  emit("update:modelValue", [newItem, ...props.modelValue])
  input.value = ""
}

function removeTask(id) {
  emit("update:modelValue", props.modelValue.filter(t => t.id !== id))
}
</script>

<template>
  <section class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
    <div class="mb-3 flex items-center gap-2">
      <span class="text-black/70">
            <ToDoListIcon/>
      </span>
      <h3 class="text-sm font-semibold">{{ title }}</h3>
    </div>

    <div class="flex items-center gap-3">
      <input
        v-model="input"
        class="flex-1 rounded-xl bg-[#F7FAF8] px-3 py-2 text-sm outline-none ring-1 ring-black/5 placeholder:text-black/35 focus:ring-[#57B884]/40"
        :placeholder="placeholder"
        @keydown.enter="addTask"
      />
      <button
        type="button"
        class="rounded-xl bg-[#57B884] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#469D6F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#57B884]"
        :disabled="!canAdd"
        @click="addTask"
      >
        {{ addLabel }}
      </button>
    </div>

    <!-- List -->
    <div class="mt-4 space-y-2">
      <div
        v-for="t in modelValue"
        :key="t.id"
        class="flex items-center justify-between rounded-xl bg-[#F7FAF8] px-3 py-2 ring-1 ring-black/5"
      >
        <p class="text-sm text-black/80">{{ t.text }}</p>

        <button
          type="button"
          class="grid h-7 w-7 place-items-center rounded-full bg-white/80 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
          aria-label="Delete"
          @click="removeTask(t.id)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  </section>
</template>
