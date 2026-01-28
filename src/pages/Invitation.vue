<script setup>
import { computed, ref } from "vue"
import { useRouter } from "vue-router"

import Header from "@/components/main/Header.vue"
import NavBar from "@/components/main/NavBar.vue"

const router = useRouter()

// --- Data model ---
// Supports either:
// 1) endsIn: "2h" / "3h 40m" (static), OR
// 2) endsAt: timestamp ms (dynamic countdown)
const invitations = ref([
  { id: 1, title: "MLDL", privacy: "public", by: "Sara", endsIn: "2h" },
  { id: 2, title: "Big Data", privacy: "private", by: "Jhon", endsIn: "3h 40m" },
])

function goBack() {
  router.back()
}

const hasInvitations = computed(() => invitations.value.length > 0)

async function acceptInvite(inv) {
  invitations.value = invitations.value.filter((x) => x.id !== inv.id)
}

async function declineInvite(inv) {
  invitations.value = invitations.value.filter((x) => x.id !== inv.id)
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <Header title="Invitations"/>

    <main class="mx-auto max-w px-4 pt-16 pb-28">
      <section class="space-y-4 mt-3">
        <div
          v-if="!hasInvitations"
          class="rounded-2xl border border-black/10 bg-black/[0.02] p-4 text-sm text-black/60"
        >
          No invitations right now.
        </div>

        <article
          v-for="inv in invitations"
          :key="inv.id"
          class="rounded-2xl border border-black/10 bg-white p-4 shadow-sm"
        >
          <div class="flex items-center justify-between gap-4">
            <!-- Left content -->
            <div class="min-w-0">
              <div class="flex items-baseline gap-2">
                <h2 class="truncate text-xl font-semibold text-[#111]">
                  {{ inv.title }}
                </h2>

                <span
                  class="shrink-0 text-xs font-semibold"
                  :class="inv.privacy === 'private'
                    ? 'text-[#111]'
                    : 'text-[#111]'"
                >
                  ({{ inv.privacy === "private" ? "Private" : "Public" }})
                </span>
              </div>

              <p class="mt-1 text-sm text-black/70">
                By <span class="font-semibold text-[#111]">{{ inv.by }}</span>
              </p>

              <p class="mt-1 text-sm text-black/70">
                End in : <span class="font-semibold text-[#111]">2h</span>
              </p>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="grid h-11 w-11 place-items-center rounded-full bg-[#111] text-white hover:bg-black/90"
                @click="acceptInvite(inv)"
                aria-label="Accept"
                title="Accept"
              >
                <svg viewBox="0 0 24 24" class="h-5 w-5 fill-current">
                  <path
                    d="M9 16.2 4.8 12a1 1 0 0 1 1.4-1.4L9 13.4l8.8-8.8a1 1 0 0 1 1.4 1.4L9 16.2z"
                  />
                </svg>
              </button>

              <button
                type="button"
                class="grid h-11 w-11 place-items-center rounded-full bg-[#111] text-white hover:bg-black/90"
                @click="declineInvite(inv)"
                aria-label="Decline"
                title="Decline"
              >
                <svg viewBox="0 0 24 24" class="h-5 w-5 fill-current">
                  <path
                    d="M18.3 5.7a1 1 0 0 1 0 1.4L13.4 12l4.9 4.9a1 1 0 1 1-1.4 1.4L12 13.4l-4.9 4.9a1 1 0 1 1-1.4-1.4l4.9-4.9-4.9-4.9a1 1 0 0 1 1.4-1.4L12 10.6l4.9-4.9a1 1 0 0 1 1.4 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </article>
      </section>
    </main>

    <NavBar />
  </div>
</template>
