<script setup>
import { useRoute, useRouter } from "vue-router"

const route = useRoute()
const router = useRouter()

const items = [
  { label: "Home", to: "/home", key: "home", icon: "home" },
  { label: "Invitation", to: "/invitation", key: "invitation", icon: "invitation" },
  { label: "Garden", to: "/garden", key: "garden", icon: "garden" },
]

const isActive = (to) => (to ? route.path === to : false)

function onClickItem(it) {
  if (it.to) router.push(it.to)
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-[50] border-t border-black/5 bg-white/95 shadow-[0_-8px_24px_rgba(0,0,0,0.05)] backdrop-blur">
    <div class="mx-auto max-w-screen-md px-4">
      <div class="flex items-center justify-around py-2 text-[11px]">
        <button
          v-for="it in items"
          :key="it.key"
          type="button"
          class="relative flex w-20 flex-col items-center gap-1 rounded-2xl px-2 py-2 transition hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
          :class="isActive(it.to) ? 'text-[#2F865B]' : 'text-black/45 hover:text-black'"
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
            <svg xmlns="http://www.w3.org/2000/svg" v-else-if="it.icon === 'garden'" width="22" height="22" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="1.9"
              stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 21v-7"/>
              <path d="M8 17c-3.2-.4-5-2.4-5-5.8 3.5-.2 6 1.4 7 4.8"/>
              <path d="M16 17c3.2-.4 5-2.4 5-5.8-3.5-.2-6 1.4-7 4.8"/>
              <path d="M12 14c-2.2-1.2-3.2-3.2-3-6 2.5.2 4 1.5 4.6 3.8"/>
            </svg>
          </span>

          <span class="leading-none">{{ it.label }}</span>

          <span
            v-if="isActive(it.to)"
            class="absolute -bottom-1 h-[4px] w-10 rounded-full bg-[#57B884]"
          />
        </button>
      </div>
    </div>
  </nav>
</template>
