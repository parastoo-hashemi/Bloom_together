<script setup>
import { onBeforeUnmount, onMounted } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()
let timerId

onMounted(() => {
  timerId = window.setTimeout(() => {
    router.push("/home")
  }, 1200)
})

onBeforeUnmount(() => {
  window.clearTimeout(timerId)
})
</script>

<template>
  <main
    class="relative flex min-h-screen overflow-hidden bg-gradient-to-b from-[#F7FAF8] via-white to-[#DFF1E5] px-6 text-black"
    aria-labelledby="intro-title"
  >
    <div class="mx-auto flex w-full max-w-sm flex-col items-center justify-center py-12 sm:max-w-md">
      <div class="animate-logo-bloom">
        <svg
          class="h-44 w-44 drop-shadow-sm sm:h-56 sm:w-56"
          viewBox="0 0 220 220"
          fill="none"
          role="img"
          aria-label="Bloom flower logo"
        >
          <g stroke="#07543B" stroke-width="8" stroke-linejoin="round">
            <path d="M110 106C82 76 83 43 110 16C137 43 138 76 110 106Z" fill="#EF5C86" />
            <path d="M105 109C65 107 43 85 43 47C82 45 105 69 105 109Z" fill="#A978E2" />
            <path d="M115 109C115 69 138 45 177 47C177 85 155 107 115 109Z" fill="#FF8B4D" />
            <path d="M101 117C67 139 36 132 20 99C54 77 85 83 101 117Z" fill="#DB39C7" />
            <path d="M119 117C153 83 184 77 200 99C184 132 153 139 119 117Z" fill="#FBC84D" />
            <path d="M103 125C98 163 72 183 34 177C38 139 65 119 103 125Z" fill="#8051D5" />
            <path d="M117 125C155 119 182 139 186 177C148 183 122 163 117 125Z" fill="#42D28D" />
            <path d="M110 132C136 160 135 192 110 216C85 192 84 160 110 132Z" fill="#6EC6E8" />
          </g>
          <circle cx="110" cy="110" r="30" fill="#F7CF69" stroke="#07543B" stroke-width="8" />
          <path d="M110 139V196" stroke="#07543B" stroke-width="8" stroke-linecap="round" />
        </svg>
      </div>

      <section class="mt-8 text-center">
        <h1 id="intro-title" class="text-5xl font-black lowercase tracking-tight text-[#07543B] sm:text-6xl">
          bloom
        </h1>
        <p class="mt-3 text-sm font-medium text-black/50 sm:text-base">
          Grow your focus, one session at a time.
        </p>
      </section>

      <div class="mt-10 h-1.5 w-36 overflow-hidden rounded-full bg-[#57B884]/15" aria-label="Loading Bloom">
        <div class="h-full rounded-full bg-[#57B884] animate-loading-bar" />
      </div>
    </div>

    <p class="absolute inset-x-0 bottom-8 px-6 text-center text-xs font-semibold uppercase tracking-[0.22em] text-[#07543B]/45">
      Bloom Together
    </p>
  </main>
</template>

<style scoped>
.animate-logo-bloom {
  animation: logo-bloom 900ms ease-out both, logo-float 3.4s ease-in-out 1s infinite;
}

.animate-loading-bar {
  animation: loading-bar 4s linear both;
}

@keyframes logo-bloom {
  0% {
    opacity: 0;
    transform: translateY(18px) scale(0.92);
  }
  65% {
    opacity: 1;
    transform: translateY(-4px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes logo-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@keyframes loading-bar {
  0% {
    width: 0%;
  }
  100% {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .animate-logo-bloom,
  .animate-loading-bar {
    animation: none;
  }

  .animate-loading-bar {
    width: 100%;
  }
}
</style>
