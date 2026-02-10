<script setup>
import { computed, ref, watch } from "vue"

const props = defineProps({
  open: { type: Boolean, default: false }, // v-model:open
})

const emit = defineEmits(["update:open", "start"])

const doNotDisturb = ref(true)
const silent = ref(true)
const vibrant = ref(true)

const payload = computed(() => ({
  doNotDisturb: doNotDisturb.value,
  silent: silent.value,
  vibrant: vibrant.value,
}))

watch(
  () => props.open,
  (v) => {
    // Optional: reset defaults each time it opens
    if (v) {
      doNotDisturb.value = true
      silent.value = true
      vibrant.value = true
    }
  }
)

function close() {
  emit("update:open", false)
}

function start() {
  emit("start", payload.value)
  close()
}
</script>

<template>
  <teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50">
      <!-- Overlay -->
      <div class="absolute inset-0 bg-black/40" @click="close"></div>

      <!-- Modal -->
      <div class="absolute inset-0 flex items-center justify-center px-6">
        <div class="w-full max-w-[320px] rounded-2xl bg-white p-4 shadow-xl">
          <div class="flex items-start justify-between">
            <div class="text-center w-full pr-6">
              <div class="text-sm font-semibold">Are you ready to start</div>
              <div class="text-sm font-semibold -mt-0.5">the session?</div>
            </div>

            <button
              type="button"
              class="-mr-1 -mt-1 grid h-8 w-8 place-items-center rounded-full hover:bg-black/5"
              aria-label="Close"
              @click="close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <div class="mt-3 space-y-3">
            <!-- Row component-ish -->
            <div class="flex items-center justify-between">
              <span class="text-sm text-black/70">Do not disturb</span>
              <button
                type="button"
                class="h-6 w-11 rounded-full p-0.5 transition"
                :class="doNotDisturb ? 'bg-blue-600' : 'bg-black/20'"
                @click="doNotDisturb = !doNotDisturb"
                aria-label="Toggle do not disturb"
              >
                <span
                  class="block h-5 w-5 rounded-full bg-white transition"
                  :class="doNotDisturb ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-sm text-black/70">Silent</span>
              <button
                type="button"
                class="h-6 w-11 rounded-full p-0.5 transition"
                :class="silent ? 'bg-blue-600' : 'bg-black/20'"
                @click="silent = !silent"
                aria-label="Toggle silent"
              >
                <span
                  class="block h-5 w-5 rounded-full bg-white transition"
                  :class="silent ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-sm text-black/70">vibrant</span>
              <button
                type="button"
                class="h-6 w-11 rounded-full p-0.5 transition"
                :class="vibrant ? 'bg-blue-600' : 'bg-black/20'"
                @click="vibrant = !vibrant"
                aria-label="Toggle vibrant"
              >
                <span
                  class="block h-5 w-5 rounded-full bg-white transition"
                  :class="vibrant ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              class="rounded-xl bg-black/10 py-2 text-sm font-semibold text-black"
              @click="close"
            >
              Go Back
            </button>

            <button
              type="button" style="background-color: #57B884;"
              class="rounded-xl bg-black py-2 text-sm font-semibold text-white"
              @click="start"
            >
              Start
            </button>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>
