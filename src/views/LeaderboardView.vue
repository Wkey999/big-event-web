<script setup>
import { computed, ref, watch } from 'vue'
import { getModelLeaderboard } from '@/api/leaderboard'
import AppIcon from '@/components/AppIcon.vue'

const dimensions = [
  { key: 'text', name: '对话', description: '人类偏好评测' },
  { key: 'webdev', name: '编程建站', description: '网页开发作品评测' },
  { key: 'search', name: '搜索', description: '联网搜索回答评测' },
  { key: 'vision', name: '视觉理解', description: '图像输入评测' },
  { key: 'agent', name: 'Agent', description: '真实任务结果评测' },
]

const active = ref('text')
const keyword = ref('')
const board = ref(null)
const loading = ref(false)
let requestVersion = 0

const selected = computed(() => dimensions.find(item => item.key === active.value))
const visibleModels = computed(() => {
  const term = keyword.value.trim().toLocaleLowerCase()
  return (board.value?.items || []).filter(item =>
    !term || `${item.name} ${item.organization}`.toLocaleLowerCase().includes(term),
  )
})
const leaders = computed(() => (board.value?.items || []).slice(0, 3))

function scoreLabel(score) {
  if (typeof score !== 'number' || !Number.isFinite(score)) return '—'
  return active.value === 'agent' ? score.toFixed(3) : score.toFixed(1)
}

async function loadBoard(dimension) {
  const current = ++requestVersion
  board.value = null
  loading.value = true
  try {
    const response = await getModelLeaderboard(dimension)
    if (current === requestVersion) board.value = response.data
  } catch {
    if (current === requestVersion) board.value = null
  } finally {
    if (current === requestVersion) loading.value = false
  }
}

watch(active, loadBoard, { immediate: true })
</script>

<template>
  <section class="leaderboard-page">
    <header class="leaderboard-hero surface">
      <div class="hero-copy">
        <span class="eyebrow">MODEL WATCH / INDEPENDENT EVALUATION</span>
        <h1>AI 模型榜单<span class="hero-dot">.</span></h1>
        <p>从不同任务看模型表现。按官方发布结果更新，分数与名次均来自 Arena，不由本站生成。</p>
        <div class="hero-links">
          <a href="https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset" target="_blank" rel="noopener noreferrer">
            查看数据源 <AppIcon name="external" :size="14" />
          </a>
          <a href="https://artificialanalysis.ai/leaderboards/models" target="_blank" rel="noopener noreferrer">
            看 Artificial Analysis 综合评测 <AppIcon name="external" :size="14" />
          </a>
        </div>
      </div>
      <div class="hero-symbol" aria-hidden="true"><span>01</span><AppIcon name="chart" :size="72" /></div>
    </header>

    <div class="leaderboard-toolbar surface">
      <div class="dimension-tabs" role="tablist" aria-label="模型评测维度">
        <button
          v-for="item in dimensions"
          :key="item.key"
          type="button"
          role="tab"
          :aria-selected="active === item.key"
          :class="{ active: active === item.key }"
          @click="active = item.key; keyword = ''"
        >{{ item.name }}</button>
      </div>
      <label class="model-search">
        <AppIcon name="search" :size="16" />
        <input v-model="keyword" type="search" maxlength="80" placeholder="搜索模型或厂商" aria-label="搜索模型或厂商" />
      </label>
    </div>

    <div class="board-meta">
      <div>
        <span class="eyebrow">{{ selected?.description }}</span>
        <h2>{{ selected?.name }}排行</h2>
      </div>
      <div class="board-dates" v-if="board?.sourceDate">
        <span :class="['freshness', board.status]">{{ board.status === 'stale' ? '最近一次成功数据' : '官方数据' }}</span>
        <span>发布日期 {{ board.sourceDate }}</span>
        <span>数据最多缓存 2 小时</span>
      </div>
    </div>

    <div v-if="loading" class="loading-board surface" role="status">正在读取官方榜单…</div>
    <div v-else-if="!board?.items?.length" class="empty-board surface">
      <AppIcon name="chart" :size="38" />
      <h3>这一维度暂时没有可用数据</h3>
      <p>本站暂时无法读取官方数据，稍后再试，也可以直接查看来源。</p>
      <a href="https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset" target="_blank" rel="noopener noreferrer">打开 Arena 数据集 <AppIcon name="external" :size="14" /></a>
    </div>
    <template v-else>
      <div class="top-three" aria-label="前三名">
        <article v-for="model in leaders" :key="model.name" class="podium-card surface" :class="`place-${model.rank}`">
          <div class="podium-top"><span>TOP {{ String(model.rank).padStart(2, '0') }}</span><span>{{ board.metric }}</span></div>
          <strong>{{ model.name }}</strong>
          <div class="podium-bottom"><span>{{ model.organization || '未知厂商' }}</span><b>{{ scoreLabel(model.score) }}</b></div>
        </article>
      </div>

      <div class="ranking-table surface">
        <div class="ranking-head"><span>排名</span><span>模型 / 厂商</span><span>开放情况</span><span>{{ board.metric }}</span></div>
        <div v-if="!visibleModels.length" class="no-match">没有找到匹配的模型</div>
        <div v-for="model in visibleModels" :key="`${active}-${model.rank}-${model.name}`" class="ranking-row">
          <span class="rank-number" :class="{ leading: model.rank <= 3 }">{{ String(model.rank).padStart(2, '0') }}</span>
          <div class="model-identity"><strong>{{ model.name }}</strong><small>{{ model.organization || '未知厂商' }}</small></div>
          <span class="license-pill">{{ model.license || '未标注' }}</span>
          <strong class="score-number">{{ scoreLabel(model.score) }}</strong>
        </div>
      </div>
      <p class="board-footnote">
        数据来源：<a :href="board.sourceUrl" target="_blank" rel="noopener noreferrer">Arena Leaderboard Dataset</a>（CC BY 4.0）。
        对话、建站、搜索、视觉为 Arena Score；Agent 为 IPS 分数。各榜单任务和计分方式不同，分数不可跨维度比较。
        本站仅整理展示，不代表 Arena 对本站的认可。
      </p>
    </template>
  </section>
</template>

<style scoped>
.leaderboard-page { max-width: 1320px; margin: 0 auto; padding: 28px 0 76px; }
.leaderboard-hero { min-height: 232px; display: flex; justify-content: space-between; align-items: center; overflow: hidden; padding: 36px 46px; border-radius: 26px; background: linear-gradient(112deg, rgba(255,255,255,.92), rgba(227,238,255,.78)); }
.hero-copy { position: relative; z-index: 1; }
.eyebrow { color: #3876ce; font-size: 11px; font-weight: 800; letter-spacing: .15em; }
h1 { font-size: 42px; letter-spacing: -.05em; line-height: 1.2; margin: 13px 0; }
.hero-dot { color: #0066ff; }
.hero-copy p { margin: 0; color: var(--muted); max-width: 610px; }
.hero-links { display: flex; gap: 24px; margin-top: 22px; }
.hero-links a, .empty-board a { color: #0066dd; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; font-weight: 650; }
.hero-links a:hover, .board-footnote a:hover { text-decoration: underline; }
.hero-symbol { width: 180px; height: 180px; border-radius: 42px; background: linear-gradient(145deg,#071a39,#2068d9); color: white; display: grid; place-items: center; transform: rotate(12deg) translate(8px,4px); box-shadow: 0 22px 45px rgba(0,69,171,.18); position: relative; }
.hero-symbol :deep(svg) { transform: rotate(-12deg); }
.hero-symbol span { position: absolute; top: 15px; left: 22px; font-size: 11px; opacity: .65; }
.leaderboard-toolbar { margin-top: 24px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; border-radius: 17px; }
.dimension-tabs { display: flex; gap: 4px; }
.dimension-tabs button { border: 0; background: transparent; color: var(--muted); padding: 10px 20px; border-radius: 10px; cursor: pointer; font-weight: 650; }
.dimension-tabs button:hover { color: var(--ink); background: rgba(0,102,255,.06); }
.dimension-tabs button.active { background: #091322; color: white; }
.model-search { display: flex; align-items: center; gap: 8px; width: 238px; padding: 9px 13px; background: rgba(255,255,255,.8); border: 1px solid var(--line); border-radius: 10px; color: var(--muted); }
.model-search input { border: 0; outline: 0; min-width: 0; width: 100%; background: transparent; color: var(--ink); }
.board-meta { display: flex; justify-content: space-between; align-items: end; gap: 20px; margin: 36px 2px 18px; }
.board-meta h2 { font-size: 27px; letter-spacing: -.04em; margin: 2px 0 0; }
.board-dates { display: flex; gap: 14px; align-items: center; color: var(--muted); font-size: 12px; }
.freshness { color: #16805d; font-weight: 700; }
.freshness.stale { color: #b26b20; }
.loading-board, .empty-board { padding: 66px 20px; text-align: center; border-radius: 18px; color: var(--muted); }
.empty-board h3 { color: var(--ink); margin: 10px 0 4px; }
.empty-board p { margin: 0 0 16px; }
.top-three { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 14px; }
.podium-card { padding: 21px 24px; min-height: 156px; border-radius: 18px; display: flex; flex-direction: column; justify-content: space-between; }
.place-1 { background: linear-gradient(125deg, rgba(255,250,234,.96), rgba(255,255,255,.88)); }
.podium-top, .podium-bottom { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.podium-top { color: #937122; font-weight: 750; font-size: 12px; letter-spacing: .08em; }
.place-2 .podium-top { color: #677b97; }.place-3 .podium-top { color: #a9693d; }
.podium-card > strong { font-size: 20px; line-height: 1.3; letter-spacing: -.02em; overflow-wrap: anywhere; }
.podium-bottom { color: var(--muted); font-size: 12px; }.podium-bottom b { color: var(--ink); font-size: 26px; font-variant-numeric: tabular-nums; }
.ranking-table { margin-top: 18px; border-radius: 18px; overflow: hidden; }
.ranking-head, .ranking-row { display: grid; grid-template-columns: 86px minmax(0, 1fr) 170px 160px; align-items: center; gap: 18px; padding: 15px 24px; }
.ranking-head { background: rgba(255,255,255,.58); color: var(--muted); font-size: 12px; font-weight: 700; }
.ranking-head span:last-child { text-align: right; }
.ranking-row { min-height: 72px; border-top: 1px solid var(--line); }
.ranking-row:hover { background: rgba(0,102,255,.035); }
.rank-number { color: #7b8798; font-size: 18px; font-weight: 800; font-variant-numeric: tabular-nums; }.rank-number.leading { color: #c08d25; }
.model-identity { display: flex; flex-direction: column; min-width: 0; line-height: 1.3; gap: 3px; }.model-identity strong { overflow-wrap: anywhere; }.model-identity small { color: var(--muted); }
.license-pill { color: var(--muted); font-size: 12px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.score-number { text-align: right; color: #075fd6; font-size: 19px; font-variant-numeric: tabular-nums; }
.no-match { padding: 44px; text-align: center; color: var(--muted); }
.board-footnote { color: var(--muted); font-size: 12px; line-height: 1.9; margin: 18px 4px; }
.board-footnote a { color: #0066dd; }
@media (max-width: 1200px) { .leaderboard-page { padding-left: 22px; padding-right: 22px; } }
</style>
