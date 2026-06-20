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
      class="flex-1 rounded-xl bg-white px-3 py-2 text-sm outline-none ring-1 ring-black/10 placeholder:text-black/35 focus:ring-[#57B884]/40"
      placeholder="Add a task ...."
      @keydown.enter="submit"
    />
    <button
      type="button"
      class="rounded-xl bg-[#57B884] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#469D6F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#57B884]"
      :disabled="!canAdd"
      @click="submit"
    >
      Add
    </button>
  </div>
</template>
