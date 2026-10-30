<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  getDocumentAssistantSetting,
  updateDocumentAssistantSetting,
} from '@/api/admin'
import { useFeaturesStore } from '@/stores/features'
import AppIcon from '@/components/AppIcon.vue'
import { ElMessage } from 'element-plus'

const features = useFeaturesStore()
const loading = ref(false)
const saving = ref(false)
const setting = ref({ enabled: false, source: 'config', configDefault: false })

const sourceLabel = computed(() => {
  if (setting.value.source === 'database') return '已手动设置'
  return '跟随配置文件'
})

async function load() {
  loading.value = true
  try {
    const res = await getDocumentAssistantSetting()
    const data = res?.data ?? res
    if (data) setting.value = data
  } catch {
    ElMessage.error('读取开关失败')
  } finally {
    loading.value = false
  }
}

async function apply(value) {
  saving.value = true
  try {
    const res = await updateDocumentAssistantSetting(value)
    const data = res?.data ?? res
    if (data) setting.value = data
    await features.refreshAssistant()
    ElMessage.success(
      value === null ? '已恢复跟随配置文件' : value ? '文档助手已开启，入口已显示' : '文档助手已关闭，入口已隐藏',
    )
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="settings-page" v-loading="loading">
    <header class="page-heading">
      <div>
        <span class="eyebrow">FEATURE SWITCH</span>
        <h1>功能开关</h1>
        <p>开关立即生效（最多 5 秒），无需重启服务。关闭后前台入口会一并隐藏。</p>
      </div>
      <button class="button button-secondary" :disabled="loading" @click="load">
        <AppIcon name="refresh" :size="16" />刷新
      </button>
    </header>

    <article class="surface setting-card">
      <div class="setting-head">
        <div>
          <h2>文档助手</h2>
          <p>上传 TXT/MD/PDF，做原文摘录检索与有据问答。依赖同机 127.0.0.1:8001 的 Python 侧车。</p>
        </div>
        <span class="tag" :class="setting.enabled ? 'tag-on' : 'tag-off'">
          {{ setting.enabled ? '已开启' : '已关闭' }}
        </span>
      </div>

      <dl class="setting-meta">
        <div><dt>当前来源</dt><dd>{{ sourceLabel }}</dd></div>
        <div><dt>配置默认值</dt><dd>{{ setting.configDefault ? '开启' : '关闭' }}</dd></div>
        <div><dt>前台入口</dt><dd>{{ setting.enabled ? '显示' : '隐藏' }}</dd></div>
      </dl>

      <div class="setting-actions">
        <button class="button button-primary" :disabled="saving || setting.enabled" @click="apply(true)">开启</button>
        <button class="button button-secondary" :disabled="saving || !setting.enabled" @click="apply(false)">关闭</button>
        <button class="button button-ghost" :disabled="saving || setting.source === 'config'" @click="apply(null)">
          恢复跟随配置
        </button>
      </div>
      <p class="setting-hint">
        提示：关闭只影响入口与接口可用性，不会删除任何数据；重新开启后立即可用。
      </p>
    </article>
  </section>
</template>

<style scoped>
.settings-page{display:grid;gap:18px}
.setting-card{padding:22px 24px;display:grid;gap:18px}
.setting-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
.setting-head h2{font-size:18px;margin:0 0 6px}
.setting-head p{margin:0;color:var(--muted);font-size:13px;line-height:1.7;max-width:56ch}
.tag-on{background:rgba(39,174,96,.12);color:#1e8a4c}
.tag-off{background:rgba(120,120,120,.12);color:var(--muted)}
.setting-meta{display:flex;gap:34px;flex-wrap:wrap;margin:0}
.setting-meta div{display:grid;gap:4px}
.setting-meta dt{font-size:11px;letter-spacing:.08em;color:var(--muted);text-transform:uppercase}
.setting-meta dd{margin:0;font-size:14px}
.setting-actions{display:flex;gap:10px;flex-wrap:wrap}
.setting-hint{margin:0;font-size:12px;color:var(--muted)}
.button-ghost{background:transparent;border:1px solid var(--line);color:var(--muted)}
</style>
