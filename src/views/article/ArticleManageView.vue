<script setup>
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'


import { addArticle, deleteArticle, getArticleForEdit, updateArticle } from '@/api/article'
import { listCategories } from '@/api/category'
import { uploadImage } from '@/api/user'
import { formatTime } from '@/utils/format'
import { useRoute, useRouter } from 'vue-router'
import { listMyArticles } from '@/api/article'
import { listAdminArticles, getAdminArticle, updateAdminArticle, deleteAdminArticle } from '@/api/admin'
import AppIcon from '@/components/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const adminView = computed(() => !!route.meta.admin)

// 写接口用数字，列表筛选用中文，两套值不能混
const STATE_TEXT = { 0: '草稿', 1: '已发布' }

const loading = ref(false)
const articles = ref([])
const total = ref(0)
let listVersion = 0
const categories = ref([])

// undefined 表示不筛选（axios 会自动丢掉 undefined 的查询参数，空字符串则会被发出去）
const query = reactive({
  pageNum: 1,
  pageSize: 10,
  categoryId: undefined,
  state: undefined,
})

const dialogVisible = ref(false)
const submitting = ref(false)
const coverUploading = ref(false)
const formRef = ref()
// null 表示新增，有值表示正在编辑该 id 的文章
const editingId = ref(null)
const form = reactive({
  title: '',
  content: '',
  coverImg: '',
  summary: '',
  categoryId: undefined,
  state: 0,
})

const dialogTitle = computed(() => (editingId.value ? '编辑内容' : '写一篇内容'))
// 编辑器头部的字数 / 阅读时长提示（按中文约 400 字/分钟估算）
const contentLength = computed(() =>
  (form.content || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').replace(/\s+/g, '').length,
)
const readMinutes = computed(() => Math.max(1, Math.ceil(contentLength.value / 400)))
function pickCategory(id) {
  form.categoryId = id
  formRef.value?.validateField('categoryId').catch(() => {})
}
const categoryNames = computed(() =>
  Object.fromEntries(categories.value.map((item) => [item.id, item.categoryName])),
)

const ArticleRichEditor = defineAsyncComponent(() => import('@/components/ArticleRichEditor.vue'))
onBeforeUnmount(() => { listVersion++ })

function validateContent(rule, value, callback) {
  // wangeditor 的空文档是 <p><br></p>，后端 @NotBlank 认为它非空，只能在前端剥掉标签再判
  const text = (value || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, '').trim()
  callback(text ? undefined : new Error('请输入文章正文'))
}

// 规则与后端 ArticleAddDTO / ArticleUpdateDTO 一致
const rules = {
  title: [
    { required: true, message: '请输入文章标题', trigger: 'blur' },
    { max: 50, message: '标题最长50个字符', trigger: 'blur' },
  ],
  content: [{ required: true, validator: validateContent, trigger: 'blur' }],
  summary: [{ max: 200, message: '摘要最长200个字符', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择文章分类', trigger: 'change' }],
  state: [{ required: true, message: '请选择文章状态', trigger: 'change' }],
}

async function loadArticles() {
  const current = ++listVersion
  loading.value = true
  try {
    const params = { ...query }
    if (adminView.value) params.state = query.state === '草稿' ? 0 : query.state === '已发布' ? 1 : undefined
    const res = await (adminView.value ? listAdminArticles(params) : listMyArticles(params))
    if (current !== listVersion) return
    total.value = res.data.total
    articles.value = res.data.items
  } catch {
    // 错误提示已由 axios 拦截器统一弹出
  } finally {
    if (current === listVersion) loading.value = false
  }
}

async function loadCategories() {
  try {
    const res = await listCategories()
    categories.value = res.data
  } catch {
    // 错误提示已由 axios 拦截器统一弹出
  }
}

function handleSearch() {
  query.pageNum = 1
  loadArticles()
}

function handleReset() {
  query.categoryId = undefined
  query.state = undefined
  query.pageNum = 1
  loadArticles()
}

function handlePageChange(page) {
  query.pageNum = page
  loadArticles()
}

// 每页条数变了要回到第 1 页，否则会停在一个超出范围的页码上
function handleSizeChange(size) {
  query.pageSize = size
  query.pageNum = 1
  loadArticles()
}

async function openDialog(id, row) {
  if (id) {
    let full
    try {
      // 列表已收窄列不返回正文，编辑前单独取全文（走 /article/edit：不增加浏览量）。
      // 拉取失败就直接不打开弹窗——否则表单里是空正文，保存会把原文覆盖成空
      full = (await (adminView.value ? getAdminArticle(id) : getArticleForEdit(id))).data
    } catch {
      // 错误提示已由 axios 拦截器统一弹出
      return
    }
    editingId.value = id
    Object.assign(form, {
      title: full.title ?? '',
      content: full.content ?? '',
      coverImg: full.coverImg ?? '',
      summary: full.summary ?? '',
      categoryId: full.categoryId ?? undefined,
      state: full.state ?? 1,
    })
  } else {
    editingId.value = null
    Object.assign(form, {
      title: '',
      content: '',
      coverImg: '',
      summary: '',
      categoryId: undefined,
      state: 0,
    })
  }
  dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

function beforeCoverUpload(file) {
  // 后端只认这几个后缀，先在本地拦一道省一次上传
  if (!/\.(jpe?g|png|gif|webp)$/i.test(file.name)) {
    ElMessage.error('只支持 jpg/png/gif/webp 格式的图片')
    return false
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error('图片不能超过 2MB')
    return false
  }
  return true
}

// 不用 el-upload 默认的 action 上传：那样带不上 Authorization 头，也解不开 Result 包装
async function customCoverUpload({ file }) {
  coverUploading.value = true
  try {
    const res = await uploadImage(file)
    form.coverImg = res.data
    ElMessage.success('封面上传成功')
  } catch {
    // 错误提示已由 axios 拦截器统一弹出
  } finally {
    coverUploading.value = false
  }
}

async function handleSubmit() {
  if (submitting.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    // form 的字段刚好对上两个 DTO；后端 UPDATE 是全字段覆盖，编辑时必须回传完整对象
    if (editingId.value) {
      if (adminView.value) await updateAdminArticle(editingId.value, { ...form })
      else await updateArticle({ id: editingId.value, ...form })
    } else {
      await addArticle({ ...form })
    }
    ElMessage.success(editingId.value ? '修改成功' : '新增成功')
    dialogVisible.value = false
    await loadArticles()
  } catch {
    // 错误提示已由 axios 拦截器统一弹出
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row) {
  const confirmed = await ElMessageBox.confirm(
    `确定删除文章「${row.title}」吗？`,
    '删除确认',
    { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
  ).catch(() => false)
  if (!confirmed) return
  try {
    await (adminView.value ? deleteAdminArticle(row.id) : deleteArticle(row.id))
    ElMessage.success('删除成功')
    // 删掉当前页最后一条时往前翻一页，否则会停在一个空页上
    if (articles.value.length === 1 && query.pageNum > 1) {
      query.pageNum -= 1
    }
    await loadArticles()
  } catch {
    // 错误提示已由 axios 拦截器统一弹出
  }
}

async function handleRouteAction() {
  if (route.query.edit) await openDialog(Number(route.query.edit))
  else if (route.query.compose === '1') openDialog(null)
  if (route.query.edit || route.query.compose) await router.replace({ name: route.name })
}
watch(() => [route.query.compose, route.query.edit], () => { if (route.query.compose || route.query.edit) handleRouteAction() })
onMounted(() => {
  loadCategories()
  loadArticles()
  handleRouteAction()
})
</script>

<template>
  <section class="workspace-page creator-workspace">
  <header class="page-heading creator-heading">
    <div>
      <span class="eyebrow">{{ adminView ? 'COMMUNITY MANAGEMENT · 内容治理' : 'CREATOR STUDIO · 创作中心' }}</span>
      <h1>{{ adminView ? '内容管理' : '我的创作' }}</h1>
      <p>{{ adminView ? '管理全站原创文章与资讯卡片，维护社区高质量阅读体验。' : '记录工程实践，分享前沿想法。每一篇内容都是一次新的开始。' }}</p>
    </div>
    <button class="button button-electric-cta" @click="openDialog(null)">
      <AppIcon name="pen" :size="16" />写一篇内容
    </button>
  </header>
  <div class="surface creator-card">
    <div class="toolbar">
      <div class="state-pills" role="tablist" aria-label="状态筛选">
        <button
          type="button"
          class="state-pill"
          :class="{ active: !query.state }"
          @click="query.state = undefined; handleSearch()"
        >全部</button>
        <button
          type="button"
          class="state-pill"
          :class="{ active: query.state === '已发布' }"
          @click="query.state = '已发布'; handleSearch()"
        >已发布</button>
        <button
          type="button"
          class="state-pill"
          :class="{ active: query.state === '草稿' }"
          @click="query.state = '草稿'; handleSearch()"
        >草稿箱</button>
      </div>
      <el-select
        v-model="query.categoryId"
        placeholder="全部频道"
        clearable
        class="filter-category"
        @change="handleSearch"
      >
        <el-option
          v-for="item in categories"
          :key="item.id"
          :label="item.categoryName"
          :value="item.id"
        />
      </el-select>
      <button type="button" class="toolbar-btn ghost" @click="handleReset">重置筛选</button>
      <span class="total">共 <strong>{{ total }}</strong> 篇内容</span>
    </div>

    <el-table
      v-loading="loading"
      :data="articles"
      empty-text="还没有创作内容，点击右上角「写一篇内容」开始你的第一篇分享"
    >
      <el-table-column label="视觉封面" width="118">
        <template #default="{ row }">
          <el-image
            v-if="row.coverImg"
            :src="row.coverImg"
            :preview-src-list="[row.coverImg]"
            preview-teleported
            fit="cover"
            class="cover"
          />
          <div v-else class="smart-cover-chip">
            <span>AUTO</span>
            <small>智能主图</small>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="内容标题" min-width="240" show-overflow-tooltip>
        <template #default="{ row }">
          <RouterLink
            v-if="row.state === 1"
            class="row-title-link"
            :to="{ name: 'read', params: { id: row.id } }"
          >{{ row.title }}</RouterLink>
          <span v-else class="row-title-draft" @click="openDialog(row.id, row)">{{ row.title }}</span>
        </template>
      </el-table-column>
      <el-table-column label="所属频道" width="130">
        <template #default="{ row }">
          <span class="channel-chip">{{ categoryNames[row.categoryId] || '未分类' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <span class="status-badge" :class="row.state === 1 ? 'is-live' : 'is-draft'">
            <i class="status-dot" />{{ STATE_TEXT[row.state] }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="viewCount" label="阅读量" width="95">
        <template #default="{ row }">
          <span class="views-num">{{ row.viewCount ?? 0 }}</span>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="175">
        <template #default="{ row }">
          <span class="time-cell">{{ formatTime(row.createTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <RouterLink v-if="row.sourceUrl" class="text-action" :to="{name:'read',params:{id:row.id}}">查看来源</RouterLink>
          <el-button v-else link type="primary" @click="openDialog(row.id, row)">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="pager"
      background
      layout="total, sizes, prev, pager, next, jumper"
      :total="total"
      :current-page="query.pageNum"
      :page-size="query.pageSize"
      :page-sizes="[5, 10, 20]"
      @current-change="handlePageChange"
      @size-change="handleSizeChange"
    />

    <el-dialog
      v-model="dialogVisible"
      width="1120px"
      top="4vh"
      class="composer-dialog"
      modal-class="composer-overlay"
      :show-close="false"
      :close-on-click-modal="false"
      append-to-body
    >
      <template #header>
        <div class="composer-head">
          <div class="composer-head-left">
            <span class="composer-dot" :class="{ live: form.state === 1 }" />
            <div>
              <span class="composer-kicker">{{ editingId ? 'EDITING' : 'NEW STORY' }}</span>
              <h2>{{ dialogTitle }}</h2>
            </div>
          </div>
          <div class="composer-head-right">
            <span class="composer-meta">{{ contentLength }} 字 · 约 {{ readMinutes }} 分钟读完</span>
            <button type="button" class="composer-close" aria-label="关闭" @click="dialogVisible = false">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" class="composer-form" @submit.prevent @keydown.ctrl.enter="handleSubmit" @keydown.meta.enter="handleSubmit">
        <div class="composer-grid">
          <!-- 左：写作区 -->
          <main class="composer-main">
            <el-form-item prop="title" class="title-item">
              <el-input
                v-model="form.title"
                maxlength="50"
                show-word-limit
                placeholder="给你的内容起个好标题…"
                class="title-input"
              />
            </el-form-item>
            <el-form-item prop="summary" class="summary-item">
              <el-input
                v-model="form.summary"
                type="textarea"
                :autosize="{ minRows: 1, maxRows: 3 }"
                maxlength="200"
                show-word-limit
                placeholder="一句话导语（选填，展示在信息流卡片上）"
                class="summary-input"
              />
            </el-form-item>
            <el-form-item prop="content" class="content-item">
              <ArticleRichEditor v-if="dialogVisible" v-model="form.content" height="44vh" class="composer-editor" />
            </el-form-item>
          </main>

          <!-- 右：发布设置 -->
          <aside class="composer-side">
            <section class="side-block">
              <h3>封面</h3>
              <el-upload
                class="cover-drop"
                :show-file-list="false"
                :before-upload="beforeCoverUpload"
                :http-request="customCoverUpload"
                accept="image/*"
                drag
              >
                <div v-if="form.coverImg" class="cover-preview">
                  <img :src="form.coverImg" alt="封面预览" />
                  <div class="cover-mask">点击或拖拽更换</div>
                </div>
                <div v-else v-loading="coverUploading" class="cover-empty">
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="9" cy="9" r="1.8" /><path d="M21 15l-5-5L5 21" /></svg>
                  <strong>上传封面</strong>
                  <span>拖拽或点击 · JPG / PNG / GIF / WEBP · ≤ 2MB</span>
                </div>
              </el-upload>
              <button v-if="form.coverImg" type="button" class="side-link danger" @click="form.coverImg = ''">移除封面</button>
              <p v-else class="side-hint">不上传也没关系，系统会自动生成主题视觉主图。</p>
            </section>

            <section class="side-block">
              <h3>频道 <em>*</em></h3>
              <el-form-item prop="categoryId" class="chip-item">
                <div class="chip-group" role="radiogroup" aria-label="选择频道">
                  <button
                    v-for="item in categories"
                    :key="item.id"
                    type="button"
                    role="radio"
                    :aria-checked="form.categoryId === item.id"
                    class="chip"
                    :class="{ active: form.categoryId === item.id }"
                    @click="pickCategory(item.id)"
                  >{{ item.categoryName }}</button>
                  <span v-if="!categories.length" class="side-hint">暂无可用频道</span>
                </div>
              </el-form-item>
            </section>

            <section class="side-block">
              <h3>可见性</h3>
              <el-form-item prop="state" class="chip-item">
                <div class="segmented" role="radiogroup" aria-label="发布状态">
                  <button type="button" role="radio" :aria-checked="form.state === 0" :class="{ active: form.state === 0 }" @click="form.state = 0">
                    <span class="seg-dot" />草稿
                  </button>
                  <button type="button" role="radio" :aria-checked="form.state === 1" :class="{ active: form.state === 1 }" @click="form.state = 1">
                    <span class="seg-dot live" />公开发布
                  </button>
                </div>
              </el-form-item>
              <p class="side-hint">{{ form.state === 1 ? '发布后将出现在社区首页与频道信息流。' : '草稿仅自己可见，可随时继续编辑。' }}</p>
            </section>
          </aside>
        </div>
      </el-form>

      <template #footer>
        <div class="composer-foot">
          <span class="foot-tip"><kbd>Ctrl</kbd> + <kbd>Enter</kbd> 快速{{ form.state === 0 ? '保存' : '发布' }}</span>
          <div class="foot-actions">
            <button type="button" class="btn-ghost" @click="dialogVisible = false">取消</button>
            <button type="button" class="btn-solid" :class="{ live: form.state === 1 }" :disabled="submitting" @click="handleSubmit">
              <span v-if="submitting" class="btn-spinner" />
              {{ form.state === 0 ? '保存草稿' : '发布内容' }}
            </button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
  </section>
</template>

<style scoped>
.creator-card {
  padding: 22px 24px;
  border-radius: 22px;
}

.button-electric-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  border-radius: 999px;
  border: 0;
  background: linear-gradient(135deg, #0a0d14 0%, #1e293b 100%);
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 10px 24px -8px rgba(10, 13, 20, 0.35);
  transition: all 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}

.button-electric-cta:hover {
  background: linear-gradient(135deg, #0066ff 0%, #0052cc 100%);
  transform: translateY(-1px);
  box-shadow: 0 12px 26px -8px rgba(0, 102, 255, 0.45);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.state-pills {
  display: inline-flex;
  padding: 4px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.05);
  border: 1px solid rgba(15, 23, 42, 0.06);
}

.state-pill {
  padding: 6px 15px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.state-pill.active {
  background: #ffffff;
  color: var(--ink);
  box-shadow: 0 2px 8px rgba(10, 13, 20, 0.08);
}

.toolbar-btn.ghost {
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  background: rgba(255, 255, 255, 0.8);
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.toolbar-btn.ghost:hover {
  border-color: var(--brand);
  color: var(--brand);
}

/* 玻璃卡内的表格强制纯白：backdrop-filter 祖先 + sticky 表头/固定列在 Safari 有已知冲突，透底会花 */
:deep(.el-table) {
  --el-table-bg-color: #ffffff;
  --el-table-tr-bg-color: #ffffff;
  --el-table-header-bg-color: #f8fafc;
  --el-table-row-hover-bg-color: rgba(0, 102, 255, 0.035);
  --el-table-border-color: rgba(15, 23, 42, 0.06);
  background: #ffffff;
  border-radius: 14px;
  overflow: hidden;
}

.filter-category {
  width: 165px;
}

.total {
  margin-left: auto;
  font-size: 13px;
  color: var(--muted);
}

.total strong {
  color: var(--ink);
  font-weight: 700;
}

.pager {
  margin-top: 20px;
  justify-content: flex-end;
}

.cover {
  width: 84px;
  height: 50px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(10, 13, 20, 0.08);
}

.smart-cover-chip {
  width: 84px;
  height: 50px;
  border-radius: 8px;
  background: linear-gradient(135deg, #0a0d14 0%, #1e293b 58%, #0052cc 100%);
  color: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1.15;
}

.smart-cover-chip span {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #60a5fa;
}

.smart-cover-chip small {
  font-size: 10px;
  font-weight: 600;
  opacity: 0.92;
}

.row-title-link {
  color: var(--ink);
  font-weight: 600;
  text-decoration: none;
  transition: color 0.16s ease;
}

.row-title-link:hover {
  color: var(--brand);
}

.row-title-draft {
  color: var(--ink);
  font-weight: 600;
  cursor: pointer;
}

.row-title-draft:hover {
  color: var(--brand);
}

.channel-chip {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(15, 23, 42, 0.05);
  color: #334155;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.status-badge.is-live {
  background: rgba(0, 102, 255, 0.09);
  color: #0052cc;
}

.status-badge.is-draft {
  background: rgba(15, 23, 42, 0.06);
  color: #64748b;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.views-num {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: #334155;
}

.time-cell {
  font-size: 12px;
  color: var(--muted);
}

</style>

<!-- 弹窗 append-to-body 到 body 下，scoped 样式够不到，统一用 .composer-dialog 前缀做全局作用域 -->
<style>
.composer-overlay {
  background: rgba(10, 13, 20, 0.42);
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
}

.composer-dialog.el-dialog {
  --c-ink: #0a0d14;
  --c-muted: #64748b;
  --c-line: rgba(15, 23, 42, 0.08);
  --c-brand: #0066ff;
  max-width: calc(100vw - 32px);
  padding: 0;
  border-radius: 24px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(22px) saturate(185%);
  -webkit-backdrop-filter: blur(22px) saturate(185%);
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow: 0 40px 90px -30px rgba(10, 13, 20, 0.45), 0 0 0 1px rgba(15, 23, 42, 0.04);
  animation: composer-in 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes composer-in {
  from { opacity: 0; transform: translateY(14px) scale(0.985); }
  to { opacity: 1; transform: none; }
}

.composer-dialog .el-dialog__header {
  padding: 0;
  margin: 0;
}

.composer-dialog .el-dialog__body {
  padding: 0;
}

.composer-dialog .el-dialog__footer {
  padding: 0;
}

/* ---------- 头部 ---------- */
.composer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--c-line);
}

.composer-head-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.composer-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #cbd5e1;
  box-shadow: 0 0 0 4px rgba(148, 163, 184, 0.18);
  transition: all 0.25s ease;
}

.composer-dot.live {
  background: var(--c-brand);
  box-shadow: 0 0 0 4px rgba(0, 102, 255, 0.18);
}

.composer-kicker {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--c-muted);
}

.composer-head h2 {
  margin: 1px 0 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--c-ink);
}

.composer-head-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.composer-meta {
  font-size: 12px;
  color: var(--c-muted);
  font-variant-numeric: tabular-nums;
}

.composer-close {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.05);
  color: var(--c-muted);
  cursor: pointer;
  transition: all 0.18s ease;
}

.composer-close:hover {
  background: var(--c-ink);
  color: #fff;
  transform: rotate(90deg);
}

/* ---------- 主体布局 ---------- */
.composer-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  min-height: 0;
}

.composer-main {
  padding: 22px 28px 8px;
  min-width: 0;
}

.composer-side {
  padding: 22px 22px 8px;
  border-left: 1px solid var(--c-line);
  background: linear-gradient(180deg, rgba(242, 244, 248, 0.7), rgba(242, 244, 248, 0.35));
  display: flex;
  flex-direction: column;
  gap: 22px;
  max-height: 72vh;
  overflow-y: auto;
}

.composer-form .el-form-item {
  margin-bottom: 14px;
}

.composer-form .el-form-item__error {
  padding-top: 4px;
  font-size: 12px;
}

/* 标题：无边框大字号 */
.title-input .el-input__wrapper {
  padding: 0 2px;
  background: transparent;
  box-shadow: none !important;
}

.title-input .el-input__inner {
  height: 52px;
  font-size: 28px;
  font-weight: 750;
  letter-spacing: -0.01em;
  color: var(--c-ink);
}

.title-input .el-input__inner::placeholder {
  color: #c4cad4;
  font-weight: 700;
}

.title-input .el-input__count .el-input__count-inner {
  background: transparent;
  font-size: 12px;
  color: #94a3b8;
}

.title-item.is-error .title-input .el-input__inner {
  caret-color: #ef4444;
}

.title-item {
  border-bottom: 1px solid var(--c-line);
  padding-bottom: 6px;
}

.title-item.is-error {
  border-bottom-color: rgba(239, 68, 68, 0.5);
}

/* 导语 */
.summary-input .el-textarea__inner {
  padding: 4px 2px;
  border: 0;
  box-shadow: none !important;
  background: transparent;
  resize: none;
  font-size: 15px;
  line-height: 1.7;
  color: #334155;
}

.summary-input .el-textarea__inner::placeholder {
  color: #a3acb9;
}

.summary-input .el-input__count {
  background: transparent;
  color: #94a3b8;
}

/* 编辑器 */
.content-item .el-form-item__content {
  display: block;
}

.composer-editor.editor {
  border: 1px solid var(--c-line);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
}

.composer-editor.editor:focus-within {
  border-color: rgba(0, 102, 255, 0.45);
  box-shadow: 0 0 0 4px rgba(0, 102, 255, 0.08);
}

.composer-editor .w-e-toolbar {
  padding: 4px 8px;
  background: rgba(248, 250, 252, 0.9);
  border-bottom: 1px solid var(--c-line);
}

.composer-editor .w-e-bar-item button {
  border-radius: 8px;
}

.composer-editor .w-e-bar-item button:hover {
  background: rgba(0, 102, 255, 0.08);
}

.composer-editor .w-e-text-container [data-slate-editor] {
  padding: 4px 18px;
  font-size: 15px;
  line-height: 1.85;
  color: #1e293b;
}

.composer-editor .w-e-text-placeholder {
  left: 18px;
  font-style: normal;
  color: #a3acb9;
}

.content-item.is-error .composer-editor.editor {
  border-color: rgba(239, 68, 68, 0.5);
}

/* ---------- 侧栏 ---------- */
.side-block h3 {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--c-ink);
}

.side-block h3 em {
  font-style: normal;
  color: #ef4444;
}

.side-hint {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--c-muted);
}

.side-link {
  margin-top: 8px;
  padding: 0;
  border: 0;
  background: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.side-link.danger {
  color: #ef4444;
}

/* 封面拖拽区 */
.cover-drop,
.cover-drop .el-upload {
  display: block;
  width: 100%;
}

.cover-drop .el-upload-dragger {
  padding: 0;
  border: 1.5px dashed rgba(15, 23, 42, 0.14);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.8);
  overflow: hidden;
  transition: all 0.2s ease;
}

.cover-drop .el-upload-dragger:hover,
.cover-drop .el-upload-dragger.is-dragover {
  border-color: var(--c-brand);
  background: rgba(0, 102, 255, 0.04);
}

.cover-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  aspect-ratio: 16 / 9;
  justify-content: center;
  color: #94a3b8;
}

.cover-empty strong {
  font-size: 13px;
  color: var(--c-ink);
}

.cover-empty span {
  font-size: 11px;
}

.cover-preview {
  position: relative;
  aspect-ratio: 16 / 9;
}

.cover-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-mask {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(10, 13, 20, 0.45);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.cover-preview:hover .cover-mask {
  opacity: 1;
}

/* 频道 chip */
.chip-item {
  margin-bottom: 0 !important;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  padding: 7px 14px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 999px;
  background: #fff;
  color: #334155;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition: all 0.18s ease;
}

.chip:hover {
  border-color: var(--c-brand);
  color: var(--c-brand);
}

.chip.active {
  background: var(--c-ink);
  border-color: var(--c-ink);
  color: #fff;
  box-shadow: 0 6px 14px -6px rgba(10, 13, 20, 0.45);
}

/* 草稿 / 发布 分段控件 */
.segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 100%;
  padding: 4px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.06);
}

.segmented button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--c-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.segmented button.active {
  background: #fff;
  color: var(--c-ink);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.1);
}

.seg-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #94a3b8;
}

.seg-dot.live {
  background: var(--c-brand);
}

/* ---------- 底栏 ---------- */
.composer-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 24px;
  border-top: 1px solid var(--c-line);
  background: rgba(255, 255, 255, 0.7);
}

.foot-tip {
  font-size: 12px;
  color: var(--c-muted);
}

.foot-tip kbd {
  display: inline-block;
  padding: 1px 6px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-bottom-width: 2px;
  border-radius: 6px;
  background: #fff;
  font-family: inherit;
  font-size: 11px;
  color: var(--c-ink);
}

.foot-actions {
  display: flex;
  gap: 10px;
}

.btn-ghost,
.btn-solid {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 20px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.btn-ghost {
  border: 1px solid rgba(15, 23, 42, 0.1);
  background: #fff;
  color: #334155;
}

.btn-ghost:hover {
  border-color: rgba(15, 23, 42, 0.25);
  color: var(--c-ink);
}

.btn-solid {
  border: 0;
  background: var(--c-ink);
  color: #fff;
  box-shadow: 0 8px 20px -8px rgba(10, 13, 20, 0.5);
}

.btn-solid.live {
  background: linear-gradient(135deg, #0066ff, #0052cc);
  box-shadow: 0 10px 24px -8px rgba(0, 102, 255, 0.55);
}

.btn-solid:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn-solid:disabled {
  opacity: 0.6;
  cursor: progress;
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: composer-spin 0.7s linear infinite;
}

@keyframes composer-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 900px) {
  .composer-grid {
    grid-template-columns: 1fr;
  }

  .composer-side {
    border-left: 0;
    border-top: 1px solid var(--c-line);
    max-height: none;
  }

  .composer-meta,
  .foot-tip {
    display: none;
  }
}
</style>
