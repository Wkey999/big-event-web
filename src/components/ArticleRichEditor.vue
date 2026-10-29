<script setup>
import { onBeforeUnmount, shallowRef } from 'vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import { uploadImage } from '@/api/user'

const content = defineModel({ type: String, default: '' })
defineProps({ height: { type: String, default: '340px' } })
const editorRef = shallowRef()

// 只保留高频实用的排版工具，去掉字号、字体、行高、颜色、背景色、表格、表情等冗余项
const toolbarConfig = {
  toolbarKeys: [
    'headerSelect',
    'bold',
    'italic',
    'blockquote',
    '|',
    'bulletedList',
    'numberedList',
    'codeBlock',
    '|',
    'insertLink',
    'uploadImage',
    'divider',
    '|',
    'undo',
    'redo',
  ],
}

const editorConfig = {
  placeholder: '开始写正文…',
  MENU_CONFIG: {
    uploadImage: {
      async customUpload(file, insertFn) {
        try {
          const { data } = await uploadImage(file)
          insertFn(data, '', data)
        } catch {
          /* axios 统一提示上传错误 */
        }
      },
    },
  },
}
onBeforeUnmount(() => editorRef.value?.destroy())
</script>

<template>
  <div class="editor">
    <Toolbar class="editor-toolbar" :editor="editorRef" :default-config="toolbarConfig" mode="simple" />
    <Editor
      v-model="content"
      :style="{ height, overflowY: 'hidden' }"
      :default-config="editorConfig"
      mode="simple"
      @on-created="editorRef = $event"
    />
  </div>
</template>

<style scoped>
.editor {
  width: 100%;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  z-index: 100;
}
.editor-toolbar {
  border-bottom: 1px solid var(--el-border-color-light);
}
.editor :deep(.w-e-toolbar) {
  border-radius: 11px 11px 0 0;
}
.editor :deep(.w-e-text-container) {
  border-radius: 0 0 11px 11px;
}
</style>
