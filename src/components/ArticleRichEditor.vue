<script setup>
import { onBeforeUnmount, shallowRef } from 'vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import { uploadImage } from '@/api/user'

const content = defineModel({ type: String, default: '' })
const editorRef = shallowRef()
const toolbarConfig = { excludeKeys: ['group-video', 'fullScreen'] }
const editorConfig = {
  placeholder: '请输入正文…',
  MENU_CONFIG: {
    uploadImage: {
      async customUpload(file, insertFn) {
        try {
          const { data } = await uploadImage(file)
          insertFn(data, '', data)
        } catch { /* axios 统一提示上传错误 */ }
      },
    },
  },
}
onBeforeUnmount(() => editorRef.value?.destroy())
</script>

<template>
  <div class="editor">
    <Toolbar class="editor-toolbar" :editor="editorRef" :default-config="toolbarConfig" mode="default" />
    <Editor v-model="content" style="height: 300px; overflow-y: hidden" :default-config="editorConfig" mode="default" @on-created="editorRef = $event" />
  </div>
</template>

<style scoped>
.editor{width:100%;border:1px solid var(--el-border-color);border-radius:10px;z-index:100}
.editor-toolbar{border-bottom:1px solid var(--el-border-color-light)}
.editor :deep(.w-e-toolbar){border-radius:9px 9px 0 0}
.editor :deep(.w-e-text-container){border-radius:0 0 9px 9px}
</style>
