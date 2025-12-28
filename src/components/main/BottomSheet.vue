<script setup>
import { onBeforeUnmount, onMounted } from "vue"

const props = defineProps({
  open: { type: Boolean, default: false },          // v-model:open
  title: { type: String, default: "" },
  closeOnBackdrop: { type: Boolean, default: true },
})

const emit = defineEmits(["update:open"])

function close() {
  emit("update:open", false)
}

function onBackdropClick() {
  if (!props.closeOnBackdrop) return
  close()
}

function onKeyDown(e) {
  if (!props.open) return
  if (e.key === "Escape") close()
}

onMounted(() => window.addEventListener("keydown", onKeyDown))
onBeforeUnmount(() => window.removeEventListener("keydown", onKeyDown))
</script>

<template>
  <teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[9999]">
      <!-- backdrop -->
      <div class="absolute inset-0 bg-black/30" @click="onBackdropClick"></div>

      <!-- sheet -->
      <div class="absolute inset-x-0 bottom-0">
        <div class="mx-auto max-w rounded-t-3xl bg-white shadow-xl ring-1 ring-black/10">
          <!-- grabber -->
          <div class="flex justify-center pt-3">
            <div class="h-1.5 w-10 rounded-full bg-black/10"></div>
          </div>

          <!-- header -->
          <div class="flex items-center justify-between px-5 pt-4">
            <div class="text-sm font-semibold">{{ title }}</div>
            <button
              class="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5"
              @click="close"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <!-- content -->
          <div class="px-5 pb-5 pt-4">
            <slot />
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>
