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
  <article class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md">
    <!-- Title -->
    <h2 class="truncate text-base font-bold tracking-tight">
      {{ title }}
    </h2>

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
      type="button"
      class="mt-4 w-full rounded-xl bg-[#57B884] py-3 text-sm font-semibold text-white transition hover:bg-[#469D6F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#57B884]"
      :disabled="disabled"
      @click="emit('enter')"
    >
      Enter The Session
    </button>
  </article>
</template>
