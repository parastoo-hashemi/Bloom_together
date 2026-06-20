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
  <section class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Session filters">
    <!-- Filter by duration trigger -->
    <button
      type="button"
      class="flex min-h-11 items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm text-black/70 shadow-sm ring-1 ring-black/5 transition hover:bg-[#F7FAF8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
      @click="sheetOpen = true"
    >
      <span class="truncate">{{ durationLabel }}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="shrink-0 text-black/40">
        <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>

    <!-- Search -->
    <div class="flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/5 focus-within:ring-[#57B884]/40">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="text-black/40">
        <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
        <path d="m21 21-4.3-4.3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>

      <input
        class="w-full bg-transparent text-sm text-black outline-none placeholder:text-black/35"
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
  </section>
</template>
