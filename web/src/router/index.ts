import { useCookies } from '@vueuse/integrations/useCookies.js'
import { createRouter, createWebHistory } from 'vue-router'

const cookies = useCookies(['auth_token'])

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      component: () => import('../views/Login.vue'),
    },
    {
      path: '/register',
      component: () => import('../views/Register.vue'),
    },
    {
      path: '/',
      component: () => import('../layouts/MainLayout.vue'),
      children: [
        { path: 'home', component: () => import('../views/Dashboard.vue') },
        { path: 'local-game', component: () => import('../views/PrivateGame.vue') },
        {
          name: 'local-game-session',
          path: 'local-game/:gameId',
          component: () => import('../views/PrivateGame.vue'),
          props: true,
        },
        { path: 'online-game', component: () => import('../views/Dashboard.vue') },
        { path: 'local-tournament', component: () => import('../views/Dashboard.vue') },
        { path: 'online-tournament', component: () => import('../views/Dashboard.vue') },
        { path: 'training', component: () => import('../views/Training.vue') },
        {
          name: 'training-session',
          path: 'training/:gameId',
          component: () => import('../views/Training.vue'),
          props: true,
        },
        { path: 'progress', component: () => import('../views/Dashboard.vue') },
        { path: 'statistics', component: () => import('../views/Dashboard.vue') },
        { path: 'profile', component: () => import('../views/Dashboard.vue') },
        { path: 'friends', component: () => import('../views/Dashboard.vue') },
        { path: 'settings', component: () => import('../views/Dashboard.vue') },
        { path: '/:pathMatch(.*)', component: () => import('../views/NotFound.vue') },
      ],
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('../views/NotFound.vue'),
    },
  ],
})

router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const isAuthenticated = !!cookies.get('auth_token')

  if (requiresAuth && !isAuthenticated) {
    next('/login')
  } else {
    next()
  }
})

export default router
