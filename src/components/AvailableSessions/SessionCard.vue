<script setup>
import { computed } from "vue"
import UsersIcon from "@/components/icons/UsersIcon.vue"
import ClockIcon from "@/components/icons/ClockIcon.vue"

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  onlineCount: {
    type: Number,
    required: true,
  },
  endsInMinutes: {
    type: Number,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["enter"])

const formattedDuration = computed(() => {
  const h = Math.floor(props.endsInMinutes / 60)
  const m = props.endsInMinutes % 60
  return h > 0 ? `${h}h ${m} min` : `${m} min`
})

</script>

<template>
  <div
    class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/10"
  >
    <!-- Title -->
    <div class="text-sm font-semibold">
      {{ title }}
    </div>

    <!-- Meta row -->
    <div class="mt-2 flex items-center justify-between text-xs text-black/60">
      <div class="flex items-center gap-1">
        <UsersIcon/>
        <span>Onlines: {{ onlineCount }}</span>
      </div>

      <div class="flex items-center gap-1">
        <!-- clock icon -->
          <ClockIcon width="14" height="14" class="currentColor" />
        <span>End In: {{ formattedDuration }}</span>
      </div>
    </div>

    <!-- CTA -->
    <button
      class="mt-4 w-full rounded-xl bg-black py-3 text-sm font-semibold text-white
             disabled:opacity-40 disabled:cursor-not-allowed"
      :disabled="disabled"
      @click="emit('enter')"
    >
      Enter The Session
    </button>
  </div>
</template>
