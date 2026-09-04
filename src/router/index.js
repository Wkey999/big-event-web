import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import LayoutView from '@/views/layout/LayoutView.vue'
import HomeView from '@/views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
    },
    {
      // 登录后的主布局，子页面渲染在布局的 <RouterView /> 里
      path: '/',
      component: LayoutView,
      meta: { requiresAuth: true },
      children: [
        { path: '', name: 'home', component: HomeView },
        {
          path: 'category',
          name: 'category',
          component: () => import('@/views/category/CategoryManageView.vue'),
        },
        {
          path: 'article',
          name: 'article',
          component: () => import('@/views/article/ArticleManageView.vue'),
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/profile/ProfileView.vue'),
        },
      ],
    },
  ],
})

// 全局路由守卫：没 token 一律去登录页；已登录不许再进登录/注册页
router.beforeEach((to) => {
  const hasToken = !!localStorage.getItem('token')
  const needsAuth = to.matched.some((record) => record.meta.requiresAuth)
  if (needsAuth && !hasToken) {
    return { path: '/login' }
  }
  if (hasToken && (to.path === '/login' || to.path === '/register')) {
    return { path: '/' }
  }
})

export default router
