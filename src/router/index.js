import { createRouter, createWebHistory } from 'vue-router'

import Login from '@/pages/Login.vue'
import IntroPage from '@/pages/IntroPage.vue'
import Home from '@/pages/Home.vue'
import HostSession from '@/pages/HostSession.vue'
import SessionRoom from '@/pages/SessionRoom.vue'
import AvailableSessions from '@/pages/AvailableSessions.vue'
import Invitation from '@/pages/Invitation.vue'
import Garden from '@/pages/Garden.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login',      name: 'login',             component: Login },
    { path: '/',           name: 'intro',             component: IntroPage },
    { path: '/home',       name: 'home',              component: Home },
    { path: '/host',       name: 'host',              component: HostSession },
    { path: '/room/:id',   name: 'session-room',      component: SessionRoom },
    { path: '/sessions',   name: 'available-sessions', component: AvailableSessions },
    { path: '/invitation', name: 'invitation',        component: Invitation },
    { path: '/garden',     name: 'garden',            component: Garden },
  ],
})

export default router
