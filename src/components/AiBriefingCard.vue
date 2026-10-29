<script setup>
import { computed, onMounted, ref, watch } from 'vue'
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
  variant: { type: String, default: 'pure' }, // 'pure' | 'text'
})

const ai = useAiSettingsStore()
const briefType = ref('weekly')
const loading = ref(false)
const aiAnswer = ref('')
const aiReferences = ref([])
const errorMsg = ref('')
const expanded = ref(props.variant === 'text')

watch(
  () => props.variant,
  (v) => {
    expanded.value = v === 'text' || Boolean(aiAnswer.value)
  },
)

const BRIEF_MODES = [
  {
    id: 'weekly',
    label: 'AI 社区周报',
    shortLabel: '本周周报',
    badge: 'WEEKLY DIGEST',
    prompt:
      '请调用工具检索最近一周发布的社区文章，为我生成一份结构清晰的「BOOM 社区本周必读周报」，总结核心技术与热点看点，并结合我的偏好推荐值得精读的文章。',
  },
  {
    id: 'today',
    label: '今日必读盘点',
    shortLabel: '今日必读',
    badge: 'TODAY MUST-READ',
    prompt:
      '请帮我盘点总结社区最新发布的必读文章（若24小时内较少可结合近期热门内容），按主题提炼今日必看亮点与推荐理由。',
  },
  {
    id: 'personal',
    label: 'AI 个性化推荐',
    shortLabel: '个性化推荐',
    badge: 'FOR YOU',
    prompt:
      '请先读取我的阅读偏好画像，再检索匹配的社区已发布文章，为我生成一份专属的「今日推荐阅读清单」并说明推荐理由。',
  },
]

const currentModeObj = computed(
  () => BRIEF_MODES.find((m) => m.id === briefType.value) || BRIEF_MODES[0],
)

const mustReadPicks = computed(() => {
  if (!props.items || !props.items.length) return []
  const sorted = [...props.items].sort(
    (a, b) =>
      (b.likeCount || 0) * 3 + (b.viewCount || 0) - ((a.likeCount || 0) * 3 + (a.viewCount || 0)),
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
        ? 'AI 总结耗时较长，请稍后重试。'
        : err.response?.data?.message || err.message || 'AI 总结生成失败，请检查模型配置。'
  } finally {
    loading.value = false
    if (mode === 'platform') ai.loadStatus()
  }
}
</script>

<template>
  <!-- 形态 1：纯净流（单行胶囊吧台，按需展开） -->
  <section v-if="variant === 'pure'" class="briefing-bar surface" aria-label="AI 智能速览">
    <div class="bar-top">
      <div class="bar-left">
        <span class="briefing-badge">
          <AppIcon name="spark" :size="13" />
          AI 速览
        </span>
        <div class="mode-pills" role="group" aria-label="速览模式">
          <button
            v-for="m in BRIEF_MODES"
            :key="m.id"
            type="button"
            :class="{ active: briefType === m.id }"
            :disabled="loading"
            @click="briefType = m.id"
          >
            {{ m.shortLabel }}
          </button>
        </div>
      </div>

      <div class="bar-right">
        <button
          type="button"
          class="button button-primary generate-btn"
          :disabled="loading"
          @click="generateBriefing"
        >
          <AppIcon :name="loading ? 'refresh' : 'spark'" :size="13" />
          {{ loading ? '生成中…' : aiAnswer ? '重新生成' : '一键生成' }}
        </button>
        <button
          v-if="aiAnswer || errorMsg"
          type="button"
          class="toggle-btn"
          @click="expanded = !expanded"
        >
          {{ expanded ? '收起' : '展开' }}
        </button>
      </div>
    </div>

    <div v-if="expanded && (loading || errorMsg || aiAnswer)" class="briefing-drawer">
      <div v-if="loading" class="drawer-loading">
        <el-skeleton :rows="3" animated />
      </div>

      <div v-else-if="errorMsg" class="drawer-error">
        <span>{{ errorMsg }}</span>
        <button type="button" class="text-action" @click="ai.openSettings()">API 配置</button>
      </div>

      <div v-else-if="aiAnswer" class="drawer-result">
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
          </RouterLink>
        </div>
      </div>
    </div>
  </section>

  <!-- 形态 2：文字流（完整双栏 Bento：今日必读精选 TOP 3 + AI 周报舱） -->
  <section v-else class="briefing-bento surface" aria-label="AI 周报与今日必读">
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

        <div v-if="loading" class="ai-summary-loading">
          <el-skeleton :rows="4" animated />
        </div>

        <div v-else-if="errorMsg" class="ai-summary-error">
          <p>{{ errorMsg }}</p>
        </div>

        <div v-else-if="aiAnswer" class="ai-summary-result">
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
            </RouterLink>
          </div>
        </div>

        <div v-else class="standby-card">
          <div class="standby-top">
            <span class="standby-code">{{ currentModeObj.badge }}</span>
            <span class="standby-hint">按需调用 Spring AI · 不自动消耗额度</span>
          </div>
          <h3>用 AI 快速浓缩本周技术热点与必读清单</h3>
          <p>
            点击右上角 <strong>「AI 一键生成周报」</strong>，自动检索站内近 7 天文章并结合你的阅读偏好生成带真实引用的周报。
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* 纯净流单行胶囊条 */
.briefing-bar {
  padding: 10px 14px;
  margin-bottom: 18px;
  border-radius: 16px;
}

.bar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.bar-left,
.bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* 文字流 Bento 面板 */
.briefing-bento {
  padding: 18px 20px;
  margin-bottom: 20px;
  background:
    radial-gradient(circle at 8% 0%, rgba(0, 102, 255, 0.08), transparent 42%),
    var(--glass-bg-strong);
  border: 1px solid rgba(15, 23, 42, 0.09);
}

.briefing-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.briefing-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
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
  letter-spacing: 0.6px;
}

.briefing-title-group h2 {
  font-size: 16px;
  font-weight: 800;
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
  gap: 8px;
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
  cursor: pointer;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f59e0b;
}

.status-dot.ready {
  background: #10b981;
}

.toggle-collapse-btn,
.toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 0;
  background: rgba(15, 23, 42, 0.05);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
}

.rotated {
  transform: rotate(180deg);
}

.briefing-grid {
  display: grid;
  grid-template-columns: 1fr 1.15fr;
  gap: 16px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.must-read-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  color: var(--brand);
}

.col-head strong {
  font-size: 13px;
  color: var(--ink);
}

.col-tag {
  margin-left: auto;
  font-size: 10.5px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.05);
  color: var(--muted);
}

.picks-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.pick-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 11px;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(15, 23, 42, 0.06);
  text-decoration: none;
  color: inherit;
}

.pick-rank {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 800;
  background: var(--ink);
  color: #ffffff;
  flex-shrink: 0;
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
  gap: 6px;
  font-size: 10.5px;
  color: var(--muted);
}

.pick-cat {
  font-weight: 700;
  color: var(--brand);
}

.pick-body h3 {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--ink);
  margin: 2px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pick-body p {
  font-size: 11.5px;
  color: var(--muted);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ai-summary-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 102, 255, 0.14);
  border-radius: 13px;
  padding: 13px 15px;
}

.ai-col-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.mode-pills {
  display: inline-flex;
  gap: 3px;
  padding: 3px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.05);
}

.mode-pills button {
  border: 0;
  background: none;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 650;
  color: var(--muted);
  cursor: pointer;
}

.mode-pills button.active {
  background: #ffffff;
  color: var(--ink);
  box-shadow: 0 1px 4px rgba(10, 13, 20, 0.08);
}

.generate-btn {
  padding: 6px 14px;
  font-size: 12px;
  border-radius: 999px;
}

.briefing-drawer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.drawer-error,
.ai-summary-error {
  font-size: 12.5px;
  color: #b91c1c;
}

.result-scroll {
  max-height: 210px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.75;
}

.result-refs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.mini-ref-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.04);
  text-decoration: none;
  font-size: 11px;
  color: var(--text);
  max-width: 230px;
}

.ref-idx {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: var(--brand);
  color: #ffffff;
  font-size: 9.5px;
  font-weight: 800;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.ref-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.standby-card {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(0, 102, 255, 0.03);
  border: 1px dashed rgba(0, 102, 255, 0.2);
}

.standby-top {
  display: flex;
  justify-content: space-between;
  font-size: 10.5px;
  color: var(--muted);
  margin-bottom: 5px;
}

.standby-code {
  font-weight: 800;
  color: var(--brand);
}

.standby-card h3 {
  font-size: 13.5px;
  margin: 0 0 5px;
  color: var(--ink);
}

.standby-card p {
  font-size: 12px;
  line-height: 1.65;
  color: var(--text);
  margin: 0;
}

@media (max-width: 960px) {
  .briefing-grid {
    grid-template-columns: 1fr;
  }
}
</style>
