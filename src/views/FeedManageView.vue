<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  listFeedSources,
  listFeedEntries,
  collectFeed,
  publishFeedEntry,
  rejectFeedEntry,
  translateFeedTitles,
} from '@/api/feeds'
import { listCategories } from '@/api/category'
import { formatTime } from '@/utils/format'
import { sourceLink } from '@/utils/sourceLink'
import AppIcon from '@/components/AppIcon.vue'
import ContentState from '@/components/ContentState.vue'

const sources = ref([])
const entries = ref([])
const categories = ref([])
const total = ref(0)
const page = ref(1)
const status = ref(0)
const source = ref('')
const loading = ref(false)
const error = ref(false)
const collecting = ref('')
const acting = ref(null)
const batchActing = ref('')
const selected = ref(null)
const categoryId = ref(null)
const translatedTitle = ref('')
const translating = ref('')
const selectedRows = ref([])
const reviewSectionRef = ref(null)

// 每个来源的实时库存统计：{ [key]: { pending: 0, published: 0, previewItems: [] } }
const sourceStats = ref({})

let version = 0
let disposed = false

const isBusy = computed(
  () => !!collecting.value || !!translating.value || !!acting.value || !!batchActing.value,
)

const totalPendingCount = computed(() =>
  Object.values(sourceStats.value).reduce((sum, item) => sum + (item?.pending || 0), 0),
)

const totalPublishedCount = computed(() =>
  Object.values(sourceStats.value).reduce((sum, item) => sum + (item?.published || 0), 0),
)

const HOT_KEYWORDS_RE =
  /LPL|LCK|S16|Worlds|全球总决赛|英雄联盟|零封|横扫|爆冷|夺冠|全败|淘汰|瑞士轮|BLG|TES|WBG|IG|JDG|T1|GEN|Faker|Bin|Rookie|VALORANT|无畏契约|VCT|CS2|Dota|国乒|中超|欧冠|英超|NBA|决赛|金牌|DeepSeek|Qwen|千问|GPT|Claude|Agent|大模型/i

function isHotEntry(entry) {
  const text = `${entry?.translatedTitle || ''} ${entry?.title || ''}`
  return HOT_KEYWORDS_RE.test(text)
}

function hasChinese(text) {
  return /[\u4e00-\u9fa5]/.test(String(text || ''))
}

function buildFallbackChineseTitle(entry, srcInfo) {
  const existing = String(entry?.translatedTitle || '').trim()
  if (hasChinese(existing)) return existing
  const raw = String(entry?.title || '').trim()
  if (hasChinese(raw)) return raw
  const prefixMap = {
    esports_insider: '【电竞赛事快讯】',
    esports_hot: '【LPL/电竞焦点】',
    bbc_sport: '【国际体育战报】',
    chinanews_sport: '【体坛焦点快讯】',
    github: '【GitHub 工程洞察】',
    deepseek_github: '【DeepSeek 开源动态】',
    qwen_github: '【通义千问开源动态】',
  }
  const prefix = prefixMap[entry?.sourceKey] || `【${srcInfo?.categoryName || '前沿资讯'}】`
  return `${prefix}${raw}`.slice(0, 500)
}

function recommendedCategoryId(sourceKey) {
  const srcInfo = sources.value.find((item) => item.key === sourceKey)
  const recommendedName = srcInfo?.categoryName
  if (recommendedName) {
    const matched = categories.value.find((item) => item.categoryName === recommendedName)
    if (matched) return matched.id
  }
  return categories.value[0]?.id || null
}

async function loadSourceStats(sourceList = sources.value) {
  if (!sourceList.length || disposed) return
  const tasks = sourceList.map(async (item) => {
    try {
      const [pendingRes, publishedRes] = await Promise.all([
        listFeedEntries({ pageNum: 1, status: 0, source: item.key }),
        listFeedEntries({ pageNum: 1, status: 1, source: item.key }),
      ])
      return [
        item.key,
        {
          pending: pendingRes?.data?.total || 0,
          published: publishedRes?.data?.total || 0,
          previewItems: (pendingRes?.data?.items || []).slice(0, 2),
        },
      ]
    } catch {
      return [
        item.key,
        sourceStats.value[item.key] || { pending: 0, published: 0, previewItems: [] },
      ]
    }
  })
  const pairs = await Promise.all(tasks)
  if (!disposed) {
    sourceStats.value = Object.fromEntries(pairs)
  }
}

async function loadSources() {
  const result = await listFeedSources()
  if (!disposed) {
    sources.value = result.data || []
    await loadSourceStats(sources.value)
  }
}

async function loadEntries() {
  const current = ++version
  loading.value = true
  error.value = false
  try {
    const result = await listFeedEntries({
      pageNum: page.value,
      status: status.value,
      source: source.value || undefined,
    })
    if (current === version) {
      entries.value = result.data.items
      total.value = result.data.total
      selectedRows.value = []
    }
  } catch {
    if (current === version) error.value = true
  } finally {
    if (current === version) loading.value = false
  }
}

function filter() {
  page.value = 1
  loadEntries()
}

function focusSourceQueue(key, targetStatus = 0) {
  source.value = key
  status.value = targetStatus
  page.value = 1
  loadEntries()
  reviewSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function collect(key) {
  if (isBusy.value) return
  collecting.value = key
  try {
    const result = await collectFeed(key)
    const run = result.data
    await Promise.allSettled([loadSources(), loadEntries()])
    const pendingNow = sourceStats.value[key]?.pending || 0
    const srcName = sources.value.find((item) => item.key === key)?.name || key

    if (run.skipped) {
      ElMessage.info(
        `${run.message}${run.autoPublished ? `，已自动发布 ${run.autoPublished} 条待处理内容` : ''}`,
      )
    } else if (run.success) {
      if (run.inserted === 0 && run.duplicates > 0 && pendingNow > 0) {
        source.value = key
        status.value = 0
        page.value = 1
        await loadEntries()
        ElMessage.success(
          `${srcName}：RSS 最新 ${run.duplicates} 篇均已采集在库！当前有 ${pendingNow} 篇待审资讯，已为您定位到列表，可点击「一键发布待审」直接上架。`,
        )
      } else {
        ElMessage.success(
          `新增 ${run.inserted} 条，自动发布 ${run.autoPublished || 0} 条，重复 ${run.duplicates} 条${
            pendingNow ? `（当前队列共 ${pendingNow} 条待审核）` : ''
          }`,
        )
      }
    } else {
      ElMessage.error(run.message)
    }
  } catch {
    /* request owns feedback */
  } finally {
    collecting.value = ''
  }
}

// 一键拉取高频赛事与科技热点源（LPL/电竞实时战报、中新体育、Esports Insider、IT之家）
async function collectAllHotSources() {
  if (isBusy.value) return
  batchActing.value = 'collect-hot'
  const priorityKeys = ['esports_hot', 'chinanews_sport', 'esports_insider', 'ithome']
  let totalInserted = 0
  try {
    for (const key of priorityKeys) {
      if (!sources.value.some((s) => s.key === key)) continue
      try {
        const res = await collectFeed(key)
        totalInserted += res?.data?.inserted || 0
      } catch {
        /* continue next source */
      }
    }
    source.value = 'esports_hot'
    status.value = 0
    page.value = 1
    await Promise.allSettled([loadSources(), loadEntries()])
    ElMessage.success(
      `全网热点拉取完成！本次新增入库 ${totalInserted} 篇实时战报与焦点资讯，已为您定位至「LPL/电竞实时战报」队列。`,
    )
  } finally {
    batchActing.value = ''
  }
}

async function translate(key) {
  if (isBusy.value) return
  translating.value = key
  try {
    const result = (await translateFeedTitles(key)).data
    if (result.success) {
      ElMessage.success(
        `${result.message}，本次补译 ${result.translated} 条${
          result.pending ? `，还有 ${result.pending} 条待补译` : ''
        }`,
      )
    } else {
      ElMessage.warning(result.message)
    }
    await Promise.allSettled([loadSources(), loadEntries()])
  } catch {
    /* request owns feedback */
  } finally {
    translating.value = ''
  }
}

// 一键采集并发布 / 一键发布该来源待审内容（彻底解决人工审核源采集后不显示在首页的问题）
async function quickPublishSource(item, shouldCollectFirst = false) {
  if (isBusy.value) return
  const key = item.key
  const catId = recommendedCategoryId(key)
  if (!catId) {
    ElMessage.warning(`未找到可用发布频道，请先在频道管理中启用「${item.categoryName}」频道`)
    return
  }

  batchActing.value = key
  try {
    if (shouldCollectFirst) {
      try {
        await collectFeed(key)
      } catch {
        // 即使单次拉取受限，也继续处理库中已有的待审条目
      }
    }

    // 读取该来源最新的待审核条目
    let pendingList = (await listFeedEntries({ pageNum: 1, status: 0, source: key }))?.data?.items || []
    if (!pendingList.length) {
      ElMessage.info(`${item.name} 当前没有待审核的资讯条目`)
      await Promise.allSettled([loadSources(), loadEntries()])
      return
    }

    // 若需要中文标题且存在未翻译条目，先尝试调用后端补译一次
    if (item.requiresTranslation && pendingList.some((entry) => !hasChinese(entry.translatedTitle))) {
      try {
        await translateFeedTitles(key)
        pendingList = (await listFeedEntries({ pageNum: 1, status: 0, source: key }))?.data?.items || []
      } catch {
        // 后端未开启大模型时自动走本地中文前缀兜底
      }
    }

    const targets = pendingList.slice(0, 5)
    let publishedCount = 0
    for (const entry of targets) {
      try {
        const finalTitle = item.requiresTranslation
          ? buildFallbackChineseTitle(entry, item)
          : undefined
        await publishFeedEntry(entry.id, catId, finalTitle)
        publishedCount++
      } catch {
        // 单条失败不中断整体批次
      }
    }

    source.value = key
    await Promise.allSettled([loadSources(), loadEntries()])

    if (publishedCount > 0) {
      ElMessage.success(
        `${item.name}：已成功一键发布 ${publishedCount} 篇资讯至「${item.categoryName}」频道！`,
      )
    } else {
      ElMessage.warning(`${item.name} 发布未完成，请检查频道状态或手动审核`)
    }
  } finally {
    batchActing.value = ''
  }
}

function sourceInfo(entry) {
  return sources.value.find((item) => item.key === entry?.sourceKey)
}

function needsTranslation(entry) {
  return !!sourceInfo(entry)?.requiresTranslation
}

// 单行一键直发（无需弹窗）
async function quickPublishRow(entry) {
  if (isBusy.value || entry.status !== 0) return
  const srcInfo = sourceInfo(entry)
  const catId = recommendedCategoryId(entry.sourceKey)
  if (!catId) {
    openPublish(entry)
    return
  }
  acting.value = entry.id
  try {
    const finalTitle = needsTranslation(entry)
      ? buildFallbackChineseTitle(entry, srcInfo)
      : undefined
    await publishFeedEntry(entry.id, catId, finalTitle)
    ElMessage.success(`已直发至「${srcInfo?.categoryName || '推荐'}」频道`)
    await Promise.allSettled([loadSources(), loadEntries()])
  } catch {
    /* request owns feedback */
  } finally {
    acting.value = null
  }
}

// 批量发布表格勾选条目（或当前页全部待审条目）
async function batchPublishRows(rowsToPublish) {
  const list = (rowsToPublish || []).filter((row) => row.status === 0)
  if (!list.length || isBusy.value) return
  batchActing.value = 'table-batch'
  let successCount = 0
  try {
    for (const entry of list) {
      const srcInfo = sourceInfo(entry)
      const catId = recommendedCategoryId(entry.sourceKey)
      if (!catId) continue
      try {
        const finalTitle = needsTranslation(entry)
          ? buildFallbackChineseTitle(entry, srcInfo)
          : undefined
        await publishFeedEntry(entry.id, catId, finalTitle)
        successCount++
      } catch {
        /* continue */
      }
    }
    await Promise.allSettled([loadSources(), loadEntries()])
    if (successCount > 0) {
      ElMessage.success(`批量发布完成：成功上架 ${successCount} 篇资讯卡片`)
    }
  } finally {
    batchActing.value = ''
  }
}

async function batchRejectRows(rowsToReject) {
  const list = (rowsToReject || []).filter((row) => row.status === 0)
  if (!list.length || isBusy.value) return
  batchActing.value = 'table-reject'
  let count = 0
  try {
    for (const entry of list) {
      try {
        await rejectFeedEntry(entry.id)
        count++
      } catch {
        /* continue */
      }
    }
    await Promise.allSettled([loadSources(), loadEntries()])
    if (count > 0) {
      ElMessage.success(`已批量忽略 ${count} 条资讯`)
    }
  } finally {
    batchActing.value = ''
  }
}

function openPublish(entry) {
  selected.value = entry
  const recommended = sourceInfo(entry)?.categoryName
  categoryId.value =
    categories.value.find((item) => item.categoryName === recommended)?.id ||
    categories.value[0]?.id ||
    null
  translatedTitle.value = entry.translatedTitle || ''
}

function fillFallbackTitleInDialog() {
  if (!selected.value) return
  translatedTitle.value = buildFallbackChineseTitle(selected.value, sourceInfo(selected.value))
}

async function publish() {
  if (!selected.value || !categoryId.value || acting.value) return
  acting.value = selected.value.id
  try {
    await publishFeedEntry(
      selected.value.id,
      categoryId.value,
      needsTranslation(selected.value) ? translatedTitle.value.trim() : undefined,
    )
    selected.value = null
    ElMessage.success('链接卡片已发布')
    await Promise.allSettled([loadSources(), loadEntries()])
  } catch {
    /* request owns feedback */
  } finally {
    acting.value = null
  }
}

async function reject(entry) {
  if (acting.value) return
  acting.value = entry.id
  try {
    await rejectFeedEntry(entry.id)
    ElMessage.success('已忽略，后续采集不会重复导入')
    await Promise.allSettled([loadSources(), loadEntries()])
  } catch {
    /* request owns feedback */
  } finally {
    acting.value = null
  }
}

function handleSelectionChange(rows) {
  selectedRows.value = rows
}

onMounted(async () => {
  await Promise.allSettled([
    loadSources(),
    loadEntries(),
    listCategories().then((r) => {
      if (!disposed) categories.value = (r.data || []).filter((c) => c.status === 1)
    }),
  ])
})

onBeforeUnmount(() => {
  disposed = true
  version++
})
</script>

<template>
  <section class="workspace-page feed-admin">
    <header class="page-heading feed-heading">
      <div>
        <span class="eyebrow">CURATED FROM THE WEB · 资讯采编工作台</span>
        <h1>资讯采集与一键上架</h1>
        <p>
          支持 RSS 订阅采集、AI 标题汉化与一键批量发布。人工审核源（如 Esports Insider、BBC Sport、IT之家）采集后会进入「待审核队列」，您可直接点击卡片上的
          <strong>「一键发布待审」</strong> 立即上架至对应社区频道。
        </p>
      </div>
      <div class="heading-stats">
        <div class="stat-pill">
          <span class="stat-label">待审核库存</span>
          <strong>{{ totalPendingCount }} 篇</strong>
        </div>
        <div class="stat-pill published">
          <span class="stat-label">累计已上架</span>
          <strong>{{ totalPublishedCount }} 篇</strong>
        </div>
        <button
          class="button button-electric"
          :disabled="isBusy"
          @click="collectAllHotSources"
        >
          <AppIcon name="spark" :size="15" />
          {{ batchActing === 'collect-hot' ? '正在拉取全网热点…' : '一键拉取赛事与科技热点' }}
        </button>
        <button
          class="button button-secondary"
          :disabled="isBusy"
          @click="loadSources(); loadEntries()"
        >
          <AppIcon name="refresh" :size="16" />刷新状态
        </button>
      </div>
    </header>

    <div class="feed-sources">
      <article
        v-for="item in sources"
        :key="item.key"
        class="surface source-card"
        :class="{ 'is-active-source': source === item.key }"
      >
        <div class="source-top">
          <div class="source-title-row">
            <h2>{{ item.name }}</h2>
            <button
              type="button"
              class="queue-badge"
              :class="{ 'has-pending': (sourceStats[item.key]?.pending || 0) > 0 }"
              @click="focusSourceQueue(item.key, 0)"
            >
              待审 {{ sourceStats[item.key]?.pending || 0 }} · 已发
              {{ sourceStats[item.key]?.published || 0 }}
            </button>
          </div>
          <span class="tag" :class="{ 'auto-publish-tag': item.automaticPublishing }">
            {{ item.automaticPublishing ? '白名单 · 自动发布' : '人工审核 · 支持一键直发' }}
          </span>
          <span v-if="item.feedCount > 1" class="tag multi-feed-tag">
            多源聚合 · {{ item.feedCount }} 路 RSS
          </span>
          <span v-if="item.hotTopicBoost" class="tag hot-boost-tag">
            🔥 热点脉冲优先
          </span>
          <span class="tag">{{ item.automaticEnabled ? '定时采集开启' : '手动采集' }}</span>
        </div>

        <p class="source-desc">{{ item.botNickname }} · {{ item.description }}</p>

        <div class="source-meta-line">
          <span class="source-channel">
            推荐频道 · {{ item.categoryName }}
            <span v-if="item.requiresTranslation"> · 中文译名</span>
          </span>
        </div>

        <p v-if="item.repositories?.length" class="source-repositories">
          {{ item.repositories.join(' · ') }}
        </p>

        <div class="source-last">
          <template v-if="item.lastRun">
            <div class="last-run-head">
              <span>
                上次 {{ formatTime(item.lastRun.finishedAt) }} ·
                {{
                  item.lastRun.skipped
                    ? '已跳过'
                    : item.lastRun.success
                      ? '采集完成'
                      : '采集异常'
                }}
              </span>
            </div>
            <div class="last-run-metrics">
              {{
                item.lastRun.success && item.lastRun.scanned > 0
                  ? `新增 ${item.lastRun.inserted} · 库内已有 ${item.lastRun.duplicates} · 过滤 ${item.lastRun.filtered} · 自动发布 ${item.lastRun.autoPublished || 0}`
                  : item.lastRun.message
              }}
            </div>
            <!-- 针对像 Esports Insider 这样已采集入库但尚未发布的智能诊断提示 -->
            <div
              v-if="
                item.lastRun.success &&
                item.lastRun.inserted === 0 &&
                item.lastRun.duplicates > 0 &&
                (sourceStats[item.key]?.pending || 0) > 0
              "
              class="duplicate-explain-tip"
            >
              💡 RSS 最新 {{ item.lastRun.duplicates }} 篇均已入库，当前有
              <strong>{{ sourceStats[item.key]?.pending }} 篇待审核</strong>，点下方「一键发布待审」即可上架到首页！
            </div>
            <div v-if="item.lastRun.autoPending" class="translation-pending">
              {{ item.lastRun.autoPending }} 条待处理：请检查中文标题或默认频道
            </div>
          </template>
          <span v-else>还没有采集记录，可点击下方按钮首次拉取</span>
        </div>

        <!-- 卡片内展示最新 2 条待审预览，让管理员一眼看到 Esports Insider 已经采到的文章 -->
        <div
          v-if="sourceStats[item.key]?.previewItems?.length"
          class="source-pending-preview"
          @click="focusSourceQueue(item.key, 0)"
        >
          <div class="preview-header">
            <span>最新待审预览（点击定位列表）</span>
            <span class="preview-count">共 {{ sourceStats[item.key]?.pending }} 篇 &rarr;</span>
          </div>
          <p
            v-for="preview in sourceStats[item.key].previewItems"
            :key="preview.id"
            class="preview-item-title"
          >
            · {{ preview.translatedTitle || preview.title }}
          </p>
        </div>

        <div class="source-actions">
          <button
            v-if="(sourceStats[item.key]?.pending || 0) > 0"
            class="button button-electric"
            :disabled="isBusy"
            @click="quickPublishSource(item, false)"
          >
            <AppIcon name="spark" :size="14" />
            {{
              batchActing === item.key
                ? '正在上架…'
                : `一键发布待审 (${Math.min(sourceStats[item.key]?.pending || 0, 5)}篇)`
            }}
          </button>
          <button
            v-else-if="!item.automaticPublishing"
            class="button button-electric"
            :disabled="isBusy"
            @click="quickPublishSource(item, true)"
          >
            <AppIcon name="spark" :size="14" />
            {{ batchActing === item.key ? '采集中…' : '采集并直发' }}
          </button>

          <button
            class="button button-primary"
            :disabled="isBusy"
            @click="collect(item.key)"
          >
            <AppIcon name="refresh" :size="14" />
            {{ collecting === item.key ? '正在采集…' : '立即采集' }}
          </button>

          <button
            v-if="item.requiresTranslation"
            class="button button-secondary"
            :disabled="isBusy"
            @click="translate(item.key)"
          >
            {{ translating === item.key ? '正在翻译…' : '补译标题' }}
          </button>
        </div>
      </article>
    </div>

    <div ref="reviewSectionRef" class="feed-review surface">
      <!-- 顶部快捷来源胶囊导航 -->
      <div class="source-filter-pills">
        <button
          type="button"
          class="source-pill"
          :class="{ active: source === '' }"
          @click="source = ''; filter()"
        >
          全部来源
          <span class="pill-badge">{{ totalPendingCount }}</span>
        </button>
        <button
          v-for="item in sources"
          :key="item.key"
          type="button"
          class="source-pill"
          :class="{ active: source === item.key }"
          @click="source = item.key; filter()"
        >
          {{ item.name }}
          <span
            class="pill-badge"
            :class="{ highlight: (sourceStats[item.key]?.pending || 0) > 0 }"
          >
            {{
              status === 0
                ? sourceStats[item.key]?.pending || 0
                : status === 1
                  ? sourceStats[item.key]?.published || 0
                  : '·'
            }}
          </span>
        </button>
      </div>

      <div class="review-toolbar">
        <div class="toolbar-left">
          <h2>采集内容队列</h2>
          <span class="total-badge">当前筛选共 {{ total }} 条</span>
        </div>

        <div class="toolbar-actions">
          <template v-if="status === 0 && entries.length > 0">
            <button
              v-if="selectedRows.length > 0"
              type="button"
              class="button button-electric button-sm"
              :disabled="isBusy"
              @click="batchPublishRows(selectedRows)"
            >
              <AppIcon name="spark" :size="14" />
              {{
                batchActing === 'table-batch'
                  ? '批量发布中…'
                  : `批量发布所选 (${selectedRows.length})`
              }}
            </button>
            <button
              v-else
              type="button"
              class="button button-electric button-sm"
              :disabled="isBusy"
              @click="batchPublishRows(entries)"
            >
              <AppIcon name="spark" :size="14" />
              {{
                batchActing === 'table-batch'
                  ? '正在发布本页…'
                  : `一键发布本页 (${entries.length}篇)`
              }}
            </button>

            <button
              v-if="selectedRows.length > 0"
              type="button"
              class="button button-secondary button-sm"
              :disabled="isBusy"
              @click="batchRejectRows(selectedRows)"
            >
              批量忽略 ({{ selectedRows.length }})
            </button>
          </template>

          <el-select v-model="status" aria-label="审核状态" @change="filter">
            <el-option label="待处理 (待审核)" :value="0" />
            <el-option label="已发布 (已上架)" :value="1" />
            <el-option label="已忽略" :value="2" />
          </el-select>

          <el-select
            v-model="source"
            placeholder="全部来源"
            aria-label="资讯来源"
            @change="filter"
          >
            <el-option label="全部来源" value="" />
            <el-option
              v-for="item in sources"
              :key="item.key"
              :label="item.name"
              :value="item.key"
            />
          </el-select>
        </div>
      </div>

      <ContentState
        v-if="error"
        error
        title="采集内容暂时无法读取"
        description="请检查后端连接和数据库迁移是否完成。"
        @retry="loadEntries"
      />
      <el-table
        v-else
        v-loading="loading"
        :data="entries"
        empty-text="当前筛选下还没有内容，可切换上方来源标签或点击「立即采集」"
        @selection-change="handleSelectionChange"
      >
        <el-table-column v-if="status === 0" type="selection" width="46" />
        <el-table-column label="标题与来源" min-width="320">
          <template #default="{ row }">
            <div class="entry-title-wrap">
              <span v-if="isHotEntry(row)" class="hot-entry-pill">🔥 焦点热讯</span>
              <a
                class="entry-title"
                :href="sourceLink(row.sourceUrl)"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ row.translatedTitle || row.title }}
                <AppIcon name="external" :size="14" />
              </a>
            </div>
            <p v-if="needsTranslation(row)" class="entry-original">
              {{ row.title }}
              <span v-if="!row.translatedTitle && row.status === 0" class="translation-pending">
                · 待翻译（点击「一键直发」将自动附加中文栏目导语）
              </span>
            </p>
            <div class="entry-meta-row">
              <span v-if="row.publishMode === 1" class="tag auto-publish-tag">白名单自动发布</span>
              <span v-else-if="row.status === 0 && row.autoPublishRequested === 1" class="tag">
                自动发布待处理
              </span>
              <span class="entry-source">
                {{ row.sourceName }} · {{ row.sourceAuthor || '来源未提供作者' }} · 推荐频道：{{
                  sourceInfo(row)?.categoryName || '未指定'
                }}
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="原文发布时间" width="160">
          <template #default="{ row }">
            {{ row.sourcePublishedAt ? formatTime(row.sourcePublishedAt) : '来源未提供' }}
          </template>
        </el-table-column>

        <el-table-column label="采集入库时间" width="160">
          <template #default="{ row }">{{ formatTime(row.fetchedAt) }}</template>
        </el-table-column>

        <el-table-column label="操作" width="210">
          <template #default="{ row }">
            <template v-if="row.status === 0">
              <el-button
                link
                type="primary"
                :disabled="isBusy"
                @click="quickPublishRow(row)"
              >
                {{ acting === row.id ? '发布中…' : '⚡ 一键直发' }}
              </el-button>
              <el-button link type="primary" :disabled="isBusy" @click="openPublish(row)">
                编辑发布
              </el-button>
              <el-button link :disabled="isBusy" @click="reject(row)">忽略</el-button>
            </template>
            <RouterLink
              v-else-if="row.articleId"
              class="text-action"
              :to="{ name: 'read', params: { id: row.articleId } }"
            >
              查看社区卡片 &rarr;
            </RouterLink>
            <span v-else class="muted">已忽略</span>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > 10"
        class="feed-pagination"
        background
        layout="prev,pager,next,total"
        :total="total"
        :current-page="page"
        :page-size="10"
        @current-change="
          (value) => {
            page = value
            loadEntries()
          }
        "
      />
    </div>

    <el-dialog
      :model-value="!!selected"
      title="审核发布链接卡片"
      width="520px"
      @close="selected = null"
    >
      <template v-if="selected">
        <template v-if="needsTranslation(selected)">
          <div class="dialog-title-header">
            <label class="title-label" for="feed-translated-title">中文标题 · 可修改后发布</label>
            <button
              v-if="!hasChinese(translatedTitle)"
              type="button"
              class="text-fill-btn"
              @click="fillFallbackTitleInDialog"
            >
              自动生成中文导语标题
            </button>
          </div>
          <el-input
            id="feed-translated-title"
            v-model="translatedTitle"
            aria-label="中文标题"
            type="textarea"
            :rows="3"
            :maxlength="500"
            show-word-limit
            placeholder="中文译名暂未生成，可点击右上角自动生成或手动填写"
          />
          <p class="entry-original">英文原题：{{ selected.title }}</p>
        </template>
        <h3 v-else class="publish-title">{{ selected.title }}</h3>
        <p class="muted">发布后将在对应社区频道展示智能视觉主图、内容速览与原文入口。</p>
        <el-select
          v-model="categoryId"
          placeholder="选择发布频道"
          aria-label="发布频道"
          style="width: 100%"
        >
          <el-option
            v-for="category in categories"
            :key="category.id"
            :label="category.categoryName"
            :value="category.id"
          />
        </el-select>
      </template>
      <template #footer>
        <el-button :disabled="!!acting" @click="selected = null">取消</el-button>
        <el-button
          type="primary"
          :loading="!!acting"
          :disabled="!categoryId || (needsTranslation(selected) && !translatedTitle.trim())"
          @click="publish"
        >
          确认发布
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.feed-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
}

.heading-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.stat-pill {
  display: flex;
  flex-direction: column;
  padding: 7px 14px;
  border-radius: 12px;
  background: rgba(0, 102, 255, 0.06);
  border: 1px solid rgba(0, 102, 255, 0.16);
}

.stat-pill.published {
  background: rgba(15, 23, 42, 0.04);
  border-color: rgba(15, 23, 42, 0.1);
}

.stat-label {
  font-size: 10px;
  color: var(--muted);
}

.stat-pill strong {
  font-size: 15px;
  color: var(--brand);
  font-weight: 700;
}

.stat-pill.published strong {
  color: var(--ink);
}

.feed-sources {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 26px;
}

.source-card {
  padding: 18px;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(15, 23, 42, 0.08);
  transition: all 0.22s ease;
}

.source-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 30px -12px rgba(10, 13, 20, 0.1);
}

.source-card.is-active-source {
  border-color: var(--brand);
  box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.12);
}

.source-top {
  display: flex;
  gap: 7px;
  justify-content: flex-start;
  align-items: center;
  flex-wrap: wrap;
}

.source-title-row {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.source-top h2 {
  font-size: 16px;
  margin: 0;
  font-weight: 700;
}

.queue-badge {
  border: 1px solid rgba(15, 23, 42, 0.1);
  background: rgba(15, 23, 42, 0.04);
  color: var(--muted);
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.queue-badge.has-pending {
  background: rgba(0, 102, 255, 0.1);
  border-color: rgba(0, 102, 255, 0.25);
  color: var(--brand);
}

.queue-badge:hover {
  background: var(--brand);
  color: #ffffff;
  border-color: var(--brand);
}

.source-top .tag {
  font-size: 10px;
}

.auto-publish-tag {
  background: #eaf3e3;
  color: #365c30;
}

.multi-feed-tag {
  background: rgba(0, 102, 255, 0.1);
  color: #0052cc;
  font-weight: 600;
}

.hot-boost-tag {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  font-weight: 600;
}

.entry-title-wrap {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.hot-entry-pill {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.22);
}

.source-desc {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.65;
  margin: 9px 0 6px;
}

.source-meta-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.source-channel {
  font-size: 11px;
  font-weight: 600;
  color: var(--brand);
}

.source-repositories {
  overflow-wrap: anywhere;
  font-size: 10px !important;
  color: var(--muted);
  margin: 4px 0 0;
}

.source-last {
  font-size: 11px;
  color: var(--muted);
  margin: 10px 0 8px;
  line-height: 1.75;
  padding: 9px 11px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.03);
}

.last-run-metrics {
  color: var(--ink);
  font-weight: 500;
}

.duplicate-explain-tip {
  margin-top: 6px;
  padding: 6px 9px;
  border-radius: 8px;
  background: rgba(0, 102, 255, 0.08);
  color: #0052cc;
  font-size: 11px;
  line-height: 1.55;
}

.source-pending-preview {
  margin: 4px 0 10px;
  padding: 9px 11px;
  border-radius: 10px;
  background: rgba(0, 102, 255, 0.04);
  border: 1px dashed rgba(0, 102, 255, 0.22);
  cursor: pointer;
  transition: background 0.18s ease;
}

.source-pending-preview:hover {
  background: rgba(0, 102, 255, 0.08);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  font-weight: 700;
  color: var(--brand);
  margin-bottom: 4px;
}

.preview-item-title {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.source-actions {
  margin-top: auto;
  padding-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.source-card .button {
  font-size: 12px;
  padding: 7px 12px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.button-electric {
  background: linear-gradient(135deg, #0066ff 0%, #0052cc 100%);
  color: #ffffff;
  border: 0;
  border-radius: 999px;
  font-weight: 600;
  box-shadow: 0 6px 16px -4px rgba(0, 102, 255, 0.38);
  cursor: pointer;
  transition: all 0.18s ease;
}

.button-electric:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px -4px rgba(0, 102, 255, 0.5);
}

.button-electric:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.button-sm {
  font-size: 12px;
  padding: 7px 14px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.feed-review {
  padding: 22px;
}

.source-filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.07);
}

.source-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.09);
  background: rgba(255, 255, 255, 0.8);
  color: var(--ink);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;
}

.source-pill:hover {
  border-color: var(--brand);
  color: var(--brand);
}

.source-pill.active {
  background: var(--ink);
  color: #ffffff;
  border-color: var(--ink);
}

.pill-badge {
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10px;
  background: rgba(15, 23, 42, 0.07);
  color: var(--muted);
}

.pill-badge.highlight {
  background: rgba(0, 102, 255, 0.14);
  color: var(--brand);
  font-weight: 700;
}

.source-pill.active .pill-badge {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.review-toolbar {
  display: flex;
  gap: 14px;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-left h2 {
  font-size: 16px;
  margin: 0;
}

.total-badge {
  font-size: 12px;
  color: var(--muted);
  background: rgba(15, 23, 42, 0.05);
  padding: 3px 10px;
  border-radius: 999px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar-actions .el-select {
  width: 155px;
}

.entry-title {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  text-decoration: none;
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
}

.entry-title:hover {
  color: var(--brand);
}

.entry-original {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.65;
  margin: 4px 0 6px;
  overflow-wrap: anywhere;
}

.entry-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.entry-source {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
}

.feed-pagination {
  justify-content: flex-end;
  margin-top: 22px;
}

.publish-title {
  font-size: 16px;
  line-height: 1.8;
}

.feed-admin :deep(.el-table .cell) {
  line-height: 1.8;
}

.translation-pending {
  color: #b45309;
  font-weight: 500;
}

.dialog-title-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.title-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
}

.text-fill-btn {
  border: 0;
  background: rgba(0, 102, 255, 0.1);
  color: var(--brand);
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  cursor: pointer;
}

.text-fill-btn:hover {
  background: var(--brand);
  color: #ffffff;
}

@media (max-width: 1100px) {
  .feed-sources {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .feed-sources {
    grid-template-columns: 1fr;
  }
}
</style>
