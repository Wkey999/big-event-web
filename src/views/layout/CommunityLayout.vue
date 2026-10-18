<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAiSettingsStore } from '@/stores/aiSettings'
import BrandMark from '@/components/BrandMark.vue'
import AppIcon from '@/components/AppIcon.vue'
import UserAvatar from '@/components/UserAvatar.vue'
const route = useRoute()
const router = useRouter()
const user = useUserStore()
const ai = useAiSettingsStore()
const keyword = ref('')
const name = computed(() => user.userInfo?.nickname || user.userInfo?.username || '我的账号')
watch(() => route.query.keyword, value => { keyword.value = String(value || '') }, { immediate: true })
function search() { if (keyword.value.trim()) router.push({ name: 'search', query: { keyword: keyword.value.trim() } }) }
function command(value) {
  if (value === 'logout') { user.logout(); router.replace('/login'); return }
  router.push(value)
}
</script>
<template>
  <div class="community-app">
    <header class="site-header"><div class="site-header-inner">
      <BrandMark />
      <nav class="main-nav" aria-label="网站导航"><RouterLink to="/" :class="{ active: route.name === 'home' || route.name === 'read' }">发现</RouterLink><RouterLink to="/ask" :class="{ active: route.name === 'ask' }" @click="ai.openSettings()">AI 搜索 <span class="small-spark">✦</span></RouterLink><RouterLink to="/games" :class="{ active: route.name === 'games' }">小游戏</RouterLink></nav>
      <form class="header-search" role="search" @submit.prevent="search"><AppIcon name="search" :size="17" /><input v-model="keyword" aria-label="搜索社区内容" maxlength="100" placeholder="搜索内容、灵感…"><button aria-label="搜索" type="submit"><AppIcon name="arrow" :size="17" /></button></form>
      <RouterLink class="write-link" :to="{ name: 'creator', query: { compose: '1' } }"><AppIcon name="pen" :size="17" />写点什么</RouterLink>
      <el-dropdown trigger="click" @command="command"><button class="account-trigger" aria-label="打开账号菜单"><UserAvatar :size="33" :src="user.userInfo?.avatar || undefined">{{ name.slice(0, 1) }}</UserAvatar><span>{{ name }}</span><AppIcon name="chevron" :size="13" /></button><template #dropdown><el-dropdown-menu><el-dropdown-item command="/creator">我的创作</el-dropdown-item><el-dropdown-item command="/profile">个人设置</el-dropdown-item><el-dropdown-item v-if="user.userInfo?.role === 1" command="/admin/articles" divided>管理后台</el-dropdown-item><el-dropdown-item command="logout" divided>退出登录</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
    </div></header>
    <main class="site-main"><RouterView /></main>
    <footer class="site-footer"><BrandMark /><span>发现灵感，也留下你的那份。</span><span class="footer-note">内容因分享而有价值</span></footer>
  </div>
</template>
