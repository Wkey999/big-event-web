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
  state: 1,
})

const dialogTitle = computed(() => (editingId.value ? '编辑内容' : '发布内容'))
const contentLength = computed(() =>
  (form.content || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').replace(/\s+/g, '').length,
)

function pickCategory(id) {
  form.categoryId = id
  formRef.value?.validateField('categoryId').catch(() => {})
}

const categoryNames = computed(() =>
  Object.fromEntries(categories.value.map((item) => [item.id, item.categoryName])),
)

const ArticleRichEditor = defineAsyncComponent(() => import('@/components/ArticleRichEditor.vue'))
onBeforeUnmount(() => {
  listVersion++
})

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
  categoryId: [{ required: true, message: '请选择所属频道', trigger: 'change' }],
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

async function openDialog(id) {
  if (id) {
    let full
    try {
      full = (await (adminView.value ? getAdminArticle(id) : getArticleForEdit(id))).data
    } catch {
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
      categoryId: categories.value[0]?.id ?? undefined,
      state: 1,
    })
  }
  dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

function beforeCoverUpload(file) {
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

async function customCoverUpload({ file }) {
  coverUploading.value = true
  try {
    const res = await uploadImage(file)
    form.coverImg = res.data
    ElMessage.success('封面已上传')
  } catch {
    // 错误提示已由 axios 拦截器统一弹出
  } finally {
    coverUploading.value = false
  }
}

async function handleSubmit(targetState = 1) {
  if (submitting.value) return
  form.state = targetState
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    const payload = { ...form, state: targetState }
    if (editingId.value) {
      if (adminView.value) await updateAdminArticle(editingId.value, payload)
      else await updateArticle({ id: editingId.value, ...payload })
    } else {
      await addArticle(payload)
    }
    ElMessage.success(targetState === 0 ? '已存入草稿箱' : editingId.value ? '修改已发布' : '发布成功')
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
watch(
  () => [route.query.compose, route.query.edit],
  () => {
    if (route.query.compose || route.query.edit) handleRouteAction()
  },
)
onMounted(async () => {
  await loadCategories()
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
            <RouterLink v-if="row.sourceUrl" class="text-action" :to="{ name: 'read', params: { id: row.id } }">查看来源</RouterLink>
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

      <!-- 极简沉浸式单栏发布弹窗 -->
      <el-dialog
        v-model="dialogVisible"
        width="820px"
        top="5vh"
        class="composer-dialog"
        modal-class="composer-overlay"
        :show-close="false"
        :close-on-click-modal="false"
        append-to-body
      >
        <template #header>
          <div class="composer-head">
            <h2>{{ dialogTitle }}</h2>
            <div class="composer-head-right">
              <span v-if="contentLength > 0" class="composer-meta">{{ contentLength }} 字</span>
              <button type="button" class="composer-close" aria-label="关闭" @click="dialogVisible = false">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
          </div>
        </template>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          class="composer-form"
          @submit.prevent
          @keydown.ctrl.enter="handleSubmit(1)"
          @keydown.meta.enter="handleSubmit(1)"
        >
          <div class="composer-body">
            <!-- 1. 标题 -->
            <el-form-item prop="title" class="title-item">
              <el-input
                v-model="form.title"
                maxlength="50"
                show-word-limit
                placeholder="输入文章标题…"
                class="title-input"
              />
            </el-form-item>

            <!-- 2. 紧凑工具条：所属频道 + 可选封面 -->
            <div class="composer-meta-row">
              <el-form-item prop="categoryId" class="chip-item">
                <div class="chip-group" role="radiogroup" aria-label="选择频道">
                  <span class="meta-label">频道</span>
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
                </div>
              </el-form-item>

              <div class="cover-inline">
                <el-upload
                  :show-file-list="false"
                  :before-upload="beforeCoverUpload"
                  :http-request="customCoverUpload"
                  accept="image/*"
                >
                  <button type="button" class="cover-pill-btn" :disabled="coverUploading">
                    <img v-if="form.coverImg" :src="form.coverImg" alt="" class="cover-mini-thumb" />
                    <AppIcon v-else name="upload" :size="14" />
                    <span>{{ coverUploading ? '上传中…' : form.coverImg ? '更换封面' : '添加封面（可选）' }}</span>
                  </button>
                </el-upload>
                <button
                  v-if="form.coverImg"
                  type="button"
                  class="cover-remove-btn"
                  title="移除封面"
                  @click="form.coverImg = ''"
                >×</button>
              </div>
            </div>

            <!-- 3. 精简正文编辑器 -->
            <el-form-item prop="content" class="content-item">
              <ArticleRichEditor v-if="dialogVisible" v-model="form.content" height="44vh" class="composer-editor" />
            </el-form-item>
          </div>
        </el-form>

        <template #footer>
          <div class="composer-foot">
            <span class="foot-tip">未传封面时系统自动生成主题主图 · <kbd>Ctrl</kbd> + <kbd>Enter</kbd> 直接发布</span>
            <div class="foot-actions">
              <button type="button" class="btn-ghost" :disabled="submitting" @click="handleSubmit(0)">
                存为草稿
              </button>
              <button type="button" class="btn-solid live" :disabled="submitting" @click="handleSubmit(1)">
                <span v-if="submitting" class="btn-spinner" />
                立即发布
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

<style>
.composer-overlay {
  background: rgba(10, 13, 20, 0.42);
  backdrop-filter: blur(8px) saturate(140%);
  -webkit-backdrop-filter: blur(8px) saturate(140%);
}

.composer-dialog.el-dialog {
  --c-ink: #0a0d14;
  --c-muted: #64748b;
  --c-line: rgba(15, 23, 42, 0.08);
  --c-brand: #0066ff;
  max-width: calc(100vw - 32px);
  padding: 0;
  border-radius: 22px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.75);
  box-shadow: 0 32px 80px -24px rgba(10, 13, 20, 0.4);
}

.composer-dialog .el-dialog__header,
.composer-dialog .el-dialog__body,
.composer-dialog .el-dialog__footer {
  padding: 0;
  margin: 0;
}

/* 顶栏 */
.composer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 24px;
  border-bottom: 1px solid var(--c-line);
}

.composer-head h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 750;
  color: var(--c-ink);
}

.composer-head-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.composer-meta {
  font-size: 12px;
  color: var(--c-muted);
  font-variant-numeric: tabular-nums;
}

.composer-close {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.05);
  color: var(--c-muted);
  cursor: pointer;
  transition: all 0.16s ease;
}

.composer-close:hover {
  background: var(--c-ink);
  color: #fff;
}

/* 单栏主体 */
.composer-body {
  padding: 18px 24px 8px;
}

.composer-form .el-form-item {
  margin-bottom: 12px;
}

.title-input .el-input__wrapper {
  padding: 0 2px;
  background: transparent;
  box-shadow: none !important;
}

.title-input .el-input__inner {
  height: 46px;
  font-size: 24px;
  font-weight: 750;
  letter-spacing: -0.01em;
  color: var(--c-ink);
}

.title-input .el-input__inner::placeholder {
  color: #c0c7d2;
  font-weight: 700;
}

.title-input .el-input__count .el-input__count-inner {
  background: transparent;
  font-size: 12px;
  color: #94a3b8;
}

.title-item {
  border-bottom: 1px solid var(--c-line);
  padding-bottom: 4px;
}

/* 频道与封面单行工具条 */
.composer-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.chip-item {
  margin-bottom: 0 !important;
}

.chip-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
}

.meta-label {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--c-muted);
  margin-right: 4px;
}

.chip {
  padding: 6px 13px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 999px;
  background: #fff;
  color: #334155;
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition: all 0.16s ease;
}

.chip:hover {
  border-color: var(--c-brand);
  color: var(--c-brand);
}

.chip.active {
  background: var(--c-ink);
  border-color: var(--c-ink);
  color: #fff;
}

.cover-inline {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cover-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px dashed rgba(15, 23, 42, 0.18);
  background: #f8fafc;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.16s ease;
}

.cover-pill-btn:hover:not(:disabled) {
  border-color: var(--c-brand);
  color: var(--c-brand);
  background: #f0f7ff;
}

.cover-mini-thumb {
  width: 22px;
  height: 16px;
  object-fit: cover;
  border-radius: 4px;
}

.cover-remove-btn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 0;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

/* 编辑器 */
.content-item .el-form-item__content {
  display: block;
}

.composer-editor.editor {
  border: 1px solid var(--c-line);
  border-radius: 14px;
  background: #fff;
  overflow: hidden;
}

.composer-editor.editor:focus-within {
  border-color: rgba(0, 102, 255, 0.45);
  box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.08);
}

.composer-editor .w-e-toolbar {
  padding: 4px 8px;
  background: #f8fafc;
  border-bottom: 1px solid var(--c-line);
}

.composer-editor .w-e-text-container [data-slate-editor] {
  padding: 6px 16px;
  font-size: 15px;
  line-height: 1.8;
  color: #1e293b;
}

.composer-editor .w-e-text-placeholder {
  left: 16px;
  font-style: normal;
  color: #a3acb9;
}

/* 底栏 */
.composer-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 24px;
  border-top: 1px solid var(--c-line);
  background: #fafbfd;
}

.foot-tip {
  font-size: 12px;
  color: var(--c-muted);
}

.foot-tip kbd {
  display: inline-block;
  padding: 1px 5px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 5px;
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
  height: 38px;
  padding: 0 18px;
  border-radius: 999px;
  font-size: 13.5px;
  font-weight: 650;
  cursor: pointer;
  transition: all 0.18s ease;
}

.btn-ghost {
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: #fff;
  color: #334155;
}

.btn-ghost:hover:not(:disabled) {
  border-color: var(--c-ink);
  color: var(--c-ink);
}

.btn-solid.live {
  border: 0;
  background: linear-gradient(135deg, #0066ff, #0052cc);
  color: #fff;
  box-shadow: 0 8px 20px -8px rgba(0, 102, 255, 0.5);
}

.btn-solid:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn-solid:disabled,
.btn-ghost:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-spinner {
  width: 13px;
  height: 13px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: composer-spin 0.7s linear infinite;
}

@keyframes composer-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 760px) {
  .foot-tip {
    display: none;
  }
}
</style>
