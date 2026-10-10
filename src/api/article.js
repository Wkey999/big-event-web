import request from '@/utils/request'

// 写接口使用数字 0(草稿) / 1(已发布)；列表筛选兼容数字和中文「草稿」/「已发布」。
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

// 行为埋点（阶段 A）：曝光传 dwellMs=0，关闭预览时传真实停留毫秒，并归因到信息流模式。
// silent: true 让拦截器跳过错误提示——埋点失败不打扰用户。
// 同一篇文章 60 秒内重复上报由后端合并为一行，前端可以放心多报。
export const reportBrowse = (articleId, dwellMs = 0, mode = 'latest') =>
  request.post('/article/browse', { articleId, dwellMs, mode }, { silent: true })

// 点赞/收藏：actionType 1-点赞 2-收藏，op 1-执行 0-取消。
// 后端幂等（重复点不重复计数），所以前端可以放心用「本地乐观更新 + 失败靠拦截器提示」。
export const actOnArticle = (articleId, actionType, op) =>
  request.post('/article/action', { articleId, actionType, op })
