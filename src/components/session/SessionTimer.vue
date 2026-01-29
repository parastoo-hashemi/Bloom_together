<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"

const props = defineProps({
  // keep name if you want; semantically this is TOTAL seconds for the session
  durationSec: { type: Number, required: true },

  // epoch milliseconds from backend (session.start_time)
  startTimeMs: { type: [Number, null], default: null },

  autoStart: { type: Boolean, default: true },
})

/**
 * Events:
 * - tick(payload): fires every second while running
 * - expired(payload): fires once when it reaches 0
 */
const emit = defineEmits(["expired", "tick"])

const total = computed(() => Math.max(0, Number(props.durationSec) || 0))

const nowMs = ref(Date.now())
let t = null
let expiredEmitted = false

function stop() {
  if (t) clearInterval(t)
  t = null
}

function calcElapsedSec() {
  if (!props.startTimeMs) return 0
  const e = Math.floor((nowMs.value - Number(props.startTimeMs)) / 1000)
  return Math.max(0, e)
}

const elapsed = computed(() => {
  // clamp to total so elapsed never exceeds total in payload/UI
  return Math.min(calcElapsedSec(), total.value)
})

const remaining = computed(() => Math.max(0, total.value - elapsed.value))

const hh = computed(() => String(Math.floor(remaining.value / 3600)).padStart(2, "0"))
const mm = computed(() => String(Math.floor((remaining.value % 3600) / 60)).padStart(2, "0"))
const ss = computed(() => String(remaining.value % 60).padStart(2, "0"))

function emitTick() {
  emit("tick", {
    remainingSec: remaining.value,
    elapsedSec: elapsed.value,
    totalSec: total.value,
  })
}

function emitExpiredOnce() {
  if (expiredEmitted) return
  expiredEmitted = true
  emit("expired", {
    remainingSec: 0,
    elapsedSec: total.value,
    totalSec: total.value,
  })
}

function step() {
  nowMs.value = Date.now()
  emitTick()
  if (total.value > 0 && remaining.value === 0) {
    stop()
    emitExpiredOnce()
  }
}

function start() {
  if (t) return
  // If there's no anchor, we can't run a meaningful persistent timer.
  // We still emit a tick so parent can render.
  step()
  if (!props.startTimeMs) return

  // If already expired, emit immediately
  if (total.value > 0 && remaining.value === 0) {
    emitExpiredOnce()
    return
  }

  t = setInterval(step, 1000)
}

function reset() {
  stop()
  expiredEmitted = false
  nowMs.value = Date.now()
  emitTick()

  if (props.autoStart) start()
  if (props.startTimeMs && total.value > 0 && remaining.value === 0) emitExpiredOnce()
}

watch(() => [props.durationSec, props.startTimeMs], reset, { immediate: true })

onMounted(() => {
  if (props.autoStart) start()
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
