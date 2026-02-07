<script setup>
import FailedFlower from "@/components/icons/FailedFlower.vue"
/**
 * Screens:
 * 1 = success (terminal) -> full screen
 * 2 = confirm early exit (reversible) -> small centered modal
 * 3 = failed/time up (terminal) -> full screen
 */

const props = defineProps({
  open: { type: Boolean, required: true },
  screen: { type: Number, required: true },

  title: { type: String, default: "Session" },

  // Screen 1
  successTitle: { type: String, default: "Task Completed" },
  successMessage: { type: String, default: "You’ve achieved your goal." },
  successCta: { type: String, default: "Home" },
  successCta2: { type: String, default: "View all garden" },

  // Screen 2
  confirmTitle: { type: String, default: "Math Session" },
  confirmMessage: {
    type: String,
    default: "If you cancel the session, your flower will die.",
  },
  backLabel: { type: String, default: "Go back" },
  confirmLabel: { type: String, default: "End session" },

  // Screen 3
  failedTitle: { type: String, default: "Math Session" },
  failedMessage: {
    type: String,
    default: "Sorry, You are failed",
  },
  failedCta: { type: String, default: "Home Page" },

  // Optional (e.g. 01:51 / 15:00)
  statsText: { type: String, default: "" },
})

const emit = defineEmits(["close", "confirmEnd", "goHome"])

const isTerminal = () => props.screen === 1 || props.screen === 3
</script>

<template>
  <!-- =========================
       Screen 2: SMALL CENTER MODAL
       ========================= -->
  <div
    v-if="open && screen === 2"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow">
      <div class="text-lg font-semibold">
        {{ confirmTitle }}
      </div>

      <p class="mt-2 text-sm text-black/70">
        {{ confirmMessage }}
      </p>

      <div class="mt-5 flex gap-3">
        <button
          class="flex-1 rounded-2xl bg-black/5 py-3 text-sm font-semibold"
          @click="emit('close')"
        >
          {{ backLabel }}
        </button>

        <button
          class="flex-1 rounded-2xl bg-black py-3 text-sm font-semibold text-white"
          @click="emit('confirmEnd')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>

  <!-- =========================
       Screen 1 & 3: FULL PAGE
       ========================= -->
  <div
    v-else-if="open && isTerminal()"
    class="fixed inset-0 z-50 flex flex-col bg-white"
  >
    <!-- Header (no close button; terminal state) -->
    <header class="flex items-center justify-between border-b px-4 py-3">
      <div class="text-lg font-semibold">
        {{ screen === 1 ? title : failedTitle }}
      </div>
      <!-- keep right side spacing consistent -->
      <div class="h-10 w-10"></div>
    </header>

    <main class="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <!-- Screen 1: SUCCESS -->
      <section v-if="screen === 1" class="w-full max-w-sm">
        <div class="text-xl font-semibold">
          {{ successTitle }}
        </div>

        <p class="mt-3 text-sm text-black/70">
          {{ successMessage }}
        </p>

        <button
          class="mt-6 w-full rounded-2xl bg-black/5 py-3 text-sm font-semibold"
          @click="emit('goHome')"
        >
          {{ successCta }}
        </button>
        <button
          disabled
          class="mt-6 w-full rounded-2xl bg-black py-3 text-sm font-semibold text-white"
          @click="emit('goGarden')"
        >
          {{ successCta2 }}
        </button>
      </section>

      <!-- Screen 3: FAILED / TIME UP -->
      <section v-else class="w-full max-w-sm">
         <FailedFlower class="h-auto w-auto mx-auto mb-4" />

        <div class="text-xl font-semibold mt-4">
          {{ failedTitle }}
        </div>

        <p class="mt-3 text-sm text-black/70">
          {{ failedMessage }}
        </p>

        <div v-if="statsText" class="mt-3 font-mono text-base font-semibold">
          {{ statsText }}
        </div>

        <button
          class="mt-6 w-full rounded-2xl bg-black py-3 text-sm font-semibold text-white"
          @click="emit('goHome')"
        >
          {{ failedCta }}
        </button>
      </section>
    </main>
  </div>
</template>
