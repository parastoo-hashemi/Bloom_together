<script setup>
import { computed, ref } from "vue"
import DurationFilter from "@/components/AvailableSessions/DurationFilter.vue"

const props = defineProps({
  duration: { type: String, default: "all" },
  query: { type: String, default: "" },
})

const emit = defineEmits(["update:duration", "update:query"])

const sheetOpen = ref(false)

const durationLabel = computed(() => {
  const map = {
    all: "Filter By Duration",
    "30": "30+ minutes",
    "60": "1+ hour",
    "120": "2+ hours",
  }
  return map[props.duration] || "Filter By Duration"
})
</script>

<template>
  <div class="mt-3 grid grid-cols-2 gap-3">
    <!-- Filter by duration trigger -->
    <button
      type="button"
      class="flex items-center justify-between rounded-xl bg-black/5 px-3 py-2 text-xs text-black/70"
      @click="sheetOpen = true"
    >
      <span class="truncate">{{ durationLabel }}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="shrink-0 text-black/40">
        <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>

    <!-- Search -->
    <div class="flex items-center gap-2 rounded-xl bg-black/5 px-3 py-2">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-black/40">
        <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
        <path d="m21 21-4.3-4.3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>

      <input
        class="w-full bg-transparent text-xs text-black/70 outline-none placeholder:text-black/35"
        placeholder="Search By Name"
        :value="query"
        @input="emit('update:query', $event.target.value)"
      />
    </div>

    <!-- Bottom sheet -->
    <DurationFilter
      v-model:open="sheetOpen"
      :model-value="duration"
      @update:modelValue="emit('update:duration', $event)"
    />
  </div>
</template>
