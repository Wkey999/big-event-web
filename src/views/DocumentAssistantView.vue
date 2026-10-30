<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { analyzeDocument, extractDocumentFile } from '@/api/documentAssistant'
import AppIcon from '@/components/AppIcon.vue'
import AiSettingsDialog from '@/components/AiSettingsDialog.vue'
import { useAiSettingsStore } from '@/stores/aiSettings'

const ai = useAiSettingsStore()

const text = ref('')
const question = ref('')
const runMode = ref('extractive') // 'extractive' | 'ai'
const strategy = ref('hybrid') // 'hybrid' | 'vector' | 'bm25' | 'tfidf' | 'overlap'
const result = ref(null)
const loading = ref(false)
const extracting = ref(false)
const uploadedMeta = ref(null)
const submittedQuestion = ref('')
const fileInputRef = ref(null)
let inputRevision = 0

const presets = [
  {
    id: 'hackathon',
    label: '示例 1：校园黑客松通知',
    question: '报名截止时间是什么时候？一等奖奖金和开源协议有什么要求？',
    unanswerableQuestion: '参赛选手的免费午餐券去哪个食堂窗口领取？',
    content: `[第 1 页]
关于举办 2026 秋季校园开发者黑客松大赛的通知

一、报名时间与组队规则
本届秋季校园黑客松线上报名通道将于 11 月 5 日 17:00 正式截止，逾期系统自动关闭，不再接受补报或中途更换队员。每支参赛队伍人数规定为 1 至 4 人，鼓励跨学院、跨专业自由组队，但每位选手在同一赛届内只能加入一支队伍。线下决赛路演定于 11 月 22 日在南校区学术报告厅举行。

[第 2 页]
二、作品提交与开源协议要求
进入决赛的团队须在路演前 24 小时提交完整源代码仓库、部署说明文档及 3 分钟以内的实机演示视频。所有参赛作品核心代码必须遵循 MIT 或 Apache-2.0 开源许可证，严禁直接套用往届获奖项目或未经授权的商业闭源模块。

三、评分权重与奖项设置
技术评委会按四个维度打分：系统工程完成度占 35%，技术创新与算法深度占 30%，真实场景实用价值占 20%，现场路演答辩占 15%。大赛设一等奖 10,000 元人民币、二等奖 5,000 元、三等奖 2,000 元，证书与奖金将于公示期满 7 个工作日后统一发放。`,
  },
  {
    id: 'reimburse',
    label: '示例 2：企业差旅报销规范',
    question: '去杭州出差住宿限额是多少？两个人合住标间怎么算？回来多久内要交报销单？',
    unanswerableQuestion: '海外出差去东京的日元汇率怎么折算？',
    content: `【企业差旅与财务报销管理办法】
第一条 差旅交通标准：员工因公出差应优先选择高铁二等座或动车二等座。单程铁路运行时间超过 6 小时或晚间 22:00 后抵达目的地的，经部门负责人审批可乘坐动卧或经济舱航班。未经审批擅自升舱（如商务座、头等舱）的差价部分由个人自行承担，财务不予报销。

第二条 住宿限额标准：一线城市（北京、上海、广州、深圳、杭州）住宿费报销上限为每人每晚 550 元人民币；省会及新一线城市上限为每人每晚 420 元；其他地级市及县城上限为每人每晚 320 元。两名同性员工合住一间标准间时，可在单人限额基础上上浮 30%。

第三条 发票与报销时效：所有差旅费用须取得增值税电子普通发票或专用发票，发票抬头须与公司全称及纳税人识别号完全一致。餐饮娱乐发票、手写白条及无明细定额收据一律不予入账。员工须在出差返程后 15 个自然日内在 OA 系统提交报销单，跨季度逾期未交且无书面延期说明的，财务部有权退单。`,
  },
  {
    id: 'security',
    label: '示例 3：BOOM 架构安全与 RAG 设计',
    question: 'Redis 退出登录怎么存储令牌？如果 Redis 挂了返回什么状态码？',
    unanswerableQuestion: '数据库连接池 HikariCP 的最大活跃连接数配置成了多少？',
    content: `【BOOM 社区安全与文档 RAG 架构设计说明】
1. 会话认证与显式退出：系统默认采用 JWT 无状态认证（有效期 24 小时）。开启 Redis 会话撤销开关（AUTH_TOKEN_REVOCATION_ENABLED=true）后，用户调用 POST /user/logout 时，后端仅提取 JWT 的 SHA-256 十六进制摘要写入 Redis 黑名单（键前缀 boom:auth:revoked:v1:），其 TTL 严格等于该令牌的剩余过期时间。Redis 中严禁存储明文 JWT。

2. 故障降级策略（Fail-Closed）：在启用 Redis 令牌撤销的场景下，若 Redis 实例发生连接中断或超时，JwtInterceptor 必须返回 HTTP 503 Service Unavailable，绝不允许静默放行已注销的旧令牌（防止注销失效复活），也不得返回 401 误导前端清空正常配置。

3. 引用溯源与无证据拒答：在检索增强问答（RAG）模式下，Java 网关先向 Python 子服务获取 Top-K 相关原文片段。若检索结果为空，系统直接拒答，不调用外部大模型 API，从而节省免费体验配额，避免在无检索结果时生成回答。调用模型后，服务端校验回答中标注的 [#chunk] 引用编号，剔除不在本次检索结果集中的编号；编号存在并不保证回答事实正确。`,
  },
]

const strategyLabels = {
  hybrid: 'FAISS 向量 + BM25 混合 RRF',
  vector: 'FAISS IndexFlatIP 稠密向量检索',
  bm25: 'BM25 稀疏加权检索',
  tfidf: 'TF-IDF 余弦相似度',
  overlap: '2-gram 词集重叠基线',
}

const providerName = computed(
  () =>
    ai.providers.find((p) => p.id === ai.configuration?.provider)?.name ||
    ai.configuration?.provider,
)

const verifiedSet = computed(() => new Set(result.value?.verified_citations || []))

const modeBadgeText = computed(() => {
  if (!result.value) return ''
  const m = result.value.mode
  if (m === 'rag') return 'RAG 有据生成 · 引用编号已由服务端核验'
  if (m === 'rag-refused') return 'RAG 无证据自动拒答 · 已拦截大模型调用（0 额度消耗）'
  return '摘录与分块检索基线 · 无模型生成（0 Token 消耗）'
})

watch(
  [text, question, runMode, strategy],
  () => {
    inputRevision += 1
  },
  { flush: 'sync' },
)

onMounted(() => {
  ai.loadStatus()
  ai.loadProviders().catch(() => {})
})

function applyPreset(preset, useTrapQuestion = false) {
  uploadedMeta.value = null
  text.value = preset.content
  question.value = useTrapQuestion ? preset.unanswerableQuestion : preset.question
  result.value = null
}

function triggerFileSelect() {
  fileInputRef.value?.click()
}

async function onFileSelected(event) {
  const file = event.target?.files?.[0]
  if (!file || extracting.value) return
  event.target.value = ''
  extracting.value = true
  try {
    const res = await extractDocumentFile(file)
    const data = res.data
    text.value = data.text || ''
    uploadedMeta.value = {
      filename: data.filename,
      fileType: data.file_type,
      pageCount: data.page_count,
      charCount: data.char_count,
      truncated: data.truncated,
    }
    result.value = null
  } catch {
    // Shared axios interceptor displays BusinessException message
  } finally {
    extracting.value = false
  }
}

async function analyze() {
  if (!text.value.trim() || loading.value) return

  let effectiveMode = 'extractive'
  let aiConfig = null
  if (runMode.value === 'ai') {
    effectiveMode = ai.mode
    aiConfig = effectiveMode === 'custom' ? ai.snapshot() : null
    if ((effectiveMode === 'custom' && !aiConfig) || (effectiveMode === 'platform' && !ai.trialReady)) {
      ai.openSettings()
      return
    }
  }

  loading.value = true
  result.value = null
  const revision = inputRevision
  const asked = question.value.trim()
  try {
    const response = await analyzeDocument(text.value, asked, {
      mode: effectiveMode,
      strategy: strategy.value,
      aiConfig,
    })
    if (revision === inputRevision) {
      result.value = response.data
      submittedQuestion.value = asked
    }
  } catch {
    // Shared request layer shows the service error
  } finally {
    loading.value = false
    if (effectiveMode === 'platform') ai.loadStatus()
  }
}

function clear() {
  text.value = ''
  question.value = ''
  result.value = null
  uploadedMeta.value = null
}
</script>

<template>
  <section class="document-page">
    <header class="intro">
      <div class="intro-top">
        <div>
          <span class="eyebrow">BOOM / DOCUMENT RAG LAB</span>
          <h1>文档助手<span>.</span></h1>
          <p>
            支持上传 <code>.txt</code> / <code>.md</code> / 可提取文字的 <code>.pdf</code> 或直接粘贴资料。
            由 Python FastAPI + LangChain 递归切块与 BM25/RRF 检索相关片段，可切换「仅原文摘录基线」或「RAG 大模型有据生成 + 确定性引用核验」。
          </p>
        </div>
        <div class="arch-pills">
          <span>FastAPI + LangChain 切块</span>
          <span>BM25 / Hybrid RRF 检索</span>
          <span>无证据拒答 + 引用正则核验</span>
        </div>
      </div>

      <div class="preset-bar">
        <span class="preset-label">快速演示样例：</span>
        <div class="preset-buttons">
          <template v-for="p in presets" :key="p.id">
            <button type="button" class="preset-chip" @click="applyPreset(p, false)">
              {{ p.label }}（有据问答）
            </button>
            <button type="button" class="preset-chip preset-chip-trap" @click="applyPreset(p, true)">
              {{ p.label.split('：')[0] }}·无答案拒答测试
            </button>
          </template>
        </div>
      </div>
    </header>

    <div class="workspace">
      <form class="input-panel" @submit.prevent="analyze">
        <div class="panel-heading">
          <div>
            <span class="step">01 / 文档输入与检索配置</span>
            <h2>上传文档或粘贴需要分析的资料</h2>
          </div>
          <div class="heading-actions">
            <input
              ref="fileInputRef"
              type="file"
              accept=".txt,.md,.pdf"
              class="sr-only"
              @change="onFileSelected"
            />
            <button
              type="button"
              class="upload-button"
              :disabled="extracting || loading"
              @click="triggerFileSelect"
            >
              <AppIcon name="upload" :size="15" />
              {{ extracting ? '正在解析文档…' : '上传 TXT / MD / PDF' }}
            </button>
            <button type="button" class="clear-button" @click="clear">清空</button>
          </div>
        </div>

        <div v-if="uploadedMeta" class="upload-banner">
          <AppIcon name="document" :size="16" />
          <span>
            已载入 <strong>{{ uploadedMeta.filename }}</strong>
            （{{ uploadedMeta.fileType.toUpperCase() }}
            <template v-if="uploadedMeta.pageCount"> · 共 {{ uploadedMeta.pageCount }} 页</template>
            · {{ uploadedMeta.charCount }} 字符
            <template v-if="uploadedMeta.truncated"> · 超出 20,000 字已截断</template>）
          </span>
        </div>

        <label for="document-text">
          资料正文
          <small>支持 PDF 页码标记 [第 N 页]，扫描件/纯图片 PDF 会自动识别并拦截提示</small>
        </label>
        <textarea
          id="document-text"
          v-model="text"
          maxlength="20000"
          placeholder="点击上方「快速演示样例」一键填入，或上传 .txt / .md / .pdf 文档…"
          required
        ></textarea>
        <span class="counter">{{ text.length }} / 20,000 字符</span>

        <div class="config-grid">
          <div class="config-field">
            <label for="retrieval-strategy">检索算法策略</label>
            <select id="retrieval-strategy" v-model="strategy">
              <option value="hybrid">Hybrid RRF（FAISS 稠密向量 + BM25 双路混合 · 推荐）</option>
              <option value="vector">FAISS IndexFlatIP（512 维稠密向量检索）</option>
              <option value="bm25">BM25 稀疏词频加权检索</option>
              <option value="tfidf">TF-IDF 余弦相似度</option>
              <option value="overlap">2-gram 词集重叠（Baseline 对照基线）</option>
            </select>
          </div>

          <div class="config-field">
            <label>回答生成模式</label>
            <div class="mode-switch" role="radiogroup" aria-label="回答生成模式">
              <button
                type="button"
                :class="['mode-btn', { active: runMode === 'extractive' }]"
                @click="runMode = 'extractive'"
              >
                仅原文摘录基线（0 消耗）
              </button>
              <button
                type="button"
                :class="['mode-btn', { active: runMode === 'ai' }]"
                @click="runMode = 'ai'"
              >
                RAG 大模型有据生成
              </button>
            </div>
          </div>
        </div>

        <div v-if="runMode === 'ai'" class="ai-quota-bar">
          <div>
            <strong>{{ ai.mode === 'platform' ? '平台免费体验模式' : '自定义 API 密钥模式' }}</strong>
            <span v-if="ai.mode === 'custom'">
              {{
                ai.configured
                  ? ` · ${providerName} (${ai.configuration.model})`
                  : ' · 尚未配置密钥，请点击右侧设置'
              }}
            </span>
            <span v-else>
              {{
                ai.status?.enabled
                  ? ` · 今日剩余 ${ai.status.quota.remaining}/${ai.status.quota.dailyLimit} 次（无证据拒答不扣额度）`
                  : ' · 平台体验未开启，请配置自己的 API Key'
              }}
            </span>
          </div>
          <button type="button" class="quota-config-btn" @click="ai.openSettings()">
            切换 / 配置 API
          </button>
        </div>

        <label for="document-question">
          围绕文档提问
          <small>选填 · 留空则仅生成文档摘要</small>
        </label>
        <input
          id="document-question"
          v-model="question"
          maxlength="300"
          placeholder="例如：报名截止日期是什么时候？如果问文档里没有的内容会触发无证据拒答。"
        />

        <button class="run-button" type="submit" :disabled="loading || extracting || !text.trim()">
          <AppIcon :name="runMode === 'ai' ? 'spark' : 'search'" :size="17" />
          {{
            loading
              ? '正在切块检索与分析…'
              : runMode === 'ai'
                ? '执行 RAG 检索增强问答（带引用核验）'
                : '生成摘要并检索相关原文片段'
          }}
        </button>
        <p class="privacy">
          安全边界：请求经 Spring Boot 鉴权网关转发至本机回环 Python 服务（127.0.0.1:8001），文档不落盘公开存储。
        </p>
      </form>

      <div class="output-panel" aria-live="polite">
        <div class="panel-heading">
          <div>
            <span class="step">02 / 检索与有据回答</span>
            <h2>可溯源的内容核对</h2>
          </div>
        </div>

        <div v-if="!result" class="empty-state">
          <AppIcon name="document" :size="38" />
          <p>选择上方演示样例或上传文档后，切块摘要、RAG 回答与原文引用片段会展示在这里。</p>
        </div>

        <template v-else>
          <div class="meta-badges">
            <span
              :class="[
                'mode-tag',
                {
                  'mode-tag-rag': result.mode === 'rag',
                  'mode-tag-refused': result.mode === 'rag-refused',
                },
              ]"
            >
              {{ modeBadgeText }}
            </span>
            <span class="stat-pill">
              检索策略：{{ strategyLabels[result.strategy] || result.strategy || 'BM25' }}
            </span>
            <span v-if="result.chunk_count" class="stat-pill">
              共切分 {{ result.chunk_count }} 个片段
            </span>
          </div>

          <h3>文档摘要</h3>
          <p class="summary">{{ result.summary }}</p>

          <template v-if="submittedQuestion">
            <h3>针对「{{ submittedQuestion }}」的回答</h3>
            <div
              :class="[
                'answer-box',
                {
                  'answer-box-rag': result.mode === 'rag',
                  'answer-box-refused': result.mode === 'rag-refused',
                },
              ]"
            >
              <p>{{ result.answer }}</p>
            </div>

            <div v-if="result.citations?.length" class="citations-section">
              <div class="citations-header">
                <h3>检索命中的原文证据片段（Top {{ result.citations.length }}）</h3>
                <span>引用编号与页码均由服务端程序确定性回填</span>
              </div>
              <div
                v-for="citation in result.citations"
                :key="citation.chunk"
                :class="['citation', { 'citation-verified': verifiedSet.has(citation.chunk) }]"
              >
                <div class="citation-head">
                  <div class="citation-badges">
                    <strong>[#{{ citation.chunk }}] 原文片段 {{ citation.chunk }}</strong>
                    <span v-if="citation.page" class="page-badge">第 {{ citation.page }} 页</span>
                    <span v-if="verifiedSet.has(citation.chunk)" class="verified-badge">
                      ✓ 模型回答引用了此片段（编号已核对）
                    </span>
                  </div>
                  <span v-if="citation.score" class="score-badge">
                    相关度得分 {{ Number(citation.score).toFixed(2) }}
                  </span>
                </div>
                <p>{{ citation.excerpt }}</p>
              </div>
            </div>
          </template>
        </template>
      </div>
    </div>
    <AiSettingsDialog :busy="loading" />
  </section>
</template>

<style scoped>
.document-page {
  max-width: 1380px;
  margin: 0 auto;
  padding: 36px 36px 70px;
  color: var(--ink, #172033);
}

.intro {
  padding: 28px 34px;
  border: 1px solid #e2e9f2;
  border-radius: 24px;
  background: linear-gradient(115deg, #ffffff, #edf4ff);
}

.intro-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
}

.eyebrow,
.step {
  color: #2d6ed1;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.13em;
}

h1 {
  font-size: 42px;
  letter-spacing: -0.05em;
  margin: 10px 0;
}

h1 span {
  color: #1768ee;
}

.intro p {
  color: #55637a;
  line-height: 1.75;
  margin: 0;
  max-width: 820px;
  font-size: 14px;
}

.intro code {
  background: rgba(23, 104, 238, 0.08);
  color: #1756b8;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 12.5px;
}

.arch-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.arch-pills span {
  font-size: 12px;
  font-weight: 700;
  padding: 6px 11px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #d5e2f6;
  color: #1e4f9c;
}

.preset-bar {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px dashed #d5e2f4;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.preset-label {
  font-size: 12.5px;
  font-weight: 700;
  color: #3b4b63;
}

.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-chip {
  border: 1px solid #cddcf2;
  background: #ffffff;
  color: #1c3d72;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.16s ease;
}

.preset-chip:hover {
  border-color: #1768ee;
  color: #1768ee;
  transform: translateY(-1px);
}

.preset-chip-trap {
  background: #fff8f1;
  border-color: #f3d2b0;
  color: #9a4d0c;
}

.preset-chip-trap:hover {
  border-color: #d97706;
  color: #b45309;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 22px;
  margin-top: 22px;
}

.input-panel,
.output-panel {
  min-width: 0;
  padding: 28px;
  border: 1px solid #e4e9f1;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 14px 36px rgba(22, 42, 76, 0.05);
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  gap: 12px;
  flex-wrap: wrap;
}

.heading-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.upload-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 13px;
  border-radius: 10px;
  border: 1px solid #c9daf6;
  background: #f3f8ff;
  color: #175ce5;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.upload-button:hover:not(:disabled) {
  background: #e6f0ff;
}

.upload-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.upload-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #f0f7ff;
  border: 1px solid #cfe2ff;
  color: #1e4b8f;
  font-size: 12.5px;
  margin-bottom: 12px;
}

h2 {
  font-size: 20px;
  letter-spacing: -0.03em;
  margin: 6px 0 0;
}

h3 {
  font-size: 15px;
  margin: 20px 0 10px;
}

label {
  display: block;
  font-weight: 750;
  font-size: 13.5px;
  margin: 14px 0 8px;
}

label small {
  color: #8290a3;
  font-weight: 400;
  margin-left: 6px;
}

textarea,
input,
select {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d9e1ec;
  border-radius: 12px;
  padding: 12px 14px;
  background: #fafcff;
  color: inherit;
  font: inherit;
  font-size: 13.5px;
  outline: none;
}

textarea:focus,
input:focus,
select:focus {
  border-color: #1768ee;
  box-shadow: 0 0 0 3px #1768ee18;
}

textarea {
  min-height: 230px;
  resize: vertical;
  line-height: 1.7;
}

.counter {
  display: block;
  text-align: right;
  color: #8994a4;
  font-size: 12px;
  margin-top: 5px;
}

.config-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
  margin-top: 6px;
}

.mode-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  background: #f2f6fc;
  padding: 4px;
  border-radius: 12px;
  border: 1px solid #dce5f2;
}

.mode-btn {
  border: 0;
  background: transparent;
  padding: 8px 10px;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 700;
  color: #5b6b82;
  cursor: pointer;
}

.mode-btn.active {
  background: #ffffff;
  color: #1459d9;
  box-shadow: 0 2px 8px rgba(16, 26, 43, 0.08);
}

.ai-quota-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 11px;
  background: #f6f9ff;
  border: 1px solid #d7e5fb;
  font-size: 12px;
  color: #465870;
}

.ai-quota-bar strong {
  color: #1656c9;
}

.quota-config-btn {
  border: 1px solid #c4d7f7;
  background: #ffffff;
  color: #175ce5;
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.clear-button {
  border: 0;
  background: none;
  color: #67778d;
  cursor: pointer;
  font-size: 13px;
}

.run-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 20px;
  padding: 13px;
  border: 0;
  border-radius: 12px;
  background: #101a2b;
  color: #fff;
  font-weight: 800;
  cursor: pointer;
}

.run-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.privacy {
  font-size: 12px;
  color: #8994a4;
  line-height: 1.6;
  margin-top: 10px;
}

.empty-state {
  min-height: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8997ac;
  text-align: center;
  padding: 20px;
}

.meta-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.mode-tag {
  display: inline-block;
  border-radius: 8px;
  padding: 6px 10px;
  background: #ebf3ff;
  color: #2766b9;
  font-size: 12px;
  font-weight: 700;
}

.mode-tag-rag {
  background: #e6f9f1;
  color: #0e7a4e;
}

.mode-tag-refused {
  background: #fff4e5;
  color: #b45309;
}

.stat-pill {
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 8px;
  background: #f4f7fb;
  color: #55657d;
  font-weight: 600;
}

.summary,
.output-panel p {
  line-height: 1.8;
  color: #425268;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 14px;
}

.answer-box {
  padding: 14px 16px;
  border-radius: 12px;
  background: #f8fafd;
  border: 1px solid #e2e8f2;
}

.answer-box-rag {
  background: #f2fbf7;
  border-color: #bce6d3;
}

.answer-box-refused {
  background: #fff9f0;
  border-color: #f5d6a7;
}

.answer-box p {
  margin: 0;
  color: #1f2d40;
}

.citations-section {
  margin-top: 20px;
}

.citations-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.citations-header span {
  font-size: 11.5px;
  color: #7c8b9e;
}

.citation {
  margin: 12px 0;
  padding: 15px;
  border-left: 3px solid #2d72de;
  border-radius: 0 12px 12px 0;
  background: #f5f8fd;
}

.citation-verified {
  border-left-color: #10b981;
  background: #f2fbf7;
}

.citation-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.citation-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.citation strong {
  font-size: 12.5px;
  color: #2158a7;
}

.page-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 6px;
  background: #e1ecff;
  color: #1d57b8;
}

.verified-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  background: #d1fae5;
  color: #065f46;
}

.score-badge {
  font-size: 11.5px;
  color: #6b7b91;
  font-family: monospace;
}

.citation p {
  margin: 8px 0 0;
  font-size: 13px;
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

@media (max-width: 980px) {
  .workspace,
  .config-grid {
    grid-template-columns: 1fr;
  }
  .document-page {
    padding: 20px;
  }
  .intro {
    padding: 22px;
  }
}
</style>
