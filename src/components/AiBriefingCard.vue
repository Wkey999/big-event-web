<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { askArticle } from '@/api/article'
import { useAiSettingsStore } from '@/stores/aiSettings'
import AppIcon from './AppIcon.vue'
import AnswerText from './AnswerText.vue'
import { getSmartSummary } from '@/utils/articleDigest'

const props = defineProps({
  items: { type: Array, default: () => [] },
  categoryNames: { type: Object, default: () => ({}) },
  activeCategory: { type: String, default: '全部发现' },
})

const ai = useAiSettingsStore()
const briefType = ref('weekly')
const loading = ref(false)
const aiAnswer = ref('')
const aiReferences = ref([])
const errorMsg = ref('')
const expanded = ref(true)

const BRIEF_MODES = [
  {
    id: 'weekly',
    label: 'AI 社区周报',
    badge: 'WEEKLY DIGEST',
    prompt:
      '请调用工具检索最近一周发布的社区文章，为我生成一份结构清晰的「BOOM 社区本周必读周报」，总结核心技术与热点看点，并结合我的偏好推荐值得精读的文章。',
  },
  {
    id: 'today',
    label: '今日必读盘点',
    badge: 'TODAY MUST-READ',
    prompt:
      '请帮我盘点总结社区最新发布的必读文章（若24小时内较少可结合近期热门内容），按主题提炼今日必看亮点与推荐理由。',
  },
  {
    id: 'personal',
    label: 'AI 个性化推荐',
    badge: 'FOR YOU',
    prompt:
      '请先读取我的阅读偏好画像，再检索匹配的社区已发布文章，为我生成一份专属的「今日推荐阅读清单」并说明推荐理由。',
  },
]

const currentModeObj = computed(
  () => BRIEF_MODES.find((m) => m.id === briefType.value) || BRIEF_MODES[0],
)

// 从当前真实文章流中提炼 Top 3 必读精选（零延迟展示）
const mustReadPicks = computed(() => {
  if (!props.items || !props.items.length) return []
  const sorted = [...props.items].sort(
    (a, b) => (b.likeCount || 0) * 3 + (b.viewCount || 0) - ((a.likeCount || 0) * 3 + (a.viewCount || 0)),
  )
  return sorted.slice(0, 3).map((item, idx) => ({
    ...item,
    rank: idx + 1,
    displayTitle: item.sourceTranslatedTitle || item.sourceTitle || item.title,
    catName: props.categoryNames[item.categoryId] || '社区精选',
    digest: getSmartSummary(item, props.categoryNames[item.categoryId]),
  }))
})

const statusLabel = computed(() => {
  if (ai.mode === 'custom') {
    return ai.configured ? `已就绪 · 自有 API (${ai.configuration.model})` : '待配置自有 API'
  }
  if (ai.status?.enabled) {
    return `平台免费额度 · 今日剩余 ${ai.status.quota?.remaining ?? 0} 次`
  }
  return '点击配置 AI 模型密钥'
})

onMounted(() => {
  ai.loadStatus()
  ai.loadProviders().catch(() => {})
})

async function generateBriefing() {
  if (loading.value) return
  const mode = ai.mode
  const config = mode === 'custom' ? ai.snapshot() : null
  if ((mode === 'custom' && !config) || (mode === 'platform' && !ai.trialReady)) {
    ai.openSettings()
    return
  }

  loading.value = true
  errorMsg.value = ''
  expanded.value = true
  try {
    const res = await askArticle(currentModeObj.value.prompt, mode, config)
    aiAnswer.value = res.data.answer || ''
    aiReferences.value = res.data.references || []
  } catch (err) {
    errorMsg.value =
      err.code === 'ECONNABORTED'
        ? 'AI 总结生成耗时较长，请稍后重试。'
        : err.response?.data?.message || err.message || 'AI 总结生成失败，请检查模型配置。'
  } finally {
    loading.value = false
    if (mode === 'platform') ai.loadStatus()
  }
}
</script>

<template>
  <section class="briefing-bento surface" aria-label="AI 周报与今日必读">
    <!-- 顶部栏 -->
    <header class="briefing-header">
      <div class="briefing-title-group">
        <span class="briefing-badge">
          <AppIcon name="spark" :size="14" />
          BOOM AI BRIEFING
        </span>
        <h2>今日必读 &amp; AI 智能周报</h2>
        <span class="briefing-sub">提炼站内核心技术动态与个性化必读清单</span>
      </div>

      <div class="briefing-actions">
        <button type="button" class="api-config-pill" @click="ai.openSettings()">
          <span class="status-dot" :class="{ ready: ai.configured || ai.trialReady }"></span>
          {{ statusLabel }}
        </button>
        <button
          type="button"
          class="toggle-collapse-btn"
          :aria-expanded="expanded"
          @click="expanded = !expanded"
        >
          {{ expanded ? '收起面板' : '展开周报' }}
          <AppIcon name="chevron" :size="13" :class="{ rotated: expanded }" />
        </button>
      </div>
    </header>

    <div v-show="expanded" class="briefing-grid">
      <!-- 左栏：实时提炼「今日必读 TOP 3」 -->
      <div class="must-read-col">
        <div class="col-head">
          <span class="col-eyebrow">TODAY'S PICKS</span>
          <strong>🔥 今日必读精选</strong>
          <span class="col-tag">{{ activeCategory }}</span>
        </div>

        <div v-if="mustReadPicks.length" class="picks-list">
          <RouterLink
            v-for="pick in mustReadPicks"
            :key="pick.id"
            :to="{ name: 'read', params: { id: pick.id }, query: { mode: 'recommend' } }"
            class="pick-item"
          >
            <span class="pick-rank" :class="`rank-${pick.rank}`">0{{ pick.rank }}</span>
            <div class="pick-body">
              <div class="pick-meta">
                <span class="pick-cat">{{ pick.catName }}</span>
                <span>{{ pick.sourceName || pick.authorNickname || '社区作者' }}</span>
              </div>
              <h3>{{ pick.displayTitle }}</h3>
              <p>{{ pick.digest }}</p>
            </div>
            <AppIcon name="external" :size="14" class="pick-arrow" />
          </RouterLink>
        </div>
        <div v-else class="picks-empty">正在从社区信息流同步今日必读文章…</div>
      </div>

      <!-- 右栏：Spring AI 驱动的「AI 周报 / 今日总结生成器」 -->
      <div class="ai-summary-col">
        <div class="ai-col-head">
          <div class="mode-pills" role="group" aria-label="周报模式切换">
            <button
              v-for="m in BRIEF_MODES"
              :key="m.id"
              type="button"
              :class="{ active: briefType === m.id }"
              :disabled="loading"
              @click="briefType = m.id"
            >
              {{ m.label }}
            </button>
          </div>

          <button
            type="button"
            class="button button-primary generate-btn"
            :disabled="loading"
            @click="generateBriefing"
          >
            <AppIcon :name="loading ? 'refresh' : 'spark'" :size="14" />
            {{ loading ? 'AI 正在检索总结…' : aiAnswer ? '重新生成总结' : 'AI 一键生成周报' }}
          </button>
        </div>

        <!-- 状态 1：加载中 -->
        <div v-if="loading" class="ai-summary-loading">
          <div class="loading-title">
            <AppIcon name="spark" :size="16" />
            <span>Spring AI 正在检索站内文章并结合你的偏好生成「{{ currentModeObj.label }}」…</span>
          </div>
          <el-skeleton :rows="4" animated />
        </div>

        <!-- 状态 2：错误提示 -->
        <div v-else-if="errorMsg" class="ai-summary-error">
          <p>{{ errorMsg }}</p>
          <div>
            <button type="button" class="button button-secondary" @click="generateBriefing">
              重试生成
            </button>
            <button type="button" class="text-action" @click="ai.openSettings()">
              检查 API 配置
            </button>
          </div>
        </div>

        <!-- 状态 3：已生成真实 AI 周报 -->
        <div v-else-if="aiAnswer" class="ai-summary-result">
          <div class="result-badge-row">
            <span class="result-badge">✦ {{ currentModeObj.label }} · AI 实时生成</span>
            <span v-if="aiReferences.length" class="ref-count">
              引用了 {{ aiReferences.length }} 篇站内真实文章
            </span>
          </div>
          <div class="result-scroll">
            <AnswerText :text="aiAnswer" />
          </div>
          <div v-if="aiReferences.length" class="result-refs">
            <RouterLink
              v-for="(refItem, idx) in aiReferences.slice(0, 4)"
              :key="refItem.id"
              :to="{ name: 'read', params: { id: refItem.id }, query: { mode: 'ask' } }"
              class="mini-ref-chip"
            >
              <span class="ref-idx">{{ idx + 1 }}</span>
              <span class="ref-title">{{ refItem.title }}</span>
              <AppIcon name="external" :size="12" />
            </RouterLink>
          </div>
        </div>

        <!-- 状态 4：默认导览态（未调用大模型前零消耗展示） -->
        <div v-else class="ai-summary- standby">
          <div class="standby-card">
            <div class="standby-top">
              <span class="standby-code">{{ currentModeObj.badge }}</span>
              <span class="standby-hint">按需调用 Spring AI · 不自动消耗额度</span>
            </div>
            <h3>用 AI 快速浓缩本周技术热点与必读清单</h3>
            <p>
              点击右上角
              <strong>「AI 一键生成周报」</strong>，后端智能体将自动调用文章检索工具（<code>query_published_articles</code>）与你的个人兴趣画像（<code>get_my_preference_profile</code>），为你生成带真实文章引用的定制周报。
            </p>
            <div class="standby-highlights">
              <span>✦ 检索近 7 天真实文章</span>
              <span>✦ 结合个人阅读偏好推荐</span>
              <span>✦ 附可点击核对的原文引用</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.briefing-bento {
  padding: 20px 22px;
  margin-bottom: 22px;
  background:
    radial-gradient(circle at 8% 0%, rgba(0, 102, 255, 0.08), transparent 42%),
    var(--glass-bg-strong);
  border: 1px solid rgba(15, 23, 42, 0.09);
}

.briefing-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.briefing-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.briefing-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--ink);
  color: #ffffff;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.8px;
}

.briefing- badge :deep(svg) {
  color: #60a5fa;
}

.briefing-title-group h2 {
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.4px;
  margin: 0;
  color: var(--ink);
}

.briefing-sub {
  font-size: 12px;
  color: var(--muted);
}

.briefing-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.api-config-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.09);
  background: rgba(255, 255, 255, 0.85);
  font-size: 11px;
  font-weight: 600;
  color: var(--text);
  transition: all 0.18s ease;
}

.api-config-pill:hover {
  border-color: var(--brand);
  color: var(--brand);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f59e0b;
}

.status-dot.ready {
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.toggle-collapse-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 8px;
  border: 0;
  background: rgba(15, 23, 42, 0.045);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--muted);
}

.toggle-collapse-btn:hover {
  color: var(--ink);
}

.rotated {
  transform: rotate(180deg);
}

/* 双栏 Bento 主体 */
.briefing-grid {
  display: grid;
  grid-template-columns: 1fr 1.15fr;
  gap: 18px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

/* 左栏：今日必读精选 */
.must-read-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.col-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.col-eyebrow {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1px;
  color: var(--brand);
}

.col-head strong {
  font-size: 13.5px;
  font-weight: 800;
  color: var(--ink);
}

.col-tag {
  margin-left: auto;
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.05);
  color: var(--muted);
}

.picks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pick-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(15, 23, 42, 0.065);
  text-decoration: none;
  color: inherit;
  transition: all 0.18s ease;
}

.pick-item:hover {
  background: #ffffff;
  border-color: rgba(0, 102, 255, 0.28);
  transform: translateX(2px);
}

.pick-rank {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  font-size: 11px;
  font-weight: 800;
  background: var(--ink);
  color: #ffffff;
  flex-shrink: 0;
  margin-top: 2px;
}

.pick-rank.rank-1 {
  background: var(--brand);
}

.pick-body {
  flex: 1;
  min-width: 0;
}

.pick-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  color: var(--muted);
  margin-bottom: 3px;
}

.pick-cat {
  font-weight: 700;
  color: var(--brand);
}

.pick-body h3 {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 3px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pick-body p {
  font-size: 11.5px;
  color: var(--muted);
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pick-arrow {
  color: var(--muted);
  margin-top: 4px;
  flex-shrink: 0;
}

.picks-empty {
  padding: 28px 16px;
  text-align: center;
  font-size: 12px;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
}

/* 右栏：AI 周报生成区 */
.ai-summary-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(0, 102, 255, 0.14);
  border-radius: 14px;
  padding: 14px 16px;
}

.ai-col-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.mode-pills {
  display: inline-flex;
  gap: 4px;
  padding: 3px;
  border-radius: 9px;
  background: rgba(15, 23, 42, 0.05);
}

.mode-pills button {
  border: 0;
  background: none;
  padding: 5px 10px;
  border-radius: 7px;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--muted);
  transition: all 0.16s ease;
}

.mode-pills button.active {
  background: #ffffff;
  color: var(--ink);
  box-shadow: 0 2px 6px rgba(10, 13, 20, 0.08);
}

.generate-btn {
  padding: 7px 14px;
  font-size: 12px;
  border-radius: 999px;
  background: linear-gradient(135deg, #0066ff 0%, #004ecc 100%);
}

.ai-summary-loading {
  padding: 12px 4px;
}

.loading-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--brand);
  margin-bottom: 12px;
}

.ai-summary-error {
  padding: 14px;
  border-radius: 10px;
  background: rgba(254, 242, 242, 0.85);
  border: 1px solid rgba(239, 68, 68, 0.2);
  font-size: 12.5px;
  color: #b91c1c;
}

.ai-summary-error > div {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}

.ai-summary-result {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-badge-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.result-badge {
  font-size: 11px;
  font-weight: 800;
  color: var(--brand);
  background: var(--soft);
  padding: 3px 9px;
  border-radius: 6px;
}

.ref-count {
  font-size: 11px;
  color: var(--muted);
}

.result-scroll {
  max-height: 210px;
  overflow-y: auto;
  padding-right: 6px;
  font-size: 13px;
  line-height: 1.75;
}

.result-refs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--line);
}

.mini-ref-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 7px;
  background: rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(15, 23, 42, 0.06);
  text-decoration: none;
  font-size: 11px;
  color: var(--text);
  max-width: 240px;
  transition: all 0.16s ease;
}

.mini-ref-chip:hover {
  border-color: var(--brand);
  color: var(--brand);
  background: #ffffff;
}

.ref-idx {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: var(--brand);
  color: #ffffff;
  font-size: 10px;
  font-weight: 800;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.ref-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.standby-card {
  padding: 12px 14px;
  border-radius: 11px;
  background: linear-gradient(135deg, rgba(10, 13, 20, 0.03), rgba(0, 102, 255, 0.04));
  border: 1px dashed rgba(0, 102, 255, 0.22);
}

.standby-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.standby-code {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: var(--brand);
  font-family: 'SF Mono', 'JetBrains Mono', Consolas, monospace;
}

.standby-hint {
  font-size: 10.5px;
  color: var(--muted);
}

.standby-card h3 {
  font-size: 14px;
  font-weight: 800;
  color: var(--ink);
  margin: 0 0 6px;
}

.standby-card p {
  font-size: 12px;
  line-height: 1.7;
  color: var(--text);
  margin: 0 0 10px;
}

.standby-card code {
  font-size: 11px;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.06);
  color: var(--ink);
}

.standby-highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 11px;
  font-weight: 600;
  color: var(--brand);
}
</style>
