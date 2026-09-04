import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// 主题层必须在 EP 样式之后引入：同优先级选择器后者胜出，:root 变量覆盖才生效
import '@/styles/theme.css'
// Element Plus 默认是英文语言包，分页器会显示 Total / Go to，这里换成简体中文
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
