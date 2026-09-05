# BOOM！大事件 · 前端

内容社区平台的 **Vue 3 前端**：C 端瀑布流信息流 + B 端管理后台（分类/文章/个人中心）。配套后端仓库：[Wkey999/big-event](https://github.com/Wkey999/big-event)。

## 技术栈

Vue 3（Composition API）· Vite · Vue Router · Pinia · axios · Element Plus 2.14.5 · @wangeditor/editor 5

JavaScript（非 TS），TypeScript 化在路线图上。

## 功能

- **登录 / 注册**：前端校验规则与后端 DTO 逐条对齐（用户名/密码正则、确认密码联动重校验）；路由守卫拦截未登录访问、已登录禁入登录页
- **主布局**：el-container 侧边栏 + 头部用户下拉，`userInfo` 只在布局层拉取一次
- **首页信息流**：得物式多列瀑布流 + 无限滚动——不依赖任何布局库，封面按确定性宽高比估算列高、贪心放进最矮列，追加不跳位；IntersectionObserver 触底翻页，失败可重试，空态引导发布
- **分类管理**：表格 CRUD + 排序权重 + 即时重名提示（后端为权威）
- **文章管理**：分类/状态双筛选 + 分页 + 大弹窗表单；wangeditor 富文本正文、封面与正文插图直传后端 OSS；编辑预填用列表行数据（不打 detail 接口，浏览量不虚增）
- **个人中心**：基本资料 + 头像上传（保存才落库）+ 修改密码（成功后强制重登）

## 主题层（整站换肤的单一来源）

全部视觉令牌集中在 `src/styles/theme.css`：雾面冷灰蓝配色（主色 `#4A6FA5`）、Element Plus 变量覆盖、玻璃拟态（真 `backdrop-filter` 只给数量恒定的容器，瀑布流卡片用伪玻璃保帧率）、teleport 浮层（dialog/popper/message）的全局规则。改配色只需要动这一个文件。

## 本地运行

```bash
npm install
npm run dev        # http://localhost:5173
```

**前置条件**：后端跑在 `localhost:8080`。axios `baseURL` 为 `/api`，由 `vite.config.js` 代理并 rewrite 掉 `/api` 前缀转发到后端（后端路由无该前缀），因此无跨域问题，也不需要任何环境变量或密钥。

## 目录约定

```
src/
├── api/          # 一个后端模块一个文件
├── utils/request.js  # axios 实例：注入 Bearer token；code!==0 统一报错；401 清 token 跳登录
├── stores/       # Pinia setup store（token 持久化在 localStorage）
├── router/       # 嵌套路由：/login /register 独立，/ 为布局 + 懒加载子页
├── styles/theme.css  # 主题层唯一入口
└── views/ components/
```

## 未来规划（任务清单）

前端侧：

- [ ] TypeScript 重构（组件、Pinia store、api 层类型化）
- [ ] C 端公开浏览：免登录看自己的已发布内容（只读模式，不依赖任何抓取）
- [ ] 评论 / 点赞 / 收藏的 C 端交互
- [ ] 移动端适配与响应式打磨
- [ ] 构建优化：路由级分包、图片懒加载、Lighthouse 跑分

多源资讯聚合方向经评估已**搁置**（维护成本与抓取合规风险），见 [后端 README · 未来规划](https://github.com/Wkey999/big-event#未来规划任务清单)；完整功能边界见 [功能实现说明书](https://github.com/Wkey999/big-event/blob/master/docs/%E5%8A%9F%E8%83%BD%E5%AE%9E%E7%8E%B0%E8%AF%B4%E6%98%8E%E4%B9%A6.md)。

## License

学习项目，仅供个人研究与简历展示。
