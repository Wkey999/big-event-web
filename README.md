# BOOM · 大事件前端

面向 PC Web 的 AI／科技内容社区，基于 Vue 3、Vite、Pinia、Vue Router、Element Plus 与 WangEditor。配套后端：[Wkey999/big-event](https://github.com/Wkey999/big-event)。

## 当前初版

- 社区首页：顶部导航、频道侧栏、推荐／最新信息流、瀑布流卡片、AI 提问入口。数据来自后端，不在页面写入模拟文章。
- 阅读页：真实作者、富文本清洗、点赞／收藏与取消、阅读时长和来源上报。
- 搜索：关键词、频道、发布时间、排序与分页；筛选条件保存在 URL，可刷新或返回。
- AI 搜索：真实调用 Agent 检索已发布文章，显示回答与后端工具结果生成的引用；每次提问独立检索。预填问题不会自动调用模型。
- 我的创作：仅自己的文章，草稿／已发布筛选；独立编辑接口预填完整正文，不增加阅读量；新建默认草稿。
- 管理后台：独立布局，文章管理和频道管理使用 /admin 接口。前端角色守卫和后端权限校验同时生效。
- 登录、注册、资料设置和 404 页面统一社区视觉。
- 小游戏频道：/games，点击后按需加载同源合成游戏，支持暂停、继续、退出，以及游戏内返回；离开频道即卸载 iframe。

当前需要登录后浏览。主界面最小宽度 1100px，暂不设计移动端。评论、向量检索、流式回答和多轮会话不在本次前端初版范围。

## 本地运行

需要后端已运行于 localhost:8080，MySQL 已启动。前端不保存数据库密码或模型密钥。

```powershell
# 终端一：后端，使用已有本地忽略配置
Set-Location D:\workplace\big-event
mvn.cmd spring-boot:run

# 终端二：前端
Set-Location D:\workplace\VUE_CODE\big-event-web
npm.cmd run dev -- --host 127.0.0.1 --strictPort
```

浏览器访问 http://127.0.0.1:5173 。Vite 将 /api 代理到后端，移除该前缀。已有 node_modules 时不需要重新安装依赖。

## 关键入口

| 地址 | 用途 |
| --- | --- |
| / | 内容发现 |
| /search?keyword=RAG | 普通检索 |
| /ask?q=RAG | AI 搜索，预填问题后手动发送 |
| /games | 小游戏频道 |
| /read/:id | 阅读详情 |
| /creator | 我的创作 |
| /creator?compose=1 | 打开写作表单 |
| /profile | 个人设置 |
| /admin/articles | 管理员内容管理 |
| /admin/categories | 管理员频道管理 |

主题入口是 src/styles/community.css，社区和后台布局分别在 src/views/layout/CommunityLayout.vue 与 AdminLayout.vue。旧 LayoutView.vue、theme.css 保留在仓库中供历史比对，当前入口不再引用。信息流加载与曝光逻辑位于 src/composables/useFeed.js。

## 验证

2026-10-17 在本机 MySQL 5.7.26 上完成：

- npm.cmd run build 通过；仍有 Element Plus／编辑器相关的较大分包提示，暂未进行专项体积优化。
- 配套后端 mvn.cmd -o test：52 项测试通过，0 失败、0 错误。
- 浏览器实测：登录、首页、文章阅读、点赞和取消、收藏和取消、关键词检索、真实 AI 回答和引用、新建草稿、重新编辑、发布。
- 接口实测：草稿不进入公开列表、其他账号不能编辑、普通账号管理接口返回 403、发布后出现在本人列表与信息流。
- 验收新建内容已软删除；已有文章内容未改写。浏览、检索和问答会按正常业务产生行为日志。
- 一次真实 AI 检索耗时约 4.7 秒，返回 2 篇引用；这是一条联调样本，不作为平均性能指标。

尚未完整验证管理员身份的写操作和 OSS 文件上传，本轮未修改上传实现。数据库升级、线上部署和论文评测另行安排。

## 小游戏静态资源

已接入用户提供的 orbipom-embed.zip（约 29 MB 解压资源），位于 public/games/orbipom/。Vite 构建时原样复制到 dist/games/orbipom/，游戏不进入社区首页 JavaScript 包。源码继续在独立的“网页游戏复刻/orbipom-merge”项目中维护。

iframe 地址为 /games/orbipom/play/game.html?lang=zh-cn，高度 720px、宽度 100%。不注册 Service Worker，不接入社区账号、排行榜或成绩数据库。对局为内存状态，刷新、退出或离开频道后重置。

postMessage 仅接受与当前站点同源、且来源窗口为当前游戏 iframe 的消息。游戏自身发出 orbipom:close 后，宿主页销毁 iframe 并回到开始界面。宿主页的暂停／继续使用游戏包已有的桥接协议。

正式部署时，应让 /games/orbipom/ 走静态文件服务；不存在的文件返回 404，不能回退成社区 index.html。保留 JS、CSS、音频、字体的正确 MIME 类型。资源来源与权利说明见 public/games/orbipom/NOTICE.md。

本机实测：进入频道前无 iframe；点击开始后加载游戏并完成引导、投放；暂停／继续按钮可响应；游戏内返回后 iframe 数量归零。未重新覆盖游戏本体所有技能、结算和输入设备的测试。
