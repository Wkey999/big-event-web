import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, saved) { return saved || { top: 0 } },
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    { path: '/register', name: 'register', component: () => import('@/views/RegisterView.vue') },
    {
      path: '/', component: () => import('@/views/layout/CommunityLayout.vue'), meta: { requiresAuth: true },
      children: [
        { path: '', name: 'home', component: () => import('@/views/HomeView.vue') },
        { path: 'search', name: 'search', component: () => import('@/views/SearchView.vue') },
        { path: 'ask', name: 'ask', component: () => import('@/views/AskView.vue') },
        { path: 'games', name: 'games', component: () => import('@/views/GamesView.vue') },
        { path: 'read/:id', name: 'read', component: () => import('@/views/ArticleReadView.vue') },
        { path: 'creator', name: 'creator', component: () => import('@/views/article/ArticleManageView.vue') },
        { path: 'profile', name: 'profile', component: () => import('@/views/profile/ProfileView.vue') },
      ],
    },
    {
      path: '/admin', component: () => import('@/views/layout/AdminLayout.vue'), meta: { requiresAuth: true, admin: true },
      children: [
        { path: '', redirect: '/admin/articles' },
        { path: 'articles', name: 'admin-articles', component: () => import('@/views/article/ArticleManageView.vue') },
        { path: 'categories', name: 'admin-categories', component: () => import('@/views/category/CategoryManageView.vue') },
        { path: 'feeds', name: 'admin-feeds', component: () => import('@/views/FeedManageView.vue') },
      ],
    },
    { path: '/article', redirect: '/creator' },
    { path: '/category', redirect: '/admin/categories' },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
  ],
})

router.beforeEach(async (to) => {
  const user = useUserStore()
  const token = localStorage.getItem('token')
  if (!token) {
    if (user.token) user.logout()
    if (to.meta.requiresAuth) return { name: 'login', query: { redirect: to.fullPath } }
    return
  }
  if (to.meta.requiresAuth) {
    try { await user.ensureUserInfo() }
    catch { user.logout(); return { name: 'login', query: { redirect: to.fullPath } } }
  }
  if (to.meta.admin && user.userInfo?.role !== 1) {
    ElMessage.warning('这个入口仅供管理员使用')
    return { name: 'home' }
  }
  if (to.name === 'login' || to.name === 'register') return { name: 'home' }
})
export default router
