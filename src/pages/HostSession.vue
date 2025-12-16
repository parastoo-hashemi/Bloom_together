<script setup>
import { computed, ref } from "vue"
import Header from "../components/main/header.vue"
import PrivateIcon from "../components/icons/PrivateIcon.vue"
import PublicIcon from "../components/icons/PublicIcon.vue"
import StudyDuration from "../components/HostSession/StudyDuration.vue"
import Topic from "../components/HostSession/Topic.vue"
import InviteFriends from "../components/HostSession/InviteFriends.vue"
import NavBar from "../components/main/NavBar.vue"

const privacy = ref("public") // "public" | "private"

const hours = ref(0)
const minutes = ref(15)

const topic = ref("")
const friendQuery = ref("")

// mock data (replace with API later)
const friends  = ref([
  { id: 1, name: "Daniel", avatar: "https://i.pravatar.cc/64?img=12" },
  { id: 2, name: "John", avatar: "https://i.pravatar.cc/64?img=3" },
  { id: 3, name: "Sara", avatar: "https://i.pravatar.cc/64?img=5" },
  { id: 4, name: "Mina", avatar: "https://i.pravatar.cc/64?img=8" },
])
const selectedFriendIds = ref([])

function createSession() {
  // TODO: call API
  console.log({
    privacy: privacy.value,
    durationMinutes: hours.value * 60 + minutes.value,
    topic: topic.value,
    invitedFriendIds: selected.value.map(f => f.id),
  })
}
</script>

<template>
  <div class="min-h-screen">
    <Header
      title="Host Session"
      subtitle="Set up your custody room"
    />
    <main class="mx-auto max-w pb-4 pt-4 mx-auto min-h-screen pb-">
      <div class="flex rounded-full bg-black/5 p-1">
        <button
          class="flex items-center justify-center flex-1 rounded-full py-2 text-sm font-medium"
          :class="privacy === 'public' ? 'bg-[#111] text-white' : 'text-black'"
          @click="privacy = 'public'"
        >
        <PublicIcon
        :class="privacy === 'private' ? 'text-black' : 'text-white'"
         class="mr-2"
         />
          Public
        </button>
        <button
          class="flex items-center justify-center flex-1 rounded-full py-2 text-sm font-medium"
          :class="privacy === 'private' ? 'bg-[#111] text-white' : 'text-black'"
          @click="privacy = 'private'"
        >
        <PrivateIcon
        :class="privacy === 'private' ? 'text-white' : 'text-black'"
         class="mr-2"
         />
          Private
        </button>
      </div>
      <section class="">
         <StudyDuration
          v-model:hours="hours"
          v-model:minutes="minutes"
        />
        <Topic v-model="topic"/>
        <InviteFriends
         :options="friends"
           v-model="selectedFriendIds "
           :max-selected="10"
        />
        <button
            class="mt-4 w-full rounded-2xl bg-[#111] py-3 text-sm font-semibold text-white hover:bg-black/90"
            @click="createSession"
          >
            Create The Session
          </button>
      </section>
    </main>
    <NavBar/>
  </div>
</template>
