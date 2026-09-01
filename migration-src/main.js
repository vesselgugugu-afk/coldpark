import { createApp } from 'vue'
import DatingApp from './apps/dating/DatingApp.vue'
import './styles.css'
import '@fortawesome/fontawesome-free/css/all.min.css'

const app = createApp(DatingApp, { show: true })
app.config.errorHandler = (error) => {
  console.error('[coldpark]', error)
  window.dispatchEvent(new CustomEvent('sys-toast', { detail: { text: '页面加载遇到问题，请稍后重试' } }))
  if (window.__cpProbe) window.__cpProbe.render('Vue errorHandler', (error && (error.stack || error.message)) || String(error))
}
app.mount('#app')
if (window.__cpProbe) window.__cpProbe.render('Vue mounted', '应用已成功挂载到 #app')
