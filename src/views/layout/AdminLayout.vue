<script setup>
import { useRoute } from 'vue-router'
import BrandMark from '@/components/BrandMark.vue'
import AppIcon from '@/components/AppIcon.vue'
const route = useRoute()
</script>
<template><div class="admin-app"><aside class="admin-sidebar"><BrandMark /><span class="section-label">管理工作台</span><RouterLink to="/admin/articles" :class="{ active: route.name === 'admin-articles' }"><AppIcon name="pen" :size="18" />内容管理</RouterLink><RouterLink to="/admin/categories" :class="{ active: route.name === 'admin-categories' }"><AppIcon name="grid" :size="18" />频道管理</RouterLink><RouterLink to="/admin/feeds" :class="{ active: route.name === 'admin-feeds' }"><AppIcon name="refresh" :size="18" />资讯采集</RouterLink><RouterLink to="/admin/settings" :class="{ active: route.name === 'admin-settings' }"><AppIcon name="shield" :size="18" />功能开关</RouterLink><RouterLink to="/" class="admin-return"><AppIcon name="back" :size="18" />返回社区</RouterLink></aside><main class="admin-main"><header class="admin-heading"><span class="eyebrow">BOOM / 管理后台</span><span class="admin-role"><AppIcon name="shield" :size="15" />管理员</span></header><RouterView :key="route.name" /></main></div></template>
