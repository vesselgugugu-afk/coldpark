import { defineConfig } from 'C:/work/ai-phone/node_modules/vite/dist/node/index.js'
import vue from 'C:/work/ai-phone/node_modules/@vitejs/plugin-vue/dist/index.mjs'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
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

      // Vite emits local CSS and JS assets. Inline them so the uploaded APP
      // does not depend on a same-origin HTTP server or module/CORS loading.
      html = html.replace(
        /<link[^>]+rel=["']stylesheet["'][^>]*href=["']\.\/assets\/([^"']+)\.css["'][^>]*>/g,
        (_, name) => {
          const css = readFileSync(join(builtDir, 'assets', `${name}.css`), 'utf8')
          return `<style>${css}</style>`
        }
      )

      // 注意：内联 <script> 的 defer 属性无效（defer 只对外部脚本生效）。
      // 若把应用代码内联在 <head>，会在 #app 解析出来之前同步执行，mount 找不到目标直接白屏。
      // 因此这里先把所有构建出的 JS 收集起来，统一内联到 </body> 之前（#app 之后）执行。
      let jsBundle = ''

      html = html.replace(
        /<script[^>]*type=["']module["'][^>]*crossorigin[^>]*src=["']\.\/assets\/([^"']+)\.js["'][^>]*><\/script>/g,
        (_, name) => {
          const js = readFileSync(join(builtDir, 'assets', `${name}.js`), 'utf8')
          jsBundle += `${js}\n`
          return ''
        }
      )

      html = html.replace(
        /<script[^>]*type=["']module["'][^>]*src=["']\.\/assets\/([^"']+)\.js["'][^>]*><\/script>/g,
        (_, name) => {
          const js = readFileSync(join(builtDir, 'assets', `${name}.js`), 'utf8')
          jsBundle += `${js}\n`
          return ''
        }
      )

      if (jsBundle) {
        html = html.replace('</body>', `<script>${jsBundle}</script>\n</body>`)
      }

      mkdirSync(appDir, { recursive: true })
      rmSync(join(appDir, 'assets'), { recursive: true, force: true })
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
    rollupOptions: {
      input: fileURLToPath(new URL('./migration-index.html', import.meta.url))
    }
  }
})
