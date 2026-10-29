<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from './AppIcon.vue'
import { getSmartSummary, getVisualPoster } from '@/utils/articleDigest'

const props = defineProps({
  article: { type: Object, required: true },
  categoryName: String,
  mode: { type: String, default: 'latest' },
  variant: { type: String, default: 'pure' }, // 'pure' (纯净视觉流) | 'text' (深度文字流)
})

const failed = ref(false)
watch(
  () => props.article.coverImg,
  () => {
    failed.value = false
  },
)

const isTextFlow = computed(() => props.variant === 'text')
const hasCover = computed(() => Boolean(props.article.coverImg) && !failed.value)
const isExternal = computed(() => Boolean(props.article.sourceName || props.article.sourceUrl))
const title = computed(
  () => props.article.sourceTranslatedTitle || props.article.sourceTitle || props.article.title,
)
const poster = computed(() => getVisualPoster(props.article, props.categoryName))
const summaryText = computed(() => getSmartSummary(props.article, props.categoryName))

const authorDisplay = computed(
  () => props.article.sourceName || props.article.authorNickname || '社区创作者',
)
const dateBadge = computed(() => {
  const raw = props.article.publishedAt || props.article.createTime || ''
  if (!raw) return ''
  const formatted = String(raw).replace('T', ' ').slice(5, 16)
  return isTextFlow.value ? formatted : formatted.slice(0, 5)
})
const path = computed(() => ({
  name: 'read',
  params: { id: props.article.id },
  query: { mode: props.mode },
}))
</script>

<template>
  <article
    class="article-card"
    :class="{
      'is-media': hasCover,
      'is-poster': !hasCover,
      'is-external': isExternal,
      'is-text-flow': isTextFlow,
    }"
  >
    <RouterLink :to="path" class="card-link">
      <!-- 形态 A：真实上传的主图封面 -->
      <div v-if="hasCover" class="card-media">
        <img :src="article.coverImg" :alt="title" loading="lazy" @error="failed = true" />
        <div class="media-badges">
          <span class="badge-category">{{ categoryName || '社区发现' }}</span>
          <span v-if="isExternal" class="badge-source">
            <template v-if="isTextFlow">{{ article.sourceName || '外部资讯' }}</template>
            <AppIcon name="external" :size="11" />
          </span>
        </div>
      </div>

      <!-- 形态 B：智能主题视觉海报主图 -->
      <div
        v-else
        class="poster-cover"
        :class="{ 'is-light': poster.theme.light }"
        :style="{ background: poster.theme.bg, '--poster-accent': poster.theme.accent }"
      >
        <svg class="poster-bg-svg" viewBox="0 0 400 220" fill="none" aria-hidden="true">
          <defs v-if="isTextFlow">
            <pattern id="poster-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path
                d="M 28 0 L 0 0 0 28"
                fill="none"
                stroke="currentColor"
                stroke-width="0.7"
                stroke-opacity="0.14"
              />
            </pattern>
          </defs>
          <rect v-if="isTextFlow" width="400" height="220" fill="url(#poster-grid)" />
          <circle
            cx="328"
            cy="55"
            r="74"
            stroke="currentColor"
            stroke-opacity="0.2"
            stroke-width="1.3"
          />
          <circle
            cx="328"
            cy="55"
            r="42"
            stroke="currentColor"
            stroke-opacity="0.26"
            stroke-dasharray="4 4"
            stroke-width="1.2"
          />
          <path
            d="M230 192 C275 138, 338 158, 392 100"
            stroke="currentColor"
            stroke-opacity="0.28"
            stroke-width="1.9"
          />
        </svg>

        <div class="poster-top">
          <span class="poster-cat">{{ categoryName || '社区发现' }}</span>
          <span v-if="isTextFlow" class="poster-source">
            <span class="poster-dot"></span>
            {{ poster.sourceLabel }}
          </span>
          <span v-else-if="isExternal" class="poster-ext" title="外部资讯源">
            <AppIcon name="external" :size="12" />
          </span>
        </div>

        <!-- 文字流海报中心：完整徽标 + 主词 + 副标题 -->
        <div v-if="isTextFlow" class="poster-center is-detailed">
          <div class="poster-emblem">
            <span class="emblem-icon">
              <AppIcon :name="poster.icon" :size="18" />
            </span>
            <span class="emblem-code">{{ poster.code }}</span>
          </div>
          <strong class="poster-headline">{{ poster.highlightToken }}</strong>
          <span class="poster-subline">{{ poster.subline }}</span>
        </div>

        <!-- 纯净流海报中心：仅保留图标与核心视觉锚点 -->
        <div v-else class="poster-center is-clean">
          <span class="emblem-icon clean-icon">
            <AppIcon :name="poster.icon" :size="20" />
          </span>
          <strong class="poster-headline">{{ poster.highlightToken }}</strong>
        </div>

        <!-- 文字流底部标签栏 -->
        <div v-if="isTextFlow" class="poster-bottom">
          <div class="poster-tags">
            <span v-for="tag in poster.tags.slice(0, 3)" :key="tag" class="poster-tag">
              # {{ tag }}
            </span>
          </div>
          <span class="poster-action">
            来源速览
            <AppIcon :name="isExternal ? 'external' : 'arrow'" :size="12" />
          </span>
        </div>
      </div>

      <!-- 正文内容区：纯净流只展示标题，文字流展示标题 + 内容速览框 -->
      <div class="card-body">
        <h2 class="card-title">{{ title }}</h2>
        <div v-if="isTextFlow" class="card-digest-box">
          <span class="digest-label">内容速览</span>
          <p class="card-excerpt">{{ summaryText }}</p>
        </div>
      </div>
    </RouterLink>

    <!-- 底部社区作者与互动栏 -->
    <footer class="card-meta">
      <div class="card-author">
        <img
          v-if="article.authorAvatar"
          :src="article.authorAvatar"
          alt=""
          @error="$event.target.style.display = 'none'"
        />
        <span v-else class="letter-avatar" :class="{ 'is-source': isExternal }">
          {{ authorDisplay.slice(0, 1).toUpperCase() }}
        </span>
        <span class="author-name">{{ authorDisplay }}</span>
        <span v-if="dateBadge" class="meta-date">· {{ dateBadge }}</span>
      </div>

      <div class="card-stats">
        <span
          v-if="article.viewCount"
          class="stat-item"
          :aria-label="`${article.viewCount} 次阅读`"
        >
          <AppIcon name="eye" :size="13" />
          {{ article.viewCount }}
        </span>
        <span class="stat-item" :aria-label="`${article.likeCount || 0} 次点赞`">
          <AppIcon name="heart" :size="13" />
          {{ article.likeCount || 0 }}
        </span>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.article-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  overflow: hidden;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: var(--glass-outline);
  border-radius: 18px;
  box-shadow: var(--glass-shadow);
  transition:
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.2s ease,
    background 0.2s ease;
}

.article-card:hover {
  transform: translateY(-4px);
  background: var(--glass-bg-strong);
  border-color: rgba(0, 102, 255, 0.28);
  box-shadow: var(--glass-shadow-hover);
}

.card-link {
  display: flex;
  flex-direction: column;
  flex: 1;
  text-decoration: none;
  color: inherit;
}

/* 形态 A：真实图片封面 */
.card-media {
  position: relative;
  aspect-ratio: 16 / 9.5;
  overflow: hidden;
  background: linear-gradient(135deg, #0f172a, #1e293b);
}

.card-media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.article-card:hover .card-media img {
  transform: scale(1.045);
}

.media-badges {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  pointer-events: none;
}

.badge-category {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(10, 13, 20, 0.76);
  backdrop-filter: blur(12px);
  color: #ffffff;
}

.badge-source {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(12px);
  color: var(--ink);
}

/* 形态 B：视觉海报主图 */
.poster-cover {
  position: relative;
  aspect-ratio: 16 / 9.2;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  overflow: hidden;
  color: #ffffff;
}

.article-card.is-text-flow .poster-cover {
  aspect-ratio: auto;
  min-height: 168px;
  gap: 10px;
}

.poster-cover.is-light {
  color: #0a0d14;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.poster-bg-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  color: var(--poster-accent, #38bdf8);
  pointer-events: none;
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.article-card:hover .poster-bg-svg {
  transform: scale(1.05);
}

.poster-top,
.poster-center,
.poster-bottom {
  position: relative;
  z-index: 1;
}

.poster-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.poster-cat {
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.poster-cover.is-light .poster-cat {
  background: rgba(10, 13, 20, 0.85);
  color: #ffffff;
}

.poster-source {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  background: rgba(10, 13, 20, 0.38);
  backdrop-filter: blur(10px);
  max-width: 145px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.poster-cover.is-light .poster-source {
  background: rgba(255, 255, 255, 0.85);
  color: #0a0d14;
}

.poster-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--poster-accent, #38bdf8);
  flex-shrink: 0;
}

.poster-ext {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.14);
}

.poster-center.is-detailed {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 2px 0;
}

.poster-center.is-clean {
  display: flex;
  align-items: center;
  gap: 10px;
}

.poster-emblem {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.emblem-icon {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.16);
  color: var(--poster-accent, #38bdf8);
  flex-shrink: 0;
}

.emblem-icon.clean-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
}

.poster-cover.is-light .emblem-icon {
  background: rgba(0, 102, 255, 0.12);
  color: #0066ff;
}

.emblem-code {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.4px;
  opacity: 0.86;
  font-family: 'SF Mono', 'JetBrains Mono', Consolas, monospace;
}

.poster-headline {
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.3px;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.poster-subline {
  font-size: 11px;
  opacity: 0.78;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.poster-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.poster-cover.is-light .poster-bottom {
  border-top-color: rgba(15, 23, 42, 0.08);
}

.poster-tags {
  display: flex;
  align-items: center;
  gap: 5px;
  overflow: hidden;
}

.poster-tag {
  font-size: 9.5px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.12);
  white-space: nowrap;
}

.poster-cover.is-light .poster-tag {
  background: rgba(15, 23, 42, 0.06);
}

.poster-action {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 700;
  opacity: 0.9;
  white-space: nowrap;
}

/* 正文排版与微文章导读框 */
.card-body {
  padding: 14px 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.card-title {
  font-size: 15.5px;
  line-height: 1.5;
  font-weight: 750;
  letter-spacing: -0.2px;
  color: var(--ink);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
  transition: color 0.18s ease;
}

.article-card:hover .card-title {
  color: var(--brand);
}

.card-digest-box {
  padding: 9px 11px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.032);
  border: 1px solid rgba(15, 23, 42, 0.05);
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: auto;
}

.digest-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.6px;
  color: var(--brand);
}

.digest-label::before {
  content: '';
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--brand);
}

.card-excerpt {
  font-size: 12px;
  color: var(--text);
  line-height: 1.65;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

/* 底部元信息栏 */
.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 16px 13px;
  border-top: 1px solid rgba(15, 23, 42, 0.055);
}

.card-author {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  font-size: 11.5px;
  color: var(--text);
}

.author-name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 115px;
}

.meta-date {
  color: var(--muted);
  font-size: 11px;
  white-space: nowrap;
}

.card-author img,
.letter-avatar {
  width: 21px;
  height: 21px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.letter-avatar {
  display: inline-grid;
  place-items: center;
  background: var(--ink);
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
}

.letter-avatar.is-source {
  background: var(--soft);
  color: var(--brand);
  border: 1px solid rgba(0, 102, 255, 0.16);
}

.card-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.stat-item {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--muted);
  white-space: nowrap;
}
</style>
