// 智能主图海报与内容导读生成引擎：
// 根据标题、来源、URL 路径与分类生成视觉素材；外链报道只展示可核实的来源信息，
// 不沿用历史模板摘要或推测报道细节。

const POSTER_THEMES = [
  {
    id: 'carbon-blue',
    bg: 'linear-gradient(135deg, #07090e 0%, #0f172a 55%, #0052cc 100%)',
    accent: '#38bdf8',
    badgeBg: 'rgba(56, 189, 248, 0.14)',
    pattern: 'grid',
  },
  {
    id: 'klein-glass',
    bg: 'linear-gradient(135deg, #0039a6 0%, #0066ff 58%, #38bdf8 100%)',
    accent: '#ffffff',
    badgeBg: 'rgba(255, 255, 255, 0.18)',
    pattern: 'orbit',
  },
  {
    id: 'titanium-slate',
    bg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 52%, #334155 100%)',
    accent: '#60a5fa',
    badgeBg: 'rgba(96, 165, 250, 0.15)',
    pattern: 'matrix',
  },
  {
    id: 'cyber-indigo',
    bg: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 55%, #1d4ed8 100%)',
    accent: '#818cf8',
    badgeBg: 'rgba(129, 140, 248, 0.16)',
    pattern: 'wave',
  },
  {
    id: 'arctic-frost',
    bg: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 50%, #e2e8f0 100%)',
    accent: '#0066ff',
    badgeBg: 'rgba(0, 102, 255, 0.1)',
    pattern: 'grid',
    light: true,
  },
  {
    id: 'obsidian-cyan',
    bg: 'linear-gradient(135deg, #090d16 0%, #0f2942 58%, #0284c7 100%)',
    accent: '#7dd3fc',
    badgeBg: 'rgba(125, 211, 252, 0.15)',
    pattern: 'orbit',
  },
]

function detectTopicProfile(article = {}, categoryName = '') {
  const title = String(
    article.sourceTranslatedTitle || article.title || article.sourceTitle || '',
  )
  const rawTitle = String(article.sourceTitle || article.title || '')
  const url = String(article.sourceUrl || '').toLowerCase()
  const source = String(article.sourceName || '')
  const combined = `${title} ${rawTitle} ${url} ${source} ${categoryName}`.toLowerCase()

  // 1. 优先识别 LPL / 英雄联盟 S16 全球总决赛焦点战报
  if (
    combined.includes('lpl') ||
    combined.includes('s16') ||
    combined.includes('英雄联盟') ||
    combined.includes('全球总决赛') ||
    combined.includes('瑞士轮') ||
    /\b(blg|tes)\b/.test(combined) ||
    combined.includes('faker') ||
    combined.includes('worlds 2026')
  ) {
    return {
      code: 'WORLDS // S16',
      headline: 'LPL & Worlds Arena',
      subline: '英雄联盟全球总决赛战报、瑞士轮对阵与赛场焦点',
      icon: 'game',
      themeIndex: 1,
      tags: ['S16 全球总决赛', 'LPL 焦点战报', '电竞赛场'],
      topicType: 'esports',
    }
  }

  // 2. 识别明确的游戏/电竞与体育资讯来源
  if (
    source.toLowerCase().includes('esports') ||
    source.includes('电竞') ||
    combined.includes('esportsinsider') ||
    combined.includes('gcores') ||
    combined.includes('ign.com') ||
    categoryName.includes('电竞') ||
    categoryName.includes('游戏') ||
    combined.includes('vct') ||
    combined.includes('valorant') ||
    combined.includes('无畏契约') ||
    combined.includes('cs2') ||
    combined.includes('dota')
  ) {
    return {
      code: 'ESPORTS // ARENA',
      headline: 'Global Esports Pulse',
      subline: '全球职业电竞赛场动态、阵容与俱乐部观察',
      icon: 'game',
      themeIndex: 3,
      tags: ['电竞赛事', '职业赛场', '俱乐部动态'],
      topicType: 'esports',
    }
  }
  if (
    source.toLowerCase().includes('bbc') ||
    source.includes('中新体育') ||
    combined.includes('chinanews.com') ||
    combined.includes('bbc.co.uk/sport') ||
    combined.includes('国乒') ||
    combined.includes('中超') ||
    combined.includes('nba') ||
    combined.includes('欧冠') ||
    categoryName.includes('体育')
  ) {
    return {
      code: 'SPORTS // NEWS',
      headline: 'Sports News',
      subline: '体育新闻、人物报道与赛事动态',
      icon: 'compass',
      themeIndex: 0,
      tags: ['体育新闻', '人物与赛事', '来源可查'],
      topicType: 'sports',
    }
  }

  // 2. DeepSeek
  if (combined.includes('deepseek')) {
    return {
      code: 'DEEPSEEK // AI',
      headline: 'DeepSeek Model & Infra',
      subline: '大模型推理架构与开源生态演进',
      icon: 'spark',
      themeIndex: 1,
      tags: ['DeepSeek', '大模型架构', '开源生态'],
      topicType: 'ai-model',
    }
  }
  // 2. Qwen / 通义千问
  if (combined.includes('qwen') || combined.includes('千问') || combined.includes('通义')) {
    return {
      code: 'QWEN // LLM',
      headline: 'Qwen Open Foundation',
      subline: '多模态与代码大模型技术实践',
      icon: 'spark',
      themeIndex: 3,
      tags: ['通义千问', '模型演进', '多模态'],
      topicType: 'ai-model',
    }
  }
  // 3. Copilot / Agent / 智能体
  if (
    combined.includes('copilot') ||
    combined.includes('agent') ||
    combined.includes('智能体') ||
    combined.includes('rag') ||
    combined.includes('llm')
  ) {
    return {
      code: 'AGENT // WORKFLOW',
      headline: 'AI Agent & Engineering',
      subline: '智能体协同开发与上下文工程实践',
      icon: 'spark',
      themeIndex: 0,
      tags: ['AI 智能体', '工程效能', '工具调用'],
      topicType: 'ai-agent',
    }
  }
  // 4. 安全 / 密钥 / 漏洞 / 证书
  if (
    combined.includes('secret') ||
    combined.includes('security') ||
    combined.includes('安全') ||
    combined.includes('密钥') ||
    combined.includes('漏洞') ||
    combined.includes('证书') ||
    combined.includes('bounty')
  ) {
    return {
      code: 'SECURITY // SHIELD',
      headline: 'Platform & Secret Defense',
      subline: '研发安全治理、密钥检测与供应链防护',
      icon: 'shield',
      themeIndex: 2,
      tags: ['安全治理', '密钥防护', '工程架构'],
      topicType: 'security',
    }
  }
  // 5. GitHub / 架构 / 开源
  if (
    combined.includes('github') ||
    combined.includes('git') ||
    combined.includes('开源') ||
    combined.includes('architecture') ||
    combined.includes('star')
  ) {
    return {
      code: 'GITHUB // INFRA',
      headline: 'Core Infrastructure',
      subline: '高并发工程架构演进与开源协作实践',
      icon: 'code',
      themeIndex: 0,
      tags: ['GitHub 工程', '高并发架构', '开源社区'],
      topicType: 'engineering',
    }
  }
  // 6. 阮一峰 / 周刊
  if (combined.includes('周刊') || combined.includes('阮一峰') || combined.includes('weekly')) {
    return {
      code: 'WEEKLY // DIGEST',
      headline: 'Tech Lovers Weekly',
      subline: '每周前沿科技探索、开源工具与独立思考',
      icon: 'compass',
      themeIndex: 4,
      tags: ['科技周刊', '前沿探索', '工具精选'],
      topicType: 'weekly',
    }
  }
  // 7. 苹果 / 硬件 / 芯片 / 手机 / 数码
  if (
    combined.includes('apple') ||
    combined.includes('苹果') ||
    combined.includes('iphone') ||
    combined.includes('mac') ||
    combined.includes('手机') ||
    combined.includes('耳机') ||
    combined.includes('笔电') ||
    combined.includes('芯片') ||
    combined.includes('3nm') ||
    combined.includes('电池') ||
    source.includes('IT之家') ||
    source.includes('少数派') ||
    categoryName.includes('数码')
  ) {
    return {
      code: 'DIGITAL // GEAR',
      headline: 'Hardware & Ecosystem',
      subline: '智能硬件评测、系统生态与数字生活洞察',
      icon: 'grid',
      themeIndex: 5,
      tags: ['科技数码', '硬件生态', '产品体验'],
      topicType: 'digital',
    }
  }
  // 8. 电竞 / 游戏
  if (
    combined.includes('vct') ||
    combined.includes('valorant') ||
    combined.includes('cs2') ||
    combined.includes('dota') ||
    combined.includes('esports') ||
    combined.includes('电竞') ||
    combined.includes('战队') ||
    combined.includes('游戏') ||
    categoryName.includes('电竞')
  ) {
    return {
      code: 'ESPORTS // ARENA',
      headline: 'Global Esports Pulse',
      subline: '全球职业电竞赛场动态、阵容与俱乐部观察',
      icon: 'game',
      themeIndex: 3,
      tags: ['电竞赛事', '职业赛场', '俱乐部动态'],
      topicType: 'esports',
    }
  }
  // 9. 体育 / 足球 / 篮球
  if (
    combined.includes('sport') ||
    combined.includes('football') ||
    combined.includes('曼联') ||
    combined.includes('阿森纳') ||
    combined.includes('布莱顿') ||
    combined.includes('联赛') ||
    categoryName.includes('体育')
  ) {
    return {
      code: 'SPORTS // NEWS',
      headline: 'Sports News',
      subline: '体育新闻、人物报道与赛事动态',
      icon: 'compass',
      themeIndex: 1,
      tags: ['体育新闻', '人物与赛事', '来源可查'],
      topicType: 'sports',
    }
  }

  // 默认技术/社区分享
  const fallbackIndex = Number(article.id || 0) % POSTER_THEMES.length
  return {
    code: 'BOOM // INSIGHT',
    headline: 'Community & Tech Notes',
    subline: '来自社区创作者的技术实践与深度思考',
    icon: 'code',
    themeIndex: fallbackIndex,
    tags: [categoryName || '社区精选', '实践笔记', '技术洞察'],
    topicType: 'general',
  }
}

export function getVisualPoster(article = {}, categoryName = '') {
  const profile = detectTopicProfile(article, categoryName)
  const theme = POSTER_THEMES[profile.themeIndex % POSTER_THEMES.length]
  // 提取英文短标识或版本亮色词（不重复完整中文标题）
  let highlightToken = profile.headline
  if (article.sourceTitle && article.sourceTranslatedTitle && article.sourceTitle !== article.sourceTranslatedTitle) {
    const words = article.sourceTitle.split(/\s+/).slice(0, 5).join(' ')
    if (words.length >= 6) highlightToken = words
  }
  return {
    ...profile,
    theme,
    highlightToken,
    sourceLabel: article.sourceName || 'BOOM 原创社区',
  }
}

export function getSmartSummary(article = {}, categoryName = '') {
  const title = String(
    article.sourceTranslatedTitle || article.title || article.sourceTitle || '',
  ).trim()
  const source = article.sourceName || '社区作者'
  if (article.sourceUrl) {
    return `来自 ${source} 的报道：「${title}」。本站展示标题和来源，具体事实请阅读原文。`
  }
  if (article.summary && article.summary.trim()) {
    return article.summary.trim()
  }
  const profile = detectTopicProfile(article, categoryName)

  switch (profile.topicType) {
    case 'ai-model':
      return `聚焦「${title}」，解析大模型在推理性能、长上下文处理与开源工程落地中的关键进展，由 ${source} 整理发布。`
    case 'ai-agent':
      return `围绕「${title}」展开实践复盘，探讨 AI 智能体与开发工具链如何融入真实代码库并提升研发效率，附完整来源上下文。`
    case 'security':
      return `针对「${title}」的工程安全深度剖析，梳理大规模组织在密钥检测、权限自动化与漏洞研究中的防护经验与落地策略。`
    case 'engineering':
      return `来自 ${source} 的架构与工程技术分享：深入探讨「${title}」背后的系统优化思路、高并发瓶颈拆解与开源协作实践。`
    case 'weekly':
      return `本期《${title}》汇总近期值得关注的科技动态、前沿开源工具、深度长文与开发者独立思考，适合快速拓展技术视野。`
    case 'digital':
      return `围绕「${title}」带来最新产品动态与使用体验观察，涵盖硬件规格演进、系统功能特性与日常数字生活场景解析。`
    case 'esports':
      return `全球电竞赛场速递：聚焦「${title}」，跟进职业联赛赛程制度、俱乐部阵容变动与焦点对局背后的行业动态。`
    case 'sports':
      return `体坛焦点战报：围绕「${title}」回顾关键比赛进程、核心球员赛场表现与最新联赛积分格局。`
    default:
      return `围绕「${title}」整理的核心看点与背景速览，收录自 ${source}，点击卡片即可阅读站内精编导读与原文详情。`
  }
}

export function getStructuredArticleDigest(article = {}, categoryName = '') {
  const title = String(
    article.sourceTranslatedTitle || article.title || article.sourceTitle || '',
  ).trim()
  const rawTitle = String(article.sourceTitle || '').trim()
  const source = article.sourceName || '社区创作者'
  const author = article.sourceAuthor || article.authorNickname || source
  const profile = detectTopicProfile(article, categoryName)
  const summary = getSmartSummary(article, categoryName)

  if (article.sourceUrl) {
    return {
      summary,
      domainContext: `这是一条来自 ${source} 的外部报道${author && author !== source ? `，原文署名 ${author}` : ''}。本站没有核验或转载全文。`,
      keyPoints: [
        `报道主题：${title}。`,
        '事实与背景：请以原网站的完整报道为准。',
        '阅读方式：通过下方原文链接查看正文及后续更新。',
      ],
      tags: profile.tags,
      code: profile.code,
      rawTitle: rawTitle && rawTitle !== title ? rawTitle : '',
    }
  }

  let domainContext = ''
  let keyPoints = []

  switch (profile.topicType) {
    case 'ai-model':
    case 'ai-agent':
      domainContext = `本文收录自 ${source}（作者/维护团队：${author}）。随着生成式 AI 与智能体（Agent）从概念验证走向生产环境，开发者关注的重心正从单纯的 Prompt 调优转向代码库上下文理解、工具调用可靠性以及推理成本控制。`
      keyPoints = [
        `核心议题：围绕「${title}」，拆解 AI 辅助开发或模型迭代中的真实工程问题。`,
        `实践价值：提供可直接参考的工作流思路、工具配置方式或架构优化经验，减少踩坑成本。`,
        `延伸探索：可结合站内「AI 检索」功能，对比阅读社区内同领域的更多 Agent 与大模型实践笔记。`,
      ]
      break
    case 'security':
    case 'engineering':
      domainContext = `本文收录自 ${source}（作者：${author}）。在现代大规模软件工程与开源协作中，基础设施的可扩展性、接口吞吐效率以及自动化安全防线是决定工程质量的底层支柱。`
      keyPoints = [
        `问题背景：针对「${title}」所面临的规模化挑战，还原真实业务场景中的技术约束。`,
        `方案取舍：重点呈现工程团队在性能、安全性与维护成本之间的权衡路径及量化收益。`,
        `源码与原文：站内已为你整理双语题名与核心脉络，完整图表与代码细节可通过下方原文入口核对。`,
      ]
      break
    case 'weekly':
      domainContext = `本文收录自 ${source}（作者：${author}）。科技周刊以跨学科的视角串联每周值得关注的新技术、新工具与人文思考，帮助读者在碎片化信息流之外建立系统化的技术审美。`
      keyPoints = [
        `本期主题：以「${title}」为主线，串联当周最具启发性的技术产品与行业观察。`,
        `工具与资源：涵盖开源项目推荐、开发效率利器以及值得精读的深度技术长文索引。`,
        `阅读建议：可先通过本页速览核心脉络，再跳转原网站查阅完整图文与外部引用链接。`,
      ]
      break
    case 'digital':
      domainContext = `本文收录自 ${source}（作者：${author || '编辑部'}）。聚焦消费电子、智能硬件与操作系统生态的最新演进，从用户真实体验与行业供应链双重视角提供快速参考。`
      keyPoints = [
        `核心动态：快速梳理「${title}」涉及的产品参数、功能更新或行业合作要点。`,
        `体验洞察：提炼对日常使用、设备选购或数字工作流有实际影响的实用信息。`,
        `来源核验：本文关键信息均已标注原始发布时间与来源站点，便于进一步追踪后续报道。`,
      ]
      break
    case 'esports':
    case 'sports':
      domainContext = `本文收录自 ${source}（作者：${author || '赛事前方'}）。为你带来全球职业体育与电子竞技赛场的最新赛果、阵容变动与赛事运营动态。`
      keyPoints = [
        `焦点事件：围绕「${title}」，提炼本场赛事或俱乐部公告的核心变动与关键数据。`,
        `赛局影响：分析该动态对后续联赛积分走势、赛区席位争夺或战队战术体系的影响。`,
        `原版报道：支持中英双语标题对照，点击下方原文链接即可直达原站点查看完整战报或视频集锦。`,
      ]
      break
    default:
      domainContext = `本文收录自 ${source}（作者：${author}），归属于「${categoryName || '社区发现'}」频道。BOOM 社区为你提取了该内容的站内结构化导读卡片，方便在跳转阅读前快速把握核心脉络。`
      keyPoints = [
        `主题速览：聚焦「${title}」，呈现核心观点与背景脉络。`,
        `来源透明：完整保留原始发布机构、作者署名与收录时间戳，真实可溯源。`,
        `深入阅读：可通过下方按钮前往原网站查看未删减的完整正文与配图。`,
      ]
  }

  return {
    summary,
    domainContext,
    keyPoints,
    tags: profile.tags,
    code: profile.code,
    rawTitle: rawTitle && rawTitle !== title ? rawTitle : '',
  }
}
