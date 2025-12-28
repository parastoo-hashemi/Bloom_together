import { createRouter, createWebHistory } from "vue-router"
import Home from "../pages/Home.vue"
import About from "../pages/About.vue"
import HostSession from "../pages/HostSession.vue"
import SessionRoom from "../pages/SessionRoom.vue"
import AvailableSessions from "../pages/AvailableSessions.vue"

export const router = createRouter({
  history: createWebHistory(),
  routes: [
  { path: "/", name: "home", component: Home },
  { path: "/host", name: "host", component: HostSession },
  { path: "/session/:id", name: "session-room", component: SessionRoom },
  { path: "/sessions", name: "available-sessions", component: AvailableSessions},
  { path: "/about", name: "about", component: About },
]
})
