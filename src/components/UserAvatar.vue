<script setup>
import { computed } from 'vue'
import { avatarPresets } from '@/utils/avatars'

const props = defineProps({ src: String, size: { type: [Number, String], default: 40 }, alt: String })
const portrait = computed(() => avatarPresets.find(item => item.src === props.src)?.portrait)
const portraitStyle = computed(() => portrait.value ? {
  '--portrait-x': portrait.value.x,
  '--portrait-y': portrait.value.y,
  '--portrait-scale': portrait.value.scale ?? 1,
  backgroundColor: portrait.value.background,
} : undefined)
</script>

<template>
  <el-avatar :size="size" :src="src || undefined" :alt="alt" class="user-avatar" :class="{ 'user-avatar-focused': portrait }" :style="portraitStyle"><slot /></el-avatar>
</template>

<style scoped>
.user-avatar-focused :deep(img){width:100%;height:100%;object-fit:cover;transform:translate(var(--portrait-x),var(--portrait-y)) scale(var(--portrait-scale))}
</style>
