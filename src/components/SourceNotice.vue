<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { sourceLink } from '@/utils/sourceLink'
import { formatTime } from '@/utils/format'
import { getStructuredArticleDigest, getVisualPoster } from '@/utils/articleDigest'

const props = defineProps({
  article: { type: Object, required: true },
  categoryName: { type: String, default: '' },
})

const link = computed(() => sourceLink(props.article.sourceUrl))
const poster = computed(() => getVisualPoster(props.article, props.categoryName))
const digest = computed(() => getStructuredArticleDigest(props.article, props.categoryName))
</script>

<template>
  <div class="editorial-digest">
    <!-- 顶部宽幅高定视觉主图 -->
    <div
      class="digest-hero-poster"
      :class="{ 'is-light': poster.theme.light }"
      :style="{ background: poster.theme.bg, '--poster-accent': poster.theme.accent }"
    >
      <svg class="hero-poster-svg" viewBox="0 0 800 240" fill="none" aria-hidden="true">
        <defs>
          <pattern id="hero-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path
              d="M 32 0 L 0 0 0 32"
              fill="none"
              stroke="currentColor"
              stroke-width="0.8"
              stroke-opacity="0.14"
            />
          </pattern>
        </defs>
        <rect width="800" height="240" fill="url(#hero-grid)" />
        <circle
          cx="680"
          cy="70"
          r="110"
          stroke="currentColor"
          stroke-opacity="0.2"
          stroke-width="1.5"
        />
        <circle
          cx="680"
          cy="70"
          r="65"
          stroke="currentColor"
          stroke-opacity="0.28"
          stroke-dasharray="5 5"
          stroke-width="1.5"
        />
      </svg>

      <div class="hero-poster-content">
        <div class="hero-poster-top">
          <span class="hero-code-badge">
            <AppIcon :name="poster.icon" :size="15" />
            {{ poster.code }}
          </span>
          <span class="hero-source-pill">收录来源 · {{ article.sourceName || '外部精选' }}</span>
        </div>
        <strong class="hero-poster-title">{{ poster.highlightToken }}</strong>
        <p class="hero-poster-sub">{{ poster.subline }}</p>
        <div class="hero-poster-tags">
          <span v-for="tag in digest.tags" :key="tag"># {{ tag }}</span>
        </div>
      </div>
    </div>

    <!-- 站内来源速览 -->
    <section class="digest-article-body">
      <div class="digest-section">
        <div class="digest-section-head">
          <span class="section-index">01</span>
          <h2>报道速览</h2>
        </div>
        <p class="digest-lead">{{ digest.summary }}</p>
        <p class="digest-context">{{ digest.domainContext }}</p>
      </div>

      <div class="digest-section">
        <div class="digest-section-head">
          <span class="section-index">02</span>
          <h2>来源与阅读提示</h2>
        </div>
        <ul class="takeaway-list">
          <li v-for="(point, index) in digest.keyPoints" :key="index">
            <span class="takeaway-dot">{{ index + 1 }}</span>
            <span>{{ point }}</span>
          </li>
        </ul>
      </div>

      <div v-if="article.sourceTranslatedTitle" class="bilingual-box">
        <span class="bilingual-label">ORIGINAL TITLE · 英文原题对照</span>
        <strong>{{ article.sourceTitle }}</strong>
        <small>中文标题经社区翻译与审核，仅供站内快速阅读参考。</small>
      </div>
    </section>

    <!-- 原始来源档案与跳转卡 -->
    <section class="source-notice">
      <div class="source-notice-top">
        <div>
          <span class="eyebrow">READ AT THE SOURCE</span>
          <h2>前往原网站，继续阅读完整原文</h2>
          <p>这是一条外部文章推荐，站内提供标题与来源信息，完整正文与配图在原网站阅读。</p>
        </div>
        <a
          v-if="link"
          :href="link"
          target="_blank"
          rel="noopener noreferrer"
          class="button button-primary source-cta"
        >
          阅读原文
          <AppIcon name="external" :size="17" />
        </a>
      </div>

      <dl class="source-dossier">
        <div>
          <dt>内容来源</dt>
          <dd>{{ article.sourceName }}</dd>
        </div>
        <div>
          <dt>原文作者</dt>
          <dd>{{ article.sourceAuthor || '来源未提供作者' }}</dd>
        </div>
        <div>
          <dt>原文发布</dt>
          <dd>
            {{ article.sourcePublishedAt ? formatTime(article.sourcePublishedAt) : '来源未提供时间' }}
          </dd>
        </div>
        <div v-if="article.sourceFetchedAt">
          <dt>收录时间</dt>
          <dd>{{ formatTime(article.sourceFetchedAt) }}</dd>
        </div>
      </dl>

      <p v-if="!link" class="link-unavailable">原文链接暂时无法使用。</p>
      <small class="source-legal">原文观点属于来源作者，本站未转载其完整正文与配图。</small>
    </section>
  </div>
</template>

<style scoped>
.editorial-digest {
  margin: 26px 0 10px;
  display: flex;
  flex-direction: column;
  gap: 26px;
}

/* 顶部宽幅主图海报 */
.digest-hero-poster {
  position: relative;
  border-radius: 18px;
  padding: 26px 30px;
  color: #ffffff;
  overflow: hidden;
  box-shadow: 0 16px 36px -12px rgba(10, 13, 20, 0.22);
}

.digest-hero-poster.is-light {
  color: #0a0d14;
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.hero-poster-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  color: var(--poster-accent, #38bdf8);
  pointer-events: none;
}

.hero-poster-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hero-poster-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-code-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(10px);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.2px;
  font-family: 'SF Mono', 'JetBrains Mono', Consolas, monospace;
}

.digest-hero-poster.is-light .hero-code-badge {
  background: rgba(0, 102, 255, 0.12);
  color: #0066ff;
}

.hero-source-pill {
  padding: 4px 11px;
  border-radius: 999px;
  background: rgba(10, 13, 20, 0.42);
  font-size: 11px;
  font-weight: 600;
}

.digest-hero-poster.is-light .hero-source-pill {
  background: rgba(255, 255, 255, 0.85);
  color: #0a0d14;
}

.hero-poster-title {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: 1.3;
  margin-top: 4px;
}

.hero-poster-sub {
  margin: 0;
  font-size: 13.5px;
  opacity: 0.84;
}

.hero-poster-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}

.hero-poster-tags span {
  padding: 4px 10px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 11.5px;
  font-weight: 600;
}

.digest-hero-poster.is-light .hero-poster-tags span {
  background: rgba(15, 23, 42, 0.06);
}

/* 精编导读正文区 */
.digest-article-body {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.digest-section {
  padding: 22px 24px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(15, 23, 42, 0.07);
}

.digest-section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.section-index {
  display: inline-grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: var(--ink);
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
}

.digest-section-head h2 {
  font-size: 17px;
  font-weight: 800;
  margin: 0;
  color: var(--ink);
  letter-spacing: -0.3px;
}

.digest-lead {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.85;
  color: var(--ink);
  margin: 0 0 12px;
}

.digest-context {
  font-size: 14px;
  line-height: 1.88;
  color: var(--text);
  margin: 0;
}

.takeaway-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 12px;
}

.takeaway-list li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.028);
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--text);
}

.takeaway-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--soft);
  color: var(--brand);
  font-size: 11.5px;
  font-weight: 800;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.bilingual-box {
  padding: 16px 20px;
  border-radius: 14px;
  background: rgba(0, 102, 255, 0.045);
  border-left: 3px solid var(--brand);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bilingual-label {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: var(--brand);
}

.bilingual-box strong {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--ink);
  font-family: 'SF Mono', 'JetBrains Mono', Consolas, monospace;
}

.bilingual-box small {
  font-size: 11.5px;
  color: var(--muted);
}

/* 底部来源档案卡 */
.source-notice {
  padding: 26px 28px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.035);
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.source-notice-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.source-notice h2 {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.4px;
  margin: 6px 0 6px;
  color: var(--ink);
}

.source-notice-top p {
  font-size: 13px;
  line-height: 1.75;
  color: var(--muted);
  margin: 0;
}

.source-cta {
  padding: 11px 20px;
  font-size: 13.5px;
}

.source-dossier {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 24px;
  font-size: 12.5px;
  margin: 20px 0 16px;
  padding: 16px 18px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
}

.source-dossier > div {
  display: flex;
  gap: 14px;
}

.source-dossier dt {
  width: 68px;
  flex-shrink: 0;
  color: var(--muted);
  font-weight: 600;
}

.source-dossier dd {
  margin: 0;
  color: var(--ink);
  font-weight: 700;
}

.link-unavailable {
  font-size: 12.5px;
  color: var(--muted);
}

.source-legal {
  display: block;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.7;
}
</style>
