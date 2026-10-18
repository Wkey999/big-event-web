<script setup>import BrandMark from '@/components/BrandMark.vue'</script>
<template><main class="not-found"><BrandMark /><span class="eyebrow">404 / PAGE NOT FOUND</span><h1>这一页，还没有内容。</h1><p>链接可能已经改变，回到社区继续发现吧。</p><RouterLink to="/" class="button button-primary">返回首页</RouterLink></main></template>
<style scoped>.not-found{max-width:540px;margin:14vh auto;text-align:center}.not-found>.brand-mark{margin-bottom:70px}.not-found>.eyebrow{display:block}.not-found h1{font-size:34px;font-weight:500;margin:15px 0}.not-found p{color:var(--muted);margin-bottom:28px}</style>
