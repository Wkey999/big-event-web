<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { sourceLink } from '@/utils/sourceLink'
import { formatTime } from '@/utils/format'
const props = defineProps({ article: { type: Object, required: true } })
const link = computed(() => sourceLink(props.article.sourceUrl))
</script>
<template>
  <section class="source-notice">
    <span class="eyebrow">READ AT THE SOURCE</span><h2>到原文，继续阅读。</h2>
    <p>这是一条外部文章推荐，站内保存来源信息，正文在原网站阅读。</p>
    <p v-if="article.sourceTranslatedTitle" class="original-title">英文原题：{{ article.sourceTitle }}<br><small>中文标题经翻译并审核，仅作阅读参考。</small></p><dl><div><dt>内容来源</dt><dd>{{ article.sourceName }}</dd></div><div><dt>原文作者</dt><dd>{{ article.sourceAuthor || '来源未提供作者' }}</dd></div><div><dt>原文发布</dt><dd>{{ article.sourcePublishedAt ? formatTime(article.sourcePublishedAt) : '来源未提供时间' }}</dd></div><div v-if="article.sourceFetchedAt"><dt>收录时间</dt><dd>{{ formatTime(article.sourceFetchedAt) }}</dd></div></dl>
    <a v-if="link" :href="link" target="_blank" rel="noopener noreferrer" class="button button-primary">阅读原文<AppIcon name="external" :size="17" /></a><p v-else>原文链接暂时无法使用。</p>
    <small>原文观点属于来源作者，本站未转载其正文与配图。</small>
  </section>
</template>
<style scoped>
.source-notice{padding:30px;margin:30px 0 5px;border-radius:12px;background:#f2f6ed;border:1px solid #e1e8d9}.source-notice h2{font-size:24px;font-weight:500;letter-spacing:-.6px;margin:12px 0}.source-notice>p{font-size:13px;line-height:1.9;color:var(--muted)}.source-notice dl{font-size:12px;margin:25px 0}.source-notice dl>div{display:flex;gap:20px;margin-top:12px}.source-notice dt{width:68px;flex-shrink:0;color:var(--muted)}.source-notice dd{margin:0;color:var(--text)}.source-notice small{display:block;font-size:11px;color:var(--muted);margin-top:20px;line-height:1.8}
</style>
