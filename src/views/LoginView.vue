<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const formRef = ref()
const loading = ref(false)
const form = reactive({
  username: '',
  password: '',
})
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    await userStore.login(form.username, form.password)
    ElMessage.success('登录成功')
    router.push('/')
  } catch {
    // 业务错误提示已由 axios 响应拦截器统一弹出
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <el-card class="login-card">
      <h2 class="login-title"><span class="title-boom">BOOM！</span>大事件 · 登录</h2>
      <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent>
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" size="large" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            size="large"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" class="login-btn" :loading="loading" @click="handleLogin">
            登录
          </el-button>
        </el-form-item>
      </el-form>
      <div class="login-footer">
        还没有账号？
        <router-link to="/register">立即注册</router-link>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: transparent;
}

.login-card {
  width: 400px;
  background: var(--glass-bg-strong);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  border: var(--glass-border);
  border-radius: 18px;
  box-shadow: 0 16px 48px rgba(43, 52, 64, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.65);
}

.login-title {
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

.login-btn {
  width: 100%;
}

.login-footer {
  text-align: center;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

/* 不写就是浏览器默认的蓝紫下划线链接，跟主题色完全脱节 */
.login-footer a {
  color: var(--el-color-primary);
  text-decoration: none;
}

.login-footer a:hover {
  text-decoration: underline;
}
</style>
