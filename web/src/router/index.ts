import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/login',
            component: () => import('../views/Login.vue')
        },
        {
            path: '/register',
            component: () => import('../views/Register.vue')
        },
        {
            path: '/',
            component: () => import('../layouts/MainLayout.vue'),
            children: [
                { path: 'home', component: () => import('../views/Dashboard.vue') },
                { path: 'local-game', component: () => import('../views/LocalGame.vue') },
                { path: 'online-game', component: () => import('../views/Dashboard.vue') },
                { path: 'local-tournament', component: () => import('../views/Dashboard.vue') },
                { path: 'online-tournament', component: () => import('../views/Dashboard.vue') },
                { path: 'training', component: () => import('../views/Training.vue') },
                { name: 'training-session', path: 'training/:sessionid', component: () => import('../views/Training.vue'), props: true },
                { path: 'progress', component: () => import('../views/Dashboard.vue') },
                { path: 'statistics', component: () => import('../views/Dashboard.vue') },
                { path: 'profile', component: () => import('../views/Dashboard.vue') },
                { path: 'friends', component: () => import('../views/Dashboard.vue') },
                { path: 'settings', component: () => import('../views/Dashboard.vue') },
                { path: '/:pathMatch(.*)', component: () => import('../views/NotFound.vue') }
            ]
        },
        {
            path: '/:pathMatch(.*)*',
            component: () => import('../views/NotFound.vue')
        }
    ]
})

export default router;