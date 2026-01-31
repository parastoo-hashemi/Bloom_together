<script setup>
import { useRoute, useRouter } from "vue-router"

const route = useRoute()
const router = useRouter()

const items = [
  { label: "Home", to: "/host", key: "home", icon: "home" },
  { label: "Sessions", to: "/sessions", key: "sessions", icon: "mail" },
  { label: "Invitation", to: "/invitation", key: "invitation", icon: "invitation" }
]

const isActive = (to) => (to ? route.path === to : false)

function onClickItem(it) {
  if (it.to) router.push(it.to)
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-[50] border-t bg-white">
    <div class="mx-auto max-w px-6">
      <div class="flex items-center justify-around py-3 text-[11px]">
        <button
          v-for="it in items"
          :key="it.key"
          type="button"
          class="relative flex w-20 flex-col items-center gap-1"
          :class="isActive(it.to) ? 'text-black' : 'text-black/50'"
          @click="onClickItem(it)"
        >
          <!-- icon -->
          <span class="block">
            <svg v-if="it.icon === 'home'" width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5Z"
                    :fill="isActive(it.to) ? 'currentColor' : 'none'"
                    stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" v-else-if="it.icon === 'mail'" width="22" height="22" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <!-- list (available sessions) -->
              <path d="M3 7h7"/>
              <path d="M3 12h7"/>
              <path d="M3 17h7"/>

              <!-- door (enter/join) -->
              <path d="M14 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/>
              <path d="M14 6v12"/>
              <circle cx="18.5" cy="12" r="0.8"/>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg"  v-else-if="it.icon === 'invitation'" width="22" height="22"  viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M2 6l10 7 10-7"/>
            </svg>
          </span>

          <span class="leading-none">{{ it.label }}</span>

          <span
            v-if="isActive(it.to)"
            class="absolute -bottom-2 h-[4px] w-10 rounded-full bg-black"
          />
        </button>
      </div>
    </div>
  </nav>
</template>
