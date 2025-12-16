<script setup>
import TopicIcon from '../icons/TopicIcon.vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  label: {
    type: String,
    default: "Topic:",
  },
  placeholder: {
    type: String,
    default: "e.g. Math",
  },
})

const emit = defineEmits(["update:modelValue"])
</script>

<template>
  <div class="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
    <label class="block text-xs font-semibold text-black/60">
      {{ label }}
    </label>

    <div class="mt-2 flex items-center gap-2 rounded-xl bg-black/5 px-3 py-2">
      <!-- icon -->
      <span class="text-black/50">
        <TopicIcon/>
      </span>

      <input
        :value="modelValue"
        @input="emit('update:modelValue', $event.target.value)"
        class="w-full bg-transparent text-sm outline-none placeholder:text-black/40"
        :placeholder="placeholder"
      />
    </div>
  </div>
</template>
