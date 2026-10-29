<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { actOnArticle, getArticleDetail, reportBrowse } from '@/api/article'
import { listCategories } from '@/api/category'
import { sanitizeRichText } from '@/utils/sanitizeRichText'
import { formatTime } from '@/utils/format'
import AppIcon from '@/components/AppIcon.vue'
import UserAvatar from '@/components/UserAvatar.vue'
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
let version = 0
let tracking = null

const cleanContent = computed(() => sanitizeRichText(article.value?.content))
const categoryName = computed(
  () =>
    categories.value.find((item) => item.id === article.value?.categoryId)?.categoryName ||
    '社区分享',
)
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
  if (document.hidden && tracking.startedAt) {
    tracking.elapsed += Date.now() - tracking.startedAt
    tracking.startedAt = 0
  } else if (!document.hidden && !tracking.startedAt) {
    tracking.startedAt = Date.now()
  }
}

async function loadArticle(id) {
  flushDwell()
  const current = ++version
  article.value = null
  loading.value = true
  errorMessage.value = ''
  imageFailed.value = false
  busy.value = false
  try {
    const response = await getArticleDetail(id)
    if (current !== version) return
    article.value = response.data
    const mode = ['latest', 'recommend', 'search', 'ask'].includes(route.query.mode)
      ? route.query.mode
      : 'latest'
    tracking = {
      id: response.data.id,
      mode,
      elapsed: 0,
      startedAt: document.hidden ? 0 : Date.now(),
    }
    reportBrowse(response.data.id, 0, mode).catch(() => {})
  } catch (error) {
    if (current === version) {
      errorMessage.value =
        error.response?.data?.message || error.message || '文章暂时无法打开'
    }
  } finally {
    if (current === version) loading.value = false
  }
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
  } catch {
    /* request interceptor owns action feedback */
  } finally {
    if (article.value === target) busy.value = false
  }
}

watch(
  () => route.params.id,
  (id) => loadArticle(id),
  { immediate: true },
)

onMounted(() => {
  listCategories()
    .then((response) => {
      categories.value = response.data
    })
    .catch(() => {})
  document.addEventListener('visibilitychange', visibilityChanged)
})

onBeforeUnmount(() => {
  version++
  flushDwell()
  document.removeEventListener('visibilitychange', visibilityChanged)
})
</script>

<template>
  <section class="reading-page">
    <RouterLink to="/" class="reading-back">
      <AppIcon name="back" :size="16" />
      返回发现流
    </RouterLink>

    <el-skeleton v-if="loading" :rows="10" animated class="reading-skeleton surface" />
    <ContentState
      v-else-if="errorMessage"
      error
      title="这篇内容暂时无法打开"
      :description="errorMessage"
      @retry="loadArticle(route.params.id)"
    />
    <div v-else-if="article" class="reading-layout">
      <article class="reading-article surface">
        <header>
          <span class="tag">{{ categoryName }}</span>
          <h1>{{ article.sourceTranslatedTitle || article.sourceTitle || article.title }}</h1>
          <div class="reading-byline">
            <UserAvatar :size="28" :src="article.authorAvatar || undefined">
              {{ author.slice(0, 1) }}
            </UserAvatar>
            <strong>{{ author }}</strong>
            <span>{{ formatTime(article.createTime) }}</span>
            <span class="byline-views">
              <AppIcon name="eye" :size="15" />
              {{ article.viewCount || 0 }}
            </span>
            <span v-if="article.state === 0" class="tag">草稿 · 仅授权用户可见</span>
          </div>
          <p v-if="article.summary && !article.sourceUrl" class="reading-lede">{{ article.summary }}</p>
        </header>

        <img
          v-if="!article.sourceUrl && article.coverImg && !imageFailed"
          class="reading-cover"
          :src="article.coverImg"
          :alt="article.title"
          @error="imageFailed = true"
        />

        <SourceNotice v-if="article.sourceUrl" :article="article" :category-name="categoryName" />
        <div v-else class="rich-article" v-html="cleanContent"></div>

        <div class="reading-bottom">
          <span>读到有用的内容，给作者一点回应。</span>
          <button class="text-action" :disabled="busy" @click="toggleAction(1)">
            <AppIcon name="heart" :size="17" />
            {{ article.liked ? '已点赞' : '点个赞' }}
          </button>
        </div>
      </article>

      <aside class="reading-aside">
        <section class="author-card surface">
          <span class="section-label">{{ article.sourceUrl ? '链接整理助手' : '这篇内容的作者' }}</span>
          <UserAvatar :size="56" :src="article.authorAvatar || undefined">
            {{ author.slice(0, 1) }}
          </UserAvatar>
          <h2>{{ author }}</h2>
          <p>每一份分享，都值得被认真阅读。</p>
          <RouterLink
            v-if="canEdit"
            :to="{ name: 'creator', query: { edit: article.id } }"
            class="text-action"
          >
            编辑这篇内容
            <AppIcon name="pen" :size="15" />
          </RouterLink>
        </section>

        <section class="reading-ai surface">
          <AppIcon name="spark" :size="20" />
          <h3>还有想了解的？</h3>
          <p>带着关键词，找找社区里的相关内容。</p>
          <RouterLink
            :to="{ name: 'ask', query: { q: '找找与「' + article.title + '」相关的社区文章' } }"
            class="text-action"
          >
            去问 AI
            <AppIcon name="external" :size="15" />
          </RouterLink>
        </section>

        <div class="reading-actions surface">
          <button
            :class="{ active: article.liked }"
            :aria-pressed="!!article.liked"
            :disabled="busy"
            @click="toggleAction(1)"
          >
            <AppIcon name="heart" :size="20" />
            <span>{{ article.liked ? '已点赞' : '点赞' }}</span>
            <strong>{{ article.likeCount || 0 }}</strong>
          </button>
          <button
            :class="{ active: article.collected }"
            :aria-pressed="!!article.collected"
            :disabled="busy"
            @click="toggleAction(2)"
          >
            <AppIcon name="bookmark" :size="20" />
            <span>{{ article.collected ? '已收藏' : '收藏' }}</span>
            <strong>{{ article.collectCount || 0 }}</strong>
          </button>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.reading-page {
  max-width: 1180px;
  margin: auto;
}

.reading-back {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--text);
  font-size: 12.5px;
  font-weight: 600;
  text-decoration: none;
  padding: 7px 14px;
  border-radius: 999px;
  background: var(--glass-bg);
  border: var(--glass-outline);
  margin: 0 0 22px;
  transition: all 0.18s ease;
}

.reading-back:hover {
  color: var(--brand);
  background: #ffffff;
}

.reading-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 248px;
  gap: 32px;
  align-items: start;
}

.reading-article {
  min-width: 0;
  padding: 36px 42px;
  background: var(--glass-bg-strong);
}

.reading-article h1 {
  font-size: 30px;
  letter-spacing: -0.8px;
  line-height: 1.42;
  font-weight: 800;
  margin: 14px 0 18px;
  color: var(--ink);
  overflow-wrap: anywhere;
}

.reading-byline {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  color: var(--muted);
  font-size: 12px;
}

.reading-byline strong {
  font-weight: 700;
  color: var(--ink);
}

.byline-views {
  display: flex;
  align-items: center;
  gap: 4px;
}

.reading-lede {
  font-size: 15px;
  line-height: 1.85;
  color: var(--text);
  background: rgba(15, 23, 42, 0.035);
  border-left: 3px solid var(--brand);
  border-radius: 10px;
  padding: 16px 20px;
  margin: 24px 0 22px;
}

.reading-cover {
  display: block;
  max-height: 440px;
  width: 100%;
  object-fit: cover;
  border-radius: 14px;
  margin: 24px 0 28px;
}

.rich-article {
  font-size: 15.5px;
  line-height: 1.95;
  color: var(--text);
  overflow-wrap: anywhere;
  margin-top: 28px;
  min-height: 120px;
}

.rich-article :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 10px;
}

.rich-article :deep(h1),
.rich-article :deep(h2),
.rich-article :deep(h3) {
  color: var(--ink);
  font-weight: 800;
  line-height: 1.45;
  margin: 30px 0 13px;
}

.rich-article :deep(p) {
  margin: 14px 0;
}

.rich-article :deep(a) {
  color: var(--brand);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.rich-article :deep(pre) {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: #0f172a;
  color: #f8fafc;
  padding: 18px;
  border-radius: 12px;
  font-size: 13px;
}

.rich-article :deep(blockquote) {
  margin: 22px 0;
  padding: 13px 18px;
  border-left: 3px solid var(--brand);
  background: var(--soft);
  border-radius: 0 10px 10px 0;
  color: var(--text);
}

.rich-article :deep(table) {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.rich-article :deep(td),
.rich-article :deep(th) {
  padding: 10px;
  border: 1px solid var(--line);
}

.reading-aside {
  position: sticky;
  top: 96px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.author-card {
  padding: 22px;
  text-align: center;
}

.author-card > .section-label {
  display: block;
  margin-bottom: 18px;
  text-align: left;
}

.author-card h2 {
  font-size: 17px;
  margin: 12px 0 6px;
  font-weight: 800;
  color: var(--ink);
}

.author-card p {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.8;
  margin-bottom: 16px;
}

.author-card .text-action {
  font-size: 12.5px;
}

.reading-ai {
  padding: 20px;
}

.reading-ai > svg {
  color: var(--brand);
}

.reading-ai h3 {
  font-size: 15px;
  font-weight: 800;
  margin: 10px 0 6px;
  color: var(--ink);
}

.reading-ai p {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.75;
  margin-bottom: 14px;
}

.reading-ai .text-action {
  font-size: 12.5px;
}

.reading-actions {
  display: flex;
  justify-content: space-around;
  padding: 16px 8px;
}

.reading-actions button {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--muted);
  background: none;
  border: 0;
  min-width: 78px;
  transition: color 0.18s ease, transform 0.18s ease;
}

.reading-actions button:hover:not(:disabled) {
  color: var(--ink);
  transform: translateY(-1px);
}

.reading-actions button.active {
  color: var(--brand);
}

.reading-actions button.active :deep(svg) {
  fill: rgba(0, 102, 255, 0.16);
}

.reading-actions button strong {
  font-size: 13px;
  font-weight: 800;
}

.reading-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  border-top: 1px solid var(--line);
  padding-top: 24px;
  margin-top: 38px;
  font-size: 12.5px;
  color: var(--muted);
}

.reading-skeleton {
  max-width: 850px;
  padding: 40px;
}
</style>
