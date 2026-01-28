import { createRouter, createWebHistory } from "vue-router"

import Home from "@/pages/Home.vue"
import HostSession from "@/pages/HostSession.vue"
import SessionRoom from "@/pages/SessionRoom.vue"
import AvailableSessions from "@/pages/AvailableSessions.vue"
import Invitation from "@/pages/Invitation.vue"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: Home },
    { path: "/host", name: "host", component: HostSession },
    { path: "/room/:id", name: "session-room", component: SessionRoom },

    { path: "/sessions", name: "available-sessions", component: AvailableSessions },
    { path: "/invitation", name: "invitation", component: Invitation },
  ],
})

export default router
