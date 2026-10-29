<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { listCategories } from '@/api/category'
import ArticleCard from '@/components/ArticleCard.vue'
import AiBriefingCard from '@/components/AiBriefingCard.vue'
import AiSettingsDialog from '@/components/AiSettingsDialog.vue'
import AppIcon from '@/components/AppIcon.vue'
import ContentState from '@/components/ContentState.vue'
import { useFeed } from '@/composables/useFeed'

const VIEW_STYLE_KEY = 'boom:home-view-style'
const router = useRouter()
const {
  items,
  total,
  mode,
  categoryId,
  loading,
  error,
  finished,
  sentinel,
  stateKey,
  registerCard,
  loadMore,
  reset,
} = useFeed()

const categories = ref([])
const categoryError = ref(false)
const aiQuestion = ref('')
const denseView = ref(true)
// 'pure' = 纯净流（极简视觉卡片+宽屏无干扰） | 'text' = 文字流（含内容速览摘要+周报大面板+右侧导览栏）
const viewStyle = ref(localStorage.getItem(VIEW_STYLE_KEY) === 'text' ? 'text' : 'pure')

watch(viewStyle, (val) => {
  try {
    localStorage.setItem(VIEW_STYLE_KEY, val)
  } catch {
    // ignore storage quota errors
  }
})

const categoryNames = computed(() =>
  Object.fromEntries(categories.value.map((item) => [item.id, item.categoryName])),
)
const activeCategory = computed(() => categoryNames.value[categoryId.value] || '全部发现')

const quickPrompts = [
  { label: '# Agent 实践', title: '我的第一个 Agent', sub: '从一次工具调用开始', q: '有哪些关于 AI Agent 的开发实践？' },
  { label: '# 开发工具', title: '真正留下的开发工具', sub: '看看使用之后的取舍', q: '推荐几篇关于开发工具的文章' },
  { label: '# 开源项目', title: '开源项目阅读笔记', sub: '看懂，然后试着改一点', q: '帮我找几篇开源项目相关的文章' },
]

async function loadCategories() {
  categoryError.value = false
  try {
    categories.value = (await listCategories()).data
  } catch {
    categoryError.value = true
  }
}

function ask(question = aiQuestion.value) {
  router.push({ name: 'ask', query: question.trim() ? { q: question.trim() } : {} })
}

onMounted(() => {
  loadCategories()
})
</script>

<template>
  <div class="discovery-layout" :class="{ 'is-text-layout': viewStyle === 'text' }">
    <!-- 左侧雾透玻璃频道导航轨 -->
    <aside class="channel-rail surface">
      <div v-if="viewStyle === 'text'" class="rail-header">
        <span class="section-label">CHANNELS</span>
        <strong>内容频道</strong>
      </div>

      <div class="channel-list">
        <button :class="{ active: !categoryId }" @click="reset(mode, null)">
          <span class="channel-icon"><AppIcon name="compass" :size="16" /></span>
          <span class="channel-text">全部发现</span>
        </button>

        <button
          v-for="(category, index) in categories"
          :key="category.id"
          :class="{ active: categoryId === category.id }"
          @click="reset(mode, category.id)"
        >
          <span class="channel-icon">
            <AppIcon :name="['spark', 'code', 'grid', 'message'][index % 4]" :size="15" />
          </span>
          <span class="channel-text">{{ category.categoryName }}</span>
        </button>

        <button v-if="categoryError" class="retry-channels" @click="loadCategories">
          <AppIcon name="refresh" :size="14" />
          重新加载频道
        </button>
      </div>

      <div class="rail-divider"></div>

      <button class="rail-game-btn" @click="router.push({ name: 'games' })">
        <span class="channel-icon"><AppIcon name="game" :size="16" /></span>
        <span class="channel-text">休闲小游戏</span>
      </button>

      <template v-if="viewStyle === 'pure'">
        <RouterLink class="rail-compose-btn" :to="{ name: 'creator', query: { compose: '1' } }">
          <AppIcon name="pen" :size="14" />
          <span>写一篇内容</span>
        </RouterLink>
        <p class="rail-disclaimer">外部资讯仅存索引 · AI 供参考</p>
      </template>
      <div v-else class="rail-note">
        <span class="note-dot"></span>
        记录真实实践，交换前沿灵感。
      </div>
    </aside>

    <!-- 中央主内容流 -->
    <section class="discovery-content">
      <!-- 顶部搜索舱：纯净流为单行紧凑条，文字流为完整 Hero 横幅 -->
      <header class="hero-glass-pod surface" :class="{ 'is-compact': viewStyle === 'pure' }">
        <div v-if="viewStyle === 'text'" class="hero-top">
          <div class="hero-copy">
            <span class="eyebrow">TECH · AI · COMMUNITY INSIGHTS</span>
            <h1>
              发现值得深聊的内容
              <span class="accent-dot">.</span>
            </h1>
          </div>
          <div class="hero-badge">
            <span class="badge-live"></span>
            <span>{{ categoryId ? `当前频道 · ${activeCategory}` : '全站实时社区流' }}</span>
          </div>
        </div>

        <form class="ai-search-bar" @submit.prevent="ask()">
          <span class="ai-spark-badge">
            <AppIcon name="spark" :size="14" />
            AI 检索
          </span>
          <input
            v-model="aiQuestion"
            maxlength="200"
            aria-label="向 AI 提问"
            placeholder="让 AI 帮你检索站内文章，例如：找几篇适合入门的 Agent 开发实践…"
          />
          <div v-if="viewStyle === 'pure'" class="quick-tags">
            <button
              v-for="item in quickPrompts"
              :key="item.label"
              type="button"
              class="quick-tag"
              @click="ask(item.q)"
            >
              {{ item.label }}
            </button>
          </div>
          <button class="button button-primary" type="submit">
            问 AI
            <AppIcon name="external" :size="14" />
          </button>
        </form>
      </header>

      <!-- 今日必读 & AI 智能周报（随 纯净流 / 文字流 自动切换形态） -->
      <AiBriefingCard
        :items="items"
        :category-names="categoryNames"
        :active-category="activeCategory"
        :variant="viewStyle"
      />

      <!-- 信息流控制栏（含「纯净流 / 文字流」方案一键切换） -->
      <div class="feed-heading">
        <div class="feed-tabs" role="group" aria-label="信息流模式">
          <button
            :class="{ active: mode === 'recommend' }"
            :aria-pressed="mode === 'recommend'"
            @click="mode !== 'recommend' && reset('recommend')"
          >
            为你推荐
          </button>
          <button
            :class="{ active: mode === 'latest' }"
            :aria-pressed="mode === 'latest'"
            @click="mode !== 'latest' && reset('latest')"
          >
            最新分享
          </button>
        </div>

        <div class="feed-controls">
          <span class="feed-context">
            {{ activeCategory }}<template v-if="total"> · 共 {{ total }} 篇</template>
          </span>

          <!-- 核心：纯净流 vs 文字流 方案切换器 -->
          <div class="flow-mode-switch" role="group" aria-label="首页流派方案切换">
            <button
              type="button"
              :class="{ active: viewStyle === 'pure' }"
              title="极简视觉海报卡片 + 宽屏网格"
              @click="viewStyle = 'pure'"
            >
              <AppIcon name="eye" :size="13" />
              纯净流
            </button>
            <button
              type="button"
              :class="{ active: viewStyle === 'text' }"
              title="含内容速览长摘要 + 周报面板 + 导读边栏"
              @click="viewStyle = 'text'"
            >
              <AppIcon name="document" :size="13" />
              文字流
            </button>
          </div>

          <div class="density-switch" role="group" aria-label="卡片列数切换">
            <button
              type="button"
              :class="{ active: denseView }"
              title="多列视图"
              @click="denseView = true"
            >
              <AppIcon name="grid" :size="14" />
              紧凑
            </button>
            <button
              type="button"
              :class="{ active: !denseView }"
              title="双列视图"
              @click="denseView = false"
            >
              双栏
            </button>
          </div>
        </div>
      </div>

      <!-- 响应式网格流 -->
      <div class="feed-grid" :class="{ 'is-two-col': !denseView, 'is-pure-grid': viewStyle === 'pure' }">
        <template v-if="loading && !items.length">
          <div v-for="i in 6" :key="i" class="feed-skeleton surface">
            <el-skeleton animated>
              <template #template>
                <el-skeleton-item variant="image" style="width: 100%; height: 165px" />
                <el-skeleton-item variant="h3" style="width: 82%; margin: 18px 16px 10px" />
                <el-skeleton-item variant="text" style="width: 64%; margin: 0 16px 18px" />
              </template>
            </el-skeleton>
          </div>
        </template>

        <template v-else>
          <div
            v-for="article in items"
            :key="stateKey + ':' + article.id"
            :ref="(el) => registerCard(article.id, el)"
            class="feed-cell"
          >
            <ArticleCard
              :article="article"
              :category-name="categoryNames[article.categoryId]"
              :mode="mode"
              :variant="viewStyle"
            />
          </div>
        </template>
      </div>

      <ContentState
        v-if="error && !items.length"
        error
        title="内容暂时没有加载出来"
        description="检查连接后再试一次，你的内容还在这里。"
        @retry="loadMore"
      />
      <ContentState
        v-else-if="!loading && !items.length"
        title="这里还在等第一份分享"
        :description="
          categoryId
            ? '这个频道暂时没有已发布的内容，可以先看看其他频道。'
            : '把你的实践和想法写下来，成为社区的第一篇分享。'
        "
      >
        <RouterLink class="button button-primary" :to="{ name: 'creator', query: { compose: '1' } }">
          写一篇内容
          <AppIcon name="pen" :size="16" />
        </RouterLink>
      </ContentState>

      <div ref="sentinel" class="feed-bottom" aria-live="polite">
        <span v-if="loading && items.length" class="loading-pill">正在加载更多社区内容…</span>
        <button v-else-if="error && items.length" class="text-action" @click="loadMore">
          <AppIcon name="refresh" :size="16" />
          加载失败，点击重试
        </button>
        <span v-else-if="finished && items.length">
          {{
            mode === 'recommend'
              ? '本次推荐到这里，去「最新分享」继续发现。'
              : '已经看到这里的全部内容了。'
          }}
        </span>
      </div>
    </section>

    <!-- 右侧辅助信息栏（仅在「文字流」模式下展示） -->
    <aside v-if="viewStyle === 'text'" class="discovery-sidebar">
      <section class="community-note surface">
        <span class="section-label">CREATOR STUDIO</span>
        <h2>有用的内容，<br />真实的分享。</h2>
        <p>记录一次硬核排障，聊聊一个趁手工具，或者分享你刚弄懂的技术架构。</p>
        <RouterLink class="button button-primary creator-cta" :to="{ name: 'creator', query: { compose: '1' } }">
          <AppIcon name="pen" :size="15" />
          写下你的那份
        </RouterLink>
      </section>

      <section class="explore-section surface">
        <div class="explore-header">
          <span class="section-label">AI TOPICS</span>
          <h2>换个角度，继续发现</h2>
        </div>

        <div class="explore-list">
          <button v-for="p in quickPrompts" :key="p.label" @click="ask(p.q)">
            <span class="prompt-hash">#</span>
            <span>
              <strong>{{ p.title }}</strong>
              <small>{{ p.sub }}</small>
            </span>
          </button>
        </div>
      </section>

      <section class="disclaimer-card surface" aria-label="免责声明">
        <div class="disclaimer-header">
          <AppIcon name="shield" :size="15" />
          <strong>免责声明 · DISCLAIMER</strong>
        </div>
        <p>
          本站收录的外部资讯仅保存来源索引并提供原文跳转，版权与观点归原作者所有；AI 检索结果仅供参考，重要信息请以原文为准。
        </p>
        <small>© BOOM · 大事件内容社区</small>
      </section>
    </aside>
  </div>
  <AiSettingsDialog />
</template>

<style scoped>
/* 默认纯净流：双栏宽屏视觉布局 */
.discovery-layout {
  display: grid;
  grid-template-columns: 186px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

/* 文字流：三栏导读布局 */
.discovery-layout.is-text-layout {
  grid-template-columns: 186px minmax(0, 1fr) 248px;
}

/* 左侧雾透玻璃频道栏 */
.channel-rail {
  position: sticky;
  top: 96px;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rail-header {
  padding: 2px 10px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rail-header strong {
  font-size: 14px;
  font-weight: 800;
  color: var(--ink);
}

.channel-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.channel-rail button {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0;
  background: transparent;
  text-align: left;
  border-radius: 11px;
  padding: 10px 12px;
  color: var(--text);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.channel-icon {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.045);
  color: var(--muted);
}

.channel-rail button:hover {
  background: rgba(15, 23, 42, 0.045);
  color: var(--ink);
}

.channel-rail button.active {
  background: var(--ink);
  color: #ffffff;
  box-shadow: 0 6px 16px -4px rgba(10, 13, 20, 0.22);
}

.channel-rail button.active .channel-icon {
  background: var(--brand);
  color: #ffffff;
}

.retry-channels {
  color: var(--brand) !important;
  font-size: 12px !important;
}

.rail-divider {
  height: 1px;
  background: var(--line);
  margin: 6px 4px;
}

.rail-game-btn {
  color: var(--muted);
}

.rail-compose-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: 6px;
  padding: 10px 12px;
  border-radius: 11px;
  background: var(--ink);
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.18s ease;
}

.rail-compose-btn:hover {
  background: var(--brand);
}

.rail-disclaimer {
  margin: 8px 6px 2px;
  font-size: 10.5px;
  color: var(--muted);
  text-align: center;
  opacity: 0.75;
}

.rail-note {
  margin-top: 10px;
  padding: 10px 10px 2px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 11px;
  line-height: 1.7;
  display: flex;
  align-items: flex-start;
  gap: 7px;
}

.note-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand);
  margin-top: 6px;
  flex-shrink: 0;
}

/* 中央内容流 */
.discovery-content {
  min-width: 0;
}

.hero-glass-pod {
  padding: 20px 22px;
  margin-bottom: 18px;
  background:
    radial-gradient(circle at 92% 12%, rgba(0, 102, 255, 0.1), transparent 45%),
    var(--glass-bg-strong);
}

.hero-glass-pod.is-compact {
  padding: 8px;
  margin-bottom: 14px;
  border-radius: 16px;
}

.hero-top {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.hero-copy h1 {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.8px;
  margin: 4px 0 0;
  color: var(--ink);
}

.accent-dot {
  color: var(--brand);
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.045);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text);
}

.badge-live {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand);
}

.ai-search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.09);
  padding: 5px 6px 5px 10px;
  border-radius: 12px;
}

.ai-search-bar:focus-within {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.1);
}

.ai-spark-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: 8px;
  background: var(--soft);
  color: var(--brand);
  font-size: 11.5px;
  font-weight: 750;
  white-space: nowrap;
}

.ai-search-bar input {
  border: 0;
  background: none;
  flex: 1;
  min-width: 120px;
  padding: 6px 4px;
  font-size: 13px;
  color: var(--ink);
  outline: none;
}

.quick-tags {
  display: flex;
  align-items: center;
  gap: 6px;
}

.quick-tag {
  border: 0;
  background: rgba(15, 23, 42, 0.045);
  color: var(--muted);
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.quick-tag:hover {
  color: var(--brand);
  background: var(--soft);
}

.ai-search-bar .button {
  padding: 8px 15px;
  border-radius: 9px;
  font-size: 12px;
}

/* 信息流控制栏 */
.feed-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 16px;
  gap: 12px;
  flex-wrap: wrap;
}

.feed-tabs {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(15, 23, 42, 0.07);
  border-radius: 999px;
}

.feed-tabs button {
  border: 0;
  background: none;
  padding: 6px 16px;
  border-radius: 999px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.feed-tabs button.active {
  background: var(--ink);
  color: #ffffff;
}

.feed-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.feed-context {
  font-size: 12px;
  color: var(--muted);
}

.flow-mode-switch,
.density-switch {
  display: inline-flex;
  padding: 3px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid var(--line);
}

.flow-mode-switch button,
.density-switch button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: none;
  padding: 5px 11px;
  border-radius: 7px;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.16s ease;
}

.flow-mode-switch button.active {
  background: var(--brand);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 102, 255, 0.25);
}

.density-switch button.active {
  background: var(--ink);
  color: #ffffff;
}

/* 栅格布局 */
.feed-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

.feed-grid.is-two-col {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (min-width: 1440px) {
  .feed-grid.is-pure-grid:not(.is-two-col) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.feed-cell {
  min-width: 0;
  display: flex;
}

.feed-cell > :deep(.article-card) {
  width: 100%;
}

.feed-skeleton {
  overflow: hidden;
  border-radius: 16px;
}

.feed-bottom {
  display: flex;
  justify-content: center;
  min-height: 56px;
  align-items: center;
  color: var(--muted);
  font-size: 12.5px;
  margin-top: 20px;
}

.loading-pill {
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--glass-bg);
  border: var(--glass-outline);
}

/* 右侧边栏（文字流） */
.discovery-sidebar {
  position: sticky;
  top: 96px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.community-note,
.explore-section {
  padding: 18px;
}

.community-note h2 {
  font-size: 19px;
  font-weight: 800;
  line-height: 1.38;
  margin: 6px 0 8px;
  color: var(--ink);
}

.community-note p {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.7;
  margin-bottom: 14px;
}

.creator-cta {
  width: 100%;
}

.explore-header h2 {
  font-size: 14.5px;
  font-weight: 800;
  margin: 4px 0 10px;
  color: var(--ink);
}

.explore-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.explore-list button {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 9px;
  border: 1px solid transparent;
  border-radius: 11px;
  background: rgba(15, 23, 42, 0.025);
  text-align: left;
  width: 100%;
  font-size: 12px;
  cursor: pointer;
}

.explore-list button:hover {
  background: #ffffff;
  border-color: rgba(0, 102, 255, 0.22);
}

.prompt-hash {
  display: grid;
  place-items: center;
  background: var(--ink);
  color: #ffffff;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 11px;
  flex-shrink: 0;
}

.explore-list strong {
  display: block;
  font-weight: 700;
  color: var(--ink);
}

.explore-list small {
  display: block;
  font-size: 11px;
  color: var(--muted);
}

.disclaimer-card {
  padding: 14px 16px;
}

.disclaimer-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--ink);
  margin-bottom: 6px;
}

.disclaimer-card p {
  font-size: 11.5px;
  line-height: 1.65;
  color: var(--muted);
  margin: 0 0 6px;
}

.disclaimer-card small {
  font-size: 10.5px;
  color: var(--muted);
}

@media (max-width: 1180px) {
  .discovery-layout.is-text-layout {
    grid-template-columns: 184px minmax(0, 1fr);
  }
  .discovery-sidebar {
    display: none;
  }
}

@media (max-width: 920px) {
  .discovery-layout,
  .discovery-layout.is-text-layout {
    grid-template-columns: 1fr;
  }
  .channel-rail {
    position: static;
  }
  .quick-tags {
    display: none;
  }
  .feed-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .feed-grid {
    grid-template-columns: 1fr;
  }
}
</style>
