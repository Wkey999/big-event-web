<script setup>
import { computed, ref, watch } from 'vue'
import { avatarPresets } from '@/utils/avatars'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps({ modelValue: Boolean, current: String, busy: Boolean })
const emit = defineEmits(['update:modelValue', 'select'])
const open = computed({ get: () => props.modelValue, set: value => emit('update:modelValue', value) })
const draft = ref('')
const selected = computed(() => avatarPresets.find(item => item.src === draft.value))
watch(() => props.modelValue, value => {
  if (value) draft.value = avatarPresets.some(item => item.src === props.current) ? props.current : ''
}, { immediate: true })
function confirm() {
  if (props.busy || !selected.value) return
  emit('select', selected.value.src)
  open.value = false
}
</script>

<template>
  <el-dialog v-model="open" title="选择预设头像" width="680px" top="6vh" :style="{ maxHeight: '88vh', overflowY: 'auto' }" :close-on-click-modal="false" destroy-on-close>
    <div class="gallery-intro"><p>给自己换个新形象。</p><span>{{ avatarPresets.length }} 款预设 · 选择后回到资料页保存</span></div>
    <div class="avatar-gallery" aria-label="全部预设头像">
      <button v-for="preset in avatarPresets" :key="preset.id" type="button" class="gallery-choice" :class="{ selected: draft === preset.src }" :aria-label="`选择${preset.name}头像`" :aria-pressed="draft === preset.src" :disabled="busy" @click="draft = preset.src">
        <span class="gallery-art"><img :src="preset.src" :alt="preset.name" width="100" height="100" loading="lazy" decoding="async"><span v-if="draft === preset.src" class="gallery-check"><AppIcon name="check" :size="12" /></span></span><span>{{ preset.name }}</span>
      </button>
    </div>
    <template #footer><div class="gallery-footer"><span>{{ selected ? `已选择 ${selected.name}` : '选择一个喜欢的头像' }}</span><el-button @click="open = false">取消</el-button><el-button type="primary" :disabled="busy || !selected" @click="confirm">使用这个头像</el-button></div></template>
  </el-dialog>
</template>

<style scoped>
.gallery-intro{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin:0 0 22px}.gallery-intro p{font-size:13px;color:var(--text);margin:0}.gallery-intro>span{font-size:11px;color:var(--muted)}.avatar-gallery{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:20px 14px;padding:3px 3px 8px}.gallery-choice{display:flex;flex-direction:column;align-items:center;gap:9px;min-width:0;padding:0;background:transparent;border:0;font-size:12px;color:var(--muted)}.gallery-art{position:relative;display:block;width:100%;aspect-ratio:1;border-radius:14px;box-shadow:0 0 0 1px var(--line);transition:box-shadow .15s,transform .15s}.gallery-art img{display:block;width:100%;height:100%;object-fit:cover;border-radius:14px}.gallery-choice:hover .gallery-art{transform:translateY(-2px);box-shadow:0 0 0 2px #a7bd98}.gallery-choice.selected{color:var(--brand);font-weight:600}.gallery-choice.selected .gallery-art{box-shadow:0 0 0 3px white,0 0 0 5px #547e43}.gallery-check{position:absolute;bottom:-5px;right:-5px;display:grid;place-items:center;width:22px;height:22px;background:var(--brand);color:#fff;border:2px solid white;border-radius:50%}.gallery-footer{display:flex;align-items:center;padding-top:14px;gap:10px;border-top:1px solid var(--line);margin-top:9px}.gallery-footer>span{font-size:12px;color:var(--muted);margin-right:auto}.gallery-footer :deep(.el-button+.el-button){margin-left:0}
</style>
