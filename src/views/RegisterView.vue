<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { register } from '@/api/user'

const router = useRouter()

const formRef = ref()
const loading = ref(false)
const form = reactive({
  username: '',
  password: '',
  rePassword: '',
})

// 密码被改动后重新校验确认密码，否则「先填确认密码再改密码」会漏判
function validatePassword(rule, value, callback) {
  if (form.rePassword) {
    formRef.value.validateField('rePassword').catch(() => {})
  }
  callback()
}

function validateRePassword(rule, value, callback) {
  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
    return
  }
  callback()
}

// 规则与后端 UserRegisterDTO 保持一致，前端先拦一道
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9]{3,20}$/, message: '用户名必须是3-20位字母或数字', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { pattern: /^\S{6,20}$/, message: '密码必须是6-20位非空字符', trigger: 'blur' },
    { validator: validatePassword, trigger: 'blur' },
  ],
  rePassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateRePassword, trigger: 'blur' },
  ],
}

async function handleRegister() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    await register(form)
    ElMessage.success('注册成功，请登录')
    router.push('/login')
  } catch {
    // 业务错误提示已由 axios 响应拦截器统一弹出
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-container">
    <el-card class="register-card">
      <h2 class="register-title"><span class="title-boom">BOOM！</span>大事件 · 注册</h2>
      <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent>
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名（3-20位字母或数字）" size="large" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码（6-20位）"
            size="large"
            show-password
          />
        </el-form-item>
        <el-form-item prop="rePassword">
          <el-input
            v-model="form.rePassword"
            type="password"
            placeholder="确认密码"
            size="large"
            show-password
            @keyup.enter="handleRegister"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="register-btn"
            :loading="loading"
            @click="handleRegister"
          >
            注册
          </el-button>
        </el-form-item>
      </el-form>
      <div class="register-footer">
        已有账号？
        <router-link to="/login">去登录</router-link>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.register-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: transparent;
}

.register-card {
  width: 400px;
  background: var(--glass-bg-strong);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  border: var(--glass-border);
  border-radius: 18px;
  box-shadow: 0 16px 48px rgba(43, 52, 64, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.65);
}

.register-title {
  margin: 0 0 24px;
  text-align: center;
  color: var(--el-text-color-primary);
}

.title-boom {
  font-weight: 800;
  background: linear-gradient(120deg, #4a6fa5, #8fa6c4);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.register-btn {
  width: 100%;
}

.register-footer {
  text-align: center;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

/* 不写就是浏览器默认的蓝紫下划线链接，跟主题色完全脱节 */
.register-footer a {
  color: var(--el-color-primary);
  text-decoration: none;
}

.register-footer a:hover {
  text-decoration: underline;
}
</style>
