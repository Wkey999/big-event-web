import request from '@/utils/request'
export const listAdminArticles = (params) => request.get('/admin/article/list', { params })
export const getAdminArticle = (id) => request.get(`/admin/article/${id}`)
export const updateAdminArticle = (id, data) => request.put(`/admin/article/${id}`, data)
export const deleteAdminArticle = (id) => request.delete(`/admin/article/${id}`)

// 功能开关：enabled=true/false 显式覆盖，null 表示恢复“跟随配置文件”
export const getDocumentAssistantSetting = () => request.get('/admin/settings/document-assistant')
export const updateDocumentAssistantSetting = (enabled) =>
  request.put('/admin/settings/document-assistant', { enabled })
