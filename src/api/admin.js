import request from '@/utils/request'
export const listAdminArticles = (params) => request.get('/admin/article/list', { params })
export const getAdminArticle = (id) => request.get(`/admin/article/${id}`)
export const updateAdminArticle = (id, data) => request.put(`/admin/article/${id}`, data)
export const deleteAdminArticle = (id) => request.delete(`/admin/article/${id}`)
