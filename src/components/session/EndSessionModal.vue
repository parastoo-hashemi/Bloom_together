<script setup>
import FailedFlower from "@/components/icons/FailedFlower.vue"

/**
 * Screens:
 * 1 = success (terminal) -> full screen
 * 2 = confirm early exit (reversible) -> small centered modal
 * 3 = failed/time up (terminal) -> full screen
 */

defineProps({
  open: { type: Boolean, required: true },
  screen: { type: Number, required: true },

  title: { type: String, default: "Session" },

  // Screen 1
  successTitle: { type: String, default: "Session Completed!" },
  successMessage: { type: String, default: "Nice work. Your progress has been saved to your garden." },
  successCta: { type: String, default: "Home" },
  successCta2: { type: String, default: "View Garden" },

  // Screen 2
  confirmTitle: { type: String, default: "Session" },
  confirmMessage: {
    type: String,
    default: "Ending early will mark this session as incomplete. You can go back and continue.",
  },
  backLabel: { type: String, default: "Go Back" },
  confirmLabel: { type: String, default: "End Session" },

  // Screen 3
  failedTitle: { type: String, default: "Session" },
  failedMessage: {
    type: String,
    default: "This session ended before completion.",
  },
  failedCta: { type: String, default: "Home" },

  // Optional (e.g. 01:51 / 15:00)
  statsText: { type: String, default: "" },
})

const emit = defineEmits(["close", "confirmEnd", "goHome", "goGarden"])

const isTerminal = (screen) => screen === 1 || screen === 3

const confirmTitleId = "end-session-confirm-title"
const confirmDescriptionId = "end-session-confirm-description"
const terminalTitleId = "end-session-terminal-title"
const terminalDescriptionId = "end-session-terminal-description"
</script>

<template>
  <div
    v-if="open && screen === 2"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-[1px]"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="confirmTitleId"
    :aria-describedby="confirmDescriptionId"
    @click.self="emit('close')"
  >
    <section class="w-full max-w-sm rounded-3xl bg-white p-5 text-center shadow-2xl ring-1 ring-black/10">
      <div class="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#FFF0EA] text-[#C75B3C]">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 8v5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M12 16.5h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
          <path
            d="M10.3 4.3 2.8 17.2A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.8L13.7 4.3a2 2 0 0 0-3.4 0Z"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linejoin="round"
          />
        </svg>
      </div>

      <p class="mt-4 text-xs font-semibold uppercase tracking-wide text-black/40">
        {{ confirmTitle }}
      </p>

      <h2 :id="confirmTitleId" class="mt-1 text-2xl font-bold tracking-tight">
        End Session?
      </h2>

      <p :id="confirmDescriptionId" class="mx-auto mt-3 max-w-xs text-sm leading-6 text-black/60">
        {{ confirmMessage }}
      </p>

      <div class="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          class="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black shadow-sm ring-1 ring-black/5 transition hover:bg-[#F7FAF8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
          @click="emit('close')"
        >
          {{ backLabel }}
        </button>

        <button
          type="button"
          class="rounded-2xl bg-[#57B884] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#469D6F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
          @click="emit('confirmEnd')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </section>
  </div>

  <div
    v-else-if="open && isTerminal(screen)"
    class="fixed inset-0 z-50 flex flex-col bg-[#F7FAF8]"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="terminalTitleId"
    :aria-describedby="terminalDescriptionId"
  >
    <header class="border-b border-black/5 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
      <div class="mx-auto flex max-w-screen-md items-center justify-center">
        <p class="truncate text-sm font-bold tracking-tight text-black/70">
          {{ screen === 1 ? title : failedTitle }}
        </p>
      </div>
    </header>

    <main class="flex flex-1 items-center justify-center px-4 py-8 text-center">
      <section class="w-full max-w-sm rounded-3xl bg-white px-5 py-8 shadow-sm ring-1 ring-black/5">
        <template v-if="screen === 1">
          <div class="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#57B884]/10 text-[#2F865B]">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>

          <h2 :id="terminalTitleId" class="mt-5 text-2xl font-bold tracking-tight">
            {{ successTitle }}
          </h2>

          <p :id="terminalDescriptionId" class="mx-auto mt-3 max-w-xs text-sm leading-6 text-black/60">
            {{ successMessage }}
          </p>

          <div class="mt-6 space-y-3">
            <button
              type="button"
              class="w-full rounded-2xl bg-[#57B884] py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#469D6F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
              @click="emit('goGarden')"
            >
              {{ successCta2 }}
            </button>

            <button
              type="button"
              class="w-full rounded-2xl bg-white py-3 text-sm font-semibold text-black shadow-sm ring-1 ring-black/5 transition hover:bg-[#F7FAF8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
              @click="emit('goHome')"
            >
              {{ successCta }}
            </button>
          </div>
        </template>

        <template v-else>
          <div class="mx-auto grid h-28 w-28 place-items-center rounded-full bg-[#FFF0EA] mb-16">
            <FailedFlower class="h-auto w-auto" />
          </div>

          <p class="mt-5 text-xs font-semibold uppercase tracking-wide text-black/40">
            {{ failedTitle }}
          </p>

          <h2 :id="terminalTitleId" class="mt-1 text-2xl font-bold tracking-tight">
            Session Incomplete
          </h2>

          <p :id="terminalDescriptionId" class="mx-auto mt-3 max-w-xs text-sm leading-6 text-black/60">
            {{ failedMessage }}
          </p>

          <!-- <div
            v-if="statsText"
            class="mx-auto mt-4 rounded-2xl bg-[#F7FAF8] px-4 py-3 font-mono text-base font-semibold ring-1 ring-black/5"
          >
            {{ statsText }}
          </div> -->

          <button
            type="button"
            class="mt-6 w-full rounded-2xl bg-[#57B884] py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#469D6F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
            @click="emit('goHome')"
          >
            {{ failedCta }}
          </button>
        </template>
      </section>
    </main>
  </div>
</template>

<style scoped>
</style>
