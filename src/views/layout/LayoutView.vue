<script setup>
import { computed, onMounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const displayName = computed(
  () => userStore.userInfo?.nickname || userStore.userInfo?.username || '',
)
const avatarText = computed(() => displayName.value.charAt(0).toUpperCase() || 'U')

onMounted(async () => {
  if (userStore.userInfo) return
  try {
    await userStore.fetchUserInfo()
  } catch {
    // 401 等情况已由 axios 拦截器统一处理
  }
})

function handleCommand(command) {
  if (command !== 'logout') return
  userStore.logout()
  router.push('/login')
}
</script>

<template>
  <el-container class="layout">
    <el-aside width="220px" class="layout-aside">
      <div class="logo"><span class="logo-boom">BOOM！</span><span class="logo-name">大事件</span></div>
      <el-menu :default-active="route.path" router>
        <el-menu-item index="/">首页</el-menu-item>
        <el-menu-item index="/category">文章分类</el-menu-item>
        <el-menu-item index="/article">文章管理</el-menu-item>
        <el-menu-item index="/profile">个人中心</el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="layout-header">
        <el-dropdown @command="handleCommand">
          <span class="user-trigger">
            <el-avatar :size="32" :src="userStore.userInfo?.avatar || undefined">
              {{ avatarText }}
            </el-avatar>
            <span class="user-name">{{ displayName }}</span>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>

      <el-main class="layout-main">
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout {
  height: 100vh;
  background: transparent;
}

.layout-aside {
  background: var(--glass-bg);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  border-right: 1px solid rgba(255, 255, 255, 0.55);
}

.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
}

.logo-boom {
  font-weight: 800;
  background: linear-gradient(120deg, #4a6fa5, #8fa6c4);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-right: 2px;
}

.logo-name {
  color: var(--el-text-color-primary);
}

.layout-aside :deep(.el-menu) {
  border-right: none;
  padding: 6px 10px;
}

.layout-aside :deep(.el-menu-item) {
  border-radius: 999px;
  margin-bottom: 4px;
}

.layout-aside :deep(.el-menu-item.is-active) {
  background: var(--el-color-primary);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(74, 111, 165, 0.28);
}

.layout-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  background: var(--glass-bg);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  border-bottom: 1px solid rgba(220, 226, 234, 0.7);
}

.user-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  outline: none;
}

.user-name {
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.layout-main {
  padding: 20px;
  background: transparent;
  overflow-y: auto;
}
</style>
