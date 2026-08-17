import { createApp } from 'vue'
import DatingApp from './apps/dating/DatingApp.vue'
import './styles.css'

const app = createApp(DatingApp, { show: true })
app.config.errorHandler = (error) => {
  console.error('[coldpark]', error)
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: { text: '页面加载遇到问题，请稍后重试' } }))
}
app.mount('#app')
