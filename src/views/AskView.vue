<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { askArticle } from '@/api/article'
import { formatTime } from '@/utils/format'
import AppIcon from '@/components/AppIcon.vue'
import AnswerText from '@/components/AnswerText.vue'
import AiSettingsDialog from '@/components/AiSettingsDialog.vue'
import { useAiSettingsStore } from '@/stores/aiSettings'

const route = useRoute()
const ai = useAiSettingsStore()
const providerName = computed(
  () =>
    ai.providers.find((p) => p.id === ai.configuration?.provider)?.name ||
    ai.configuration?.provider,
)
const question = ref('')
const answer = ref('')
const submittedQuestion = ref('')
const references = ref([])
const loading = ref(false)
const errorMessage = ref('')
const suggestions = [
  '找几篇关于 AI Agent 的开发实践',
  '最近一周有哪些科技相关的文章？',
  '推荐几篇适合入门 Spring Boot 的内容',
]
const ready = computed(() => question.value.trim().length > 0 && !loading.value)

watch(
  () => route.query.q,
  (q) => {
    if (!loading.value) question.value = String(q || '').slice(0, 200)
  },
  { immediate: true },
)

onMounted(() => {
  ai.loadStatus()
  ai.loadProviders().catch(() => {})
  ai.openSettings()
})

function clearApi() {
  ai.clear()
  ai.loadStatus()
}

async function submitQuestion(text = question.value) {
  const value = String(text).trim()
  if (!value || loading.value) return
  const mode = ai.mode
  const config = mode === 'custom' ? ai.snapshot() : null
  if ((mode === 'custom' && !config) || (mode === 'platform' && !ai.trialReady)) {
    ai.openSettings()
    return
  }
  question.value = value
  submittedQuestion.value = value
  loading.value = true
  answer.value = ''
  references.value = []
  errorMessage.value = ''
  try {
    const response = await askArticle(value, mode, config)
    answer.value = response.data.answer
    references.value = response.data.references || []
  } catch (error) {
    errorMessage.value =
      error.code === 'ECONNABORTED'
        ? '这次搜索用时较长，请稍后重新提问。'
        : error.response?.data?.message || error.message || 'AI 搜索暂时不可用，请稍后再试。'
  } finally {
    loading.value = false
    if (mode === 'platform') ai.loadStatus()
  }
}

function reset() {
  if (loading.value) return
  answer.value = ''
  submittedQuestion.value = ''
  question.value = ''
  references.value = []
  errorMessage.value = ''
}
</script>

<template>
  <section class="ask-workspace surface">
    <aside class="ask-sidebar">
      <span class="eyebrow">BOOM AI · INSIGHTS</span>
      <h2>把内容，<br />聊明白。</h2>
      <p>从一个问题出发，检索社区真实发布的文章。</p>
      <button class="button button-secondary" :disabled="loading" @click="reset">
        <AppIcon name="pen" :size="15" />
        重新提问
      </button>
      <div class="search-boundary">
        <AppIcon name="shield" :size="18" />
        <span>搜索社区已发布内容<br />每次提问独立检索</span>
      </div>
      <RouterLink class="text-action" to="/search">
        切换关键词搜索
        <AppIcon name="arrow" :size="15" />
      </RouterLink>
    </aside>

    <main class="ask-main">
      <header class="ask-heading">
        <span class="eyebrow">SEARCH WITH SOURCES</span>
        <h1>你想了解什么？</h1>
        <p>让 AI 检索社区文章，带着可核对的引用回答你。</p>
      </header>

      <div class="api-banner">
        <div>
          <strong>{{ ai.mode === 'platform' ? '平台免费体验' : '使用自己的 AI 服务' }}</strong>
          <p v-if="ai.mode === 'custom'">
            {{
              ai.configured
                ? `${providerName} · ${ai.configuration.model} · 使用你的 API 额度`
                : '请先填写自己的 API 配置。'
            }}
          </p>
          <p v-else>
            {{
              ai.statusError ||
              (ai.status?.enabled
                ? `今日剩余 ${ai.status.quota.remaining} / ${ai.status.quota.dailyLimit} 次 · 全站今日剩余 ${ai.status.quota.siteRemaining} 次`
                : '平台尚未开放免费体验，可选择自己的 API。')
            }}
          </p>
        </div>
        <button class="button button-secondary" :disabled="loading" @click="ai.openSettings()">
          搜索方式 / API 配置
        </button>
        <button v-if="ai.configured" class="text-action" :disabled="loading" @click="clearApi">
          清除密钥
        </button>
      </div>

      <div v-if="!submittedQuestion" class="ask-intro">
        <span class="intro-spark">✦</span>
        <h2>好问题，是发现的开始。</h2>
        <div class="question-suggestions">
          <button v-for="suggestion in suggestions" :key="suggestion" @click="question = suggestion">
            {{ suggestion }}
            <AppIcon name="external" :size="15" />
          </button>
        </div>
      </div>

      <div v-else class="answer-area" aria-live="polite">
        <div class="question-bubble">{{ submittedQuestion }}</div>

        <div v-if="loading" class="answer-loading">
          <div class="answer-label">
            <AppIcon name="spark" :size="18" />
            BOOM AI
          </div>
          <p>正在检索社区内容并生成回答…</p>
          <el-skeleton :rows="3" animated />
          <span>工具检索和模型生成可能需要一些时间。</span>
        </div>

        <div v-else-if="errorMessage" class="ask-error" role="alert">
          <AppIcon name="refresh" :size="22" />
          <h3>这次没能完成搜索</h3>
          <p>{{ errorMessage }}</p>
          <button class="button button-secondary" @click="submitQuestion(submittedQuestion)">
            重试这次提问
          </button>
          <RouterLink to="/search" class="text-action">也可以使用关键词搜索</RouterLink>
        </div>

        <article v-else class="answer-content">
          <div class="answer-label">
            <AppIcon name="spark" :size="18" />
            BOOM AI
          </div>
          <AnswerText :text="answer" />

          <section v-if="references.length" class="answer-references">
            <div class="references-heading">
              <h2>参考内容</h2>
              <span>{{ references.length }} 篇真实社区文章</span>
            </div>
            <RouterLink
              v-for="(reference, index) in references"
              :key="reference.id"
              class="reference-item"
              :to="{ name: 'read', params: { id: reference.id }, query: { mode: 'ask' } }"
            >
              <span class="reference-number">{{ index + 1 }}</span>
              <span class="reference-copy">
                <strong>{{ reference.title }}</strong>
                <span>
                  {{
                    reference.sourceUrl
                      ? '站内仅保存来源信息，打开卡片前往原网站阅读。'
                      : reference.summary || '打开文章查看完整内容'
                  }}
                </span>
                <small>
                  {{ reference.sourceName || reference.authorNickname || '社区作者' }}
                  <span v-if="reference.categoryName"> · {{ reference.categoryName }}</span>
                  <span v-if="reference.publishedAt"> · {{ formatTime(reference.publishedAt) }}</span>
                </small>
              </span>
              <AppIcon name="external" :size="17" />
            </RouterLink>
          </section>

          <p v-else class="no-references">
            本次没有检索到可引用的站内文章。可以换一个关键词或时间范围再试。
          </p>
          <p class="answer-footnote">AI 回答可能存在偏差，重要信息请打开引用文章核对。</p>
        </article>
      </div>

      <form class="ask-composer" @submit.prevent="submitQuestion()">
        <label class="sr-only" for="ai-question">向 AI 提问</label>
        <textarea
          id="ai-question"
          v-model="question"
          :disabled="loading"
          maxlength="200"
          rows="3"
          placeholder="例如：帮我找几篇关于 Spring Boot 的 Agent 开发实践"
          @keydown.ctrl.enter.prevent="submitQuestion()"
        ></textarea>
        <div class="composer-footer">
          <span>每次独立检索 · {{ question.length }}/200 · Ctrl + Enter 发送</span>
          <button class="button button-primary" type="submit" :disabled="!ready">
            {{ loading ? '搜索中…' : '发送问题' }}
            <AppIcon name="arrow" :size="17" />
          </button>
        </div>
      </form>
    </main>
  </section>
  <AiSettingsDialog :busy="loading" />
</template>

<style scoped>
.api-banner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 15px 18px;
  margin-top: 22px;
  background: var(--soft);
  border: 1px solid rgba(0, 102, 255, 0.14);
  border-radius: 14px;
}

.api-banner > div {
  flex: 1;
  min-width: 180px;
}

.api-banner strong {
  font-size: 13px;
  font-weight: 700;
  color: var(--brand);
}

.api-banner p {
  font-size: 11.5px;
  line-height: 1.75;
  color: var(--muted);
  margin: 4px 0 0;
  overflow-wrap: anywhere;
}

.api-banner .button {
  font-size: 12px;
  white-space: nowrap;
}

.api-banner > .text-action {
  font-size: 11.5px;
}

.ask-workspace {
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  max-width: 1210px;
  margin: 0 auto;
  min-height: 720px;
  overflow: hidden;
  border-radius: 20px;
}

.ask-sidebar {
  padding: 34px 26px;
  background: rgba(15, 23, 42, 0.03);
  border-right: 1px solid var(--line);
}

.ask-sidebar h2 {
  font-size: 28px;
  line-height: 1.38;
  font-weight: 800;
  letter-spacing: -0.8px;
  margin: 12px 0;
  color: var(--ink);
}

.ask-sidebar > p {
  font-size: 12.5px;
  color: var(--muted);
  line-height: 1.85;
}

.ask-sidebar > .button {
  width: 100%;
  margin-top: 18px;
}

.search-boundary {
  display: flex;
  gap: 9px;
  font-size: 11.5px;
  line-height: 1.85;
  color: var(--muted);
  margin: 56px 0 28px;
  align-items: flex-start;
}

.search-boundary > svg {
  margin-top: 3px;
  color: var(--brand);
}

.ask-sidebar > .text-action {
  font-size: 12px;
}

.ask-main {
  width: 100%;
  max-width: 850px;
  min-width: 0;
  margin: auto;
  padding: 36px 45px;
}

.ask-heading h1 {
  font-size: 30px;
  letter-spacing: -0.9px;
  font-weight: 800;
  margin: 7px 0 8px;
  color: var(--ink);
}

.ask-heading p {
  font-size: 13px;
  color: var(--muted);
  margin: 0;
}

.ask-intro {
  padding: 34px 0 30px;
}

.intro-spark {
  font-size: 32px;
  color: var(--brand);
}

.ask-intro h2 {
  font-size: 19px;
  font-weight: 700;
  margin: 8px 0 18px;
  color: var(--ink);
}

.question-suggestions {
  display: grid;
  gap: 10px;
}

.question-suggestions button {
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.85);
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 13px 16px;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  color: var(--text);
  transition: all 0.18s ease;
}

.question-suggestions button:hover {
  background: #ffffff;
  border-color: var(--brand);
  color: var(--brand);
  transform: translateX(2px);
}

.answer-area {
  padding-top: 20px;
}

.question-bubble {
  max-width: 87%;
  width: fit-content;
  margin: 12px 0 24px auto;
  background: var(--ink);
  color: #ffffff;
  padding: 12px 18px;
  border-radius: 16px 16px 4px 16px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 13.5px;
  font-weight: 500;
}

.answer-label {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12.5px;
  color: var(--brand);
  font-weight: 700;
}

.references-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.references-heading h2 {
  font-size: 13.5px;
  font-weight: 700;
  margin: 0;
  color: var(--ink);
}

.references-heading > span {
  font-size: 11px;
  color: var(--muted);
}

.reference-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--line);
  border-radius: 12px;
  text-decoration: none;
  margin-top: 9px;
  transition: all 0.18s ease;
}

.reference-item:hover {
  border-color: var(--brand);
  background: #ffffff;
  transform: translateY(-1px);
}

.reference-number {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  background: var(--soft);
  color: var(--brand);
  border-radius: 8px;
  font-size: 11.5px;
  font-weight: 700;
  flex-shrink: 0;
}

.reference-copy {
  flex: 1;
  min-width: 0;
}

.reference-copy strong {
  display: block;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ink);
}

.reference-copy > span {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.75;
  margin: 5px 0;
}

.reference-copy small {
  font-size: 11px;
  color: var(--muted);
}

.reference-item > svg {
  color: var(--muted);
  margin-top: 4px;
}

.answer-footnote,
.no-references {
  font-size: 11.5px;
  color: var(--muted);
  line-height: 1.85;
  margin: 16px 0;
}

.answer-loading {
  padding: 8px 0 25px;
}

.answer-loading > p {
  color: var(--text);
  font-size: 13px;
  margin: 12px 0 20px;
}

.answer-loading > span {
  display: block;
  margin-top: 18px;
  color: var(--muted);
  font-size: 11.5px;
}

.ask-error {
  padding: 20px;
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 14px;
  background: rgba(254, 242, 242, 0.8);
  margin-bottom: 24px;
}

.ask-error > svg {
  color: #ef4444;
}

.ask-error h3 {
  font-size: 16px;
  font-weight: 700;
  margin: 10px 0 5px;
}

.ask-error p {
  font-size: 13px;
  color: var(--muted);
}

.ask-error .text-action {
  font-size: 12px;
  margin-left: 16px;
}

.ask-composer {
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 16px;
  padding: 14px 16px;
  background: #ffffff;
  margin-top: 16px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.ask-composer:focus-within {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.12);
}

.ask-composer textarea {
  resize: vertical;
  min-height: 75px;
  max-height: 250px;
  border: 0;
  background: none;
  padding: 3px;
  width: 100%;
  color: var(--ink);
  outline: none;
  font-size: 13.5px;
  line-height: 1.75;
}

.composer-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  margin-top: 8px;
}

.composer-footer > span {
  font-size: 11px;
  color: var(--muted);
}

.composer-footer .button {
  font-size: 12.5px;
  padding: 8px 16px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
