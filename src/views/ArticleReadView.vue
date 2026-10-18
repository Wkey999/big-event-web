<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { actOnArticle, getArticleDetail, reportBrowse } from '@/api/article'
import { listCategories } from '@/api/category'
import { sanitizeRichText } from '@/utils/sanitizeRichText'
import { formatTime } from '@/utils/format'
import AppIcon from '@/components/AppIcon.vue'
import ContentState from '@/components/ContentState.vue'
import SourceNotice from '@/components/SourceNotice.vue'
import { useUserStore } from '@/stores/user'
const route = useRoute()
const user = useUserStore()
const article = ref(null)
const loading = ref(false)
const errorMessage = ref('')
const categories = ref([])
const busy = ref(false)
const imageFailed = ref(false)
let version = 0, tracking = null
const cleanContent = computed(() => sanitizeRichText(article.value?.content))
const categoryName = computed(() => categories.value.find(item => item.id === article.value?.categoryId)?.categoryName || '社区分享')
const canEdit = computed(() => article.value?.userId === user.userInfo?.id)
const author = computed(() => article.value?.authorNickname || '社区作者')
function flushDwell() {
  if (!tracking) return
  if (tracking.startedAt) tracking.elapsed += Date.now() - tracking.startedAt
  const { id, mode, elapsed } = tracking
  tracking = null
  reportBrowse(id, Math.min(300000, Math.max(0, elapsed)), mode).catch(() => {})
}
function visibilityChanged() {
  if (!tracking) return
  if (document.hidden && tracking.startedAt) { tracking.elapsed += Date.now() - tracking.startedAt; tracking.startedAt = 0 }
  else if (!document.hidden && !tracking.startedAt) tracking.startedAt = Date.now()
}
async function loadArticle(id) {
  flushDwell()
  const current = ++version
  article.value = null; loading.value = true; errorMessage.value = ''; imageFailed.value = false; busy.value = false
  try {
    const response = await getArticleDetail(id)
    if (current !== version) return
    article.value = response.data
    const mode = ['latest', 'recommend', 'search', 'ask'].includes(route.query.mode) ? route.query.mode : 'latest'
    tracking = { id: response.data.id, mode, elapsed: 0, startedAt: document.hidden ? 0 : Date.now() }
    reportBrowse(response.data.id, 0, mode).catch(() => {})
  } catch (error) { if (current === version) errorMessage.value = error.response?.data?.message || error.message || '文章暂时无法打开' }
  finally { if (current === version) loading.value = false }
}
async function toggleAction(type) {
  if (busy.value || !article.value) return
  const target = article.value
  const activeKey = type === 1 ? 'liked' : 'collected'
  const countKey = type === 1 ? 'likeCount' : 'collectCount'
  const wasActive = target[activeKey]
  busy.value = true
  try {
    await actOnArticle(target.id, type, wasActive ? 0 : 1)
    target[activeKey] = !wasActive
    target[countKey] = Math.max(0, (target[countKey] || 0) + (wasActive ? -1 : 1))
  } catch { /* request interceptor owns action feedback */ }
  finally { if (article.value === target) busy.value = false }
}
watch(() => route.params.id, id => loadArticle(id), { immediate: true })
onMounted(() => { listCategories().then(response => { categories.value = response.data }).catch(() => {}); document.addEventListener('visibilitychange', visibilityChanged) })
onBeforeUnmount(() => { version++; flushDwell(); document.removeEventListener('visibilitychange', visibilityChanged) })
</script>
<template>
  <section class="reading-page">
    <RouterLink to="/" class="reading-back"><AppIcon name="back" :size="17" />回到发现</RouterLink>
    <el-skeleton v-if="loading" :rows="10" animated class="reading-skeleton" />
    <ContentState v-else-if="errorMessage" error title="这篇内容暂时无法打开" :description="errorMessage" @retry="loadArticle(route.params.id)" />
    <div v-else-if="article" class="reading-layout">
      <article class="reading-article">
        <header><span class="tag">{{ categoryName }}</span><h1>{{ article.sourceTranslatedTitle || article.sourceTitle || article.title }}</h1><div class="reading-byline"><el-avatar :size="28" :src="article.authorAvatar || undefined">{{ author.slice(0, 1) }}</el-avatar><strong>{{ author }}</strong><span>{{ formatTime(article.createTime) }}</span><span class="byline-views"><AppIcon name="eye" :size="15" />{{ article.viewCount || 0 }}</span><span v-if="article.state === 0" class="tag">草稿 · 仅授权用户可见</span></div><p v-if="article.summary" class="reading-lede">{{ article.summary }}</p></header>
        <img v-if="!article.sourceUrl && article.coverImg && !imageFailed" class="reading-cover" :src="article.coverImg" :alt="article.title" @error="imageFailed = true">
        <SourceNotice v-if="article.sourceUrl" :article="article" /><div v-else class="rich-article" v-html="cleanContent"></div>
        <div class="reading-bottom"><span>读到有用的内容，给作者一点回应。</span><button class="text-action" :disabled="busy" @click="toggleAction(1)"><AppIcon name="heart" :size="17" />{{ article.liked ? '已点赞' : '点个赞' }}</button></div>
      </article>
      <aside class="reading-aside"><section class="author-card surface"><span class="section-label">{{ article.sourceUrl ? '链接整理助手' : '这篇内容的作者' }}</span><el-avatar :size="56" :src="article.authorAvatar || undefined">{{ author.slice(0, 1) }}</el-avatar><h2>{{ author }}</h2><p>每一份分享，都值得被认真阅读。</p><RouterLink v-if="canEdit" :to="{ name: 'creator', query: { edit: article.id } }" class="text-action">编辑这篇内容<AppIcon name="pen" :size="15" /></RouterLink></section><section class="reading-ai"><AppIcon name="spark" :size="21" /><h3>还有想了解的？</h3><p>带着关键词，找找社区里的相关内容。</p><RouterLink :to="{ name: 'ask', query: { q: '找找与「' + article.title + '」相关的社区文章' } }" class="text-action">去问 AI<AppIcon name="external" :size="15" /></RouterLink></section><div class="reading-actions surface"><button :class="{ active: article.liked }" :aria-pressed="!!article.liked" :disabled="busy" @click="toggleAction(1)"><AppIcon name="heart" :size="20" /><span>{{ article.liked ? '已点赞' : '点赞' }}</span><strong>{{ article.likeCount || 0 }}</strong></button><button :class="{ active: article.collected }" :aria-pressed="!!article.collected" :disabled="busy" @click="toggleAction(2)"><AppIcon name="bookmark" :size="20" /><span>{{ article.collected ? '已收藏' : '收藏' }}</span><strong>{{ article.collectCount || 0 }}</strong></button></div></aside>
    </div>
  </section>
</template>
<style scoped>
.reading-page{max-width:1190px;margin:auto}.reading-back{display:inline-flex;align-items:center;gap:7px;color:var(--muted);font-size:12px;text-decoration:none;margin:0 0 26px}.reading-layout{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:46px;align-items:start}.reading-article{min-width:0;background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:35px 40px}.reading-article h1{font-size:32px;letter-spacing:-.8px;line-height:1.5;font-weight:650;margin:16px 0 20px;overflow-wrap:anywhere}.reading-byline{display:flex;align-items:center;gap:12px;flex-wrap:wrap;color:var(--muted);font-size:11px}.reading-byline strong{font-weight:500;color:var(--text)}.byline-views{display:flex;align-items:center;gap:4px}.reading-lede{font-size:16px;line-height:1.9;color:var(--text);background:#f5f7f1;border-radius:8px;padding:17px 20px;margin:27px 0 23px}.reading-cover{display:block;max-height:420px;width:100%;object-fit:cover;border-radius:9px;margin:26px 0 30px}.rich-article{font-size:15px;line-height:1.95;color:#46594b;overflow-wrap:anywhere;margin-top:30px;min-height:120px}.rich-article :deep(img){max-width:100%;height:auto;border-radius:6px}.rich-article :deep(h1),.rich-article :deep(h2),.rich-article :deep(h3){color:var(--ink);line-height:1.5;margin:30px 0 13px}.rich-article :deep(p){margin:14px 0}.rich-article :deep(a){color:var(--brand);text-decoration:underline;text-underline-offset:3px}.rich-article :deep(pre){white-space:pre-wrap;overflow-wrap:anywhere;background:#f2f5ed;padding:17px;border-radius:8px;font-size:13px}.rich-article :deep(blockquote){margin:22px 0;padding:12px 18px;border-left:3px solid #a9bc96;background:#f6f8f1;color:var(--text)}.rich-article :deep(table){width:100%;border-collapse:collapse;table-layout:fixed}.rich-article :deep(td),.rich-article :deep(th){padding:10px;border:1px solid var(--line)}.reading-aside{position:sticky;top:113px}.author-card{padding:23px;text-align:center}.author-card>.section-label{display:block;margin-bottom:20px;text-align:left}.author-card h2{font-size:17px;margin:13px 0 8px;font-weight:600}.author-card p{font-size:11px;color:var(--muted);line-height:1.9;margin-bottom:20px}.author-card .text-action{font-size:12px}.reading-ai{padding:22px 18px;margin-top:20px;border-radius:12px;background:var(--soft)}.reading-ai>svg{color:var(--brand)}.reading-ai h3{font-size:15px;font-weight:500;margin:10px 0 8px}.reading-ai p{font-size:11px;color:var(--muted);line-height:1.8;margin-bottom:18px}.reading-ai .text-action{font-size:12px}.reading-actions{display:flex;justify-content:space-around;margin-top:20px;padding:17px 8px}.reading-actions button{display:flex;align-items:center;flex-direction:column;gap:7px;font-size:11px;color:var(--muted);background:none;border:0;min-width:75px}.reading-actions button.active{color:var(--brand)}.reading-actions button.active:first-child :deep(svg){fill:#e5eddd}.reading-actions button strong{font-size:12px;font-weight:500}.reading-bottom{display:flex;justify-content:space-between;gap:20px;border-top:1px solid var(--line);padding-top:25px;margin-top:40px;font-size:12px;color:var(--muted)}.reading-skeleton{max-width:850px;padding:40px}
</style>
