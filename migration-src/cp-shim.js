/* coldpark 沙盒兼容垫片
   保证 module 执行时 localStorage 已可用。 */
(function () {
  'use strict';

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
})();
