<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listCategories } from '@/api/category'
import ArticleCard from '@/components/ArticleCard.vue'
import AppIcon from '@/components/AppIcon.vue'
import ContentState from '@/components/ContentState.vue'
import { useFeed } from '@/composables/useFeed'
const router = useRouter()
const { items, total, mode, categoryId, loading, error, finished, sentinel, stateKey, registerCard, loadMore, reset } = useFeed()
const categories = ref([])
const categoryError = ref(false)
const aiQuestion = ref('')
const categoryNames = computed(() => Object.fromEntries(categories.value.map(item => [item.id, item.categoryName])))
const activeCategory = computed(() => categoryNames.value[categoryId.value] || '全部发现')
const heading = computed(() => (categoryId.value ? activeCategory.value : '全部发现'))
async function loadCategories() {
  categoryError.value = false
  try { categories.value = (await listCategories()).data }
  catch { categoryError.value = true }
}
function ask(question = aiQuestion.value) {
  router.push({ name: 'ask', query: question.trim() ? { q: question.trim() } : {} })
}
onMounted(loadCategories)
</script>
<template>
  <div class="discovery">
    <aside class="channel-rail" aria-label="内容频道">
      <p class="rail-title">频道</p>
      <button :class="{ active: !categoryId }" :aria-pressed="!categoryId" @click="reset(mode, null)">全部发现</button>
      <button v-for="category in categories" :key="category.id" :class="{ active: categoryId === category.id }" :aria-pressed="categoryId === category.id" @click="reset(mode, category.id)">{{ category.categoryName }}</button>
      <button v-if="categoryError" class="rail-retry" @click="loadCategories"><AppIcon name="refresh" :size="14" />重新加载频道</button>
    </aside>

    <section class="feed">
      <header class="feed-head">
        <div class="feed-title">
          <h1>{{ heading }}</h1>
          <p class="feed-count">{{ total }} 篇<template v-if="categoryId"> · 该频道已发布内容</template></p>
        </div>
        <div class="feed-tabs" role="group" aria-label="信息流模式">
          <button :class="{ active: mode === 'recommend' }" :aria-pressed="mode === 'recommend'" @click="mode !== 'recommend' && reset('recommend')">为你推荐</button>
          <button :class="{ active: mode === 'latest' }" :aria-pressed="mode === 'latest'" @click="mode !== 'latest' && reset('latest')">最新分享</button>
        </div>
      </header>

      <div class="feed-list">
        <template v-if="loading && !items.length">
          <div v-for="i in 4" :key="i" class="skeleton-row" :class="{ 'skeleton-row--hero': i === 1 }">
            <el-skeleton animated><template #template><div class="skeleton-line"><el-skeleton-item variant="image" style="width:232px;height:146px;border-radius:10px" /><div style="flex:1"><el-skeleton-item variant="h3" style="width:64%" /><el-skeleton-item variant="text" style="width:88%;margin-top:12px" /><el-skeleton-item variant="text" style="width:42%;margin-top:8px" /></div></div></template></el-skeleton>
          </div>
        </template>
        <template v-else>
          <div v-for="(article, index) in items" :key="stateKey + ':' + article.id" :ref="el => registerCard(article.id, el)" class="cell" :class="{ 'cell--hero': index === 0 }">
            <ArticleCard :article="article" :category-name="categoryNames[article.categoryId]" :show-category="!categoryId" :mode="mode" :variant="index === 0 ? 'hero' : 'row'" />
          </div>
        </template>
      </div>

      <ContentState v-if="error && !items.length" error title="内容暂时没有加载出来" description="检查网络后再试一次。" @retry="loadMore" />
      <ContentState v-else-if="!loading && !items.length" title="这个频道还没有内容" :description="categoryId ? '换个频道看看，或者成为第一个分享的人。' : '写下你的第一次实践，成为社区的第一篇分享。'"><RouterLink class="button button-primary" :to="{ name: 'creator', query: { compose: '1' } }">写一篇内容<AppIcon name="pen" :size="16" /></RouterLink></ContentState>

      <div ref="sentinel" class="feed-bottom" aria-live="polite">
        <span v-if="loading && items.length">正在加载更多…</span>
        <button v-else-if="error && items.length" class="text-action" @click="loadMore"><AppIcon name="refresh" :size="15" />加载失败，点击重试</button>
        <span v-else-if="finished && items.length">{{ mode === 'recommend' ? '推荐就先到这里，切到「最新分享」看更新的内容。' : '已经看到这里的全部内容了。' }}</span>
      </div>
    </section>

    <aside class="side-rail" aria-label="辅助信息">
      <section class="side-card side-ai">
        <p class="side-label"><AppIcon name="spark" :size="14" />AI 检索</p>
        <h2>问一句，让 AI 从站内找线索</h2>
        <form @submit.prevent="ask()">
          <input v-model="aiQuestion" maxlength="200" aria-label="向 AI 提问" placeholder="例如：适合入门的 Agent 实践">
          <button class="button button-primary" type="submit">问 AI<AppIcon name="arrow" :size="15" /></button>
        </form>
        <p class="side-note">只检索站内已发布内容，回答会附上引用来源。</p>
      </section>

      <section class="side-card">
        <h2 class="side-heading">写一点自己的</h2>
        <p class="side-text">一次踩坑、一个工具、一段刚弄懂的逻辑，都值得留下来。</p>
        <RouterLink class="text-action" :to="{ name: 'creator', query: { compose: '1' } }">开始创作<AppIcon name="pen" :size="15" /></RouterLink>
      </section>

      <section class="side-card side-plain">
        <h2 class="side-heading">关于来源</h2>
        <p class="side-text">聚合资讯保留原始标题、来源与原文链接，不冒充站内原创。</p>
      </section>
    </aside>
  </div>
</template>
<style scoped>
.discovery{display:grid;grid-template-columns:168px minmax(0,1fr) 268px;gap:32px;align-items:start}

/* 左侧频道索引 */
.channel-rail{position:sticky;top:100px;display:flex;flex-direction:column;gap:2px}
.rail-title{margin:0 0 10px;padding-left:12px;font-size:11px;letter-spacing:.1em;color:var(--muted)}
.channel-rail button{position:relative;display:flex;align-items:center;gap:8px;border:0;background:none;text-align:left;border-radius:8px;padding:9px 12px;color:var(--text);font-size:13.5px;transition:background .14s ease,color .14s ease}
.channel-rail button:hover{background:rgba(37,91,70,.05)}
.channel-rail button.active{color:var(--brand);font-weight:600;background:var(--brand-soft)}
.channel-rail button.active::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:2px;height:16px;border-radius:2px;background:var(--brand)}
.rail-retry{color:var(--muted);font-size:12.5px}

/* 中间正文：一张纸，一条栏目线，没有卡片堆叠 */
.feed{min-width:0;background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:26px 34px 10px}
.feed-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;padding-bottom:16px;border-bottom:1px solid var(--line)}
.feed-title h1{margin:0;font-size:24px;line-height:1.3;font-weight:650;letter-spacing:-.02em}
.feed-count{margin:5px 0 0;font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}
.feed-tabs{display:flex;gap:2px;padding:3px;background:var(--soft);border-radius:var(--radius-sm)}
.feed-tabs button{border:0;background:none;padding:6px 14px;border-radius:8px;font-size:13px;color:var(--muted);transition:background .14s ease,color .14s ease}
.feed-tabs button:hover{color:var(--text)}
.feed-tabs button.active{background:var(--paper);color:var(--ink);font-weight:600;box-shadow:0 1px 2px rgba(23,30,26,.08)}

.feed-list{display:block}
.skeleton-row{padding:20px 0;border-bottom:1px solid var(--line)}
.skeleton-line{display:flex;gap:22px;align-items:flex-start}
.feed-bottom{display:flex;justify-content:center;padding:22px 0 12px;font-size:12.5px;color:var(--muted);min-height:52px}

/* 右侧辅助栏 */
.side-rail{position:sticky;top:100px;display:flex;flex-direction:column;gap:14px}
.side-card{background:var(--paper);border:1px solid var(--line);border-radius:var(--radius);padding:18px}
.side-label{display:flex;align-items:center;gap:6px;margin:0 0 10px;font-size:11px;letter-spacing:.08em;color:var(--brand)}
.side-ai h2{margin:0 0 12px;font-size:15px;line-height:1.6;font-weight:600}
.side-ai form{display:flex;flex-direction:column;gap:8px}
.side-ai input{width:100%;border:1px solid var(--line);border-radius:9px;padding:9px 10px;font-size:12.5px;color:var(--ink);background:#fbfcfa;outline:none}
.side-ai input:focus{border-color:#b9c7bd;box-shadow:0 0 0 3px rgba(37,91,70,.08)}
.side-ai .button{justify-content:center;font-size:12.5px;padding:8px 12px;background:var(--brand-soft);color:var(--brand-dark);border-color:transparent}
.side-ai .button:hover{background:#dde9e1}
.side-note{margin:10px 0 0;font-size:11px;line-height:1.7;color:var(--muted)}
.side-heading{margin:0 0 8px;font-size:14px;font-weight:600}
.side-text{margin:0 0 12px;font-size:12.5px;line-height:1.8;color:var(--muted)}
.side-plain{background:transparent;border-style:dashed}

@media (max-width: 1360px){
  .discovery{grid-template-columns:148px minmax(0,1fr) 244px;gap:24px}
  .feed{padding:24px 26px 8px}
}
</style>
