<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { addCategory, deleteCategory, listCategories, updateCategory } from '@/api/category'

const loading = ref(false)
const categories = ref([])

const dialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref()
// null 表示新增，有值表示正在编辑该 id 的分类
const editingId = ref(null)
const form = reactive({
  categoryName: '',
  sortOrder: 0,
  status: 1,
})

const dialogTitle = computed(() => (editingId.value ? '编辑分类' : '新增分类'))

// 同一用户下分类名唯一（数据库 uk_user_category 唯一索引），前端先拦一道
function validateNameUnique(rule, value, callback) {
  const taken = categories.value.some(
    (item) => item.categoryName === value && item.id !== editingId.value,
  )
  callback(taken ? new Error('分类名称已存在') : undefined)
}

// 名称规则与后端 CategoryDTO 一致：1-20 位且不能含空白字符
const rules = {
  categoryName: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { pattern: /^\S{1,20}$/, message: '分类名称必须是1-20位非空字符', trigger: 'blur' },
    { validator: validateNameUnique, trigger: 'blur' },
  ],
}

async function loadCategories() {
  loading.value = true
  try {
    const res = await listCategories()
    categories.value = res.data
  } catch {
    // 错误提示已由 axios 拦截器统一弹出
  } finally {
    loading.value = false
  }
}

function openDialog(id, row) {
  editingId.value = id
  Object.assign(form, {
    categoryName: row?.categoryName ?? '',
    sortOrder: row?.sortOrder ?? 0,
    status: row?.status ?? 1,
  })
  dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

async function handleSubmit() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    if (editingId.value) {
      await updateCategory({ id: editingId.value, ...form })
    } else {
      await addCategory({ ...form })
    }
    ElMessage.success(editingId.value ? '修改成功' : '新增成功')
    dialogVisible.value = false
    await loadCategories()
  } catch {
    // 错误提示已由 axios 拦截器统一弹出
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row) {
  const confirmed = await ElMessageBox.confirm(
    `确定删除分类「${row.categoryName}」吗？`,
    '删除确认',
    { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
  ).catch(() => false)
  if (!confirmed) return
  try {
    await deleteCategory(row.id)
    ElMessage.success('删除成功')
    await loadCategories()
  } catch {
    // 错误提示已由 axios 拦截器统一弹出
  }
}

// 后端 LocalDateTime 序列化成 2026-09-05T03:55:27，去掉 T 更好读
function formatTime(time) {
  return time ? time.replace('T', ' ') : ''
}

onMounted(loadCategories)
</script>

<template>
  <el-card class="glass-card">
    <div class="toolbar">
      <el-button type="primary" @click="openDialog(null)">新增分类</el-button>
      <el-button :loading="loading" @click="loadCategories">刷新</el-button>
      <span class="total">共 {{ categories.length }} 个分类</span>
    </div>

    <el-table v-loading="loading" :data="categories" stripe empty-text="暂无分类，点击「新增分类」创建">
      <el-table-column type="index" label="#" width="60" />
      <el-table-column prop="categoryName" label="分类名称" min-width="160" />
      <el-table-column prop="sortOrder" label="排序权重" width="110" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'">
            {{ row.status === 1 ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="480px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px" @submit.prevent>
        <el-form-item label="分类名称" prop="categoryName">
          <el-input v-model="form.categoryName" maxlength="20" placeholder="1-20位，不能包含空格" />
        </el-form-item>
        <el-form-item label="排序权重" prop="sortOrder">
          <el-input-number v-model="form.sortOrder" :min="0" :max="9999" />
          <span class="hint">数字越小越靠前</span>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
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

.total {
  margin-left: auto;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.hint {
  margin-left: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
