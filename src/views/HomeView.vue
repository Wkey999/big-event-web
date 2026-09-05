<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listArticles } from '@/api/article'
import { listCategories } from '@/api/category'
import { formatTime } from '@/utils/format'
import FeedCard from '@/components/FeedCard.vue'

const router = useRouter()

const PAGE_SIZE = 8
// 封面宽高比由文章 id 决定：高度在渲染前就可估算，瀑布流分桶不需要量 DOM
const RATIOS = [3 / 4, 1, 4 / 5]

const items = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const finished = ref(false)
const loadError = ref(false)
// 首次加载由 IntersectionObserver 触发，挂载瞬间还没发起；没有这个标记模板会先闪一下空态
const started = ref(false)
const columnCount = ref(columnCountFor(window.innerWidth))
const categoryNames = ref(new Map())
const sentinelEl = ref()
const preview = ref(null)

let sentinelVisible = false
let io = null
let resizeTimer = null

function columnCountFor(width) {
  if (width >= 1400) return 4
  if (width >= 900) return 3
  return 2
}

const ratioOf = (article) => RATIOS[article.id % RATIOS.length]
// 100 / ratio 是封面相对列宽的高度，45 是标题两行 + meta 行的经验常量
const estHeight = (article) => 100 / ratioOf(article) + 45

// 贪心：每张卡放进当前累计高度最小的列。对 items 全量重算，追加时已有卡的归属不变
const columns = computed(() => {
  const buckets = Array.from({ length: columnCount.value }, () => ({ list: [], height: 0 }))
  for (const article of items.value) {
    const target = buckets.reduce((min, b) => (b.height < min.height ? b : min))
    target.list.push(article)
    target.height += estHeight(article)
  }
  return buckets.map((b) => b.list)
})

const previewVisible = computed({
  get: () => preview.value !== null,
  set: (visible) => {
    if (!visible) preview.value = null
  },
})

async function loadMore() {
  if (loading.value || finished.value) return
  loading.value = true
  started.value = true
  loadError.value = false
  try {
    const res = await listArticles({ pageNum: page.value, pageSize: PAGE_SIZE, state: '已发布' })
    // 文章管理页可能并发增删导致页码漂移，按 id 去重
    const seen = new Set(items.value.map((a) => a.id))
    items.value.push(...res.data.items.filter((a) => !seen.has(a.id)))
    total.value = res.data.total
    finished.value = items.value.length >= total.value
    page.value += 1
  } catch {
    // 错误提示已由 axios 拦截器弹出，这里只负责把哨兵切成重试态
    loadError.value = true
  }
  // 必须先解除 loading 再自链，否则递归调用会被上面的守卫直接挡回
  loading.value = false
  await nextTick()
  if (sentinelVisible && !finished.value && !loadError.value) loadMore()
}

function openPreview(article) {
  preview.value = article
}

function handleResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    columnCount.value = columnCountFor(window.innerWidth)
  }, 150)
}

onMounted(async () => {
  window.addEventListener('resize', handleResize)
  // root 必须是 .layout-main 这个真正的滚动容器：用 null 时哨兵的相交矩形会被它的
  // overflow 裁掉，rootMargin 的预加载余量完全失效，矮视口下首屏要等用户滚动才发请求
  io = new IntersectionObserver(
    ([entry]) => {
      // 哨兵持续可见时 IO 不会再次回调，所以记下可见性靠 loadMore 末尾自链补页
      sentinelVisible = entry.isIntersecting
      // 失败态必须挡住：加载失败后 el-empty/骨架塌成只剩哨兵，布局变化会再次触发 IO，
      // 不设防就会自动重发请求（后端真挂了会一直重试），把重试按钮的状态盖掉
      if (entry.isIntersecting && !loadError.value) loadMore()
    },
    { root: sentinelEl.value.closest('.layout-main'), rootMargin: '200px' },
  )
  io.observe(sentinelEl.value)
  try {
    const res = await listCategories()
    categoryNames.value = new Map(res.data.map((c) => [c.id, c.categoryName]))
  } catch {
    // 分类名拿不到时卡片只是不显示 tag，不阻塞信息流
  }
})

onBeforeUnmount(() => {
  io?.disconnect()
  clearTimeout(resizeTimer)
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="feed">
    <header class="feed-header">
      <h2>动态</h2>
      <span v-if="total > 0" class="count">共 {{ total }} 篇</span>
    </header>

    <div v-if="items.length === 0 && !loadError && (loading || !started)" class="feed-columns">
      <div v-for="c in columnCount" :key="c" class="feed-col">
        <el-skeleton v-for="n in 2" :key="n" animated class="skeleton-card">
          <template #template>
            <el-skeleton-item variant="image" style="width: 100%; height: 200px" />
            <el-skeleton-item variant="text" style="margin-top: 12px" />
            <el-skeleton-item variant="text" style="width: 60%; margin-top: 8px" />
          </template>
        </el-skeleton>
      </div>
    </div>

    <el-empty v-else-if="total === 0 && !loadError" description="还没有已发布的文章">
      <el-button type="primary" @click="router.push('/article')">去发布</el-button>
    </el-empty>

    <div v-else class="feed-columns">
      <div v-for="(col, colIndex) in columns" :key="colIndex" class="feed-col">
        <FeedCard
          v-for="article in col"
          :key="article.id"
          :article="article"
          :category-name="categoryNames.get(article.categoryId) || ''"
          :author="{ nickname: article.authorNickname, avatar: article.authorAvatar }"
          :ratio="ratioOf(article)"
          @click="openPreview(article)"
        />
      </div>
    </div>

    <div ref="sentinelEl" class="sentinel">
      <span v-if="loadError" class="retry" @click="loadMore">加载失败，点击重试</span>
      <span v-else-if="loading" class="tip">加载中…</span>
      <span v-else-if="finished && items.length > 0" class="tip">没有更多了</span>
    </div>

    <el-dialog v-model="previewVisible" :title="preview?.title" width="720px" top="6vh">
      <div v-if="preview" class="preview-meta">
        <span>{{ categoryNames.get(preview.categoryId) || '未分类' }}</span>
        <span>{{ formatTime(preview.createTime) }}</span>
        <span>浏览 {{ preview.viewCount }}</span>
      </div>
      <!-- 列表按 userId 隔离，content 永远是登录者自己写的；将来若做公开信息流，这里必须先 sanitize -->
      <div v-if="preview" class="preview-content" v-html="preview.content"></div>
    </el-dialog>
  </div>
</template>

<style scoped>
.feed-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
}

.feed-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.count {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.feed-columns {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.feed-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 与 FeedCard 同配方的伪玻璃，保证骨架态与成型态底色一致不跳变 */
.skeleton-card {
  padding: 12px;
  background: rgba(252, 253, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(43, 52, 64, 0.06);
}

.sentinel {
  display: flex;
  justify-content: center;
  padding: 24px 0 8px;
  min-height: 48px;
}

.tip {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.retry {
  font-size: 13px;
  color: var(--el-color-warning);
  cursor: pointer;
}

.preview-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.preview-content :deep(img) {
  max-width: 100%;
}

.preview-content :deep(p) {
  margin: 0 0 12px;
  line-height: 1.8;
  color: var(--el-text-color-regular);
}
</style>
