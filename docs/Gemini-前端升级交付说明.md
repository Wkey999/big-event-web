# BOOM 大事件：Gemini 前端升级交付说明 (`design/gemini`)

## 一、 视觉与设计方向：得物潮流社区 × Apple 雾透毛玻璃（黑白蓝高定版）

根据用户提出的核心审美诉求（**“参考得物社区模块，整体更现代化、注重细节；采用黑白蓝配色，呈现类似 Apple 的雾透玻璃高级感”**）以及交接文档的要求，本分支（`design/gemini`）独立设计并实施了以下视觉与交互方案：

1. **黑白蓝（Monochrome + Electric Blue）高对比度色彩系统**：
   - **深邃碳黑（`--ink: #0a0d14`）**：用于核心标题、主操作按钮、得物风胶囊导航选中态与个人铭牌底色，形成鲜明利落的视觉锚点。
   - **冷调银白底色（`--page: #f2f4f8`）**：搭配低饱和度的冰蓝与石墨径向环境氛围光（`radial-gradient`），为上层半透明毛玻璃容器提供真实的折射衬底。
   - **科技克莱因/苹果蓝（`--brand: #0066ff`）**：克制地用于 AI 检索标识、外链脉冲点、焦点光环、标签胶囊与关键交互悬停态。
2. **Apple 级多层雾透玻璃（Frosted Glassmorphism）**：
   - 顶栏、频道轨、信息流卡片、个人中心面板统一采用 `backdrop-filter: blur(22px) saturate(185%)` 结合高透白底（`rgba(255, 255, 255, 0.74 ~ 0.88)`）。
   - 细节处引入 `inset 0 1px 0 rgba(255, 255, 255, 0.92)` 顶部镜面高光内描边与 `1px solid rgba(15, 23, 42, 0.075)` 极细外轮廓，在保持文字高可读性的同时呈现通透立体的层次感。

---

## 二、 核心痛点解决与设计取舍

### 1. 彻底消除“无图资讯假封面标题重复”问题（[`ArticleCard.vue`](../src/components/ArticleCard.vue)）
- **原问题**：资讯常无封面图，旧版卡片用大号标题生成彩色占位封面，下方正文区又把同一标题再印一遍，造成严重视觉重复与空间浪费。
- **新方案**：根据真实内容形态分流设计：
  - **有图卡片（Media Card）**：统一为 `16:10` 黄金比例封面（取消按 ID 取模导致的高低参差变形），左上角悬浮深色磨砂分类胶囊，右上角标注外部来源角标。
  - **无图情报/原创文字卡（Editorial Card）**：**完全取消重复印标题的假封面**。顶部改为结构化得物风情报眉头（黑底分类胶囊 + 冰蓝来源脉冲标签 + 右侧箭头微徽章）；中部直出高对比度标题（支持最多 3 行自然折行，长中英文标题不截断核心语义）；若存在双语标题（`sourceTranslatedTitle` 与 `sourceTitle` 不同），以精致的左蓝线单行代码体展示英文原题；底部配以精炼摘要与作者/互动栏。

### 2. 用规整有序的响应式网格流替代估算高度瀑布流（[`HomeView.vue`](../src/views/HomeView.vue)）
- **原问题**：旧版通过估算高度做分栏瀑布流，文字为主的资讯卡片阅读顺序被打乱，视线左右跳动。
- **新方案**：
  - 改为**从左到右、从上到下自然阅读顺序**的现代等高 CSS Grid 社区流。
  - 新增 **「紧凑（多列发现）/ 双栏（精读视图）」密度切换器**，满足快速扫读与深度阅读两种场景。
  - 100% 保留 `useFeed.js` 的 `registerCard` 曝光统计（`IntersectionObserver`）、`sentinel` 触底分页、去重与请求竞态保护。

### 3. 共享导航与 AI 检索舱升级（[`CommunityLayout.vue`](../src/views/layout/CommunityLayout.vue) & [`HomeView.vue`](../src/views/HomeView.vue)）
- 顶部导航栏升级为 Apple 悬浮毛玻璃顶栏，主导航改为得物式胶囊切换器（发现 / AI 检索 ✦ / 休闲局），搜索框支持聚焦动态拓宽与蓝光呼吸环。
- 首页顶部将社区精神标语与 AI 检索入口融合为一体化的 **「雾透玻璃 AI 检索舱」**，精简无数据支撑的冗余装饰。

### 4. 个人中心（我的页）与全站联动升级（[`ProfileView.vue`](../src/views/profile/ProfileView.vue) 等）
- **个人中心（`/profile`）**：左侧升级为黑蓝渐变潮流数字身份铭牌（`BOOM ID // PASS`），右侧升级为雾透玻璃头像工作台与表单面板，完整保留 **DeepSeek、GPT、查看更多（20款预设弹窗）、上传图片** 四个头像入口及人物聚焦偏移逻辑。
- **搜索页（`/search`）**：无图搜索结果自动收起左侧空置封面框，关键词命中高亮升级为冰蓝胶囊。
- **阅读页（`/read/:id`）与 AI 问答页（`/ask`）**：统一为黑白蓝雾透玻璃工作台风格，代码块升级为深邃暗色高对比样式。

---

## 三、 修改文件清单

| 文件路径 | 改动说明 |
| :--- | :--- |
| `src/styles/community.css` | 重构全局 CSS 变量为黑白蓝 + Apple 雾透毛玻璃令牌，升级顶栏、按钮、表面容器与 Element Plus 主题映射 |
| `src/components/BrandMark.vue` | 升级品牌标识为碳黑立体徽标 + 科技蓝呼吸圆点 |
| `src/views/layout/CommunityLayout.vue` | 升级共享顶部毛玻璃导航、胶囊菜单、搜索框与创作者入口 |
| `src/components/ArticleCard.vue` | 重构文章卡片：区分有图卡片与无图情报卡，消除假封面标题重复，支持中英双语原题展示 |
| `src/views/HomeView.vue` | 升级左侧玻璃频道轨、顶部 AI 检索舱、规整网格信息流（支持紧凑/双栏切换）与右侧创作者边栏 |
| `src/views/profile/ProfileView.vue` | 升级“我的页”为得物铭牌 + Apple 玻璃工作台风格，保留全部 4 个头像入口与表单校验 |
| `src/components/PresetAvatarDialog.vue` | 同步预设头像画廊弹窗的黑白蓝选中态与边框细节 |
| `src/views/SearchView.vue` | 升级搜索面板与结果列表，优化无图结果布局与冰蓝关键词高亮 |
| `src/views/ArticleReadView.vue` | 升级文章阅读页排版、暗色代码块、作者玻璃名片与悬浮互动按钮 |
| `src/components/SourceNotice.vue` | 升级外部资讯来源提示卡为冰蓝毛玻璃样式 |
| `src/views/AskView.vue` | 升级 AI 检索工作台、额度横幅、气泡与真实引用文章卡片样式 |
| `src/components/AiSettingsDialog.vue` | 同步 AI 搜索方式与个人 API 配置弹窗视觉 |
| `src/components/AuthShell.vue` | 同步登录/注册外壳为黑白蓝科技玻璃视觉 |
| `src/views/GamesView.vue` | 同步休闲小游戏入口面板视觉，保留点击后按需加载与消息通信机制 |

---

## 四、 构建与验证结果

1. **构建与分包检查**：
   - 运行 `npm.cmd run build`：**通过**（1895 modules transformed，耗时 1.58s）。
   - 运行 `npm.cmd run check:build`：**通过**（`Build checks passed: 62 JS chunks; largest 223.26 kB; editor and games stay lazy.`），单个 JS chunk 远低于 500 kB 限制，富文本编辑器与小游戏严格保持按需懒加载。
2. **业务边界与既有改动保留检查**：
   - 保留 `README.md`、`src/api/feeds.js`、`src/views/FeedManageView.vue` 的既有状态，未覆盖或回退。
   - 未触碰 `src/composables/useFeed.js`、`src/stores/aiSettings.js`、`src/utils/avatars.js`、`src/utils/request.js` 等核心业务与安全逻辑。
3. **未验证项说明**：
   - 未发起任何付费大模型 API 调用。
   - 未执行远程 Git Push 或服务器部署（按交接规范保留在本地 `design/gemini` 分支供对比预览）。
