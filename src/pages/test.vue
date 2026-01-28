<script setup>
import { onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { api } from "@/Api/http";

const users = await api("/api/users"); // GET
await api(`/api/users/mario`, { method: "PUT", body: JSON.stringify({ flowers: 3 }) });

</script>

<template>
</template>
