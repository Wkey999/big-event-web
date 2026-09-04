<script setup>
import { computed } from 'vue'

const props = defineProps({
  article: { type: Object, required: true },
  categoryName: { type: String, default: '' },
  author: { type: Object, default: null },
  // 封面宽高比（宽/高），由文章 id 决定，保证瀑布流高度可预估
  ratio: { type: Number, required: true },
})

defineEmits(['click'])

const authorName = computed(
  () => props.author?.nickname || props.author?.username || '',
)
const authorText = computed(() => authorName.value.charAt(0).toUpperCase() || 'U')
</script>

<template>
  <article class="feed-card" @click="$emit('click')">
    <div class="cover" :style="{ aspectRatio: ratio }">
      <img v-if="article.coverImg" :src="article.coverImg" :alt="article.title" loading="lazy" />
      <div v-else class="cover-placeholder" />
      <span v-if="categoryName" class="tag">{{ categoryName }}</span>
    </div>
    <div class="body">
      <h3 class="title">{{ article.title }}</h3>
      <div class="meta">
        <span class="author">
          <el-avatar :size="20" :src="author?.avatar || undefined">{{ authorText }}</el-avatar>
          <span class="author-name">{{ authorName }}</span>
        </span>
        <span class="views">
          <svg viewBox="0 0 1024 1024" width="14" height="14" aria-hidden="true">
            <path
              fill="currentColor"
              d="M512 256c-209.4 0-389.5 128.6-448 256 58.5 127.4 238.6 256 448 256s389.5-128.6 448-256c-58.5-127.4-238.6-256-448-256zm0 416c-88.4 0-160-71.6-160-160s71.6-160 160-160 160 71.6 160 160-71.6 160-160 160z"
            />
          </svg>
          {{ article.viewCount }}
        </span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.feed-card {
  /* 伪玻璃：半透明冷白 + 亮描边 + 灰调阴影。不加 backdrop-filter——
     瀑布流 25+ 张卡同开 blur 会各占一个合成层，滚动掉帧，而卡片背后是静态渐变，模糊收益极小 */
  background: rgba(252, 253, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(43, 52, 64, 0.06);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.feed-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 28px rgba(43, 52, 64, 0.13);
}

.cover {
  position: relative;
  width: 100%;
  overflow: hidden;
  background-color: var(--el-color-primary-light-9);
}

.cover img,
.cover-placeholder {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.cover-placeholder {
  background: linear-gradient(135deg, var(--el-color-primary-light-9) 0%, var(--el-color-primary-light-8) 100%);
}

.tag {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 10px;
  border-radius: 999px;
  background-color: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 12px;
  line-height: 18px;
}

.body {
  padding: 10px 12px 12px;
}

/* 固定两行高度：卡片总高度才能只由封面比例决定，瀑布流估算才准 */
.title {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.45;
  height: 2.9em;
  color: var(--el-text-color-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.author {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.author-name {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.views {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}
</style>
