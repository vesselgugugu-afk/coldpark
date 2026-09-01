import { defineConfig } from 'C:/work/ai-phone/node_modules/vite/dist/node/index.js'
import vue from 'C:/work/ai-phone/node_modules/@vitejs/plugin-vue/dist/index.mjs'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

const localStorageShim = `<script>
/* coldpark sandbox compatibility shim: some phone webviews block localStorage,
   and module top-level reads throw before the app can show anything. */
(function(){var ok=!1;try{var k="__cp_ls_probe__";window.localStorage.setItem(k,"1");window.localStorage.removeItem(k);ok=!0}catch(e){ok=!1}if(ok)return;var st={};var fake={getItem:function(k){return Object.prototype.hasOwnProperty.call(st,k)?st[k]:null},setItem:function(k,v){st[k]=String(v)},removeItem:function(k){delete st[k]},clear:function(){st={}},key:function(i){var ks=Object.keys(st);return i>=0&&i<ks.length?ks[i]:null}};Object.defineProperty(fake,"length",{get:function(){return Object.keys(st).length}});try{Object.defineProperty(window,"localStorage",{value:fake,configurable:!0,writable:!0})}catch(e2){try{window.localStorage=fake}catch(e3){}}})();
</script>`

function inlineSingleFile() {
  return {
    name: 'inline-single-file',
    apply: 'build',
    closeBundle() {
      const builtDir = join(projectRoot, 'app-coldpark-built')
      const appDir = join(projectRoot, 'app-coldpark')
      const sourceHtml = join(builtDir, 'migration-index.html')
      const targetHtml = join(appDir, 'index.html')

      let html = readFileSync(sourceHtml, 'utf8')

      if (!html.includes('__cp_ls_probe__')) {
        html = html.replace('</head>', `${localStorageShim}</head>`)
      }

      // 终极方案：单文件内联。
      // 因为宿主以 file:// 或类似沙盒协议运行，外链 module 必定报 CORS 错误。
      // 所以我们必须把所有 JS 和 CSS 强行塞进 HTML。
      // 为了避免 `<script type="module">` 内联带来的奇怪解析错误，
      // Vite 输出的代码会被直接放到一个普通 `<script>` 标签里执行。
      mkdirSync(appDir, { recursive: true })
      
      // 提取并移除所有外链 CSS
      html = html.replace(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']\.\/assets\/([^"']+)\.css["'][^>]*>/g, (_, name) => {
        const cssPath = join(builtDir, 'assets', `${name}.css`)
        if (existsSync(cssPath)) {
          return `<style>${readFileSync(cssPath, 'utf8')}</style>`
        }
        return ''
      })

      // 提取并移除所有外链 JS
      let jsContent = ''
      html = html.replace(/<script[^>]+src=["']\.\/assets\/([^"']+)\.js["'][^>]*><\/script>/g, (_, name) => {
        const jsPath = join(builtDir, 'assets', `${name}.js`)
        if (existsSync(jsPath)) {
          jsContent += readFileSync(jsPath, 'utf8') + '\n'
        }
        return ''
      })
      
      // 清理 modulepreload
      html = html.replace(/<link[^>]+rel=["']modulepreload["'][^>]*>/g, '')

      // 将提取的 JS 作为普通脚本注入到底部
      if (jsContent) {
        // 如果 JS 里面有 </script> 字样，会导致 HTML 解析提前结束，替换掉
        jsContent = jsContent.replace(/<\/script>/g, '<\\/script>')
        html = html.replace('</body>', `<script>\n${jsContent}\n</script>\n</body>`)
      }

      // 将 cp-shim.js (垫片) 内联回 head
      const cpShimSrc = join(projectRoot, 'migration-src', 'cp-shim.js')
      if (existsSync(cpShimSrc)) {
        const shimContent = readFileSync(cpShimSrc, 'utf8').replace(/<\/script>/g, '<\\/script>')
        html = html.replace('<head>', `<head>\n<script>\n${shimContent}\n</script>`)
      }

      writeFileSync(targetHtml, html, 'utf8')
    }
  }
}

export default defineConfig({
  base: './',
  root: '.',
  plugins: [vue(), inlineSingleFile()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./migration-src', import.meta.url)),
      vue: 'C:/work/ai-phone/node_modules/vue',
      dexie: 'C:/work/ai-phone/node_modules/dexie'
    }
  },
  build: {
    outDir: 'app-coldpark-built',
    emptyOutDir: true,
    // 【关键】禁止拆包，强制输出单文件 JS 和单文件 CSS
    rollupOptions: {
      input: fileURLToPath(new URL('./migration-index.html', import.meta.url)),
      output: {
        manualChunks: undefined
      }
    }
  }
})
