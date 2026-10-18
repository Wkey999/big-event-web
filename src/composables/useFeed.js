import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { listArticles, reportBrowse } from '@/api/article'

export function useFeed() {
  const items = ref([])
  const total = ref(0)
  const mode = ref('recommend')
  const categoryId = ref(null)
  const loading = ref(false)
  const error = ref(false)
  const started = ref(false)
  const finished = ref(false)
  const sentinel = ref(null)
  let version = 0, page = 1, disposed = false, visible = false, pagingObserver, exposureObserver
  const exposures = new Set()
  const elements = new Map()
  const stateKey = computed(() => `${mode.value}:${categoryId.value || 'all'}`)

  function registerCard(id, element) {
    const old = elements.get(id)
    if (old) exposureObserver?.unobserve(old)
    if (!element) { elements.delete(id); return }
    elements.set(id, element)
    element.dataset.articleId = String(id)
    element.dataset.feedVersion = String(version)
    if (!exposureObserver) {
      exposureObserver = new IntersectionObserver(entries => {
        for (const entry of entries) {
          const articleId = Number(entry.target.dataset.articleId)
          if (!entry.isIntersecting || Number(entry.target.dataset.feedVersion) !== version || exposures.has(articleId)) continue
          exposures.add(articleId)
          reportBrowse(articleId, 0, mode.value).catch(() => {})
        }
      }, { threshold: .5 })
    }
    exposureObserver.observe(element)
  }

  async function loadMore() {
    if (disposed || loading.value || finished.value) return
    const current = version, currentMode = mode.value
    const pageSize = currentMode === 'recommend' ? 30 : 12
    started.value = true; loading.value = true; error.value = false
    try {
      const response = await listArticles({ pageNum: page, pageSize, mode: currentMode, categoryId: categoryId.value || undefined, state: 1 })
      if (disposed || current !== version) return
      const rows = response.data.items || []
      const seen = new Set(items.value.map(item => item.id))
      items.value.push(...rows.filter(item => !seen.has(item.id)))
      total.value = response.data.total
      finished.value = currentMode === 'recommend' || rows.length < pageSize || items.value.length >= total.value
      page++
    } catch {
      if (!disposed && current === version) error.value = true
    } finally {
      if (!disposed && current === version) loading.value = false
    }
    if (disposed || current !== version || currentMode !== 'latest') return
    await nextTick()
    const nearBottom = sentinel.value && sentinel.value.getBoundingClientRect().top <= window.innerHeight + 300
    if (visible && nearBottom && !error.value && !finished.value) loadMore()
  }

  function reset(nextMode = mode.value, nextCategory = categoryId.value) {
    version++; mode.value = nextMode; categoryId.value = nextCategory
    page = 1; items.value = []; total.value = 0; finished.value = false; loading.value = false; started.value = false; error.value = false
    exposures.clear(); exposureObserver?.disconnect(); elements.clear()
    loadMore()
  }

  onMounted(() => {
    pagingObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible && started.value && !error.value) loadMore() }, { rootMargin: '0px 0px 300px 0px' })
    if (sentinel.value) pagingObserver.observe(sentinel.value)
    loadMore()
  })
  onBeforeUnmount(() => { disposed = true; version++; pagingObserver?.disconnect(); exposureObserver?.disconnect(); elements.clear() })
  return { items, total, mode, categoryId, loading, error, started, finished, sentinel, stateKey, registerCard, loadMore, reset }
}
