<script setup>
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listCategories } from '@/api/category'
import { searchArticles } from '@/api/article'
import { formatTime } from '@/utils/format'
import AppIcon from '@/components/AppIcon.vue'
import ContentState from '@/components/ContentState.vue'
const route = useRoute()
const router = useRouter()
const PAGE_SIZE = 10
const filters = reactive({ keyword: '', categoryId: undefined, timeRange: 'all', orderBy: 'latest' })
const categories = ref([])
const items = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const error = ref(false)
const searched = ref(false)
const activeKeyword = ref('')
let version = 0
function query() {
  const q = { keyword: filters.keyword.trim(), timeRange: filters.timeRange, orderBy: filters.orderBy, pageNum: String(page.value) }
  if (filters.categoryId) q.categoryId = String(filters.categoryId)
  if (route.query.authorId) q.authorId = String(route.query.authorId)
  return q
}
async function fetchResults() {
  const current = ++version
  const keyword = String(route.query.keyword || '').trim().slice(0, 100)
  activeKeyword.value = keyword
  if (!keyword) { items.value = []; total.value = 0; searched.value = false; loading.value = false; return }
  searched.value = true; loading.value = true; error.value = false
  try {
    const response = await searchArticles({ keyword, categoryId: filters.categoryId, timeRange: filters.timeRange, orderBy: filters.orderBy, authorId: route.query.authorId || undefined, pageNum: page.value, pageSize: PAGE_SIZE })
    if (current !== version) return
    items.value = response.data.items || []
    total.value = response.data.total || 0
  } catch { if (current === version) { error.value = true; items.value = [] } }
  finally { if (current === version) loading.value = false }
}
async function submit(resetPage = true) {
  if (!filters.keyword.trim()) return
  if (resetPage) page.value = 1
  const next = query()
  if (JSON.stringify(next) === JSON.stringify(route.query)) await fetchResults()
  else await router.push({ name: 'search', query: next })
}
function changePage(value) { page.value = value; submit(false) }
function highlight(text) {
  const value = text || '', needle = activeKeyword.value
  const index = value.toLowerCase().indexOf(needle.toLowerCase())
  if (index < 0 || !needle) return [{ text: value }]
  return [{ text: value.slice(0, index) }, { text: value.slice(index, index + needle.length), hit: true }, { text: value.slice(index + needle.length) }]
}
watch(() => route.query, q => {
  filters.keyword = String(q.keyword || '').slice(0, 100)
  filters.categoryId = Number(q.categoryId) > 0 ? Number(q.categoryId) : undefined
  filters.timeRange = ['all', '1d', '7d', '30d'].includes(q.timeRange) ? q.timeRange : 'all'
  filters.orderBy = q.orderBy === 'popular' ? 'popular' : 'latest'
  page.value = Math.max(1, Math.min(100000, Math.floor(Number(q.pageNum)) || 1))
  fetchResults()
}, { immediate: true })
onMounted(() => listCategories().then(response => { categories.value = response.data }).catch(() => {}))
onBeforeUnmount(() => version++)
</script>
<template>
  <section class="search-page">
    <header class="page-heading"><div><span class="eyebrow">FIND SOMETHING WORTH READING</span><h1>找到你想读的。</h1><p>按关键词查找社区内容，或者换个方式问问 AI。</p></div><RouterLink class="button button-secondary" :to="{ name: 'ask', query: filters.keyword ? { q: filters.keyword } : {} }"><AppIcon name="spark" :size="17" />用 AI 搜索</RouterLink></header>
    <form class="search-panel surface" @submit.prevent="submit()"><div class="search-input-row"><AppIcon name="search" :size="22" /><input v-model="filters.keyword" maxlength="100" aria-label="文章关键词" placeholder="输入你关心的话题或关键词"><button type="submit" class="button button-primary" :disabled="loading || !filters.keyword.trim()">搜索内容<AppIcon name="arrow" :size="16" /></button></div><div class="search-filters"><span>筛选</span><el-select v-model="filters.categoryId" clearable placeholder="全部频道" aria-label="频道"><el-option v-for="category in categories" :key="category.id" :value="category.id" :label="category.categoryName" /></el-select><el-select v-model="filters.timeRange" aria-label="发布时间"><el-option label="全部时间" value="all" /><el-option label="最近24小时" value="1d" /><el-option label="最近7天" value="7d" /><el-option label="最近30天" value="30d" /></el-select><el-select v-model="filters.orderBy" aria-label="排序"><el-option label="最新发布" value="latest" /><el-option label="最受欢迎" value="popular" /></el-select><button class="text-action" type="submit" :disabled="loading || !filters.keyword.trim()">应用筛选</button></div></form>
    <div v-if="loading" class="search-skeleton surface"><el-skeleton :rows="8" animated /></div>
    <ContentState v-else-if="error" error title="搜索暂时没有完成" description="请检查连接后再试一次。" @retry="fetchResults" />
    <ContentState v-else-if="!searched" title="从一个关键词开始" description="工具、技术、开发中的问题，都可以成为发现的起点。" />
    <ContentState v-else-if="!items.length" title="还没有找到相关内容" description="试试更简短的关键词，或扩大发布时间范围。"><RouterLink class="button button-secondary" :to="{ name: 'ask', query: { q: filters.keyword } }"><AppIcon name="spark" :size="16" />让 AI 试试看</RouterLink></ContentState>
    <template v-else><p class="result-count">与「{{ activeKeyword }}」相关的 {{ total }} 篇内容</p><div class="result-list"><article v-for="item in items" :key="item.id" class="result-card surface"><RouterLink class="result-cover" :to="{ name: 'read', params: { id: item.id }, query: { mode: 'search' } }" :aria-label="item.title"><img v-if="item.coverImg" :src="item.coverImg" :alt="item.title" loading="lazy" @error="$event.target.style.display = 'none'"><span v-else>{{ item.categoryName || 'BOOM' }}</span></RouterLink><div class="result-body"><div class="result-meta"><span class="tag" v-if="item.categoryName">{{ item.categoryName }}</span><span>{{ item.authorNickname || '社区作者' }}</span><span>{{ formatTime(item.publishedAt) }}</span></div><RouterLink class="result-title" :to="{ name: 'read', params: { id: item.id }, query: { mode: 'search' } }"><h2>{{ item.title }}</h2></RouterLink><p class="result-summary"><span v-for="(part, i) in highlight(item.hitSnippet || item.summary)" :key="i" :class="{ 'search-hit': part.hit }">{{ part.text }}</span></p><div class="result-footer"><span><AppIcon name="eye" :size="14" />{{ item.viewCount || 0 }}<AppIcon name="heart" :size="14" />{{ item.likeCount || 0 }}</span><RouterLink class="text-action" :to="{ name: 'read', params: { id: item.id }, query: { mode: 'search' } }">读这篇<AppIcon name="external" :size="15" /></RouterLink></div></div></article></div><el-pagination v-if="total > PAGE_SIZE" class="search-pagination" background layout="prev, pager, next, total" :current-page="page" :page-size="PAGE_SIZE" :total="total" @current-change="changePage" /></template>
  </section>
</template>
<style scoped>
.search-page{max-width:1080px;margin:auto}.search-panel{padding:20px 25px}.search-input-row{display:flex;gap:15px;align-items:center}.search-input-row>svg{color:var(--brand)}.search-input-row input{flex:1;min-width:0;border:0;background:none;outline-offset:8px;font-size:16px;padding:9px;color:var(--ink)}.search-filters{display:flex;align-items:center;gap:12px;border-top:1px solid var(--line);padding-top:18px;margin-top:18px}.search-filters>span{font-size:12px;color:var(--muted);margin-right:6px}.search-filters>.el-select{width:160px}.search-filters .text-action{margin-left:auto;font-size:12px}.search-skeleton{padding:32px;margin-top:24px}.result-count{font-size:12px;color:var(--muted);margin:25px 0 16px}.result-list{display:grid;gap:15px}.result-card{display:grid;grid-template-columns:195px minmax(0,1fr);gap:24px;padding:20px}.result-cover{display:grid;place-items:center;width:195px;min-height:144px;overflow:hidden;border-radius:8px;background:var(--soft);text-decoration:none;color:var(--brand);font-size:23px}.result-cover img{width:100%;height:100%;max-height:165px;object-fit:cover}.result-body{min-width:0}.result-meta{display:flex;align-items:center;gap:12px;font-size:10px;color:var(--muted)}.result-title{text-decoration:none}.result-title h2{font-size:18px;font-weight:600;line-height:1.6;margin:11px 0 9px}.result-title:hover{color:var(--brand)}.result-summary{font-size:13px;color:var(--text);line-height:1.8;margin:0 0 18px}.search-hit{background:#e7efd9;color:var(--brand);font-weight:600}.result-footer{display:flex;align-items:center;justify-content:space-between;gap:12px}.result-footer>span{display:flex;align-items:center;gap:7px;color:var(--muted);font-size:11px}.result-footer>span svg:nth-of-type(2){margin-left:11px}.result-footer .text-action{font-size:12px}.search-pagination{justify-content:center;margin:30px 0}
</style>
