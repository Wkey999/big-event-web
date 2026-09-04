<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import { addArticle, deleteArticle, listArticles, updateArticle } from '@/api/article'
import { listCategories } from '@/api/category'
import { uploadImage } from '@/api/user'
import { formatTime } from '@/utils/format'

// 写接口用数字，列表筛选用中文，两套值不能混
const STATE_TEXT = { 0: '草稿', 1: '已发布' }

const loading = ref(false)
const articles = ref([])
const total = ref(0)
const categories = ref([])

// undefined 表示不筛选（axios 会自动丢掉 undefined 的查询参数，空字符串则会被发出去）
const query = reactive({
  pageNum: 1,
  pageSize: 5,
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

const dialogTitle = computed(() => (editingId.value ? '编辑文章' : '新增文章'))
const categoryNames = computed(() =>
  Object.fromEntries(categories.value.map((item) => [item.id, item.categoryName])),
)

// wangeditor 实例内部状态复杂，被 Vue 深度代理会直接坏掉，必须用 shallowRef
const editorRef = shallowRef()

const toolbarConfig = { excludeKeys: ['group-video', 'fullScreen'] }
const editorConfig = {
  placeholder: '请输入正文…',
  MENU_CONFIG: {
    uploadImage: {
      // 正文插图和封面图共用后端唯一的上传接口，拿到 OSS URL 再插进文档
      async customUpload(file, insertFn) {
        try {
          const res = await uploadImage(file)
          insertFn(res.data, '', res.data)
        } catch {
          // 错误提示已由 axios 拦截器统一弹出
        }
      },
    },
  },
}

function handleCreated(editor) {
  editorRef.value = editor
}

// wangeditor 的 Vue 封装只在 onMounted 里建实例、不会自动销毁，漏了这行会内存泄漏
onBeforeUnmount(() => {
  editorRef.value?.destroy()
})

// 弹窗每次打开都要把当前文章灌进编辑器。setHtml('') 在 wangeditor 里不可靠，清空得用 clear()
watch(dialogVisible, (visible) => {
  if (!visible) return
  nextTick(() => {
    const editor = editorRef.value
    // 首次打开时编辑器刚创建，内容已由组件用 modelValue 初始化过，这里拿不到实例直接跳过
    if (!editor) return
    if (form.content) {
      editor.setHtml(form.content)
    } else {
      editor.clear()
    }
  })
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
  summary: [{ max: 200, message: '摘要最长200个字符', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择文章分类', trigger: 'change' }],
  state: [{ required: true, message: '请选择文章状态', trigger: 'change' }],
}

async function loadArticles() {
  loading.value = true
  try {
    const res = await listArticles({ ...query })
    total.value = res.data.total
    articles.value = res.data.items
  } catch {
    // 错误提示已由 axios 拦截器统一弹出
  } finally {
    loading.value = false
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

function openDialog(id, row) {
  editingId.value = id
  Object.assign(form, {
    title: row?.title ?? '',
    // 直接用列表行里的 content 预填，不调 /article/detail/{id}——那个接口每调一次浏览量 +1
    content: row?.content ?? '',
    coverImg: row?.coverImg ?? '',
    summary: row?.summary ?? '',
    categoryId: row?.categoryId ?? undefined,
    state: row?.state ?? 1,
  })
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
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    // form 的字段刚好对上两个 DTO；后端 UPDATE 是全字段覆盖，编辑时必须回传完整对象
    if (editingId.value) {
      await updateArticle({ id: editingId.value, ...form })
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
    await deleteArticle(row.id)
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

onMounted(() => {
  loadCategories()
  loadArticles()
})
</script>

<template>
  <el-card class="glass-card">
    <div class="toolbar">
      <el-select
        v-model="query.categoryId"
        placeholder="全部分类"
        clearable
        class="filter-category"
      >
        <el-option
          v-for="item in categories"
          :key="item.id"
          :label="item.categoryName"
          :value="item.id"
        />
      </el-select>
      <el-select v-model="query.state" placeholder="全部状态" clearable class="filter-state">
        <el-option label="已发布" value="已发布" />
        <el-option label="草稿" value="草稿" />
      </el-select>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <el-button @click="handleReset">重置</el-button>
      <el-button type="success" @click="openDialog(null)">新增文章</el-button>
      <span class="total">共 {{ total }} 篇文章</span>
    </div>

    <el-table
      v-loading="loading"
      :data="articles"
      stripe
      empty-text="暂无文章，点击「新增文章」创建"
    >
      <el-table-column label="封面" width="110">
        <template #default="{ row }">
          <el-image
            v-if="row.coverImg"
            :src="row.coverImg"
            :preview-src-list="[row.coverImg]"
            preview-teleported
            fit="cover"
            class="cover"
          />
          <span v-else class="muted">无</span>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
      <el-table-column label="分类" width="120">
        <template #default="{ row }">{{ categoryNames[row.categoryId] || '未分类' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.state === 1 ? 'success' : 'info'">{{ STATE_TEXT[row.state] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="viewCount" label="浏览量" width="90" />
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDialog(row.id, row)">编辑</el-button>
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
      :title="dialogTitle"
      width="860px"
      top="6vh"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" @submit.prevent>
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" maxlength="50" show-word-limit placeholder="请输入文章标题" />
        </el-form-item>
        <el-form-item label="分类" prop="categoryId">
          <el-select v-model="form.categoryId" placeholder="请选择分类" class="form-category">
            <el-option
              v-for="item in categories"
              :key="item.id"
              :label="item.categoryName"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="摘要" prop="summary">
          <el-input
            v-model="form.summary"
            type="textarea"
            :rows="2"
            maxlength="200"
            show-word-limit
            placeholder="选填，列表页展示用"
          />
        </el-form-item>
        <el-form-item label="封面">
          <div class="cover-row">
            <el-upload
              :show-file-list="false"
              :before-upload="beforeCoverUpload"
              :http-request="customCoverUpload"
              accept="image/*"
            >
              <el-button :loading="coverUploading">上传封面</el-button>
            </el-upload>
            <template v-if="form.coverImg">
              <el-image :src="form.coverImg" fit="cover" class="cover" />
              <el-button link type="danger" @click="form.coverImg = ''">移除</el-button>
            </template>
            <span v-else class="muted">选填，仅支持 jpg/png/gif/webp</span>
          </div>
        </el-form-item>
        <el-form-item label="正文" prop="content">
          <div class="editor">
            <Toolbar
              class="editor-toolbar"
              :editor="editorRef"
              :default-config="toolbarConfig"
              mode="default"
            />
            <Editor
              v-model="form.content"
              class="editor-body"
              style="height: 300px; overflow-y: hidden"
              :default-config="editorConfig"
              mode="default"
              @on-created="handleCreated"
            />
          </div>
        </el-form-item>
        <el-form-item label="状态" prop="state">
          <el-radio-group v-model="form.state">
            <el-radio :value="1">已发布</el-radio>
            <el-radio :value="0">草稿</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

/* 玻璃卡内的表格强制纯白：backdrop-filter 祖先 + sticky 表头/固定列在 Safari 有已知冲突，透底会花 */
:deep(.el-table) {
  --el-table-bg-color: #ffffff;
  --el-table-tr-bg-color: #ffffff;
  --el-table-header-bg-color: var(--el-fill-color-lighter);
  --el-table-row-hover-bg-color: var(--el-color-primary-light-9);
  --el-table-border-color: var(--el-border-color-lighter);
  background: #ffffff;
  border-radius: 10px;
}

.filter-category {
  width: 160px;
}

.filter-state {
  width: 130px;
}

.form-category {
  width: 220px;
}

.total {
  margin-left: auto;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.pager {
  margin-top: 16px;
  justify-content: flex-end;
}

.cover {
  width: 80px;
  height: 50px;
  border-radius: 4px;
}

.muted {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.cover-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 这里不能加 overflow:hidden 收圆角：工具栏的下拉面板是编辑器内部绝对定位的，会被裁掉 */
.editor {
  width: 100%;
  border: 1px solid var(--el-border-color);
  border-radius: 10px;
  /* 编辑器的下拉菜单要盖住 el-dialog，z-index 必须抬上去 */
  z-index: 100;
}

.editor-toolbar {
  border-bottom: 1px solid var(--el-border-color-light);
}

.editor :deep(.w-e-toolbar) {
  border-radius: 9px 9px 0 0;
}

.editor :deep(.w-e-text-container) {
  border-radius: 0 0 9px 9px;
}
</style>
