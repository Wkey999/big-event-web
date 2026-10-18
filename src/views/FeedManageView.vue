<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { listFeedSources, listFeedEntries, collectFeed, publishFeedEntry, rejectFeedEntry, translateFeedTitles } from '@/api/feeds'
import { listCategories } from '@/api/category'
import { formatTime } from '@/utils/format'
import { sourceLink } from '@/utils/sourceLink'
import AppIcon from '@/components/AppIcon.vue'
import ContentState from '@/components/ContentState.vue'
const sources = ref([]), entries = ref([]), categories = ref([]), total = ref(0), page = ref(1)
const status = ref(0), source = ref(''), loading = ref(false), error = ref(false), collecting = ref(''), acting = ref(null)
const selected = ref(null), categoryId = ref(null), translatedTitle = ref(''), translating = ref('')
let version = 0, disposed = false
async function loadSources() { const result = await listFeedSources(); if (!disposed) sources.value = result.data }
async function loadEntries() {
  const current = ++version
  loading.value = true; error.value = false
  try {
    const result = await listFeedEntries({ pageNum: page.value, status: status.value, source: source.value || undefined })
    if (current === version) { entries.value = result.data.items; total.value = result.data.total }
  } catch { if (current === version) error.value = true }
  finally { if (current === version) loading.value = false }
}
function filter() { page.value = 1; loadEntries() }
async function collect(key) {
  if (collecting.value || translating.value) return
  collecting.value = key
  try {
    const result = await collectFeed(key)
    const run = result.data
    if (run.success && run.scanned === 0) ElMessage.info(run.message)
    else if (run.success) ElMessage.success(`新增 ${run.inserted} 条，重复 ${run.duplicates} 条，过滤 ${run.filtered} 条`)
    else ElMessage.error(run.message)
    await Promise.allSettled([loadSources(), loadEntries()])
  } catch { /* request owns feedback */ }
  finally { collecting.value = '' }
}
async function translate(key) {
  if (translating.value || collecting.value) return
  translating.value = key
  try {
    const result = (await translateFeedTitles(key)).data
    if (result.success) ElMessage.success(`${result.message}，本次补译 ${result.translated} 条${result.pending ? `，还有 ${result.pending} 条待补译` : ''}`)
    else ElMessage.warning(result.message)
    await loadEntries()
  } catch { /* request owns feedback */ }
  finally { translating.value = '' }
}
function sourceInfo(entry) { return sources.value.find(item => item.key === entry?.sourceKey) }
function needsTranslation(entry) { return !!sourceInfo(entry)?.requiresTranslation }
function openPublish(entry) {
  selected.value = entry
  const recommended = sourceInfo(entry)?.categoryName
  categoryId.value = categories.value.find(item => item.categoryName === recommended)?.id || null
  translatedTitle.value = entry.translatedTitle || ''
}
async function publish() {
  if (!selected.value || !categoryId.value || acting.value) return
  acting.value = selected.value.id
  try { await publishFeedEntry(selected.value.id, categoryId.value, needsTranslation(selected.value) ? translatedTitle.value.trim() : undefined); selected.value = null; ElMessage.success('链接卡片已发布'); await loadEntries() }
  catch { /* request owns feedback */ }
  finally { acting.value = null }
}
async function reject(entry) {
  if (acting.value) return
  acting.value = entry.id
  try { await rejectFeedEntry(entry.id); ElMessage.success('已忽略，后续采集不会重复导入'); await loadEntries() }
  catch { /* request owns feedback */ }
  finally { acting.value = null }
}
onMounted(async () => {
  await Promise.allSettled([loadSources(), loadEntries(), listCategories().then(r => { if (!disposed) categories.value = r.data.filter(c => c.status === 1) })])
})
onBeforeUnmount(() => { disposed = true; version++ })
</script>
<template>
  <section class="workspace-page feed-admin">
    <header class="page-heading"><div><span class="eyebrow">CURATED FROM THE WEB</span><h1>资讯采集</h1><p>自动发现更新，审核后以链接卡片发布。原文留在来源网站。</p></div><button class="button button-secondary" @click="loadSources(); loadEntries()"><AppIcon name="refresh" :size="16" />刷新</button></header>
    <div class="feed-sources"><article v-for="item in sources" :key="item.key" class="surface source-card"><div class="source-top"><h2>{{ item.name }}</h2><span class="tag">{{ item.automaticEnabled ? '定时采集开启' : '手动采集' }}</span></div><p>{{ item.botNickname }} · {{ item.description }}</p><span class="source-channel">推荐频道 · {{ item.categoryName }}<span v-if="item.requiresTranslation"> · 中文译名</span></span><div class="source-last"><span v-if="item.lastRun">上次 {{ formatTime(item.lastRun.finishedAt) }}<br>{{ item.lastRun.success && item.lastRun.scanned > 0 ? `新增 ${item.lastRun.inserted} · 重复 ${item.lastRun.duplicates} · 过滤 ${item.lastRun.filtered}` : item.lastRun.message }}</span><span v-else>还没有采集记录</span></div><button class="button button-primary" :disabled="!!collecting || !!translating" @click="collect(item.key)"><AppIcon name="refresh" :size="15" />{{ collecting === item.key ? '正在采集…' : '立即采集' }}</button><button v-if="item.requiresTranslation" class="button button-secondary translate-button" :disabled="!!translating || !!collecting" @click="translate(item.key)">{{ translating === item.key ? '正在翻译…' : '补译标题' }}</button></article></div>
    <div class="feed-review surface"><div class="review-toolbar"><h2>采集内容</h2><el-select v-model="status" aria-label="审核状态" @change="filter"><el-option label="待审核" :value="0" /><el-option label="已发布" :value="1" /><el-option label="已忽略" :value="2" /></el-select><el-select v-model="source" placeholder="全部来源" aria-label="资讯来源" @change="filter"><el-option label="全部来源" value="" /><el-option v-for="item in sources" :key="item.key" :label="item.name" :value="item.key" /></el-select><span>{{ total }} 条</span></div>
      <ContentState v-if="error" error title="采集内容暂时无法读取" description="请检查后端连接和数据库迁移是否完成。" @retry="loadEntries" />
      <el-table v-else v-loading="loading" :data="entries" empty-text="这里还没有内容，可先点击上方「立即采集」"><el-table-column label="标题与来源" min-width="300"><template #default="{row}"><a class="entry-title" :href="sourceLink(row.sourceUrl)" target="_blank" rel="noopener noreferrer">{{ row.translatedTitle || row.title }}<AppIcon name="external" :size="14" /></a><p v-if="needsTranslation(row)" class="entry-original">{{ row.title }}<span v-if="!row.translatedTitle && row.status === 0" class="translation-pending"> · 待翻译，可补译或在审核时填写</span></p><p class="entry-source">{{ row.sourceName }} · {{ row.sourceAuthor || '来源未提供作者' }}</p></template></el-table-column><el-table-column label="原文发布时间" width="165"><template #default="{row}">{{ row.sourcePublishedAt ? formatTime(row.sourcePublishedAt) : '来源未提供' }}</template></el-table-column><el-table-column label="采集时间" width="165"><template #default="{row}">{{ formatTime(row.fetchedAt) }}</template></el-table-column><el-table-column label="操作" width="145"><template #default="{row}"><template v-if="row.status === 0"><el-button link type="primary" :disabled="!!acting" @click="openPublish(row)">审核发布</el-button><el-button link :disabled="!!acting" @click="reject(row)">忽略</el-button></template><RouterLink v-else-if="row.articleId" class="text-action" :to="{name:'read',params:{id:row.articleId}}">查看卡片</RouterLink><span v-else class="muted">已忽略</span></template></el-table-column></el-table>
      <el-pagination v-if="total > 10" class="feed-pagination" background layout="prev,pager,next,total" :total="total" :current-page="page" :page-size="10" @current-change="value => { page = value; loadEntries() }" />
    </div>
    <el-dialog :model-value="!!selected" title="审核发布链接卡片" width="510px" @close="selected = null"><template v-if="selected"><template v-if="needsTranslation(selected)"><label class="title-label" for="feed-translated-title">中文标题 · 可修改后发布</label><el-input id="feed-translated-title" v-model="translatedTitle" aria-label="中文标题" type="textarea" :rows="3" :maxlength="500" show-word-limit placeholder="中文译名暂未生成，可补译或手动填写" /><p class="entry-original">英文原题：{{ selected.title }}</p></template><h3 v-else class="publish-title">{{ selected.title }}</h3><p class="muted">发布后将显示来源与原文入口，不转载正文和配图。</p><el-select v-model="categoryId" placeholder="选择发布频道" aria-label="发布频道" style="width:100%"><el-option v-for="category in categories" :key="category.id" :label="category.categoryName" :value="category.id" /></el-select></template><template #footer><el-button :disabled="!!acting" @click="selected = null">取消</el-button><el-button type="primary" :loading="!!acting" :disabled="!categoryId || (needsTranslation(selected) && !translatedTitle.trim())" @click="publish">确认发布</el-button></template></el-dialog>
  </section>
</template>
<style scoped>
.feed-sources{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-bottom:25px}.source-card{padding:18px}.source-top{display:flex;gap:9px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap}.source-top h2{font-size:17px;margin:0}.source-card>p{font-size:12px;color:var(--muted);margin:12px 0}.source-last{font-size:11px;color:var(--muted);min-height:44px;margin:12px 0 8px;line-height:1.9}.source-card .button{font-size:12px;padding:8px 13px}.feed-review{padding:22px}.review-toolbar{display:flex;gap:14px;align-items:center;margin-bottom:20px}.review-toolbar h2{font-size:16px;margin:0 auto 0 0}.review-toolbar .el-select{width:155px}.review-toolbar>span{font-size:12px;color:var(--muted)}.entry-title{display:inline-flex;gap:5px;align-items:center;text-decoration:none;color:var(--ink);font-size:13px}.entry-title:hover{color:var(--brand)}.entry-source{margin:6px 0 0;font-size:11px;color:var(--muted)}.feed-pagination{justify-content:flex-end;margin-top:22px}.publish-title{font-size:16px;line-height:1.8}.feed-admin :deep(.el-table .cell){line-height:1.8}
.entry-original{font-size:11px;color:var(--muted);line-height:1.7;margin:5px 0 7px;overflow-wrap:anywhere}.translation-pending{color:#9a702e}.title-label{display:block;font-size:12px;margin-bottom:10px}.translate-button{margin-left:10px}.source-channel{font-size:10px;color:var(--brand)}.source-card .button{margin-top:4px}.source-card>p{min-height:36px;line-height:1.7;margin:9px 0}.source-top h2{font-size:16px}.source-top .tag{font-size:9px}</style>
