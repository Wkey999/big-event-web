import DOMPurify from 'dompurify'

const ALLOWED_TAGS = [
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'del',
  'div',
  'em',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]

const ALLOWED_ATTR = ['alt', 'height', 'href', 'rel', 'src', 'style', 'target', 'title', 'width']

const SAFE_NAMED_COLORS = new Set([
  'aqua',
  'black',
  'blue',
  'gray',
  'green',
  'grey',
  'lime',
  'maroon',
  'navy',
  'olive',
  'orange',
  'purple',
  'red',
  'silver',
  'teal',
  'transparent',
  'white',
  'yellow',
])

const COLOR_VALUE = /^(?:#[\da-f]{3,4}|#[\da-f]{6}|#[\da-f]{8}|(?:rgb|rgba|hsl|hsla)\([\d.%\s,+-]+\))$/i
const SIZE_VALUE = /^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i
const SAFE_STYLE_VALUES = {
  color: (value) => SAFE_NAMED_COLORS.has(value.toLowerCase()) || COLOR_VALUE.test(value),
  'background-color': (value) => SAFE_NAMED_COLORS.has(value.toLowerCase()) || COLOR_VALUE.test(value),
  'font-size': (value) => SIZE_VALUE.test(value),
  'font-weight': (value) => /^(?:normal|bold|bolder|lighter|[1-9]00)$/i.test(value),
  'font-style': (value) => /^(?:normal|italic|oblique)$/i.test(value),
  'text-align': (value) => /^(?:left|right|center|justify|start|end)$/i.test(value),
  'text-decoration': (value) => /^(?:none|underline|line-through|overline)(?:\s+(?:underline|line-through|overline))*$/i.test(value),
  'margin-left': (value) => SIZE_VALUE.test(value),
  'vertical-align': (value) => /^(?:baseline|sub|super|top|text-top|middle|bottom|text-bottom)$/i.test(value),
}

const SANITIZE_OPTIONS = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOW_DATA_ATTR: false,
  // 保留 http(s)、邮件/电话链接、站内相对地址和锚点；拒绝 javascript:/data: 等危险协议。
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|\/(?!\/)|\.{1,2}\/|#|[a-z0-9_-]+(?:\/|$))/i,
}

/**
 * 清洗文章富文本：由 DOMPurify 负责标签/属性/URI，再将内联 CSS 收窄到展示所需白名单。
 * 该函数用于浏览器渲染边界；后端仍应把所有文章内容视为不可信输入。
 */
export function sanitizeRichText(html) {
  if (!html) return ''

  const cleanHtml = DOMPurify.sanitize(String(html), SANITIZE_OPTIONS)
  const document = new DOMParser().parseFromString(cleanHtml, 'text/html')

  for (const element of document.body.querySelectorAll('[style]')) {
    const safeDeclarations = []
    for (const [property, isSafeValue] of Object.entries(SAFE_STYLE_VALUES)) {
      const value = element.style.getPropertyValue(property).trim()
      if (value && isSafeValue(value)) safeDeclarations.push(`${property}: ${value}`)
    }

    if (safeDeclarations.length > 0) {
      element.setAttribute('style', safeDeclarations.join('; '))
    } else {
      element.removeAttribute('style')
    }
  }

  for (const anchor of document.body.querySelectorAll('a')) {
    const target = anchor.getAttribute('target')
    if (target !== '_blank' && target !== '_self') anchor.removeAttribute('target')
    if (target === '_blank') anchor.setAttribute('rel', 'noopener noreferrer')
  }

  return document.body.innerHTML
}
