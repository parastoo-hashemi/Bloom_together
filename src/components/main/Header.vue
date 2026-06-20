<script setup>
import { useRouter } from "vue-router"

import ArrowLeft from "@/components/icons/ArrowLeft.vue"

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
  showBack: { type: Boolean, default: true },
})

const router = useRouter()

function goBack() {
  if (window.history.state?.back) {
    router.back()
    return
  }

  router.push("/home")
}
</script>

<template>
  <header class="fixed top-0 left-0 right-0 z-50 border-b border-black/5 bg-white/95 shadow-sm backdrop-blur">
    <div class="mx-auto max-w-screen-md px-4 py-2">
      <div class="flex items-center">
        <button
          v-if="showBack"
          type="button"
          class="inline-grid min-h-[42px] min-w-[42px] place-items-center rounded-xl text-black transition hover:bg-black/5 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
          aria-label="Back"
          @click="goBack"
        >
          <ArrowLeft />
        </button>

        <div class="ml-2 flex min-w-0 items-center">
          <div class="truncate text-sm font-bold tracking-tight">{{ title }}</div>

          <div v-if="subtitle" class="ml-1 truncate text-[11px] text-black/45">
            ( {{ subtitle }} )
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
