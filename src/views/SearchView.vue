<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listCategories } from '@/api/category'
import { searchArticles } from '@/api/article'
import { formatTime } from '@/utils/format'

const PAGE_SIZE = 10
const route = useRoute()
const router = useRouter()

const filters = reactive({
  keyword: '',
  categoryId: undefined,
  authorId: undefined,
  timeRange: 'all',
  orderBy: 'latest',
})
const categories = ref([])
const items = ref([])
const total = ref(0)
const pageNum = ref(1)
const loading = ref(false)
const searched = ref(false)
const errorMessage = ref('')
let requestVersion = 0

function readRouteQuery() {
  filters.keyword = String(route.query.keyword || '')
  filters.categoryId = route.query.categoryId ? Number(route.query.categoryId) : undefined
  filters.authorId = route.query.authorId ? Number(route.query.authorId) : undefined
  filters.timeRange = String(route.query.timeRange || 'all')
  filters.orderBy = String(route.query.orderBy || 'latest')
  pageNum.value = Math.max(Number(route.query.pageNum) || 1, 1)
}

function queryParams() {
  return {
    keyword: filters.keyword.trim(),
    pageNum: pageNum.value,
    pageSize: PAGE_SIZE,
    categoryId: filters.categoryId || undefined,
    authorId: filters.authorId || undefined,
    timeRange: filters.timeRange,
    orderBy: filters.orderBy,
  }
}

async function runSearch({ resetPage = true, updateRoute = true } = {}) {
  const keyword = filters.keyword.trim()
  if (!keyword) {
    errorMessage.value = '请输入搜索关键词'
    items.value = []
    total.value = 0
    searched.value = true
    return
  }
  if (resetPage) pageNum.value = 1
  const version = ++requestVersion
  loading.value = true
  errorMessage.value = ''
  searched.value = true

  if (updateRoute) {
    const query = { keyword, pageNum: String(pageNum.value), timeRange: filters.timeRange, orderBy: filters.orderBy }
    if (filters.categoryId) query.categoryId = String(filters.categoryId)
    if (filters.authorId) query.authorId = String(filters.authorId)
    await router.replace({ name: 'search', query })
  }

  try {
    const response = await searchArticles(queryParams())
    if (version !== requestVersion) return
    items.value = response.data.items
    total.value = response.data.total
  } catch (error) {
    if (version !== requestVersion) return
    errorMessage.value = error.message || '搜索失败，请稍后重试'
    items.value = []
    total.value = 0
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

function changePage(nextPage) {
  pageNum.value = nextPage
  runSearch({ resetPage: false })
}

function openArticle(article) {
  router.push({ name: 'read', params: { id: article.id }, query: { mode: 'search' } })
}

function highlightSnippet(text) {
  const value = String(text || '')
  const needle = filters.keyword.trim().slice(0, 58)
  if (!needle) return [{ text: value, hit: false }]
  const index = value.toLowerCase().indexOf(needle.toLowerCase())
  if (index < 0) return [{ text: value, hit: false }]
  const end = index + needle.length
  return [
    ...(index > 0 ? [{ text: value.slice(0, index), hit: false }] : []),
    { text: value.slice(index, end), hit: true },
    ...(end < value.length ? [{ text: value.slice(end), hit: false }] : []),
  ]
}

onMounted(async () => {
  readRouteQuery()
  try {
    const response = await listCategories()
    categories.value = response.data
  } catch {
    // The category filter is optional; keyword search remains available.
  }
  if (filters.keyword.trim()) runSearch({ resetPage: false, updateRoute: false })
})
</script>

<template>
  <section class="search-page">
    <header class="search-heading">
      <div>
        <h1>搜索文章</h1>
        <p>仅检索已发布内容的标题和摘要</p>
      </div>
    </header>

    <el-card shadow="never" class="search-panel">
      <el-form @submit.prevent="runSearch()">
        <el-form-item>
          <el-input
            v-model="filters.keyword"
            maxlength="100"
            clearable
            size="large"
            placeholder="输入标题或摘要关键词"
            @keyup.enter="runSearch()"
          >
            <template #append>
              <el-button :loading="loading" @click="runSearch()">搜索</el-button>
            </template>
          </el-input>
        </el-form-item>
        <div class="search-filters">
          <el-select v-model="filters.categoryId" clearable placeholder="全部频道">
            <el-option v-for="category in categories" :key="category.id" :label="category.categoryName" :value="category.id" />
          </el-select>
          <el-input-number v-model="filters.authorId" :min="1" :precision="0" :controls="false" placeholder="作者ID" />
          <el-select v-model="filters.timeRange" aria-label="发布时间">
            <el-option label="全部时间" value="all" />
            <el-option label="最近24小时" value="1d" />
            <el-option label="最近7天" value="7d" />
            <el-option label="最近30天" value="30d" />
          </el-select>
          <el-select v-model="filters.orderBy" aria-label="排序方式">
            <el-option label="最新发布" value="latest" />
            <el-option label="最受欢迎" value="popular" />
          </el-select>
        </div>
      </el-form>
    </el-card>

    <p v-if="errorMessage" class="search-error">{{ errorMessage }}</p>
    <div v-else-if="loading" class="search-loading"><el-skeleton :rows="5" animated /></div>
    <el-empty v-else-if="searched && items.length === 0" description="没有找到匹配文章" />

    <template v-else-if="items.length">
      <p class="result-count">找到 {{ total }} 篇已发布文章</p>
      <div class="result-list">
        <el-card v-for="item in items" :key="item.id" shadow="hover" class="result-card">
          <div class="result-cover" @click="openArticle(item)">
            <img v-if="item.coverImg" :src="item.coverImg" :alt="item.title" loading="lazy" />
            <div v-else class="cover-placeholder" />
          </div>
          <div class="result-body">
            <div class="result-meta">
              <el-tag v-if="item.categoryName" size="small" effect="plain">{{ item.categoryName }}</el-tag>
              <span>{{ item.authorNickname || '匿名作者' }}</span>
              <span>{{ formatTime(item.publishedAt) }}</span>
            </div>
            <h2 class="result-title" @click="openArticle(item)">{{ item.title }}</h2>
            <p v-if="item.hitSnippet" class="result-summary">
              <el-tag size="small" effect="plain">命中{{ item.hitField === 'title' ? '标题' : '摘要' }}</el-tag>
              <span v-for="(part, index) in highlightSnippet(item.hitSnippet)" :key="index" :class="{ 'search-hit': part.hit }">{{ part.text }}</span>
            </p>
            <p v-else class="result-summary">{{ item.summary || '暂无摘要' }}</p>
            <div class="result-footer">
              <span>浏览 {{ item.viewCount || 0 }} · 点赞 {{ item.likeCount || 0 }} · 收藏 {{ item.collectCount || 0 }}</span>
              <el-button type="primary" link @click="openArticle(item)">阅读文章</el-button>
            </div>
          </div>
        </el-card>
      </div>
      <el-pagination
        v-if="total > PAGE_SIZE"
        class="search-pagination"
        background
        layout="prev, pager, next, total"
        :current-page="pageNum"
        :page-size="PAGE_SIZE"
        :total="total"
        @current-change="changePage"
      />
    </template>
  </section>
</template>

<style scoped>
.search-page { max-width: 1000px; margin: 0 auto; }
.search-heading h1 { margin: 0; font-size: 24px; color: var(--el-text-color-primary); }
.search-heading p { margin: 6px 0 18px; color: var(--el-text-color-secondary); }
.search-panel { margin-bottom: 20px; border-radius: 16px; }
.search-filters { display: flex; flex-wrap: wrap; gap: 10px; }
.search-filters > * { width: 180px; }
.search-error { color: var(--el-color-danger); }
.search-loading { padding: 20px; }
.result-count { color: var(--el-text-color-secondary); font-size: 13px; }
.result-list { display: grid; gap: 14px; }
.result-card { border-radius: 14px; }
.result-card :deep(.el-card__body) { display: grid; grid-template-columns: 180px 1fr; gap: 18px; }
.result-cover { width: 180px; height: 132px; overflow: hidden; border-radius: 10px; background: var(--el-fill-color-light); cursor: pointer; }
.result-cover img, .cover-placeholder { width: 100%; height: 100%; object-fit: cover; }
.result-body { min-width: 0; }
.result-meta, .result-footer { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; color: var(--el-text-color-secondary); font-size: 12px; }
.result-title { margin: 8px 0; font-size: 17px; cursor: pointer; }
.result-title:hover { color: var(--el-color-primary); }
.result-summary { margin: 0 0 12px; color: var(--el-text-color-regular); line-height: 1.6; }
.search-hit { color: var(--el-color-danger); font-weight: 700; background: var(--el-color-danger-light-9); }
.result-footer { justify-content: space-between; }
.search-pagination { justify-content: center; margin: 22px 0; }
@media (max-width: 640px) {
  .result-card :deep(.el-card__body) { grid-template-columns: 1fr; }
  .result-cover { width: 100%; height: 190px; }
  .search-filters > * { flex: 1 1 140px; width: auto; }
}
</style>
