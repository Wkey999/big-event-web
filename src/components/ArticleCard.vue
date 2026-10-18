<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from './AppIcon.vue'
const props = defineProps({ article: { type: Object, required: true }, categoryName: String, mode: { type: String, default: 'latest' } })
const failed = ref(false)
watch(() => props.article.coverImg, () => { failed.value = false })
const tint = computed(() => Number(props.article.categoryId || props.article.id) % 4)
const excerpt = computed(() => props.article.summary || '打开文章，看看作者的分享与思考。')
const path = computed(() => ({ name: 'read', params: { id: props.article.id }, query: { mode: props.mode } }))
</script>
<template>
  <article class="article-card">
    <RouterLink :to="path" class="card-link">
      <div v-if="article.coverImg && !failed" class="card-image" :class="`image-shape-${Number(article.id) % 3}`"><img :src="article.coverImg" :alt="article.title" loading="lazy" @error="failed = true"><span v-if="categoryName" class="cover-category">{{ categoryName }}</span></div>
      <div v-else class="editorial-cover" :class="`tint-${tint}`"><span class="cover-eyebrow">BOOM / {{ categoryName || '社区分享' }}</span><span class="cover-graphic" aria-hidden="true"><i></i><i></i><i></i></span><strong>{{ article.title }}</strong><span class="cover-foot">IDEAS WORTH SHARING</span></div>
      <div class="card-copy"><span class="card-category">{{ categoryName || '社区分享' }}</span><h2>{{ article.title }}</h2><p>{{ excerpt }}</p></div>
    </RouterLink>
    <div class="card-meta"><span class="card-author"><img v-if="article.authorAvatar" :src="article.authorAvatar" alt="" @error="$event.target.style.display = 'none'"><span v-else class="letter-avatar">{{ (article.authorNickname || '作').slice(0, 1) }}</span><span>{{ article.authorNickname || '社区作者' }}</span></span><span class="card-count" :aria-label="`${article.likeCount || 0} 次点赞`"><AppIcon name="heart" :size="14" />{{ article.likeCount || 0 }}</span></div>
  </article>
</template>
<style scoped>
.article-card{overflow:hidden;background:var(--paper);border:1px solid var(--line);border-radius:12px;transition:box-shadow .18s,transform .18s}.article-card:hover{box-shadow:0 8px 24px #243c2c0d;transform:translateY(-2px)}.card-link{display:block;text-decoration:none}.card-image{position:relative;aspect-ratio:1.2;overflow:hidden;background:var(--soft)}.image-shape-1{aspect-ratio:1}.image-shape-2{aspect-ratio:1.35}.card-image img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .35s}.article-card:hover .card-image img{transform:scale(1.025)}.cover-category{position:absolute;bottom:11px;left:12px;font-size:10px;border-radius:4px;padding:3px 7px;background:#ffffffeb;color:var(--ink)}.editorial-cover{min-height:192px;padding:18px;display:flex;flex-direction:column;justify-content:space-between;gap:16px;overflow:hidden;position:relative;background:#dfe9d4;color:#3c5d39}.tint-1{background:#e2e6ed;color:#4c5e78}.tint-2{background:#eee4d4;color:#776039}.tint-3{background:#294e3b;color:#edf4df}.cover-eyebrow,.cover-foot{position:relative;z-index:1;font-size:9px;letter-spacing:1px}.editorial-cover strong{font-size:20px;font-weight:500;line-height:1.55;letter-spacing:-.4px;position:relative;z-index:1;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;max-width:90%}.cover-graphic{position:absolute;right:-18px;top:38px;width:110px;height:110px;transform:rotate(-24deg);opacity:.12}.cover-graphic i{position:absolute;inset:0;border:1px solid currentColor;border-radius:50%}.cover-graphic i:nth-child(2){inset:15px -12px}.cover-graphic i:nth-child(3){inset:30px -22px}.card-copy{padding:13px 14px 0}.card-category{color:var(--brand);font-size:10px}.card-copy h2{font-size:15px;line-height:1.65;font-weight:600;margin:6px 0 7px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.card-copy p{font-size:12px;color:var(--muted);line-height:1.75;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.card-meta{display:flex;align-items:center;justify-content:space-between;gap:9px;padding:14px}.card-author{display:flex;align-items:center;gap:6px;min-width:0;font-size:11px;color:var(--text)}.card-author>span:last-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.card-author img,.letter-avatar{width:21px;height:21px;border-radius:50%;object-fit:cover;flex-shrink:0}.letter-avatar{display:inline-grid;place-items:center;background:var(--soft);color:var(--brand);font-size:10px}.card-count{display:flex;gap:4px;align-items:center;font-size:11px;color:var(--muted);white-space:nowrap}
</style>
