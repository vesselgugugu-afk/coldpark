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

      // 强制注入启动探针（与垫片同级）：即使 Vite 对入口 HTML 做了压缩/改写，
      // closeBundle 后处理也能保证最终 app-coldpark/index.html 一定带探针，
      // 用于白屏时在页面顶部显示诊断信息。
      const startupProbe = `<script>
/* coldpark startup probe: 把启动阶段任何错误直接渲染到页面，用于诊断白屏 */
(function () {
  var box = null;
  function render(tag, detail) {
    try {
      if (!box) {
        box = document.createElement('div');
        box.id = '__cp_probe__';
        box.style.cssText = 'position:fixed;left:8px;right:8px;top:8px;z-index:999999;background:#fff1f0;color:#b91c1c;border:2px solid #ef4444;border-radius:10px;padding:12px;font:12px/1.5 monospace;white-space:pre-wrap;word-break:break-all;box-shadow:0 4px 20px rgba(0,0,0,.3);max-height:70vh;overflow:auto;text-align:left;';
        document.documentElement.appendChild(box);
      }
      var line = document.createElement('div');
      line.style.cssText = 'border-bottom:1px dashed #fecaca;padding:4px 0;';
      line.textContent = '[' + new Date().toLocaleTimeString() + '] ' + tag + (detail ? ': ' + detail : '');
      box.appendChild(line);
    } catch (e) {}
  }
  window.__cpProbe = { render: render };
  render('探针已激活', '页面脚本已开始执行');
  window.addEventListener('error', function (e) {
    var msg = e.message || 'Script error';
    if (e.filename) msg += '\\n  @ ' + e.filename + (e.lineno ? ':' + e.lineno : '');
    render('window.onerror', msg);
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    var msg = (r && (r.stack || r.message)) ? (r.stack || r.message) : String(r);
    render('unhandledrejection', msg);
  });
  function checkMounted() {
    var app = document.getElementById('app');
    if (app && app.childNodes.length === 0) {
      render('PROBE', 'DOM 已就绪但 #app 为空：Vue 应用未挂载（脚本可能未执行或在挂载前抛错）');
    }
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(checkMounted, 2000);
  } else {
    window.addEventListener('DOMContentLoaded', function () { setTimeout(checkMounted, 2000); });
  }
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (t && (t.tagName === 'SCRIPT' || t.tagName === 'LINK' || t.tagName === 'IMG')) {
      render('资源加载失败', t.tagName + ' ' + (t.src || t.href || ''));
    }
  }, true);
})();
</script>`
      if (!html.includes('__cp_probe__')) {
        html = html.replace('</head>', `${startupProbe}</head>`)
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
      // 外链 shim：宿主 iframe 沙盒 CSP 拦截 inline script（垫片/探针是 inline 时
      // 会被静默丢弃，导致 module 顶层读 localStorage 抛错 → 白屏且无提示）。
      // 因此把「localStorage 垫片 + 启动探针」合并成外链 cp-shim.js，同步执行于
      // 任何 module 之前，规避 CSP inline 限制。
      const cpShimSrc = join(projectRoot, 'migration-src', 'cp-shim.js')
      if (existsSync(cpShimSrc)) {
        const shimDir = join(appDir, 'assets')
        mkdirSync(shimDir, { recursive: true })
        writeFileSync(join(shimDir, 'cp-shim.js'), readFileSync(cpShimSrc, 'utf8'), 'utf8')
      }
      // 移除 built html 中残留的 inline 探针，统一改走外链 cp-shim.js
      html = html.replace(/<script>\s*\/\* coldpark startup probe[\s\S]*?<\/script>/g, '')
      if (!html.includes('cp-shim.js')) {
        html = html.replace('<head>', '<head>\n    <script src="./assets/cp-shim.js"></script>')
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
