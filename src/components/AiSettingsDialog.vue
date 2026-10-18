<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useAiSettingsStore } from '@/stores/aiSettings'

defineProps({ busy: Boolean })
const ai = useAiSettingsStore()
const draft = reactive({ provider: 'deepseek', model: '', apiKey: '' })
const error = ref('')
const fetching = ref(false)
const selected = computed(() => ai.providers.find(p => p.id === draft.provider))
async function load() {
  fetching.value = true
  error.value = ''
  try { await ai.loadProviders() }
  catch { error.value = '服务商列表加载失败，请检查后端连接后重试。' }
  finally { fetching.value = false }
}
watch(() => ai.dialogOpen, open => {
  if (open) {
    Object.assign(draft, ai.snapshot() || { provider: 'deepseek', model: '', apiKey: '' })
    load()
    ai.loadStatus()
  } else { draft.apiKey = ''; error.value = '' }
}, { immediate: true })
function changeProvider() { draft.model = ''; draft.apiKey = '' }
function save() {
  if (ai.mode === 'platform') {
    if (!ai.trialReady) return
    ai.dialogOpen = false
    return
  }
  const model = draft.model.trim()
  const apiKey = draft.apiKey.trim()
  if (!selected.value) { error.value = '请选择服务商。'; return }
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$/.test(model)) { error.value = '请填写有效的模型 ID。'; return }
  if (!/^[\x21-\x7E]{1,512}$/.test(apiKey)) { error.value = '请填写 API Key，不能包含空格或换行。'; return }
  ai.saveConfig({ provider: draft.provider, model, apiKey })
  ElMessage.success('配置已用于本次页面会话，请发送问题开始搜索。')
}
</script>

<template>
  <el-dialog v-model="ai.dialogOpen" title="选择 AI 搜索方式" width="620px" top="5vh" :style="{ maxHeight: '90vh', overflowY: 'auto' }" :close-on-click-modal="false" destroy-on-close>
    <div class="api-intro"><span>✦</span><div><strong>先免费体验，也可以连接自己的 AI</strong><p>检索社区已发布内容，回答附上可核对的文章引用。</p></div></div>
    <el-radio-group v-model="ai.mode" :disabled="busy" class="mode-picker" aria-label="AI 搜索方式"><el-radio-button value="platform">平台免费体验</el-radio-button><el-radio-button value="custom">使用自己的 API</el-radio-button></el-radio-group>
    <div v-if="ai.mode === 'platform'" class="trial-pane">
      <template v-if="ai.status"><h3>{{ ai.status.enabled ? `今日剩余 ${ai.status.quota.remaining} / ${ai.status.quota.dailyLimit} 次` : '平台免费体验尚未开放' }}</h3><p v-if="ai.status.enabled">{{ ai.status.provider }} · {{ ai.status.model }}<br>全站今日剩余 {{ ai.status.quota.siteRemaining }} 次，每天北京时间 00:00 重置。</p><p v-else>管理员配置独立试用密钥后开放。你现在可以切换到“使用自己的 API”。</p><p v-if="ai.status.enabled && !ai.trialReady" class="api-error">今日免费额度已用完，可以明天再来或使用自己的 API。</p></template>
      <p v-else>{{ ai.statusError || '正在读取免费额度…' }}</p>
      <button class="text-action" type="button" @click="ai.loadStatus()">刷新额度</button>
      <div class="api-notice">免费体验由平台承担模型费用。每次开始调用模型扣 1 次，即使调用失败也计入；额度在后端校验，刷新页面不会重置。每次独立提问，不延续历史对话。</div>
    </div>
    <el-form v-else label-position="top" @submit.prevent="save">
      <el-form-item label="AI 服务商"><el-select v-model="draft.provider" aria-label="AI 服务商" :disabled="busy || fetching" @change="changeProvider"><el-option v-for="provider in ai.providers" :key="provider.id" :label="provider.name" :value="provider.id" /></el-select></el-form-item>
      <div v-if="selected" class="api-endpoint">接口地址：{{ selected.baseUrl }} <a :href="selected.consoleUrl" target="_blank" rel="noopener noreferrer">前往服务商控制台 ↗</a></div>
      <el-form-item label="模型名称"><el-input v-model="draft.model" aria-label="模型名称" placeholder="填写服务商控制台中的模型 ID" maxlength="120" :disabled="busy" autocomplete="off" /><span class="api-hint">请选择支持工具调用（Tool Calls）的对话模型。</span></el-form-item>
      <el-form-item label="API Key"><el-input v-model="draft.apiKey" aria-label="API Key" type="password" show-password placeholder="粘贴你自己的 API Key" maxlength="512" :disabled="busy" autocomplete="off" /></el-form-item>
      <div class="api-notice">密钥仅保留在当前页面会话内，刷新页面或退出登录后清除，不写入数据库。搜索请求会经过本站后端转发至所选服务商，问题和检索结果将随请求发送。保存配置不会发起模型调用。</div>
      <p v-if="error" class="api-error" role="alert">{{ error }} <button v-if="!ai.providers.length" type="button" class="text-action" @click="load">重新加载</button></p>
    </el-form>
    <template #footer><el-button @click="ai.dialogOpen = false">返回页面</el-button><el-button type="primary" :disabled="busy || (ai.mode === 'platform' ? !ai.trialReady : fetching || !selected)" @click="save">{{ ai.mode === 'platform' ? '使用免费体验' : '保存并返回搜索' }}</el-button></template>
  </el-dialog>
</template>

<style scoped>
.mode-picker{display:flex;margin-bottom:22px}.trial-pane{min-height:220px}.trial-pane h3{font-size:24px;font-weight:550;color:var(--brand);margin:10px 0}.trial-pane>p{font-size:13px;line-height:1.9;color:var(--muted)}.trial-pane>.text-action{font-size:12px;margin:0 0 20px}
.api-intro{display:flex;gap:14px;padding:18px;background:#eef4e8;border:1px solid #d5e2cc;border-radius:10px;margin:0 0 22px;color:#365531}.api-intro>span{font-size:27px}.api-intro strong{font-size:16px}.api-intro p{font-size:12px;line-height:1.8;margin:5px 0 0}.el-select{width:100%}.api-endpoint{display:flex;flex-wrap:wrap;gap:8px;font-size:11px;color:var(--muted);margin:-8px 0 20px;overflow-wrap:anywhere}.api-endpoint a{color:var(--brand);margin-left:auto}.api-hint{font-size:11px;color:var(--muted);line-height:1.8;margin-top:5px}.api-notice{padding:12px 14px;background:var(--soft);border-radius:8px;font-size:12px;line-height:1.9;color:var(--muted)}.api-error{font-size:12px;color:#a44632}
</style>
