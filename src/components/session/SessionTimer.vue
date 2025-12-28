<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"

const props = defineProps({
  durationSec: { type: Number, required: true },
  autoStart: { type: Boolean, default: true },
})

/**
 * Events:
 * - tick(payload): fires every second while running
 * - expired(payload): fires once when it reaches 0
 */
const emit = defineEmits(["expired", "tick"])

const total = ref(0)
const remaining = ref(0)

let t = null
let expiredEmitted = false

const elapsed = computed(() => Math.max(0, total.value - remaining.value))

const hh = computed(() => String(Math.floor(remaining.value / 3600)).padStart(2, "0"))
const mm = computed(() => String(Math.floor((remaining.value % 3600) / 60)).padStart(2, "0"))
const ss = computed(() => String(remaining.value % 60).padStart(2, "0"))

function stop() {
  if (t) clearInterval(t)
  t = null
}

function emitTick() {
  const payload = {
    remainingSec: remaining.value,
    elapsedSec: elapsed.value,
    totalSec: total.value,
  }
  emit("tick", payload)
}

function emitExpiredOnce() {
  if (expiredEmitted) return
  expiredEmitted = true
  const payload = {
    remainingSec: 0,
    elapsedSec: total.value,
    totalSec: total.value,
  }
  emit("expired", payload)
}

function start() {
  if (t) return
  // If already at 0, expire immediately (don’t start an interval)
  if (remaining.value <= 0) {
    stop()
    emitExpiredOnce()
    return
  }

  t = setInterval(() => {
    // Decrement first → when it hits 0, expire immediately (no 1-second lag)
    remaining.value = Math.max(0, remaining.value - 1)
    emitTick()

    if (remaining.value === 0) {
      stop()
      emitExpiredOnce()
    }
  }, 1000)
}

function reset(seconds) {
  stop()
  expiredEmitted = false

  const s = Math.max(0, Number(seconds) || 0)
  total.value = s
  remaining.value = s

  // Emit an initial tick so parent can render elapsed/remaining immediately
  emitTick()

  if (props.autoStart && remaining.value > 0) start()
  if (remaining.value === 0) emitExpiredOnce()
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
