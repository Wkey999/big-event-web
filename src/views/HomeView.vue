<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
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
const grid = ref(null)
const columnCount = ref(3)
let resizeObserver
const categoryNames = computed(() => Object.fromEntries(categories.value.map(item => [item.id, item.categoryName])))
const activeCategory = computed(() => categoryNames.value[categoryId.value] || '全部发现')
const columns = computed(() => {
  const buckets = Array.from({ length: columnCount.value }, () => ({ height: 0, items: [] }))
  for (const item of items.value) {
    const bucket = buckets.reduce((lowest, current) => current.height < lowest.height ? current : lowest)
    bucket.items.push(item)
    bucket.height += (item.coverImg ? [150, 190, 135][Number(item.id) % 3] : 190) + 125
  }
  return buckets.map(bucket => bucket.items)
})
async function loadCategories() {
  categoryError.value = false
  try { categories.value = (await listCategories()).data }
  catch { categoryError.value = true }
}
function ask(question = aiQuestion.value) {
  router.push({ name: 'ask', query: question.trim() ? { q: question.trim() } : {} })
}
onMounted(() => {
  loadCategories()
  resizeObserver = new ResizeObserver(([entry]) => { columnCount.value = entry.contentRect.width >= 900 ? 4 : 3 })
  if (grid.value) resizeObserver.observe(grid.value)
})
onBeforeUnmount(() => resizeObserver?.disconnect())
</script>
<template>
  <div class="discovery-layout">
    <aside class="channel-rail">
      <span class="section-label">内容频道</span>
      <button :class="{ active: !categoryId }" @click="reset(mode, null)"><AppIcon name="compass" :size="18" />全部发现</button>
      <button v-for="(category, index) in categories" :key="category.id" :class="{ active: categoryId === category.id }" @click="reset(mode, category.id)"><AppIcon :name="['spark', 'code', 'grid', 'message'][index % 4]" :size="17" />{{ category.categoryName }}</button>
      <button v-if="categoryError" class="retry-channels" @click="loadCategories">重新加载频道</button>
      <button @click="router.push({ name: 'games' })"><AppIcon name="game" :size="18" />小游戏</button>
      <div class="rail-note">记录一点实践，<br>交换一点灵感。</div>
    </aside>
    <section class="discovery-content">
      <header class="discovery-heading"><span class="eyebrow">科技里的新想法，社区里的真实体验</span><h1>发现值得聊的内容<span>。</span></h1></header>
      <section class="ai-entry">
        <div class="ai-entry-label"><AppIcon name="spark" :size="17" /><strong>让 AI 帮你找到线索</strong><span>站内内容</span></div>
        <form @submit.prevent="ask()"><input v-model="aiQuestion" maxlength="200" aria-label="向 AI 提问" placeholder="找几篇适合入门的 Agent 开发实践"><button class="button button-primary" type="submit">问 AI<AppIcon name="external" :size="16" /></button></form>
      </section>
      <div class="feed-heading"><div class="feed-tabs" role="group" aria-label="信息流模式"><button :class="{ active: mode === 'recommend' }" :aria-pressed="mode === 'recommend'" @click="mode !== 'recommend' && reset('recommend')">为你推荐</button><button :class="{ active: mode === 'latest' }" :aria-pressed="mode === 'latest'" @click="mode !== 'latest' && reset('latest')">最新分享</button></div><span class="feed-context">{{ categoryId ? activeCategory : '从实践里发现灵感' }}</span></div>
      <div ref="grid" class="feed-grid">
        <template v-if="loading && !items.length"><div v-for="i in columnCount" :key="i" class="feed-column"><div class="feed-skeleton"><el-skeleton animated><template #template><el-skeleton-item variant="image" style="width:100%;height:200px" /><el-skeleton-item variant="h3" style="width:80%;margin:18px 12px 12px" /><el-skeleton-item variant="text" style="width:65%;margin:0 12px 18px" /></template></el-skeleton></div></div></template>
        <template v-else><div v-for="(column, index) in columns" :key="index" class="feed-column"><div v-for="article in column" :key="stateKey + ':' + article.id" :ref="el => registerCard(article.id, el)"><ArticleCard :article="article" :category-name="categoryNames[article.categoryId]" :mode="mode" /></div></div></template>
      </div>
      <ContentState v-if="error && !items.length" error title="内容暂时没有加载出来" description="检查连接后再试一次，你的内容还在这里。" @retry="loadMore" />
      <ContentState v-else-if="!loading && !items.length" title="这里还在等第一份分享" :description="categoryId ? '这个频道暂时没有已发布的内容，可以先看看其他频道。' : '把你的实践和想法写下来，成为社区的第一篇分享。'"><RouterLink class="button button-primary" :to="{ name: 'creator', query: { compose: '1' } }">写一篇内容<AppIcon name="pen" :size="16" /></RouterLink></ContentState>
      <div ref="sentinel" class="feed-bottom" aria-live="polite"><span v-if="loading && items.length">正在寻找更多内容…</span><button v-else-if="error && items.length" class="text-action" @click="loadMore"><AppIcon name="refresh" :size="16" />加载失败，点击重试</button><span v-else-if="finished && items.length">{{ mode === 'recommend' ? '本次推荐到这里，去「最新分享」继续发现。' : '已经看到这里的全部内容了。' }}</span></div>
    </section>
    <aside class="discovery-sidebar">
      <section class="community-note"><span class="section-label">在 BOOM 分享</span><h2>有用的内容，<br>真实的分享。</h2><p>记录一次开发，聊聊一个工具，或者分享你刚弄懂的问题。</p><RouterLink class="text-action" :to="{ name: 'creator', query: { compose: '1' } }">写下你的那份<AppIcon name="external" :size="15" /></RouterLink></section>
      <section class="explore-section"><h2>换个角度，继续发现</h2><button @click="ask('有哪些关于 AI Agent 的开发实践？')"><span class="prompt-hash">#</span><span>我的第一个 Agent<small>从一次工具调用开始</small></span></button><button @click="ask('推荐几篇关于开发工具的文章')"><span class="prompt-hash">#</span><span>真正留下的开发工具<small>看看使用之后的取舍</small></span></button><button @click="ask('帮我找几篇开源项目相关的文章')"><span class="prompt-hash">#</span><span>开源项目阅读笔记<small>看懂，然后试着改一点</small></span></button></section>
      <section class="reading-note"><AppIcon name="bookmark" :size="19" /><h3>读到有用的，记得收藏。</h3><p>在文章里留下一个赞，给认真分享的人一点回应。</p></section>
      <p class="sidebar-footer">BOOM · 大事件<br>发现灵感，也留下你的那份。</p>
    </aside>
  </div>
</template>
<style scoped>
.discovery-layout{display:grid;grid-template-columns:128px minmax(0,1fr) 205px;gap:27px;align-items:start}.channel-rail{position:sticky;top:116px;display:flex;flex-direction:column;gap:8px;padding-top:4px}.channel-rail>.section-label{padding-left:10px;margin-bottom:12px}.channel-rail button{display:flex;align-items:center;gap:9px;border:0;background:none;text-align:left;border-radius:8px;padding:11px 10px;color:var(--muted);font-size:13px}.channel-rail button:hover{background:#eef3e9}.channel-rail button.active{background:var(--soft);color:var(--brand);font-weight:600}.rail-note{margin:65px 0 0 10px;color:var(--muted);font-size:11px;line-height:1.9}.discovery-content{min-width:0}.discovery-heading{margin:0 0 21px}.discovery-heading h1{font-size:30px;font-weight:650;letter-spacing:-1px;line-height:1.4;margin:6px 0 0}.discovery-heading h1 span{color:var(--brand)}.ai-entry{background:var(--soft);border:1px solid #dfe9d7;border-radius:12px;padding:15px 17px}.ai-entry-label{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--brand)}.ai-entry-label strong{font-weight:600}.ai-entry-label>span{margin-left:auto;color:var(--muted);font-size:10px}.ai-entry form{display:flex;align-items:center;background:var(--paper);padding:7px;border-radius:8px;margin-top:10px;gap:8px}.ai-entry input{border:0;background:none;flex:1;min-width:0;padding:5px 7px;font-size:13px;color:var(--ink);outline-offset:3px}.ai-entry .button{padding:8px 12px;font-size:12px}.feed-heading{display:flex;align-items:center;justify-content:space-between;margin:26px 0 19px;gap:12px}.feed-tabs{display:flex;gap:23px}.feed-tabs button{border:0;background:none;padding:0;color:var(--muted);font-size:15px}.feed-tabs button.active{color:var(--ink);font-weight:650}.feed-context{font-size:11px;color:var(--muted)}.feed-grid{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:16px}.feed-column{display:flex;flex-direction:column;gap:17px;min-width:0}.feed-skeleton{overflow:hidden;border:1px solid var(--line);border-radius:12px;background:var(--paper)}.feed-bottom{display:flex;justify-content:center;min-height:54px;align-items:center;color:var(--muted);font-size:12px;margin-top:20px}.discovery-sidebar{padding-top:5px}.community-note{background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:20px}.community-note h2{font-size:23px;font-weight:500;line-height:1.5;letter-spacing:-.5px;margin:12px 0}.community-note p{font-size:12px;color:var(--muted);line-height:1.9;margin-bottom:21px}.community-note .text-action{font-size:12px}.explore-section{margin:29px 0}.explore-section h2{font-size:13px;font-weight:600;margin-bottom:12px}.explore-section button{display:flex;align-items:start;gap:8px;padding:12px 0;border:0;background:none;text-align:left;width:100%;font-size:12px}.prompt-hash{display:grid;place-items:center;background:var(--soft);color:var(--brand);width:23px;height:23px;border-radius:5px;flex-shrink:0}.explore-section small{display:block;font-size:10px;margin-top:3px;color:var(--muted)}.reading-note{background:#eeeee2;padding:18px 16px;border-radius:12px}.reading-note>svg{color:#798453}.reading-note h3{font-size:13px;font-weight:500;margin:10px 0 7px}.reading-note p{font-size:11px;color:var(--muted);line-height:1.8;margin:0}.sidebar-footer{font-size:10px;color:var(--muted);line-height:1.9;margin-top:23px}
</style>
