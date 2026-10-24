<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from './AppIcon.vue'
const props = defineProps({
  article: { type: Object, required: true },
  categoryName: String,
  showCategory: { type: Boolean, default: true },
  mode: { type: String, default: 'latest' },
  variant: { type: String, default: 'row' },
})
const failed = ref(false)
watch(() => props.article.coverImg, () => { failed.value = false })
const hasCover = computed(() => Boolean(props.article.coverImg) && !failed.value)
const title = computed(() => props.article.sourceTranslatedTitle || props.article.sourceTitle || props.article.title)
const summary = computed(() => (props.article.summary || '').trim())
const author = computed(() => props.article.authorNickname || '社区作者')
const path = computed(() => ({ name: 'read', params: { id: props.article.id }, query: { mode: props.mode } }))
const likeCount = computed(() => Number(props.article.likeCount || 0))
const publishedAt = computed(() => {
  const raw = props.article.createTime || props.article.sourcePublishedAt
  if (!raw) return ''
  const stamp = new Date(String(raw).replace(' ', 'T'))
  if (Number.isNaN(stamp.getTime())) return ''
  const minutes = Math.floor((Date.now() - stamp.getTime()) / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (minutes < 1440) return `${Math.floor(minutes / 60)} 小时前`
  if (minutes < 43200) return `${Math.floor(minutes / 1440)} 天前`
  return `${stamp.getMonth() + 1} 月 ${stamp.getDate()} 日`
})
const layout = computed(() => {
  if (props.variant === 'hero') return hasCover.value ? 'hero' : 'hero-text'
  return hasCover.value ? 'row' : 'text'
})
</script>
<template>
  <article class="story" :class="`story--${layout}`">
    <RouterLink :to="path" class="story-link">
      <div v-if="layout !== 'text' && hasCover" class="story-media">
        <img :src="article.coverImg" :alt="title" loading="lazy" decoding="async" @error="failed = true">
      </div>
      <div class="story-body">
        <p v-if="showCategory || article.sourceName" class="story-kicker">
          <span v-if="showCategory" class="story-channel">{{ categoryName || '社区分享' }}</span>
          <span v-if="article.sourceName" class="story-source">外部 · {{ article.sourceName }}</span>
        </p>
        <h2 class="story-title">{{ title }}</h2>
        <p v-if="summary" class="story-summary">{{ summary }}</p>
        <div class="story-meta">
          <span class="story-author"><img v-if="article.authorAvatar" :src="article.authorAvatar" alt="" @error="$event.target.style.display = 'none'"><span v-else class="letter-avatar">{{ author.slice(0, 1) }}</span>{{ author }}</span>
          <span v-if="publishedAt" class="story-time">{{ publishedAt }}</span>
          <span class="story-likes" :aria-label="`${likeCount} 次点赞`"><AppIcon name="heart" :size="13" />{{ likeCount }}</span>
        </div>
      </div>
    </RouterLink>
  </article>
</template>
<style scoped>
.story{border-bottom:1px solid var(--line)}
.story:last-child{border-bottom:0}
.story-link{display:grid;grid-template-columns:1fr;gap:0;text-decoration:none;color:inherit;padding:18px 0;transition:background .14s ease}
.story-link:hover .story-title{color:var(--brand)}
.story-media{overflow:hidden;border-radius:10px;background:var(--soft);flex-shrink:0;box-shadow:inset 0 0 0 1px rgba(23,30,26,.06)}
.story-media img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .4s ease}
.story-link:hover .story-media img{transform:scale(1.02)}
.story-body{min-width:0}
.story-kicker{display:flex;align-items:center;gap:8px;margin:0 0 6px;font-size:11.5px;line-height:1.5;color:var(--muted)}
.story-channel{color:var(--brand);font-weight:500}
.story-title{margin:0;font-size:18px;line-height:1.55;font-weight:600;letter-spacing:-.01em;color:var(--ink);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.story-summary{margin:7px 0 0;font-size:13px;line-height:1.8;color:var(--text);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.story-meta{display:flex;align-items:center;gap:12px;margin-top:9px;font-size:12px;color:var(--muted)}
.story-time{color:#98a29b;font-variant-numeric:tabular-nums}
.story-author{display:inline-flex;align-items:center;gap:7px;min-width:0;max-width:70%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.story-author img{width:19px;height:19px;border-radius:50%;object-fit:cover;flex-shrink:0;background:var(--soft)}
.letter-avatar{display:grid;place-items:center;width:19px;height:19px;border-radius:50%;background:var(--soft);color:var(--brand);font-size:10px;flex-shrink:0}
.story-likes{display:inline-flex;align-items:center;gap:4px;font-variant-numeric:tabular-nums}

/* 有图条目：图文左右排，图占固定轨道，标题与摘要共享同一条基线 */
.story--row .story-link{grid-template-columns:208px minmax(0,1fr);gap:20px;align-items:start;padding:15px 0}
.story--row .story-media{width:208px;height:130px}

/* 无图条目：不造占位图，标题放大撑住版面 */
.story--text .story-title{font-size:19px;-webkit-line-clamp:2}
.story--text .story-summary{-webkit-line-clamp:2}
.story--text .story-link{padding:18px 0}

/* 头图：图在右，文在左，打破列表的重复 */
.story--hero{border-bottom:1px solid var(--line)}
.story--hero .story-link{grid-template-columns:minmax(0,1fr) 44%;gap:30px;padding:2px 0 26px;align-items:center}
.story--hero .story-media{width:100%;aspect-ratio:16/10;height:auto;border-radius:12px}
.story--hero .story-title{font-size:25px;line-height:1.45;letter-spacing:-.02em;-webkit-line-clamp:3}
.story--hero .story-summary{font-size:13.5px;-webkit-line-clamp:3;margin-top:10px;max-width:52ch}
.story--hero .story-meta{margin-top:14px}

@media (max-width: 1360px){
  .story--hero .story-title{font-size:23px}
  .story--row .story-link{grid-template-columns:188px minmax(0,1fr);gap:18px}
  .story--row .story-media{width:188px;height:118px}
}

/* 头条没有配图时：整版留给文字，标题抬到最大 */
.story--hero-text .story-link{grid-template-columns:1fr;padding:6px 0 28px}
.story--hero-text .story-title{font-size:30px;line-height:1.4;letter-spacing:-.025em;-webkit-line-clamp:3;max-width:24ch}
.story--hero-text .story-summary{font-size:14px;line-height:1.85;margin-top:12px;-webkit-line-clamp:3;max-width:58ch}
.story--hero-text .story-meta{margin-top:16px}
</style>
