import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getAiProviders, getAiStatus } from '@/api/ai'

// Credentials exist only in this tab's memory. Never persist them in browser storage.
export const useAiSettingsStore = defineStore('ai-settings', () => {
  const configuration = ref(null)
  const providers = ref([])
  const dialogOpen = ref(false)
  const configured = computed(() => Boolean(configuration.value))
  const mode = ref('platform')
  const status = ref(null)
  const statusError = ref('')
  const trialReady = computed(() => Boolean(status.value?.enabled && status.value.quota.remaining > 0 && status.value.quota.siteRemaining > 0 && status.value.quota.ipRemaining > 0))
  let providersPromise
  async function loadProviders() {
    if (providers.value.length) return
    if (!providersPromise) {
      providersPromise = getAiProviders().then(res => { providers.value = res.data })
        .finally(() => { providersPromise = null })
    }
    return providersPromise
  }
  function openSettings() { dialogOpen.value = true }
  async function loadStatus() {
    statusError.value = ''
    try { const res = await getAiStatus(); status.value = res.data }
    catch { statusError.value = '免费额度暂时无法读取，请稍后刷新。' }
  }
  function saveConfig(config) { configuration.value = { ...config }; mode.value = 'custom'; dialogOpen.value = false }
  function clear() { configuration.value = null; dialogOpen.value = false; mode.value = 'platform'; status.value = null; statusError.value = '' }
  function snapshot() { return configuration.value ? { ...configuration.value } : null }
  return { configuration, providers, dialogOpen, configured, loadProviders, openSettings, saveConfig, clear, snapshot,
    mode, status, statusError, trialReady, loadStatus }
})
