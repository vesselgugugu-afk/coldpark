/* coldpark 沙盒兼容垫片 + 启动探针（外链版）
   宿主 iframe 沙盒 CSP 会拦截 inline script，因此垫片与探针必须放在
   外链普通 script 里（同步执行，早于任何 module script），
   保证 module 执行时 localStorage 已可用、且错误可见。 */
(function () {
  'use strict';

  /* ---------- 1) localStorage 垫片 ---------- */
  var ok = false;
  try {
    var probeKey = '__cp_ls_probe__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    ok = true;
  } catch (e) { ok = false; }
  if (!ok) {
    var store = {};
    var fakeLS = {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; },
      clear: function () { store = {}; },
      key: function (i) { var ks = Object.keys(store); return i >= 0 && i < ks.length ? ks[i] : null; }
    };
    Object.defineProperty(fakeLS, 'length', { get: function () { return Object.keys(store).length; } });
    try {
      Object.defineProperty(window, 'localStorage', { value: fakeLS, configurable: true, writable: true });
    } catch (e2) {
      try { window.localStorage = fakeLS; } catch (e3) {}
    }
  }

  /* ---------- 2) 启动探针 ---------- */
  var box = null;
  function render(tag, detail) {
    try {
      if (!box) {
        box = document.createElement('div');
        box.id = '__cp_probe__';
        box.style.cssText = 'position:fixed;left:8px;right:8px;top:8px;z-index:999999;' +
          'background:#fff1f0;color:#b91c1c;border:2px solid #ef4444;border-radius:10px;' +
          'padding:12px;font:12px/1.5 monospace;white-space:pre-wrap;word-break:break-all;' +
          'box-shadow:0 4px 20px rgba(0,0,0,.3);max-height:70vh;overflow:auto;text-align:left;';
        (document.documentElement || document.body || document).appendChild(box);
      }
      var line = document.createElement('div');
      line.style.cssText = 'border-bottom:1px dashed #fecaca;padding:4px 0;';
      line.textContent = '[' + new Date().toLocaleTimeString() + '] ' + tag + (detail ? ': ' + detail : '');
      box.appendChild(line);
    } catch (e) {}
  }
  window.__cpProbe = { render: render };
  render('探针已激活', '外链 shim 已执行（localStorage 垫片就绪）');

  window.addEventListener('error', function (e) {
    var msg = e.message || 'Script error';
    if (e.filename) msg += '\n  @ ' + e.filename + (e.lineno ? ':' + e.lineno : '');
    render('window.onerror', msg);
  }, true);

  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    var msg = (r && (r.stack || r.message)) ? (r.stack || r.message) : String(r);
    render('unhandledrejection', msg);
  });

  function checkMounted() {
    try {
      var app = document.getElementById('app');
      if (app && app.childNodes.length === 0) {
        render('PROBE', 'DOM 已就绪但 #app 为空：Vue 应用未挂载（脚本可能未执行或在挂载前抛错）');
      }
    } catch (e) {}
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
