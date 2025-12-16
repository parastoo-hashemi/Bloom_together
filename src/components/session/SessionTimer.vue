<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"

const props = defineProps({
  durationSec: { type: Number, required: true },
  autoStart: { type: Boolean, default: true },
})

const emit = defineEmits(["expired", "tick"])

const remaining = ref(0)
let t = null

const hh = computed(() => String(Math.floor(remaining.value / 3600)).padStart(2, "0"))
const mm = computed(() => String(Math.floor((remaining.value % 3600) / 60)).padStart(2, "0"))
const ss = computed(() => String(remaining.value % 60).padStart(2, "0"))

function stop() {
  if (t) clearInterval(t)
  t = null
}

function start() {
  if (t) return
  t = setInterval(() => {
    if (remaining.value <= 0) {
      stop()
      emit("expired")
      return
    }
    remaining.value -= 1
    emit("tick", remaining.value)
  }, 1000)
}

function reset(seconds) {
  stop()
  remaining.value = Math.max(0, Number(seconds) || 0)
  if (props.autoStart && remaining.value > 0) start()
}

watch(() => props.durationSec, (v) => reset(v), { immediate: true })

onMounted(() => {
  if (props.autoStart && remaining.value > 0) start()
})

onBeforeUnmount(stop)
</script>

<template>
  <div class="flex items-end justify-center gap-3">
    <div class="text-sm font-semibold text-black/70">End In:</div>
    <div class="font-mono text-4xl tracking-wider">
      {{ hh }} : {{ mm }} : {{ ss }}
    </div>
  </div>
</template>
