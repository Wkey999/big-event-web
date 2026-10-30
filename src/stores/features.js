import { defineStore } from 'pinia'
import { getAssistantStatus } from '@/api/documentAssistant'

// 后端开关变化最多 60 秒内被前端感知；管理员在后台切换后会主动 refresh。
const TTL_MS = 60_000

export const useFeaturesStore = defineStore('features', {
  state: () => ({
    assistantEnabled: false,
    assistantSource: 'config',
    loadedAt: 0,
    loading: false,
  }),
  actions: {
    async loadAssistant(force = false) {
      if (!force && this.loadedAt && Date.now() - this.loadedAt < TTL_MS) {
        return this.assistantEnabled
      }
      if (this.loading) return this.assistantEnabled
      this.loading = true
      try {
        const res = await getAssistantStatus()
        // request 拦截器返回整个 {code,message,data}，这里两种形状都兼容
        const data = res?.data ?? res
        this.assistantEnabled = !!data?.enabled
        this.assistantSource = data?.source || 'config'
        this.loadedAt = Date.now()
      } catch {
        // 未登录或网络异常时按“关闭”处理：入口不显示，避免用户点进去只看到报错
        this.assistantEnabled = false
        this.assistantSource = 'unavailable'
      } finally {
        this.loading = false
      }
      return this.assistantEnabled
    },
    async refreshAssistant() {
      return this.loadAssistant(true)
    },
  },
})
