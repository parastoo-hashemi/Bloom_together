import { createRouter, createWebHistory } from "vue-router"
import Home from "../pages/Home.vue"
import About from "../pages/About.vue"
import HostSession from "../pages/HostSession.vue"

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: Home },
    { path: "/host", name: "host", component: HostSession },
    { path: "/about", name: "about", component: About },
  ],
})
