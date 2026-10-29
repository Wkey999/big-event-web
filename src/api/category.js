import request from '@/utils/request'

export const listCategories = () => request.get('/category/list')

export const listAdminCategories = () => request.get('/admin/category/list')

export const addCategory = (data) => request.post('/admin/category', data)

export const updateCategory = ({ id, ...data }) => request.put(`/admin/category/${id}`, data)

export const deleteCategory = (id) => request.delete(`/admin/category/${id}`)
