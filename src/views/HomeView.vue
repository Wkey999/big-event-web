<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listCategories } from '@/api/category'
import ArticleCard from '@/components/ArticleCard.vue'
import AiBriefingCard from '@/components/AiBriefingCard.vue'
import AiSettingsDialog from '@/components/AiSettingsDialog.vue'
import AppIcon from '@/components/AppIcon.vue'
import ContentState from '@/components/ContentState.vue'
import { useFeed } from '@/composables/useFeed'

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

const categoryNames = computed(() =>
  Object.fromEntries(categories.value.map((item) => [item.id, item.categoryName])),
)
const activeCategory = computed(() => categoryNames.value[categoryId.value] || '全部发现')

const quickPrompts = [
  '有哪些关于 AI Agent 的开发实践？',
  '推荐几篇关于开发工具的文章',
  '帮我找几篇开源项目相关的文章',
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
  <div class="discovery-layout">
    <!-- 左侧雾透玻璃频道导航轨 -->
    <aside class="channel-rail surface">
      <div class="rail-header">
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

      <div class="rail-note">
        <span class="note-dot"></span>
        记录真实实践，交换前沿灵感。
      </div>
    </aside>

    <!-- 中央主内容流 -->
    <section class="discovery-content">
      <!-- 顶部社区横幅 + AI 灵感检索舱 -->
      <header class="hero-glass-pod surface">
        <div class="hero-top">
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
            <AppIcon name="spark" :size="15" />
            AI 检索
          </span>
          <input
            v-model="aiQuestion"
            maxlength="200"
            aria-label="向 AI 提问"
            placeholder="让 AI 帮你检索站内文章，例如：找几篇适合入门的 Agent 开发实践…"
          />
          <button class="button button-primary" type="submit">
            问 AI
            <AppIcon name="external" :size="15" />
          </button>
        </form>
      </header>

      <!-- 今日必读 & AI 智能周报 Bento 舱 -->
      <AiBriefingCard
        :items="items"
        :category-names="categoryNames"
        :active-category="activeCategory"
      />

      <!-- 信息流控制栏（得物风高对比胶囊切换 + 视图密度控制） -->
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
            {{ categoryId ? `${activeCategory}` : '按阅读价值与时效呈现' }}
            <template v-if="total"> · 共 {{ total }} 篇</template>
          </span>
          <div class="density-switch" role="group" aria-label="卡片列数切换">
            <button
              type="button"
              :class="{ active: denseView }"
              title="多列发现视图"
              @click="denseView = true"
            >
              <AppIcon name="grid" :size="14" />
              紧凑
            </button>
            <button
              type="button"
              :class="{ active: !denseView }"
              title="双列精读视图"
              @click="denseView = false"
            >
              双栏
            </button>
          </div>
        </div>
      </div>

      <!-- 规整有序的响应式网格流（消除估算高度瀑布流的错位与跳视） -->
      <div class="feed-grid" :class="{ 'is-two-col': !denseView }">
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

    <!-- 右侧辅助信息栏 -->
    <aside class="discovery-sidebar">
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
          <button @click="ask(quickPrompts[0])">
            <span class="prompt-hash">#</span>
            <span>
              <strong>我的第一个 Agent</strong>
              <small>从一次工具调用开始</small>
            </span>
          </button>
          <button @click="ask(quickPrompts[1])">
            <span class="prompt-hash">#</span>
            <span>
              <strong>真正留下的开发工具</strong>
              <small>看看使用之后的取舍</small>
            </span>
          </button>
          <button @click="ask(quickPrompts[2])">
            <span class="prompt-hash">#</span>
            <span>
              <strong>开源项目阅读笔记</strong>
              <small>看懂，然后试着改一点</small>
            </span>
          </button>
        </div>
      </section>

      <section class="reading-note surface">
        <div class="reading-note-icon">
          <AppIcon name="bookmark" :size="18" />
        </div>
        <div>
          <h3>读到有用的，记得收藏</h3>
          <p>在文章里留下一个赞与收藏，给认真分享的创作者一点回应。</p>
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
.discovery-layout {
  display: grid;
  grid-template-columns: 186px minmax(0, 1fr) 248px;
  gap: 24px;
  align-items: start;
}

/* 左侧雾透玻璃频道栏 */
.channel-rail {
  position: sticky;
  top: 96px;
  padding: 18px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rail-header {
  padding: 2px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rail-header strong {
  font-size: 14px;
  font-weight: 800;
  color: var(--ink);
  letter-spacing: -0.3px;
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
  transition: all 0.18s cubic-bezier(0.22, 1, 0.36, 1);
}

.channel-icon {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.045);
  color: var(--muted);
  transition: all 0.18s ease;
}

.channel-rail button:hover {
  background: rgba(15, 23, 42, 0.045);
  color: var(--ink);
}

.channel-rail button:hover .channel-icon {
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
  margin: 8px 6px;
}

.rail-game-btn {
  color: var(--muted);
}

.rail-note {
  margin-top: 14px;
  padding: 12px 12px 4px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 11px;
  line-height: 1.75;
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

/* 顶部英雄区 + AI 检索舱 */
.discovery-content {
  min-width: 0;
}

.hero-glass-pod {
  padding: 22px 24px;
  margin-bottom: 22px;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 92% 12%, rgba(0, 102, 255, 0.1), transparent 45%),
    var(--glass-bg-strong);
}

.hero-top {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.hero-copy h1 {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.9px;
  line-height: 1.25;
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
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.045);
  border: 1px solid rgba(15, 23, 42, 0.06);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
}

.badge-live {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand);
  box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.18);
}

.ai-search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.1);
  padding: 6px 6px 6px 12px;
  border-radius: 14px;
  box-shadow: 0 4px 16px -4px rgba(10, 13, 20, 0.05);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.ai-search-bar:focus-within {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.12);
}

.ai-spark-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 8px;
  background: var(--soft);
  color: var(--brand);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.ai-search-bar input {
  border: 0;
  background: none;
  flex: 1;
  min-width: 0;
  padding: 6px 4px;
  font-size: 13.5px;
  color: var(--ink);
  outline: none;
}

.ai-search-bar input::placeholder {
  color: #94a3b8;
}

.ai-search-bar .button {
  padding: 9px 16px;
  border-radius: 10px;
  font-size: 12.5px;
}

/* 信息流切换控制栏 */
.feed-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 18px;
  gap: 12px;
}

.feed-tabs {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(15, 23, 42, 0.07);
  border-radius: 999px;
}

.feed-tabs button {
  border: 0;
  background: none;
  padding: 7px 18px;
  border-radius: 999px;
  color: var(--muted);
  font-size: 13.5px;
  font-weight: 700;
  transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.feed-tabs button:hover {
  color: var(--ink);
}

.feed-tabs button.active {
  background: var(--ink);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(10, 13, 20, 0.15);
}

.feed-controls {
  display: flex;
  align-items: center;
  gap: 14px;
}

.feed-context {
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
}

.density-switch {
  display: inline-flex;
  padding: 3px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid var(--line);
}

.density-switch button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  background: none;
  padding: 4px 9px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}

.density-switch button.active {
  background: var(--ink);
  color: #ffffff;
}

/* 规整信息流栅格：按真实阅读顺序排列，同行等高 */
.feed-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

.feed-grid.is-two-col {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (min-width: 1660px) {
  .feed-grid:not(.is-two-col) {
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
  min-height: 60px;
  align-items: center;
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 500;
  margin-top: 22px;
}

.loading-pill {
  padding: 7px 16px;
  border-radius: 999px;
  background: var(--glass-bg);
  border: var(--glass-outline);
}

/* 右侧边栏 */
.discovery-sidebar {
  position: sticky;
  top: 96px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.community-note {
  padding: 22px 20px;
}

.community-note h2 {
  font-size: 21px;
  font-weight: 800;
  line-height: 1.38;
  letter-spacing: -0.6px;
  margin: 8px 0 10px;
  color: var(--ink);
}

.community-note p {
  font-size: 12.5px;
  color: var(--muted);
  line-height: 1.75;
  margin-bottom: 18px;
}

.creator-cta {
  width: 100%;
}

.explore-section {
  padding: 20px;
}

.explore-header h2 {
  font-size: 15px;
  font-weight: 800;
  margin: 4px 0 12px;
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
  gap: 10px;
  padding: 10px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.025);
  text-align: left;
  width: 100%;
  font-size: 12.5px;
  transition: all 0.18s ease;
}

.explore-list button:hover {
  background: #ffffff;
  border-color: rgba(0, 102, 255, 0.22);
  transform: translateX(2px);
}

.prompt-hash {
  display: grid;
  place-items: center;
  background: var(--ink);
  color: #ffffff;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  font-weight: 700;
  font-size: 12px;
  flex-shrink: 0;
}

.explore-list button:hover .prompt-hash {
  background: var(--brand);
}

.explore-list strong {
  display: block;
  font-weight: 700;
  color: var(--ink);
}

.explore-list small {
  display: block;
  font-size: 11px;
  margin-top: 2px;
  color: var(--muted);
}

.reading-note {
  padding: 18px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.reading-note-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--soft);
  color: var(--brand);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.reading-note h3 {
  font-size: 13.5px;
  font-weight: 700;
  margin: 0 0 4px;
  color: var(--ink);
}

.reading-note p {
  font-size: 11.5px;
  color: var(--muted);
  line-height: 1.65;
  margin: 0;
}

.disclaimer-card {
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.58);
}

.disclaimer-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.6px;
  color: var(--ink);
  margin-bottom: 8px;
}

.disclaimer-header > svg {
  color: var(--brand);
}

.disclaimer-card p {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.72;
  margin: 0 0 8px;
}

.disclaimer-card small {
  display: block;
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.4px;
}
</style>
