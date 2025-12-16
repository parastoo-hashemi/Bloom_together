<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import InviteIcon from "../icons/InviteIcon.vue"
import ArrowBottom from "../icons/ArrowBottom.vue"
import RemoveIcon from "../icons/RemoveIcon.vue"

const props = defineProps({
  options: {
    type: Array,
    required: true, // [{ id, name, avatar? }]
  },
  modelValue: {
    type: Array,
    default: () => [], // selected ids
  },
  label: { type: String, default: "Invite Friends" },
  placeholder: { type: String, default: "Select friends" },
  searchPlaceholder: { type: String, default: "Search and username" },
})

const emit = defineEmits(["update:modelValue"])

const rootEl = ref(null)
const controlEl = ref(null)
const dropdownEl = ref(null)

const open = ref(false)
const query = ref("")

const selectedSet = computed(() => new Set(props.modelValue))
const invitedCount = computed(() => props.modelValue.length)

const selectedOptions = computed(() =>
  props.options.filter(o => selectedSet.value.has(o.id))
)

const filteredOptions = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.options.filter(o =>
    q ? String(o.name).toLowerCase().includes(q) : true
  )
})

function toggleOption(id) {
  const has = selectedSet.value.has(id)
  if (has) emit("update:modelValue", props.modelValue.filter(x => x !== id))
  else emit("update:modelValue", [...props.modelValue, id])
}

function removeChip(id) {
  emit("update:modelValue", props.modelValue.filter(x => x !== id))
}

function openDropdown() {
  open.value = true
  query.value = ""
}

function closeDropdown() {
  open.value = false
  query.value = ""
}

function toggleDropdown() {
  if (open.value) closeDropdown()
  else openDropdown()
}

function onDocPointerDown(e) {
  if (!rootEl.value) return

  const inRoot = rootEl.value.contains(e.target)
  if (!inRoot) {
    closeDropdown()
    return
  }

  // If click is inside the component but NOT inside dropdown and NOT inside control -> close
  if (!open.value) return
  const inDropdown = dropdownEl.value?.contains(e.target)
  const inControl = controlEl.value?.contains(e.target)

  if (!inDropdown && !inControl) closeDropdown()
}

onMounted(() => document.addEventListener("pointerdown", onDocPointerDown, true))
onBeforeUnmount(() => document.removeEventListener("pointerdown", onDocPointerDown, true))
</script>

<template>
  <div ref="rootEl" class="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
    <div class="flex items-center justify-between">
      <label class="text-xs font-semibold text-black/60">{{ label }}:</label>
      <span class="text-xs font-semibold text-black/50">
        Invited ({{ invitedCount }})
      </span>
    </div>
    <button
      ref="controlEl"
      type="button"
      class="mt-2 w-full rounded-xl bg-black/5 px-3 py-2"
      @click.stop="toggleDropdown"
    >
      <div class="flex items-center gap-2">
        <span class="text-black/50">
          <InviteIcon/>
        </span>
        <div class="flex-1 text-left">
          <span v-if="invitedCount === 0" class="text-sm text-black/40">
            {{ placeholder }}
          </span>
          <span v-else class="text-sm font-medium text-black/70">
            {{ invitedCount }} friend{{ invitedCount === 1 ? "" : "s" }} selected
          </span>
        </div>
        <span class="text-black/40">
          <ArrowBottom/>
        </span>
      </div>
    </button>
    <div
      v-if="open"
      ref="dropdownEl"
      class="mt-2 rounded-xl bg-white p-2 ring-1 ring-black/10"
      @pointerdown.stop
      @click.stop
    >
      <div class="mb-2 rounded-lg bg-black/5 px-3 py-2">
        <input
          v-model="query"
          class="w-full bg-transparent text-sm outline-none placeholder:text-black/40"
          :placeholder="searchPlaceholder"
          autofocus
        />
      </div>
      <div class="max-h-56 overflow-auto">
        <button
          v-for="o in filteredOptions"
          :key="o.id"
          type="button"
          class="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-black/5"
          @click="toggleOption(o.id)"
        >
          <div class="flex items-center gap-3">
            <img v-if="o.avatar" :src="o.avatar" class="h-7 w-7 rounded-full object-cover" />
            <span class="text-sm font-medium">{{ o.name }}</span>
          </div>

          <span
            class="grid h-5 w-5 place-items-center rounded-md ring-1 ring-black/15"
            :class="selectedSet.has(o.id) ? 'bg-black text-white' : 'bg-white text-transparent'"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </button>
        <div v-if="!filteredOptions.length" class="px-2 py-3 text-sm text-black/45">
          No results
        </div>
      </div>
    </div>
    <div v-if="selectedOptions.length" class="mt-3 flex flex-wrap gap-2">
      <span
        v-for="o in selectedOptions"
        :key="o.id"
        class="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1 text-xs"
      >
        <img v-if="o.avatar" :src="o.avatar" class="h-5 w-5 rounded-full object-cover" />
        <span class="font-medium">{{ o.name }}</span>
        <button
          type="button"
          class="grid h-5 w-5 place-items-center rounded-full hover:bg-black/10"
          @click.stop="removeChip(o.id)"
          aria-label="Remove"
        >
          <RemoveIcon/>
        </button>
      </span>
    </div>
  </div>
</template>
