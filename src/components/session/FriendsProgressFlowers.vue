<script setup>
import { computed, ref } from "vue"
import FlowerGrowth from "@/components/session/FlowerGrowth.vue"
import { clamp01 } from "@/utils/flowerGrowth"

const props = defineProps({
  title: { type: String, default: "Online Members" },
  friends: { type: Array, required: true }, // [{id,name,progress(0-100)}]
  maxVisible: { type: Number, default: 5 },
})

const emit = defineEmits(["select"])

const showAll = ref(false)

const visibleFriends = computed(() => props.friends.slice(0, props.maxVisible))
const overflowCount = computed(() => Math.max(0, props.friends.length - props.maxVisible))

function selectFriend(f) {
  emit("select", f)
}
</script>

<template>
  <div class="rounded-2xl border p-4">
    <div class="mb-3 text-sm font-semibold text-black/70">
      {{ title }}: {{ friends.length }}
    </div>

    <div class="grid grid-cols-3 gap-4">
      <button
        v-for="f in visibleFriends"
        :key="f.id"
        type="button"
        class="flex flex-col items-center rounded-xl p-2 hover:bg-black/5"
        @click="selectFriend(f)"
      >
        <FlowerGrowth
          v-if="(f.progress ?? 0) > 0"
          :progress="clamp01((f.progress ?? 0) / 100)"
          :size="40"
          compact
        />
        <div
          v-else
          class="h-10 w-10 rounded-full border border-dashed border-black/20"
        ></div>
        <div class="mt-2 text-xs font-medium">{{ f.name }}</div>
        <div class="text-[11px] text-black/40">{{ f.progress ?? 0 }}%</div>
      </button>

      <!-- +N overflow -->
      <button
        v-if="overflowCount > 0"
        type="button"
        class="grid place-items-center rounded-full border text-sm font-semibold text-black/70 hover:bg-black/5"
        style="width: 40px; height: 40px;"
        @click="showAll = true"
      >
        +{{ overflowCount }}
      </button>
    </div>

    <!-- super simple overflow modal -->
    <div v-if="showAll" class="fixed inset-0 z-50 bg-black/30" @click.self="showAll = false">
      <div class="mx-auto mt-24 w-[92%] max-w-sm rounded-2xl bg-white p-4 shadow">
        <div class="mb-3 flex items-center justify-between">
          <div class="text-sm font-semibold">All members</div>
          <button class="rounded-lg px-2 py-1 text-sm hover:bg-black/5" @click="showAll = false">Close</button>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="f in friends"
            :key="f.id"
            type="button"
            class="flex items-center gap-3 rounded-xl p-2 hover:bg-black/5"
            @click="selectFriend(f)"
          >
            <!-- <FlowerGrowth :progress="clamp01(((f.progress ?? 0) as number) / 100)" :size="32" compact /> -->
            <div class="min-w-0">
              <div class="truncate text-xs font-medium">{{ f.name }}</div>
              <div class="text-[11px] text-black/40">{{ f.progress ?? 0 }}%</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
/* optional: if you don’t have tailwind line-clamp plugin */
.line-clamp-1 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
