<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { askArticle } from '@/api/article'
import { formatTime } from '@/utils/format'
import AppIcon from '@/components/AppIcon.vue'
import AnswerText from '@/components/AnswerText.vue'
const route = useRoute()
const question = ref('')
const answer = ref('')
const submittedQuestion = ref('')
const references = ref([])
const loading = ref(false)
const errorMessage = ref('')
const suggestions = ['找几篇关于 AI Agent 的开发实践', '最近一周有哪些科技相关的文章？', '推荐几篇适合入门 Spring Boot 的内容']
const ready = computed(() => question.value.trim().length > 0 && !loading.value)
watch(() => route.query.q, q => { if (!loading.value) question.value = String(q || '').slice(0, 200) }, { immediate: true })
async function submitQuestion(text = question.value) {
  const value = String(text).trim()
  if (!value || loading.value) return
  question.value = value
  submittedQuestion.value = value
  loading.value = true
  answer.value = ''
  references.value = []
  errorMessage.value = ''
  try {
    const response = await askArticle(value)
    answer.value = response.data.answer
    references.value = response.data.references || []
  } catch (error) {
    errorMessage.value = error.code === 'ECONNABORTED' ? '这次搜索用时较长，请稍后重新提问。' : error.response?.data?.message || error.message || 'AI 搜索暂时不可用，请稍后再试。'
  } finally { loading.value = false }
}
function reset() { if (loading.value) return; answer.value = ''; submittedQuestion.value = ''; question.value = ''; references.value = []; errorMessage.value = '' }
</script>
<template>
  <section class="ask-workspace surface">
    <aside class="ask-sidebar"><span class="eyebrow">BOOM AI</span><h2>把内容，<br>聊明白。</h2><p>从一个问题，找到值得读的内容。</p><button class="button button-secondary" :disabled="loading" @click="reset"><AppIcon name="pen" :size="15" />重新提问</button><div class="search-boundary"><AppIcon name="shield" :size="18" /><span>搜索社区已发布内容<br>每次提问独立检索</span></div><RouterLink class="text-action" to="/search">切换关键词搜索<AppIcon name="arrow" :size="15" /></RouterLink></aside>
    <main class="ask-main">
      <header class="ask-heading"><span class="eyebrow">SEARCH WITH SOURCES</span><h1>你想了解什么？</h1><p>让 AI 检索社区文章，带着可核对的引用回答你。</p></header>
      <div v-if="!submittedQuestion" class="ask-intro"><span class="intro-spark">✦</span><h2>好问题，是发现的开始。</h2><div class="question-suggestions"><button v-for="suggestion in suggestions" :key="suggestion" @click="question = suggestion">{{ suggestion }}<AppIcon name="external" :size="15" /></button></div></div>
      <div v-else class="answer-area" aria-live="polite">
        <div class="question-bubble">{{ submittedQuestion }}</div>
        <div v-if="loading" class="answer-loading"><div class="answer-label"><AppIcon name="spark" :size="18" />BOOM AI</div><p>正在检索社区内容并生成回答…</p><el-skeleton :rows="3" animated /><span>工具检索和模型生成可能需要一些时间。</span></div>
        <div v-else-if="errorMessage" class="ask-error" role="alert"><AppIcon name="refresh" :size="22" /><h3>这次没能完成搜索</h3><p>{{ errorMessage }}</p><button class="button button-secondary" @click="submitQuestion(submittedQuestion)">重试这次提问</button><RouterLink to="/search" class="text-action">也可以使用关键词搜索</RouterLink></div>
        <article v-else class="answer-content"><div class="answer-label"><AppIcon name="spark" :size="18" />BOOM AI</div><AnswerText :text="answer" /><section v-if="references.length" class="answer-references"><div class="references-heading"><h2>参考内容</h2><span>{{ references.length }} 篇真实社区文章</span></div><RouterLink v-for="(reference, index) in references" :key="reference.id" class="reference-item" :to="{ name: 'read', params: { id: reference.id }, query: { mode: 'ask' } }"><span class="reference-number">{{ index + 1 }}</span><span class="reference-copy"><strong>{{ reference.title }}</strong><span>{{ reference.summary || '打开文章查看完整内容' }}</span><small>{{ reference.authorNickname || '社区作者' }}<span v-if="reference.categoryName"> · {{ reference.categoryName }}</span><span v-if="reference.publishedAt"> · {{ formatTime(reference.publishedAt) }}</span></small></span><AppIcon name="external" :size="17" /></RouterLink></section><p v-else class="no-references">本次没有检索到可引用的站内文章。可以换一个关键词或时间范围再试。</p><p class="answer-footnote">AI 回答可能存在偏差，重要信息请打开引用文章核对。</p></article>
      </div>
      <form class="ask-composer" @submit.prevent="submitQuestion()"><label class="sr-only" for="ai-question">向 AI 提问</label><textarea id="ai-question" v-model="question" :disabled="loading" maxlength="200" rows="3" placeholder="例如：帮我找几篇关于 Spring Boot 的 Agent 开发实践" @keydown.ctrl.enter.prevent="submitQuestion()"></textarea><div class="composer-footer"><span>每次独立检索 · {{ question.length }}/200 · Ctrl + Enter 发送</span><button class="button button-primary" type="submit" :disabled="!ready">{{ loading ? '搜索中…' : '发送问题' }}<AppIcon name="arrow" :size="17" /></button></div></form>
    </main>
  </section>
</template>
<style scoped>
.ask-workspace{display:grid;grid-template-columns:236px minmax(0,1fr);max-width:1210px;margin:0 auto;min-height:720px;overflow:hidden}.ask-sidebar{padding:33px 26px;background:#f0f4eb;border-right:1px solid var(--line)}.ask-sidebar h2{font-size:29px;line-height:1.45;font-weight:500;letter-spacing:-.7px;margin:14px 0}.ask-sidebar>p{font-size:12px;color:var(--muted);line-height:1.9}.ask-sidebar>.button{width:100%;margin-top:18px;background:#ffffffbf}.search-boundary{display:flex;gap:9px;font-size:11px;line-height:1.9;color:var(--muted);margin:60px 0 30px;align-items:start}.search-boundary>svg{margin-top:3px;color:var(--brand)}.ask-sidebar>.text-action{font-size:11px}.ask-main{width:100%;max-width:850px;min-width:0;margin:auto;padding:36px 45px}.ask-heading h1{font-size:30px;letter-spacing:-.8px;font-weight:550;margin:7px 0 8px}.ask-heading p{font-size:13px;color:var(--muted);margin:0}.ask-intro{padding:36px 0 31px}.intro-spark{font-size:34px;color:#9bb58b}.ask-intro h2{font-size:19px;font-weight:500;margin:9px 0 20px}.question-suggestions{display:grid;gap:9px}.question-suggestions button{border:1px solid var(--line);background:var(--paper);border-radius:8px;display:flex;justify-content:space-between;align-items:center;gap:14px;padding:12px 14px;font-size:12px;text-align:left;color:var(--text)}.question-suggestions button:hover{background:var(--soft)}.answer-area{padding-top:20px}.question-bubble{max-width:87%;width:fit-content;margin:12px 0 24px auto;background:var(--soft);padding:12px 16px;border-radius:12px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px}.answer-label{display:flex;gap:8px;align-items:center;font-size:12px;color:var(--brand);font-weight:600}.answer-text{white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;line-height:1.95;margin:15px 0 25px;color:var(--text)}.references-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.references-heading h2{font-size:13px;font-weight:600;margin:0}.references-heading>span{font-size:10px;color:var(--muted)}.reference-item{display:flex;align-items:start;gap:12px;padding:14px;background:#fff;border:1px solid var(--line);border-radius:9px;text-decoration:none;margin-top:9px}.reference-item:hover{border-color:#b1c5a5;background:#fbfcf8}.reference-number{display:grid;place-items:center;width:25px;height:25px;background:var(--soft);color:var(--brand);border-radius:6px;font-size:11px;flex-shrink:0}.reference-copy{flex:1;min-width:0}.reference-copy strong{display:block;font-size:13px;font-weight:500}.reference-copy>span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:11px;color:var(--muted);line-height:1.8;margin:6px 0}.reference-copy small{font-size:10px;color:var(--muted)}.reference-item>svg{color:var(--muted);margin-top:4px}.answer-footnote,.no-references{font-size:11px;color:var(--muted);line-height:1.9;margin:17px 0}.answer-loading{padding:8px 0 25px}.answer-loading>p{color:var(--text);font-size:13px;margin:12px 0 20px}.answer-loading>span{display:block;margin-top:18px;color:var(--muted);font-size:11px}.ask-error{padding:20px;border:1px solid #ecdcd5;border-radius:10px;background:#fbf8f3;margin-bottom:25px}.ask-error>svg{color:#a67a50}.ask-error h3{font-size:16px;font-weight:500;margin:12px 0 5px}.ask-error p{font-size:13px;color:var(--muted)}.ask-error .text-action{font-size:11px;margin-left:16px}.ask-composer{border:1px solid #d6e0ce;border-radius:12px;padding:14px;background:#fff;margin-top:14px}.ask-composer:focus-within{border-color:var(--brand)}.ask-composer textarea{resize:vertical;min-height:75px;max-height:250px;border:0;background:none;padding:3px;width:100%;color:var(--ink);outline:none;font-size:13px;line-height:1.8}.composer-footer{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-top:8px}.composer-footer>span{font-size:10px;color:var(--muted)}.composer-footer .button{font-size:12px;padding:8px 12px}.sr-only{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
</style>
