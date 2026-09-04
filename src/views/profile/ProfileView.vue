<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { updatePassword, updateUserInfo, uploadImage } from '@/api/user'

const router = useRouter()
const userStore = useUserStore()

const infoRef = ref()
const pwdRef = ref()
const savingInfo = ref(false)
const savingPwd = ref(false)
const avatarUploading = ref(false)

const infoForm = reactive({ nickname: '', email: '', avatar: '' })
const pwdForm = reactive({ old_pwd: '', new_pwd: '', re_pwd: '' })

const avatarText = computed(
  () => (userStore.userInfo?.nickname || userStore.userInfo?.username || 'U').charAt(0).toUpperCase(),
)

// 布局会 fetch userInfo，但子页面比布局先 mounted，所以用 watch 等数据到位再回填，只填一次
let filled = false
watch(
  () => userStore.userInfo,
  (info) => {
    if (filled || !info) return
    filled = true
    Object.assign(infoForm, {
      nickname: info.nickname ?? '',
      email: info.email ?? '',
      avatar: info.avatar ?? '',
    })
  },
  { immediate: true },
)

// 规则与后端 UserUpdateDTO 一致：昵称 1-10 位非空字符，邮箱必填且格式正确
const infoRules = {
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { pattern: /^\S{1,10}$/, message: '昵称必须是1-10位非空字符', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
}

function validateRePwd(rule, value, callback) {
  if (value !== pwdForm.new_pwd) {
    callback(new Error('两次输入的密码不一致'))
    return
  }
  callback()
}

// 新密码被改动后重新校验确认密码，否则「先填确认密码再改新密码」会漏判
function validateNewPwd(rule, value, callback) {
  if (pwdForm.re_pwd) {
    pwdRef.value?.validateField('re_pwd').catch(() => {})
  }
  callback()
}

// 新密码规则与后端 UserUpdatePwdDTO 一致：6-20 位非空字符
const pwdRules = {
  old_pwd: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  new_pwd: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { pattern: /^\S{6,20}$/, message: '新密码必须是6-20位非空字符', trigger: 'blur' },
    { validator: validateNewPwd, trigger: 'blur' },
  ],
  re_pwd: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateRePwd, trigger: 'blur' },
  ],
}

function beforeAvatarUpload(file) {
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

// 不用 el-upload 默认的 action 上传：那样带不上 Authorization 头，也解不开 Result 包装。
// 上传成功只更新表单预览，点「保存修改」才随 nickname/email 一起落库
async function customAvatarUpload({ file }) {
  avatarUploading.value = true
  try {
    const res = await uploadImage(file)
    infoForm.avatar = res.data
    ElMessage.success('头像上传成功，记得点保存')
  } catch {
    // 错误提示已由 axios 拦截器统一弹出
  } finally {
    avatarUploading.value = false
  }
}

async function handleSaveInfo() {
  const valid = await infoRef.value.validate().catch(() => false)
  if (!valid) return
  savingInfo.value = true
  try {
    await updateUserInfo({ ...infoForm })
    ElMessage.success('保存成功')
    // 刷新 store，头部头像和昵称才会同步
    await userStore.fetchUserInfo()
  } catch {
    // 错误提示已由 axios 拦截器统一弹出
  } finally {
    savingInfo.value = false
  }
}

async function handleChangePwd() {
  const valid = await pwdRef.value.validate().catch(() => false)
  if (!valid) return
  savingPwd.value = true
  try {
    await updatePassword({ old_pwd: pwdForm.old_pwd, new_pwd: pwdForm.new_pwd })
    // JWT 是无状态的，旧令牌在过期前依然有效，所以改完密码直接踢回登录页重新认证
    userStore.logout()
    ElMessage.success('密码修改成功，请重新登录')
    router.push('/login')
  } catch {
    // 错误提示已由 axios 拦截器统一弹出
  } finally {
    savingPwd.value = false
  }
}
</script>

<template>
  <el-card class="glass-card">
    <el-tabs>
      <el-tab-pane label="基本资料">
        <el-form ref="infoRef" :model="infoForm" :rules="infoRules" label-width="80px" class="pane-form" @submit.prevent>
          <el-form-item label="头像">
            <div class="avatar-row">
              <el-avatar :size="72" :src="infoForm.avatar || undefined">{{ avatarText }}</el-avatar>
              <el-upload
                :show-file-list="false"
                :before-upload="beforeAvatarUpload"
                :http-request="customAvatarUpload"
                accept="image/*"
              >
                <el-button :loading="avatarUploading">上传头像</el-button>
              </el-upload>
              <span class="hint">选填，仅支持 jpg/png/gif/webp，上传后需点保存</span>
            </div>
          </el-form-item>
          <el-form-item label="用户名">
            <el-input :model-value="userStore.userInfo?.username" disabled />
            <span class="hint">用户名注册后不可修改</span>
          </el-form-item>
          <el-form-item label="昵称" prop="nickname">
            <el-input v-model="infoForm.nickname" maxlength="10" show-word-limit placeholder="1-10位非空字符" />
          </el-form-item>
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="infoForm.email" placeholder="请输入邮箱" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="savingInfo" @click="handleSaveInfo">保存修改</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="修改密码">
        <el-form ref="pwdRef" :model="pwdForm" :rules="pwdRules" label-width="100px" class="pane-form" @submit.prevent>
          <el-form-item label="原密码" prop="old_pwd">
            <el-input v-model="pwdForm.old_pwd" type="password" show-password placeholder="请输入原密码" />
          </el-form-item>
          <el-form-item label="新密码" prop="new_pwd">
            <el-input v-model="pwdForm.new_pwd" type="password" show-password placeholder="6-20位非空字符" />
          </el-form-item>
          <el-form-item label="确认新密码" prop="re_pwd">
            <el-input v-model="pwdForm.re_pwd" type="password" show-password placeholder="请再次输入新密码" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="savingPwd" @click="handleChangePwd">确认修改</el-button>
            <span class="hint">修改成功后需要重新登录</span>
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>
  </el-card>
</template>

<style scoped>
.pane-form {
  max-width: 480px;
}

.avatar-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
