<script setup>
import { computed, ref } from "vue"

const emit = defineEmits(["add"])
const input = ref("")

const canAdd = computed(() => input.value.trim().length > 0)

function submit() {
  if (!canAdd.value) return
  emit("add", input.value)
  input.value = ""
}
</script>

<template>
  <div class="flex items-center gap-3">
    <input
      v-model="input"
      class="flex-1 rounded-xl bg-white px-3 py-2 text-sm outline-none ring-1 ring-black/10 placeholder:text-black/35"
      placeholder="Add a task ...."
      @keydown.enter="submit"
    />
    <button
      class="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
      :disabled="!canAdd"
      @click="submit"
    >
      Add
    </button>
  </div>
</template>
