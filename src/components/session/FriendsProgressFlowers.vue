<script setup>
import { computed, ref } from "vue"

const props = defineProps({
  title: { type: String, default: "Online Members" },
  friends: {
    type: Array,
    required: true,
    // expected shape: [{ id, name, progress }] where progress is 0..100
  },
  maxVisible: { type: Number, default: 5 },
})

const emit = defineEmits(["select"])

const isOpen = ref(false)

const visibleFriends = computed(() => props.friends.slice(0, props.maxVisible))
const remainingCount = computed(() => Math.max(props.friends.length - props.maxVisible, 0))
const hasMore = computed(() => remainingCount.value > 0)

function openModal() {
  if (hasMore.value) isOpen.value = true
}
function closeModal() {
  isOpen.value = false
}

function clampProgress(p) {
  const n = Number(p)
  if (Number.isNaN(n)) return 0
  return Math.min(100, Math.max(0, n))
}

// Replace this with your real flower assets logic.
// Example idea: 0-20 => stage0, 21-40 => stage1, ...
function flowerSrc(progress) {
  const p = clampProgress(progress)
  const stage = p >= 80 ? 4 : p >= 60 ? 3 : p >= 40 ? 2 : p >= 20 ? 1 : 0
  return `/flowers/stage-${stage}.svg`
}

function onPickFriend(friend) {
  emit("select", friend)
}
</script>

<template>
  <section class="w-full rounded-xl border border-black/10 bg-white p-4">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-black/80">
        {{ title }}: {{ friends.length }}
      </h3>
    </div>

    <!-- Grid: first 5 friends -->
    <div class="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
      <button
        v-for="f in visibleFriends"
        :key="f.id"
        type="button"
        class="group flex flex-col items-center rounded-lg p-2 hover:bg-black/5"
        @click="onPickFriend(f)"
      >
        <img
          :src="flowerSrc(f.progress)"
          alt=""
          class="h-10 w-10 select-none"
          draggable="false"
        />
        <div class="mt-1 text-xs font-medium text-black/70 line-clamp-1">
          {{ f.name }}
        </div>
        <div class="text-[11px] text-black/50">
          {{ clampProgress(f.progress) }}%
        </div>
      </button>

      <!-- +N chip -->
      <button
        v-if="hasMore"
        type="button"
        class="flex flex-col items-center justify-center rounded-lg p-2 hover:bg-black/5"
        @click="openModal"
      >
        <div
          class="flex h-10 w-10 items-center justify-center rounded-full border border-black/30 text-sm font-semibold text-black/70"
        >
          +{{ remainingCount }}
        </div>
      </button>
    </div>

    <!-- Modal -->
    <teleport to="body">
      <div v-if="isOpen" class="fixed inset-0 z-50">
        <!-- backdrop -->
        <button
          type="button"
          class="absolute inset-0 bg-black/40"
          aria-label="Close"
          @click="closeModal"
        />

        <!-- modal panel -->
        <div class="absolute inset-0 flex items-center justify-center p-4">
          <div class="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <div class="flex items-center justify-between">
              <div class="text-sm font-semibold text-black/80">
                Friends Progress ({{ friends.length }})
              </div>

              <button
                type="button"
                class="rounded-lg px-2 py-1 text-sm text-black/60 hover:bg-black/5"
                @click="closeModal"
              >
                Close
              </button>
            </div>

            <div class="mt-3 grid grid-cols-4 gap-3">
              <button
                v-for="f in friends"
                :key="f.id"
                type="button"
                class="group flex flex-col items-center rounded-lg p-2 hover:bg-black/5"
                @click="onPickFriend(f)"
              >
                <img
                  :src="flowerSrc(f.progress)"
                  alt=""
                  class="h-10 w-10 select-none"
                  draggable="false"
                />
                <div class="mt-1 text-xs font-medium text-black/70 line-clamp-1">
                  {{ f.name }}
                </div>
                <div class="text-[11px] text-black/50">
                  {{ clampProgress(f.progress) }}%
                </div>
              </button>
            </div>

            <div class="mt-4">
              <button
                type="button"
                class="w-full rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
                @click="closeModal"
              >
                Go Back To Session
              </button>
            </div>
          </div>
        </div>
      </div>
    </teleport>
  </section>
</template>

<style scoped>
/* optional: if you don’t have tailwind line-clamp plugin */
.line-clamp-1 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
