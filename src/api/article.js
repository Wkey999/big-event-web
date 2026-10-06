import request from '@/utils/request'

// state 在读写两端类型不一样，这是后端的历史设计，前端必须两头适配：
// - 列表筛选传中文「草稿」/「已发布」（parseState 只认这两个词，传 0/1 会静默退化成「不筛选」）
// - 新增/修改传数字 0(草稿) / 1(已发布)
export const listArticles = (params) => request.get('/article/list', { params })

// 列表接口已收窄列，不返回 content（正文 TEXT 不再随卡片列表传输）。
// 需要正文的两条路径：
// - 阅读：走 detail，浏览量 +1（打开预览/详情才算一次阅读）
// - 编辑预填：走 edit，返回完整正文且不计数，避免作者编辑自己的文章刷高浏览量
export const getArticleDetail = (id) => request.get(`/article/detail/${id}`)

export const getArticleForEdit = (id) => request.get(`/article/edit/${id}`)

export const addArticle = (data) => request.post('/article/add', data)

// 后端 UPDATE 是全字段无条件覆盖，所以这里必须回传完整对象（id/title/content/
// coverImg/summary/categoryId/state 一个都不能少），漏字段会把对应列写成空值
export const updateArticle = (data) => request.put('/article/update', data)

export const deleteArticle = (id) => request.delete(`/article/delete/${id}`)
