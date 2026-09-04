import request from '@/utils/request'

// state 在读写两端类型不一样，这是后端的历史设计，前端必须两头适配：
// - 列表筛选传中文「草稿」/「已发布」（parseState 只认这两个词，传 0/1 会静默退化成「不筛选」）
// - 新增/修改传数字 0(草稿) / 1(已发布)
export const listArticles = (params) => request.get('/article/list', { params })

export const addArticle = (data) => request.post('/article/add', data)

// 后端 UPDATE 是全字段无条件覆盖，所以这里必须回传完整对象（id/title/content/
// coverImg/summary/categoryId/state 一个都不能少），漏字段会把对应列写成空值
export const updateArticle = (data) => request.put('/article/update', data)

export const deleteArticle = (id) => request.delete(`/article/delete/${id}`)
