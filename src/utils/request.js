import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

// baseURL 为 /api，由 vite.config.js 的 proxy 转发到后端 8080 并去掉前缀
const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => {
    const res = response.data
    // 后端统一响应体：code 0 为成功，其余为业务错误
    if (res.code === 0) {
      return res
    }
    ElMessage.error(res.message || '请求失败')
    return Promise.reject(new Error(res.message))
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      ElMessage.error('登录状态已失效，请重新登录')
      router.push('/login')
    } else {
      ElMessage.error(error.response?.data?.message || '网络异常，请稍后重试')
    }
    return Promise.reject(error)
  },
)

export default request
