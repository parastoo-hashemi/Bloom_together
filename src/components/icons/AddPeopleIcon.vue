<script setup>
const props = defineProps({
  size: { type: [Number, String], default: 24 },
  strokeWidth: { type: [Number, String], default: 1.8 },
})
</script>

<template>
    <!-- User Plus icon (clean, ChatGPT-like) -->
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
     viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
     aria-hidden="true">
  <!-- head -->
  <path d="M15 7a4 4 0 1 1-8 0a4 4 0 0 1 8 0Z"/>
  <!-- shoulders/body -->
  <path d="M4 21a8 8 0 0 1 16 0"/>
  <!-- plus -->
  <path d="M19 8v6"/>
  <path d="M16 11h6"/>
</svg>

</template>
