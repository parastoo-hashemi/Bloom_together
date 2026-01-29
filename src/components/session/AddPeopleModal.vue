<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import ArrowLeft from "@/components/icons/ArrowLeft.vue"
import AddPeopleIcon from "@/components/icons/AddPeopleIcon.vue"

const props = defineProps({
  open: { type: Boolean, default: false },
  options: { type: Array, required: true },     // [{id,name,avatar,email?}]
  modelValue: { type: Array, default: () => [] } // invited ids
})

const emit = defineEmits(["update:open", "update:modelValue", "send"])

const invited = ref([])
watch(
  () => props.modelValue,
  (v) => (invited.value = Array.isArray(v) ? [...v] : []),
  { immediate: true }
)

const username = ref("")

const dropdownOpen = ref(false)
const search = ref("")
const panelRef = ref(null)

const invitedCount = computed(() => invited.value.length)

const filteredOptions = computed(() => {
  const q = search.value.trim().toLowerCase()
  const base = props.options || []
  if (!q) return base
  return base.filter((u) =>
    u.name?.toLowerCase().includes(q) ||
    String(u.id).includes(q) ||
    (u.email && u.email.toLowerCase().includes(q))
  )
})

const invitedUsers = computed(() => {
  const map = new Map((props.options || []).map(u => [u.id, u]))
  return invited.value.map(id => map.get(id)).filter(Boolean)
})

function close() {
  dropdownOpen.value = false
  emit("update:open", false)
}

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
}

function toggleId(id) {
  const s = new Set(invited.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)

  invited.value = Array.from(s)
  emit("update:modelValue", invited.value) // 🔥 immediate persist
}

function removeInvited(id) {
  invited.value = invited.value.filter(x => x !== id)
  emit("update:modelValue", invited.value) // immediate remove
}

function onSend() {
  const v = username.value.trim()
  if (!v) return
  emit("send", v)
  username.value = ""
}

function onDocDown(e) {
  if (!dropdownOpen.value) return
  if (!panelRef.value) return
  if (panelRef.value.contains(e.target)) return
  dropdownOpen.value = false
}

onMounted(() => document.addEventListener("mousedown", onDocDown))
onBeforeUnmount(() => document.removeEventListener("mousedown", onDocDown))
</script>

<template>
  <teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[9999]">
      <div class="absolute inset-0 bg-black/40" @click="close"></div>

      <div class="absolute right-0 top-0 h-full w-[78%] max-w-[360px] bg-white shadow-2xl">
        <div class="flex items-center gap-2 border-b px-4 py-3">
          <button
            type="button"
            class="grid h-10 w-10 place-items-center rounded-full hover:bg-black/5"
            @click="close"
            aria-label="Back"
          >
            <ArrowLeft />
          </button>
          <div class="text-lg font-semibold">Add People</div>
        </div>

        <div class="mx-auto px-4 py-5">
          <div class="mt-6" ref="panelRef">
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-2xl bg-black/5 px-4 py-3 text-sm text-black/60"
              @click="toggleDropdown"
            >
              <span class="flex items-center gap-2">
                <AddPeopleIcon class="h-6 w-6" />
                Select friends
              </span>
              <span class="text-black/50">Invited ({{ invitedCount }})</span>
            </button>

            <div
              v-if="dropdownOpen"
              class="mt-2 overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/10"
            >
              <div class="flex items-center gap-2 border-b px-4 py-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="text-black/40">
                  <path d="m21 21-4.3-4.3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                  <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" />
                </svg>
                <input
                  v-model="search"
                  class="w-full bg-transparent text-sm outline-none placeholder:text-black/35"
                  placeholder="Search..."
                />
              </div>

              <div class="max-h-[330px] overflow-auto">
                <button
                  v-for="u in filteredOptions"
                  :key="u.id"
                  type="button"
                  class="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-black/5"
                  :class="invited.includes(u.id) ? 'bg-black text-white' : ''"
                  @click="toggleId(u.id)"
                >
                  <span
                    class="grid h-5 w-5 place-items-center rounded-md ring-1"
                    :class="invited.includes(u.id) ? 'ring-white/40 bg-white/10' : 'ring-black/20 bg-white'"
                  >
                    <svg v-if="invited.includes(u.id)" width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M20 6 9 17l-5-5"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </span>

                  <img :src="u.avatar" class="h-10 w-10 rounded-full object-cover" />
                  <div class="min-w-0">
                    <div class="text-sm font-semibold">{{ u.name }}</div>
                    <div class="text-xs" :class="invited.includes(u.id) ? 'text-white/70' : 'text-black/40'">
                      {{ u.email || "" }}
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div class="mt-5 space-y-3">
            <div
              v-for="u in invitedUsers"
              :key="u.id"
              class="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-black/10"
            >
              <div class="flex items-center gap-3">
                <img :src="u.avatar" class="h-10 w-10 rounded-full object-cover" />
                <div class="text-sm font-semibold">{{ u.name }}</div>
              </div>

              <button
                type="button"
                class="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5"
                @click="removeInvited(u.id)"
                aria-label="Remove"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  </teleport>
</template>
