<script setup>
import ArrowLeft from "@/components/icons/ArrowLeft.vue"

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: "",
  },
  showBack: {
    type: Boolean,
    default: true,
  },
})
</script>

<template>
  <header class="mx-auto">
    <div class="flex items-center">
      <!-- Back button -->
      <button
        v-if="showBack"
        class="inline-grid place-items-center min-w-[42px] min-h-[42px] rounded-md text-black transition active:scale-95"
        aria-label="Back"
      >
        <ArrowLeft />
      </button>

      <!-- Title block -->
      <div class="ml-2 flex items-center">
        <div class="text-sm font-semibold">
          {{ title }}
        </div>

        <div
          v-if="subtitle"
          class="ml-1 text-[11px] text-black/50"
        >
          ( {{ subtitle }} )
        </div>
      </div>
    </div>
  </header>
</template>
