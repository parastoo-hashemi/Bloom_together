<script setup>
defineProps({
  todos: { type: Array, default: () => [] },
})

const emit = defineEmits(["toggle", "remove"])
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="t in todos"
      :key="t.id"
      class="flex items-center justify-between rounded-xl bg-black/5 px-3 py-2"
    >
      <button
        class="mr-3 grid h-6 w-6 place-items-center rounded-md bg-white ring-1 ring-black/20"
        @click="emit('toggle', t.id)"
        aria-label="Toggle done"
      >
        <svg v-if="t.done" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <p
        class="flex-1 text-sm"
        :class="t.done ? 'text-black/50 line-through' : 'text-black/80'"
      >
        {{ t.text }}
      </p>

      <button
        class="ml-3 grid h-7 w-7 place-items-center rounded-full bg-white/70 hover:bg-white"
        @click="emit('remove', t.id)"
        aria-label="Remove"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <div v-if="!todos.length" class="text-sm text-black/40">
      No tasks yet.
    </div>
  </div>
</template>
