<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { askArticle } from '@/api/article'
import { formatTime } from '@/utils/format'

const router = useRouter()
const question = ref('')
const answer = ref('')
const references = ref([])
const loading = ref(false)
const submitted = ref(false)
const errorMessage = ref('')

async function submitQuestion() {
  const text = question.value.trim()
  if (!text || loading.value) return
  submitted.value = true
  loading.value = true
  errorMessage.value = ''
  answer.value = ''
  references.value = []
  try {
    const response = await askArticle(text)
    answer.value = response.data.answer
    references.value = response.data.references || []
  } catch (error) {
    errorMessage.value = error.message || '问答暂不可用，请稍后重试'
  } finally {
    loading.value = false
  }
}

function openReference(reference) {
  router.push({ name: 'read', params: { id: reference.id }, query: { mode: 'ask' } })
}
</script>

<template>
  <section class="ask-page">
    <header class="ask-heading">
      <el-tag type="primary" effect="light">AI 内容助手</el-tag>
      <h1>你想了解什么？</h1>
      <p>我会检索社区已发布文章，并给出可核对的文章引用。</p>
    </header>

    <el-card shadow="never" class="ask-composer">
      <el-input
        v-model="question"
        type="textarea"
        :rows="4"
        maxlength="200"
        show-word-limit
        placeholder="例如：帮我找几篇关于 Spring Boot 的文章"
        @keydown.ctrl.enter.prevent="submitQuestion"
      />
      <div class="composer-actions">
        <span class="privacy-note">每次提问独立检索；文章工具仅能读取已发布内容</span>
        <el-button type="primary" :loading="loading" :disabled="!question.trim()" @click="submitQuestion">
          提问
        </el-button>
      </div>
    </el-card>

    <el-alert v-if="errorMessage" :title="errorMessage" type="error" :closable="false" show-icon />
    <el-card v-if="loading" shadow="never" class="answer-card">
      <el-skeleton :rows="4" animated />
    </el-card>

    <template v-if="submitted && !loading && !errorMessage">
      <el-card shadow="never" class="answer-card">
        <template #header><strong>回答</strong></template>
        <p class="answer-text">{{ answer }}</p>
      </el-card>

      <section class="references-section">
        <h2>相关文章</h2>
        <el-empty v-if="references.length === 0" description="本次回答没有检索到可引用文章" />
        <div v-else class="reference-list">
          <el-card v-for="reference in references" :key="reference.id" shadow="hover" class="reference-card">
            <div class="reference-meta">
              <el-tag v-if="reference.categoryName" size="small" effect="plain">{{ reference.categoryName }}</el-tag>
              <span>{{ reference.authorNickname || '匿名作者' }}</span>
              <span>{{ formatTime(reference.publishedAt) }}</span>
            </div>
            <h3>{{ reference.title }}</h3>
            <p>{{ reference.summary || '暂无摘要' }}</p>
            <el-button type="primary" link @click="openReference(reference)">阅读文章</el-button>
          </el-card>
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped>
.ask-page { max-width: 860px; margin: 0 auto; display: grid; gap: 18px; }
.ask-heading { text-align: center; padding: 20px 0 2px; }
.ask-heading h1 { margin: 12px 0 8px; font-size: 28px; color: var(--el-text-color-primary); }
.ask-heading p, .privacy-note { color: var(--el-text-color-secondary); font-size: 13px; }
.ask-composer, .answer-card, .reference-card { border-radius: 16px; }
.composer-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; }
.answer-text { white-space: pre-wrap; line-height: 1.8; color: var(--el-text-color-primary); }
.references-section h2 { font-size: 18px; }
.reference-list { display: grid; gap: 12px; }
.reference-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; color: var(--el-text-color-secondary); font-size: 12px; }
.reference-card h3 { margin: 10px 0 6px; }
.reference-card p { color: var(--el-text-color-regular); line-height: 1.6; }
@media (max-width: 600px) { .composer-actions { align-items: flex-end; } .privacy-note { max-width: 65%; } }
</style>
