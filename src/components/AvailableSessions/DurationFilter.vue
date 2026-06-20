<script setup>
import { computed, ref, watch } from "vue"
import BottomSheet from "@/components/main/BottomSheet.vue"

const props = defineProps({
  open: { type: Boolean, default: false },          // v-model:open
  modelValue: { type: String, default: "all" },     // v-model
})

const emit = defineEmits(["update:open", "update:modelValue"])

const options = [
  { value: "all", label: "Any duration" },
  { value: "30", label: "30+ minutes" },
  { value: "60", label: "1+ hour" },
  { value: "120", label: "2+ hours" },
]

const draft = ref(props.modelValue)

watch(() => props.open, (isOpen) => {
  if (isOpen) draft.value = props.modelValue
})

const selectedLabel = computed(() =>
  options.find(o => o.value === props.modelValue)?.label || "Filter By Duration"
)

function reset() {
  draft.value = "all"
}

function apply() {
  emit("update:modelValue", draft.value)
  emit("update:open", false)
}
</script>

<template>
  <BottomSheet
    :open="open"
    @update:open="emit('update:open', $event)"
    title="Filter By Duration"
  >
    <div class="space-y-3">
      <div class="text-xs text-black/60">
        Current: <span class="font-semibold text-black">{{ selectedLabel }}</span>
      </div>

      <!-- radio list -->
      <div class="space-y-2">
        <button
          v-for="o in options"
          :key="o.value"
          type="button"
          class="flex w-full items-center justify-between rounded-2xl px-4 py-3 ring-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
          :class="draft === o.value ? 'bg-[#57B884] text-white ring-[#57B884]' : 'bg-white text-black ring-black/10 hover:bg-[#F7FAF8]'"
          @click="draft = o.value"
        >
          <span class="text-sm font-medium">{{ o.label }}</span>

          <span
            class="grid h-5 w-5 place-items-center rounded-full ring-1"
            :class="draft === o.value ? 'ring-white/40 bg-white/10' : 'ring-black/20 bg-white'"
          >
            <span v-if="draft === o.value" class="h-2.5 w-2.5 rounded-full bg-white"></span>
          </span>
        </button>
      </div>

      <!-- actions -->
      <div class="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          class="rounded-2xl bg-black/5 py-3 text-sm font-semibold text-black transition hover:bg-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
          @click="reset"
        >
          Reset
        </button>

        <button
          type="button"
          class="rounded-2xl bg-[#57B884] py-3 text-sm font-semibold text-white transition hover:bg-[#469D6F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57B884]"
          @click="apply"
        >
          Apply
        </button>
      </div>
    </div>
  </BottomSheet>
</template>
