<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getArticleDetail, listArticles, reportBrowse } from '@/api/article'
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
const previewLoading = ref(false)

let sentinelVisible = false
let io = null
let resizeTimer = null
// 组件卸载后必须阻断 loadMore 的自链与状态写入：否则离开首页后仍在后台一页页请求
let unmounted = false

// ---- 行为埋点（阶段 A 数据闭环）----
// 卡片曝光观察器懒创建：卡片要等第一页数据回来才渲染，放在首次 registerCard 里创建最稳
let cardObserver = null
const cardEls = new Map()
// 一次会话内同一篇文章只报一次曝光，避免来回滚动反复触发
const reportedExposure = new Set()
// 预览弹窗停留计时：打开记时间戳，关闭时上报真实时长
let previewArticleId = null
let previewEnteredAt = 0

function sendBrowse(articleId, dwellMs) {
  // 埋点不该打扰用户：静默失败（request 拦截器已按 silent 配置跳过提示，这里再兜一层未捕获拒绝）
  reportBrowse(articleId, dwellMs).catch(() => {})
}

function handleCardEntries(entries) {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue
    const id = Number(entry.target.dataset.articleId)
    if (!id || reportedExposure.has(id)) continue
    reportedExposure.add(id)
    // 曝光信号：只说明「看到了」，停留时长等关闭预览时再补报
    sendBrowse(id, 0)
  }
}

function registerCard(id, el) {
  const prev = cardEls.get(id)
  if (!el) {
    // 函数式 ref 在卸载时回调 null：显式 unobserve，避免观察器长期持有已移除的节点
    if (prev) {
      cardObserver?.unobserve(prev)
      cardEls.delete(id)
    }
    return
  }
  cardEls.set(id, el)
  el.dataset.articleId = String(id)
  if (!cardObserver) {
    // 露出一半才算曝光；root 同样必须是 .layout-main，否则滚动容器会把相交矩形裁掉
    cardObserver = new IntersectionObserver(handleCardEntries, {
      root: el.closest('.layout-main'),
      threshold: 0.5,
    })
  }
  cardObserver.observe(el)
}

function flushPreviewDwell() {
  if (!previewArticleId || !previewEnteredAt) return
  // 上限与后端 @Max(300000) 对齐，避免挂机过久被校验拒绝
  const dwellMs = Math.min(Date.now() - previewEnteredAt, 300000)
  const id = previewArticleId
  previewArticleId = null
  previewEnteredAt = 0
  sendBrowse(id, dwellMs)
}

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
    if (!visible) {
      // 关闭弹窗即用户读完了这一篇：先补报停留时长，再清状态
      flushPreviewDwell()
      preview.value = null
      previewLoading.value = false
    }
  },
})

async function loadMore() {
  if (loading.value || finished.value) return
  loading.value = true
  started.value = true
  loadError.value = false
  try {
    const res = await listArticles({ pageNum: page.value, pageSize: PAGE_SIZE, state: '已发布' })
    if (unmounted) return
    // 文章管理页可能并发增删导致页码漂移，按 id 去重
    const seen = new Set(items.value.map((a) => a.id))
    items.value.push(...res.data.items.filter((a) => !seen.has(a.id)))
    total.value = res.data.total
    // 短页判定兜底：本页不满说明已到底。只靠 items.length >= total 时，
    // 跨页重复被去重掉会让它永远差几条，自链就退化成无限请求（实测症状：一直转圈请求）
    finished.value = res.data.items.length < PAGE_SIZE || items.value.length >= total.value
    page.value += 1
  } catch {
    // 错误提示已由 axios 拦截器弹出，这里只负责把哨兵切成重试态
    if (!unmounted) loadError.value = true
  } finally {
    if (!unmounted) loading.value = false
  }
  if (unmounted) return
  // 必须先解除 loading 再自链，否则递归调用会被上面的守卫直接挡回
  await nextTick()
  if (sentinelVisible && !finished.value && !loadError.value) loadMore()
}

async function openPreview(article) {
  // 列表已收窄列不含正文，打开预览时才拉全文——这才算一次真实阅读，
  // 顺便让浏览量增长有意义（此前列表自带 content，没人会调 detail）
  previewArticleId = article.id
  previewEnteredAt = Date.now()
  preview.value = { ...article, content: '' }
  previewLoading.value = true
  try {
    const res = await getArticleDetail(article.id)
    // 用户可能已关掉弹窗或点了另一张卡，回来只认当前这张
    if (preview.value && preview.value.id === article.id) preview.value = res.data
  } catch {
    // 错误提示已由 axios 拦截器统一弹出
  } finally {
    previewLoading.value = false
  }
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
  unmounted = true
  // 离开页面时如果预览还开着，把这段停留也补报掉，否则计时丢失
  flushPreviewDwell()
  cardObserver?.disconnect()
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
        <!-- 包一层 div 只为拿到可观察的 DOM 节点（组件上的函数式 ref 拿到的是实例不是元素） -->
        <div
          v-for="article in col"
          :key="article.id"
          :ref="(el) => registerCard(article.id, el)"
        >
          <FeedCard
            :article="article"
            :category-name="categoryNames.get(article.categoryId) || ''"
            :author="{ nickname: article.authorNickname, avatar: article.authorAvatar }"
            :ratio="ratioOf(article)"
            @click="openPreview(article)"
          />
        </div>
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
      <!-- 正文来自 /article/detail（打开预览才拉，浏览量 +1） -->
      <el-skeleton v-if="previewLoading" :rows="6" animated />
      <!-- 信息流已全站共享，这篇正文是别人写的：v-html 渲染他人 HTML 存在存储型 XSS 风险，
           上线前必须过一层 sanitize（DOMPurify），当前仅作受信任作者范围内的过渡方案 -->
      <div v-else-if="preview" class="preview-content" v-html="preview.content"></div>
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
