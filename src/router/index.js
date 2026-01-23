import { createRouter, createWebHistory } from "vue-router"

import Home from "@/pages/Home.vue"
import HostSession from "@/pages/HostSession.vue"
import SessionRoom from "@/pages/SessionRoom.vue"
import AvailableSessions from "@/pages/AvailableSessions.vue"
import About from "@/pages/About.vue"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: Home },
    { path: "/host", name: "host", component: HostSession },
    { path: "/room/:id", name: "session-room", component: SessionRoom },

    { path: "/sessions", name: "available-sessions", component: AvailableSessions },
    { path: "/about", name: "about", component: About },
  ],
})

export default router
