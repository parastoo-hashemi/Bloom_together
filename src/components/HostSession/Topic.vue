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
   <div class="mb-3 flex items-center gap-2">
    <span class="text-black/70">
        <TopicIcon/>
      </span>
    <h3 class="text-sm font-semibold text-left">{{ label }}</h3>
</div>
    <div class="mt-2 flex items-center gap-2 rounded-xl bg-black/5 px-3 py-2">
      <input
        :value="modelValue"
        @input="emit('update:modelValue', $event.target.value)"
        class="w-full bg-transparent text-sm outline-none placeholder:text-black/40"
        :placeholder="placeholder"
      />
    </div>
  </div>
</template>
