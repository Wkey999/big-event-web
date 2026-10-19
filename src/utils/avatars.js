const avatarUrl = filename => `${import.meta.env.BASE_URL}avatars/${filename}`

// The first two appear on the profile page; all presets are available in the gallery.
// New artwork keeps its original composition without the earlier image-specific crop.
export const avatarPresets = [
  { id: 'deepseek', name: 'DeepSeek', src: avatarUrl('deepseek.png') },
  { id: 'gpt', name: 'GPT', src: avatarUrl('gpt.png') },
  { id: 'kimi', name: 'Kimi', src: avatarUrl('kimi.png') },
  { id: 'claude', name: 'Claude', src: avatarUrl('claude.png') },
  { id: 'gemini', name: 'Gemini', src: avatarUrl('gemini.png') },
  { id: 'qwen', name: '千问', src: avatarUrl('qwen.png') },
  { id: 'glm', name: 'GLM', src: avatarUrl('glm.png') },
  { id: 'grok', name: 'Grok', src: avatarUrl('grok.png') },
  { id: 'mimo', name: 'MiMo', src: avatarUrl('mimo.png') },
]

export const featuredAvatars = avatarPresets.slice(0, 2)

// Preserve existing saved avatar URLs without offering these retired presets again.
const legacyPortraits = {
  [avatarUrl('daniya.jpg')]: { x: '2%', y: '-2%', scale: 1.04, background: '#1e2326' },
  [avatarUrl('xigelika.jpg')]: { x: '2%', y: '-2%', scale: 1.04, background: '#222325' },
}
export const getAvatarPortrait = src => legacyPortraits[src]
