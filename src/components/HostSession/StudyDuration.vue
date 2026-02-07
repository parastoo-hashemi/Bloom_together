<script setup>
import ClockIcon from "@/components/icons/ClockIcon.vue"

const props = defineProps({
  hours: {
    type: Number,
    default: 0,
  },
  minutes: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits([
  "update:hours",
  "update:minutes",
])
</script>

<template>
  <div class="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
    <div class="">
    <div class="mb-3 flex items-center gap-2">
      <span class="text-black/70">
           <ClockIcon class="text-black" />
      </span>
      <h3 class="text-sm font-semibold">Study Duration</h3>
    </div>
      <div class="flex items-center gap-2 rounded-xl bg-black/5 px-3 py-2">
        <select
          :value="hours"
          @change="emit('update:hours', Number($event.target.value))"
          class="bg-transparent text-sm font-semibold outline-none"
        >
          <option v-for="h in 13" :key="h - 1" :value="h - 1">
            {{ h - 1 }}
          </option>
        </select>
        <span class="text-sm text-black/60">hours</span>

        <select
          :value="minutes"
          @change="emit('update:minutes', Number($event.target.value))"
          class="bg-transparent text-sm font-semibold outline-none"
        >
          <option :value="0">00</option>
          <option :value="5">05</option>
          <option :value="15">15</option>
          <option :value="30">30</option>
          <option :value="45">45</option>
        </select>
        <span class="text-sm text-black/60">min</span>
      </div>
    </div>
  </div>
</template>
