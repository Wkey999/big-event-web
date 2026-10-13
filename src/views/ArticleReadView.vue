<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getArticleDetail, reportBrowse } from '@/api/article'
import { formatTime } from '@/utils/format'
import { sanitizeRichText } from '@/utils/sanitizeRichText'

const route = useRoute()
const router = useRouter()
const article = ref(null)
const loading = ref(false)
const errorMessage = ref('')
let enteredAt = 0
let requestVersion = 0

const cleanContent = computed(() => sanitizeRichText(article.value?.content))
const sourceMode = computed(() => {
  const value = String(route.query.mode || 'latest')
  return ['latest', 'recommend', 'search', 'ask'].includes(value) ? value : 'latest'
})

async function loadArticle(id) {
  const version = ++requestVersion
  loading.value = true
  errorMessage.value = ''
  article.value = null
  enteredAt = 0
  try {
    const response = await getArticleDetail(id)
    if (version !== requestVersion) return
    article.value = response.data
    enteredAt = Date.now()
  } catch (error) {
    if (version === requestVersion) errorMessage.value = error.message || '文章无法打开'
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

function reportReadDwell() {
  if (!article.value || !enteredAt) return
  const dwellMs = Math.min(Date.now() - enteredAt, 300000)
  enteredAt = 0
  reportBrowse(article.value.id, dwellMs, sourceMode.value).catch(() => {})
}

onMounted(() => loadArticle(route.params.id))
onBeforeUnmount(reportReadDwell)
</script>

<template>
  <article class="read-page">
    <el-button text @click="router.back()">返回</el-button>
    <el-skeleton v-if="loading" :rows="8" animated />
    <el-alert v-else-if="errorMessage" :title="errorMessage" type="error" :closable="false" />
    <template v-else-if="article">
      <header class="article-heading">
        <el-tag v-if="article.categoryId" effect="plain">频道 {{ article.categoryId }}</el-tag>
        <h1>{{ article.title }}</h1>
        <p>{{ article.authorNickname || '匿名作者' }} · {{ formatTime(article.createTime) }} · 浏览 {{ article.viewCount }}</p>
        <img v-if="article.coverImg" class="article-cover" :src="article.coverImg" :alt="article.title" />
      </header>
      <div class="article-body" v-html="cleanContent"></div>
    </template>
  </article>
</template>

<style scoped>
.read-page { max-width: 900px; margin: 0 auto; }
.article-heading { margin: 16px 0 26px; }
.article-heading h1 { margin: 12px 0; font-size: 30px; line-height: 1.35; }
.article-heading p { color: var(--el-text-color-secondary); }
.article-cover { display: block; width: 100%; max-height: 460px; object-fit: cover; border-radius: 16px; margin-top: 20px; }
.article-body { line-height: 1.85; color: var(--el-text-color-primary); overflow-wrap: anywhere; }
.article-body :deep(img) { max-width: 100%; height: auto; }
@media (max-width: 640px) { .article-heading h1 { font-size: 24px; } }
</style>
