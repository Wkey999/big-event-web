import request from '@/utils/request'
export const listFeedSources = () => request.get('/admin/feeds/sources')
export const listFeedEntries = params => request.get('/admin/feeds/entries', { params })
export const collectFeed = key => request.post(`/admin/feeds/${key}/collect`, {}, { timeout: 180000 })
export const translateFeedTitles = key => request.post(`/admin/feeds/${key}/translate`, {}, { timeout: 90000 })
export const publishFeedEntry = (id, categoryId, translatedTitle) => request.post(`/admin/feeds/entries/${id}/publish`, { categoryId, translatedTitle })
export const rejectFeedEntry = id => request.post(`/admin/feeds/entries/${id}/reject`)
