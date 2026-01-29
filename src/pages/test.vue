<script setup>
import { onMounted } from "vue";

onMounted(async () => {
  const res = await fetch("/api/users");
  const json = await res.json();
  console.log('json', json);
});

</script>

<template>
    <h1>Test</h1>
</template>
