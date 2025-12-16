<script setup>
import { computed } from "vue"
import { useRoute, useRouter } from "vue-router"

const route = useRoute()
const router = useRouter()

const items = [
  { label: "Home", to: "/" , key: "home", icon: "home" },
  { label: "Invitation", to: "/invitation", key: "invitation", icon: "mail" }, // change to your real path
  { label: "Garden", to: "/garden", key: "garden", icon: "plant" },            // change to your real path
]

const isActive = (to) => route.path === to
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-[9999] border-t bg-white">
    <div class="mx-auto max-w px-6">
      <div class="flex items-center justify-around py-3 text-[11px]">
        <button
          v-for="it in items"
          :key="it.key"
          type="button"
          class="relative flex w-20 flex-col items-center gap-1"
          :class="isActive(it.to) ? 'text-black' : 'text-black/50'"
          @click="router.push(it.to)"
        >
          <!-- icon -->
          <span class="block">
            <svg v-if="it.icon === 'home'" width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5Z"
                    :fill="isActive(it.to) ? 'currentColor' : 'none'"
                    stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
            </svg>

            <svg v-else-if="it.icon === 'mail'" width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"
                    stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
              <path d="m4 8 8 6 8-6" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
            </svg>

            <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 21c5-3 8-7 8-11a5 5 0 0 0-8-4 5 5 0 0 0-8 4c0 4 3 8 8 11Z"
                    stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
              <path d="M12 8v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </span>

          <span class="leading-none">{{ it.label }}</span>

          <!-- active underline like iOS -->
          <span
            v-if="isActive(it.to)"
            class="absolute -bottom-2 h-[4px] w-10 rounded-full bg-black"
          />
        </button>
      </div>
    </div>
  </nav>
</template>
