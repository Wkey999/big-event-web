<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthShell from '@/components/AuthShell.vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
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
    const redirect = route.query.redirect
    router.replace(typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') && !/^\/(login|register)(?:[/?#]|$)/.test(redirect) ? redirect : '/')
  } catch {
    // 业务错误提示已由 axios 响应拦截器统一弹出
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell>
      <span class="eyebrow">WELCOME BACK</span>
      <h2 class="login-title">很高兴，再次见到你</h2>
      <p class="auth-description">登录大事件，继续你的探索与创作。</p>
      <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent>
        <el-form-item prop="username">
          <el-input v-model="form.username" aria-label="用户名" autocomplete="username" placeholder="用户名" size="large" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            aria-label="密码"
            autocomplete="current-password"
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
  </AuthShell>
</template>

<style scoped>.login-btn,.register-btn{width:100%}.login-footer,.register-footer{text-align:center;color:var(--muted)}.login-footer a,.register-footer a{color:var(--brand);text-decoration:none}.login-footer a:hover,.register-footer a:hover{text-decoration:underline}</style>
