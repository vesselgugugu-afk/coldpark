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

      // 内联单文件版在小手机宿主的 iframe 里会触发 `SyntaxError: Unexpected token '<'`，
      // 而「外链 assets + 入口垫片」形态已在目标环境验证可正常工作。
      // 因此这里只做两件事：① 注入 localStorage 垫片；② 保留 Vite 原生外链
      // （<script type="module" src="./assets/..."> 与 <link href="./assets/...css">），
      // 并把构建出的 assets 原样复制到 app-coldpark/assets，不再内联、不再删 assets。
      mkdirSync(appDir, { recursive: true })
      const builtAssets = join(builtDir, 'assets')
      const targetAssets = join(appDir, 'assets')
      rmSync(targetAssets, { recursive: true, force: true })
      if (existsSync(builtAssets)) {
        cpSync(builtAssets, targetAssets, { recursive: true })
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
    rollupOptions: {
      input: fileURLToPath(new URL('./migration-index.html', import.meta.url))
    }
  }
})
