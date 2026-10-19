import { fileURLToPath, URL } from 'node:url'
import { existsSync, readdirSync } from 'node:fs'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { prepareEditorEntry } from './build/editor-entry.js'

const editorEntry = prepareEditorEntry(fileURLToPath(new URL('.', import.meta.url)))
const elementComponents = new URL('./node_modules/element-plus/es/components/', import.meta.url)
const elementStyles = readdirSync(elementComponents, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && existsSync(new URL(`${entry.name}/style/css.mjs`, elementComponents)))
  .map(entry => `element-plus/es/components/${entry.name}/style/css`)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    AutoImport({ resolvers: [ElementPlusResolver()], dts: false }),
    Components({ resolvers: [ElementPlusResolver()], dts: false }),
  ],
  resolve: {
    alias: [
      { find: /^@wangeditor\/editor$/, replacement: editorEntry },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
  },
  // Avoid dev-server re-optimization/reloads on the first visit to each route.
  // Production styles remain on demand.
  optimizeDeps: { include: ['element-plus/es', ...elementStyles, '@wangeditor/editor-for-vue'] },
  build: {
    manifest: true,
    rolldownOptions: {
      preserveEntrySignatures: false,
      output: {
        strictExecutionOrder: true,
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [{
            name: id => `editor-${id.match(/@wangeditor[\\/]([^/\\]+)/)?.[1] || 'entry'}`,
            test: /node_modules[\\/]@wangeditor[\\/]/,
          }],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      // 前端请求 /api/user/login → 转发到 http://localhost:8080/user/login
      // 开发期用它解决跨域；rewrite 去掉 /api 前缀，因为后端路径没有这个前缀
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
