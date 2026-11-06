// ==UserScript==
// @name         BPO Job Lookup (tìm job + tài khoản Data Center)
// @namespace    bpo-job-lookup
// @version      1.2
// @description  Test update 1.2
// @match        http://global-autolabeling-service.evad.xiaomi.srv/appen/ui*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @updateURL    https://github.com/HoangAnh260803/ConeChut/raw/refs/heads/main/scripts/BPO_Job_Lookup.js
// @downloadURL  https://github.com/HoangAnh260803/ConeChut/raw/refs/heads/main/scripts/BPO_Job_Lookup.js
// @connect      *
// ==/UserScript==
(function () {
  'use strict';
  // Trang cấp cao nhất: chỉ chạy trên host chính. Khung nhúng (iframe) của bất kỳ host nào vẫn chạy để học API cuboid.
  if (window.top === window.self && location.host !== 'global-autolabeling-service.evad.xiaomi.srv' && !/data-preview|lidar/i.test(location.href)) return;

  /* ===== CẤU HÌNH (chỉnh nếu response của hệ thống khác) ===== */
  var CFG = {
    CYCLE: { 'labeling job': 0, '1 round qa': 1, '2 round qa': 2 }, // giá trị tham số "cycle" theo từng job
    ID_KEYS: ['recordId', 'record_id', 'dataId', 'taskId', 'id'],
    NAME_KEYS: ['currentWorker', 'current_worker', 'currentWorkerName', 'worker', 'workerName', 'currentUser', 'userName', 'username', 'assignee', 'accountName', 'name', 'email'],
    PAGE_KEYS: ['pageNum', 'pageNo', 'pageIndex', 'pageNumber', 'currentPage', 'curPage', 'page', 'current'],
    SIZE_KEYS: ['pageSize', 'size', 'limit'],
    PAGE_SIZE: 0 // 0 = giữ nguyên pageSize của request đã học
  };
  var ROLES = ['Labeling Job', '1 Round QA', '2 Round QA'];
  var SUF = /\s*(2 Round QA|1 Round QA|Labeling Job)\s*$/i;
  var LS = 'bpo_lookup_tpl_v1';
  var JOBID_RE = /job_?id["']?\s*[=:]\s*["']?(\d+)/i;
  var tpl = {}, learnedRole = '', cubRole = '', lastTs = '';
  var RECID_RE = /record_?id["']?\s*[=:]\s*["']?(\d+)/i;
  var W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  var MAIN_HOST = 'global-autolabeling-service.evad.xiaomi.srv';
  function loadTpl() {
    try { var v = typeof GM_getValue === 'function' ? GM_getValue(LS, '{}') : localStorage.getItem(LS); return JSON.parse(v || '{}'); } catch (e) { return {}; }
  }
  tpl = loadTpl();
  function saveTpl() {
    try { var v = JSON.stringify(tpl); if (typeof GM_setValue === 'function') GM_setValue(LS, v); else localStorage.setItem(LS, v); } catch (e) {}
    updateBadge();
  }
  function abs(u) { try { return new URL(u, location.href).href; } catch (e) { return u; } }
  function toast(msg, color) {
    if (window.innerWidth < 300) return;
    var d = document.createElement('div');
    d.textContent = msg;
    d.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483647;background:' + (color || '#1a9b5f') + ';color:#fff;padding:8px 16px;border-radius:8px;font:13px sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.3)';
    (document.body || document.documentElement).appendChild(d);
    setTimeout(function () { d.remove(); }, 4000);
  }

  /* ===== 1. HỌC API DATA CENTER (chặn fetch/XHR) ===== */
  function findArr(o, d) {
    d = d || 0; if (!o || d > 5) return null;
    if (Array.isArray(o)) return o;
    var best = null;
    if (typeof o === 'object') for (var k in o) { var a = findArr(o[k], d + 1); if (a && (!best || a.length > best.length)) best = a; }
    return best;
  }
  function countCub(o, d) {
    d = d || 0; if (!o || typeof o !== 'object' || d > 14) return 0;
    if (!Array.isArray(o)) {
      var k = Object.keys(o);
      var has = function (re) { return k.some(function (x) { return re.test(x); }); };
      var typ = ['type', 'objectType', 'shape', 'toolType', 'geometryType', 'annotationType', 'className'].some(function (x) { return typeof o[x] === 'string' && /cuboid|3d/i.test(o[x]); });
      if (typ || (has(/^(center|position|centerPoint)$/i) && has(/^(size|dimension|dimensions|scale)$/i))) return 1;
    }
    var n = 0; for (var x in o) n += countCub(o[x], d + 1); return n;
  }
  function gmGet(k, d) { try { return typeof GM_getValue === 'function' ? GM_getValue(k, d) : (localStorage.getItem(k) || d); } catch (e) { return d; } }
  function gmSet(k, v) { try { if (typeof GM_setValue === 'function') GM_setValue(k, v); else localStorage.setItem(k, v); } catch (e) {} }
  var DK = 'bpo_diag_v1';
  function diagPush(ent) {
    var list = []; try { list = JSON.parse(gmGet(DK, '[]')); } catch (e) {}
    list.push(ent); if (list.length > 40) list = list.slice(-40);
    gmSet(DK, JSON.stringify(list));
  }
  function shape(o, d, path, out) {
    if (out.length > 30 || d > 5 || !o || typeof o !== 'object') return;
    if (Array.isArray(o)) {
      out.push(path + '[] len=' + o.length + (o[0] && typeof o[0] === 'object' ? ' keys=' + Object.keys(o[0]).slice(0, 14).join(',') : ''));
      if (o[0]) shape(o[0], d + 1, path + '[0]', out);
      return;
    }
    Object.keys(o).forEach(function (k) {
      var v = o[k], pp = path ? path + '.' + k : k;
      if (v && typeof v === 'object') shape(v, d + 1, pp, out); else if (d <= 2) out.push(pp + '=' + String(v).slice(0, 60));
    });
  }
  function showReport() {
    var list = []; try { list = JSON.parse(gmGet(DK, '[]')); } catch (e) {}
    var ta = document.createElement('textarea');
    ta.value = 'PAGE ' + location.href + '\n' + list.map(function (r) { return JSON.stringify(r); }).join('\n');
    ta.style.cssText = 'position:fixed;left:8px;right:8px;bottom:44px;height:40vh;z-index:2147483647;font:11px monospace;background:#fff;color:#000';
    ta.ondblclick = function () { ta.remove(); };
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
  }
  function myKey() {
    var w = window;
    for (var i = 0; i < 5; i++) {
      try {
        var h = w.location.href, a = h.match(/[?&]recordId=(\d+)/i), b = h.match(/[?&]flowId=(\d+)/i);
        if (a && b) return a[1] + ':' + b[1];
      } catch (e) {}
      if (w.parent === w) break; w = w.parent;
    }
    return '';
  }
  function countFrames(j) {
    var fr = j && j.data && j.data.frames;
    if (Array.isArray(fr)) return fr.reduce(function (n, f) { return n + ((f && f.items && f.items.length) || 0); }, 0);
    return countCub(j);
  }
  function handle(req, t, status, ct) {
    try {
      var j = null; try { j = JSON.parse(t); } catch (e) {}
      if (window.top !== window.self && /lidar\/get_result/.test(req.url || '')) {
        var ck = myKey();
        if (ck) gmSet('bpo_cub_' + ck, JSON.stringify({ n: j ? countFrames(j) : 0, t: Date.now() }));
      }
      if (j && window.top !== window.self && /lidar\/(get_frame|scene_info)/.test(req.url || '')) {
        var lk = myKey();
        if (lk) gmSet('bpo_cubload_' + lk, String(Date.now()));
      }
      if ((j !== null && t.length > 200 && !/image/i.test(ct || '')) || status >= 400) {
        var ent = { c: window.top === window.self ? 'TOP' : 'FRAME', m: req.method, u: abs(req.url).slice(0, 240), b: (req.body || '').slice(0, 400), s: status, len: t.length, head: t.slice(0, 120) };
        if (j !== null && t.length < 5e6) { ent.cub = countCub(j); if (t.length > 20000) { var sh = []; shape(j, 0, '', sh); ent.shape = sh; } }
        diagPush(ent);
      }
      if (j !== null) record(req, j);
    } catch (e2) {}
  }
  function record(req, json) {
    try {
      var rt0 = (req.url || '') + ' ' + (req.body || ''), mode = '';
      var rm = rt0.match(RECID_RE);
      if (!rm) {
        var tk = location.href.match(/record_?id[=\/:]?(\d+)|[?&\/](?:id|dataId|taskId)[=\/](\d+)/i), t0 = tk && (tk[1] || tk[2]);
        if (t0 && new RegExp('(^|[^\\d])' + t0 + '(?!\\d)').test(rt0)) { rm = [null, t0]; mode = 'token'; }
      }
      if (rm) {
        var cn = countCub(json);
        if (cn > 0) {
          var jm = ((req.url || '') + ' ' + (req.body || '')).match(JOBID_RE);
          tpl = loadTpl();
          tpl.cub = { req: { url: abs(req.url), method: req.method || 'GET', body: req.body || null, headers: req.headers || {} }, recordId: rm[1], mode: mode, jobId: jm ? jm[1] : '' };
          saveTpl(); toast('BPO Lookup: ✔ đã học cách đếm cuboid — quay lại trang Job List và bấm Tìm');
          try { if (window.top !== window.self) window.top.postMessage({ bpl: 1, key: 'cub', val: tpl.cub }, '*'); } catch (e) {}
          return;
        }
        if (JSON.stringify(json).length > 5000) console.log('[BPO Lookup] request có recordId, response lớn nhưng không đếm được cuboid:', req.url, req.body);
      }
      var arr = findArr(json);
      if (!arr || !arr.length || typeof arr[0] !== 'object') return;
      if (/G\d+-F\d+-[QL]\d+/.test(JSON.stringify(arr[0]))) return; // đây là job list, bỏ qua
      var m = ((req.url || '') + ' ' + (req.body || '')).match(JOBID_RE);
      if (!m) return;
      var keys = Object.keys(arr[0]);
      if (!CFG.ID_KEYS.concat(CFG.NAME_KEYS).some(function (k) { return keys.indexOf(k) > -1; })) return;
      tpl = loadTpl();
      tpl.data = { req: { url: req.url, method: req.method || 'GET', body: req.body || null, headers: req.headers || {} }, jobId: m[1] };
      saveTpl();
    } catch (e) {}
  }
  var origFetch = W.fetch.bind(W);
  W.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url);
    var method = (init && init.method) || (input && input.method) || 'GET';
    var body = init && typeof init.body === 'string' ? init.body : null;
    var headers = {};
    try {
      var h = init && init.headers;
      if (h && typeof h.forEach === 'function' && !Array.isArray(h)) h.forEach(function (v, k) { headers[k] = v; });
      else if (h) Object.keys(h).forEach(function (k) { headers[k] = h[k]; });
    } catch (e) {}
    var p = origFetch.apply(this, arguments);
    p.then(function (r) { var rq = { url: url, method: method, body: body, headers: headers }; r.clone().text().then(function (t) { handle(rq, t, r.status, r.headers.get('content-type')); }).catch(function () {}); }).catch(function () {});
    return p;
  };
  var X = W.XMLHttpRequest.prototype, xo = X.open, xs = X.send, xh = X.setRequestHeader;
  X.open = function (m, u) { this._r = { method: m, url: u, body: null, headers: {} }; return xo.apply(this, arguments); };
  X.setRequestHeader = function (k, v) { if (this._r) this._r.headers[k] = v; return xh.apply(this, arguments); };
  X.send = function (b) {
    var x = this;
    if (x._r) { x._r.body = typeof b === 'string' ? b : null; x.addEventListener('load', function () { var t = ''; try { t = (x.responseType === '' || x.responseType === 'text') ? x.responseText : x.responseType === 'json' ? JSON.stringify(x.response) : '[' + x.responseType + ' ' + (x.response && (x.response.byteLength || x.response.size)) + ']'; } catch (e) {} handle(x._r, t, x.status, x.getResponseHeader('content-type')); }); }
    return xs.apply(this, arguments);
  };

  /* ===== 2. LẤY TÀI KHOẢN BẰNG CÁCH PHÁT LẠI REQUEST ĐÃ HỌC ===== */
  function setKey(s, keys, val) {
    if (s == null) return s;
    keys.forEach(function (k) { s = s.replace(new RegExp('([?&,{\\s"\'])(' + k + ')(["\']?\\s*[=:]\\s*["\']?)\\d+', 'i'), '$1$2$3' + val); });
    return s;
  }
  function firstPage(s) {
    for (var i = 0; i < CFG.PAGE_KEYS.length; i++) {
      var m = (s || '').match(new RegExp('[?&,{\\s"\']' + CFG.PAGE_KEYS[i] + '["\']?\\s*[=:]\\s*["\']?(\\d+)', 'i'));
      if (m) return +m[1];
    }
    return 1;
  }
  function build(role, jobNum, page, jid) {
    var pm = (jid || '').match(/^G(\d+)-F(\d+)-/);
    var t = tpl.data.req, re = new RegExp('(job_?id["\']?\\s*[=:]\\s*["\']?)' + tpl.data.jobId, 'ig');
    var c = CFG.CYCLE[role.toLowerCase()];
    function sub(s) {
      if (s == null) return s;
      s = s.replace(re, '$1' + jobNum);
      if (pm) s = s.replace(/(project_?id["']?\s*[=:]\s*["']?)\d+/ig, '$1' + pm[1]).replace(/(flow_?id["']?\s*[=:]\s*["']?)\d+/ig, '$1' + pm[2]);
      s = s.replace(/(finished["']?\s*[=:]\s*["']?)(true|false)/ig, '$1false'); // chỉ lấy tab "To be finished"
      if (c != null && role.toLowerCase() !== learnedRole) s = s.replace(/(cycle["']?\s*[=:]\s*["']?)\d+/ig, '$1' + c);
      if (CFG.PAGE_SIZE) s = setKey(s, CFG.SIZE_KEYS, CFG.PAGE_SIZE);
      return setKey(s, CFG.PAGE_KEYS, page);
    }
    return { url: sub(t.url), body: sub(t.body) };
  }
  function findTotal(o, d) {
    d = d || 0; if (!o || typeof o !== 'object' || d > 4) return null;
    for (var k in o) { if (/^(total|totalCount|count|totalElements|totalRecords|recordCount)$/i.test(k) && typeof o[k] === 'number') return o[k]; }
    for (var k2 in o) { var v = findTotal(o[k2], d + 1); if (v != null) return v; }
    return null;
  }
  function nameOf(o) {
    var v = pick(o, CFG.NAME_KEYS);
    if (!v) for (var k in o) { if (/worker|user|assign|owner|name/i.test(k) && o[k]) { v = o[k]; break; } }
    if (v && typeof v === 'object') v = pick(v, ['userName', 'username', 'name', 'email', 'id']);
    return v;
  }
  function pick(o, keys) { for (var i = 0; i < keys.length; i++) { var v = o[keys[i]]; if (v != null && v !== '') return v; } return ''; }
  var dbg = '';
  function autoNameKey(arr) {
    var keys = Object.keys(arr[0] || {});
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (/status|time|date|type|state|url|path|label|id$/i.test(k)) continue;
      var ok = arr.filter(function (x) { return typeof x[k] === 'string' && /^[A-Za-z][\w.@-]{2,}$/.test(x[k]); }).length;
      if (ok >= arr.length / 2) return k;
    }
    return '';
  }
  function getPath(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function pickPath(arr) {
    var cnt = {}, bad = /status|time|date|type|state|url|path|project|flow|job|file|remark|desc|reason/i;
    arr.forEach(function (x) {
      (function walk(o, path, d) {
        if (d > 3 || !o || typeof o !== 'object') return;
        Object.keys(o).forEach(function (k) {
          var v = o[k], pp = path ? path + '.' + k : k;
          if (typeof v === 'string' && v && !/^\d+$/.test(v) && !/^(null|undefined|none|nil)$/i.test(v)) cnt[pp] = (cnt[pp] || 0) + 1;
          else if (v && typeof v === 'object') walk(v, pp, d + 1);
        });
      })(x, '', 0);
    });
    var pri = [/contributor\.name|current.?worker|^worker/i, /worker/i, /user.?name|account|email|operator|annotator|assign|owner|labeler/i, /name/i];
    for (var i = 0; i < pri.length; i++) {
      var best = '', bc = 0;
      Object.keys(cnt).forEach(function (q) { if (pri[i].test(q) && !bad.test(q) && cnt[q] > bc) { best = q; bc = cnt[q]; } });
      if (best) return best;
    }
    return '';
  }
  function deepName(x) {
    var c = [];
    (function walk(o, path, d) {
      if (d > 3 || !o || typeof o !== 'object') return;
      Object.keys(o).forEach(function (k) {
        var v = o[k], p = path ? path + '.' + k : k;
        if (typeof v === 'string' && v && !/^\d+$/.test(v) && !/^(null|undefined|none|nil)$/i.test(v)) c.push([p, v]);
        else if (v && typeof v === 'object') walk(v, p, d + 1);
      });
    })(x, '', 0);
    var bad = /status|time|date|type|state|url|path|project|flow|job|file|remark|desc|reason/i;
    var pri = [/worker/i, /submit|user.?name|account|email/i, /operator|annotator|assign|owner|labeler/i, /name/i];
    for (var i = 0; i < pri.length; i++) for (var j = 0; j < c.length; j++) if (pri[i].test(c[j][0]) && !bad.test(c[j][0])) return c[j][1];
    return '';
  }
  var cubBusy = 0, cubQueue = [], CUB_MAX = 6;
  function cubAcquire() { return new Promise(function (go) { if (cubBusy < CUB_MAX) { cubBusy++; go(); } else cubQueue.push(go); }); }
  function cubRelease() { var nx = cubQueue.shift(); if (nx) nx(); else cubBusy--; }
  async function directCount(recId, pid, fid) {
    var url = location.origin + '/appen/mashup/ssr/data-preview?recordId=' + recId + '&projectId=' + pid + '&role=bpo&flowId=' + fid + '&locale=en-US';
    var res1 = await origFetch(url, { credentials: 'include' });
    if (!res1.ok) return null;
    var html = (await res1.text()).replace(/\\u002F/gi, '/').replace(/\\\//g, '/');
    var m = html.match(/https?:\/\/[^"'\s\\<>]+\/api\/label\/appen\/v1\/prev_label\?[^"'\s\\<>]+/);
    if (!m) return null;
    var res2 = await origFetch(location.origin + '/appen/pointcloud/contributor_proxy/v1/lidar/get_result', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ resultUrl: m[0].replace(/&amp;/g, '&') })
    });
    if (!res2.ok) return null;
    var j = await res2.json();
    if (!j || !j.data || !Array.isArray(j.data.frames)) return null;
    return countFrames(j);
  }
  async function previewCount(job, recId) {
    await cubAcquire();
    try {
      var m = job.id.match(/^G(\d+)-F(\d+)-/);
      if (m) { try { var d = await directCount(recId, m[1], m[2]); if (d != null) return d; } catch (e) {} }
      return await previewCount1(job, recId);
    } finally { cubRelease(); }
  }
  function previewCount1(job, recId) {
    return new Promise(function (ok) {
      var m = job.id.match(/^G(\d+)-F(\d+)-/);
      if (!m) return ok('?');
      var key = 'bpo_cub_' + recId + ':' + m[2];
      var lkey = 'bpo_cubload_' + recId + ':' + m[2];
      gmSet(key, ''); gmSet(lkey, '');
      var f = document.createElement('iframe'), loaded = 0;
      f.onload = function () { loaded = Date.now(); };
      f.style.cssText = 'position:fixed;left:-10000px;top:0;width:1280px;height:800px;border:0;visibility:hidden';
      f.src = location.origin + '/appen/mashup/ssr/data-preview?recordId=' + recId + '&projectId=' + m[1] + '&role=bpo&flowId=' + m[2] + '&locale=en-US';
      var t0 = Date.now(), iv = setInterval(function () {
        var v = gmGet(key, ''), done = false, out;
        if (v) { try { out = JSON.parse(v).n; done = true; } catch (e) {} }
        else {
          var lt = +gmGet(lkey, '0');
          if (lt && Date.now() - lt > 25000) { out = 0; done = true; }
          else if (Date.now() - t0 > 60000) { out = '?'; done = true; }
        }
        if (done) { clearInterval(iv); f.remove(); gmSet(key, ''); gmSet(lkey, ''); ok(out); }
      }, 400);
      document.body.appendChild(f);
    });
  }
  async function fillCub(job, list) {
    list.forEach(function (x) { x.cub = '…'; }); render();
    var i = 0;
    await Promise.all([0, 1, 2, 3].map(async function () {
      while (i < list.length) {
        var x = list[i++];
        try { x.cub = await previewCount(job, x.id); } catch (e) { x.cub = '?'; }
        render();
      }
    }));
  }
    async function fetchAccounts(role, jobNum, jid) {
    var t = tpl.data.req, out = [], seen = {}, nk = '', nkLogged = 0, total = null, sz = 10;
    var headers = {};
    Object.keys(t.headers || {}).forEach(function (k) { if (!/^content-length$/i.test(k)) headers[k] = t.headers[k]; });
    var m = ((t.url || '') + (t.body || '')).match(/[?&,{\s"']pageSize["']?\s*[=:]\s*["']?(\d+)/i);
    if (CFG.PAGE_SIZE) sz = CFG.PAGE_SIZE; else if (m) sz = +m[1];
    for (var page = 0; page < 40; page++) {
      var r = build(role, jobNum, page, jid), j;
      try {
        var res = await origFetch(r.url, { method: t.method, headers: headers, body: t.method === 'GET' ? undefined : r.body, credentials: 'include' });
        j = await res.json();
      } catch (e) { if (page === 0) continue; throw e; }
      var arr = (findArr(j) || []).filter(function (x) { return x && typeof x === 'object'; });
      dbg = 'URL ' + String(r.url).slice(0, 160) + (r.body ? ' | body ' + String(r.body).slice(0, 160) : '') + ' | keys: ' + (j && typeof j === 'object' ? Object.keys(j).join(',') : typeof j) + ' | mẫu: ' + String(JSON.stringify(arr[0])).slice(0, 200);
      var tt = findTotal(j); if (tt != null) total = tt;
      if (arr.length && !nk) {
        nk = pickPath(arr);
        if (!nk && !nkLogged) { nkLogged = 1; console.log('[BPO Lookup] mẫu 1 record:', JSON.stringify(arr[0])); }
      }
      var fresh = 0;
      arr.forEach(function (x) {
        var id = String(pick(x, CFG.ID_KEYS));
        if (seen[id]) return; seen[id] = 1; fresh++;
        var nm = nk ? getPath(x, nk) : '';
        if (nm == null || /^(null|undefined)$/i.test(String(nm))) nm = '';
        if (nm && typeof nm === 'object') nm = pick(nm, ['userName', 'username', 'name', 'email']);
        out.push({ id: id, name: String(nm == null ? '' : nm) });
      });
      if (total != null && out.length >= total) break;
      if (page >= 1 && arr.length < sz) break;
      if (page >= 2 && fresh === 0) break;
    }
    if (total != null && out.length < total) out.note = 'Chỉ lấy được ' + out.length + '/' + total + ' (tham số trang không đổi được).';
    return out;
  }

  /* ===== 3. TÌM JOB TRÊN BẢNG BPO JOB LIST (qua DOM) ===== */
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function parts(n) { var m = n.match(SUF); return { base: n.replace(SUF, '').trim(), role: m ? m[1].toLowerCase() : '' }; }
  function findInput(label) {
    var it = [].slice.call(document.querySelectorAll('.ant-form-item')).filter(function (x) { var l = x.querySelector('label'); return l && l.textContent.trim() === label; })[0];
    return it && it.querySelector('input');
  }
  function readRows() {
    return [].slice.call(document.querySelectorAll('table tbody tr')).map(function (tr) {
      return [].map.call(tr.querySelectorAll('td'), function (td) { return td.textContent.trim(); });
    }).filter(function (c) { return c.length >= 6 && /^G\d+-F\d+-[QL]\d+$/.test(c[0]); })
      .map(function (c) { return { id: c[0], name: c[1], type: c[2], status: c[3], time: c[4], contact: c[5] }; });
  }
  async function searchJobs(q) {
    var inp = findInput('Job Name');
    if (!inp) throw new Error('Không thấy ô Job Name — hãy mở trang BPO Job List.');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(inp, q);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    var btn = [].slice.call(document.querySelectorAll('button')).filter(function (b) { return b.textContent.replace(/\s/g, '') === 'Search'; })[0];
    if (!btn) throw new Error('Không thấy nút Search.');
    btn.click();
    var prev = '', same = 0;
    for (var i = 0; i < 25 && same < 2; i++) {
      await sleep(300);
      var sig = JSON.stringify(readRows()) + document.querySelectorAll('.ant-spin-spinning').length;
      same = (sig === prev && !document.querySelector('.ant-spin-spinning')) ? same + 1 : 0; prev = sig;
    }
    return readRows().filter(function (r) { return r.name.indexOf(q) === 0 || parts(r.name).base === q; });
  }

  /* ===== 4. GIAO DIỆN ===== */
  var res = [], panel, $, CSS_TEXT = '';
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function css() {
    var s = document.createElement('style');
    CSS_TEXT = '#bpl{position:fixed;right:16px;bottom:16px;width:min(1100px,94vw);max-height:80vh;overflow:auto;z-index:99999;background:#fff;color:#1d2330;border:1px solid #cfd5df;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.25);font:13px/1.5 -apple-system,Segoe UI,Roboto,sans-serif}' +
      '#bpl .h{padding:8px 12px;background:#1c7a70;color:#fff;font-weight:600;cursor:move;display:flex;justify-content:space-between;border-radius:12px 12px 0 0;position:sticky;top:0;z-index:2}' +
      '#bpl .b{padding:10px 12px}#bpl.min .b{display:none}' +
      '#bpl input{padding:6px 10px;border:1px solid #cfd5df;border-radius:6px;width:min(560px,100%);color:#1d2330;background:#fff}' +
      '#bpl button{padding:6px 10px;border:1px solid #cfd5df;border-radius:6px;background:#f4f6fa;color:#1d2330;cursor:pointer;margin-left:4px}#bpl button.p{background:#1c7a70;color:#fff;border-color:#1c7a70}' +
      '#bpl .g{border:1px solid #e2e5ea;border-radius:10px;margin-top:10px;overflow:hidden}#bpl .gh{padding:8px 10px;background:#edf6f4;font-weight:600;word-break:break-all}' +
      '#bpl .c{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}#bpl .j{padding:8px 10px;border-right:1px solid #e2e5ea;min-width:0}#bpl .j:last-child{border-right:0}' +
      '#bpl .r{background:#e0f0ee;color:#1c7a70;border-radius:99px;padding:1px 8px;font-weight:600;font-size:12px}#bpl .m{color:#667085;font-size:12px;margin:4px 0;word-break:break-all}' +
      '#bpl .w{color:#c27a0a}#bpl .s{max-height:240px;overflow:auto;border:1px solid #e2e5ea;border-radius:6px}' +
      '#bpl table{border-collapse:collapse;width:100%}#bpl th,#bpl td{padding:3px 6px;border-bottom:1px solid #e2e5ea;text-align:left;white-space:nowrap}#bpl th{background:#edf6f4;position:sticky;top:0}' +
      '#bpl th:first-child,#bpl td:first-child{width:1%;padding-right:2px;color:#667085}#bpl th:nth-child(2),#bpl td:nth-child(2){width:1%;padding-right:16px}' +
      '@media(max-width:860px){#bpl .c{grid-template-columns:1fr}}';
    CSS_TEXT += '#bpl .cp{padding:0 4px;margin-left:4px;font-size:11px}#bpl.full{max-height:none!important;overflow:visible!important}#bpl.full .s{max-height:none!important;overflow:visible!important}';
    s.textContent = CSS_TEXT;
    document.head.appendChild(s);
  }
  function cubSum(a) { var s = 0, ok = false; a.forEach(function (x) { if (typeof x.cub === 'number') { s += x.cub; ok = true; } }); return ok ? ' · ' + s + ' cuboid' : ''; }
  function badge() { return !tpl.data ? '<span class="w">● Chưa học API Data Center — mở trang Data Center của 1 job bất kỳ một lần</span>' : ''; }
  function updateBadge() { var e = $ && $('#bpl-badge'); if (e) e.innerHTML = badge(); var rb = $ && $('#bpl-rst'); if (rb) rb.style.display = tpl.data ? 'none' : ''; }
  function jobHtml(role, j) {
    if (!j) return '<div class="j"><span class="r">' + role + '</span><p class="w">Không tìm thấy job này.</p></div>';
    var a = j.accounts, body;
    if (j.err) body = '<div class="w">Lỗi: ' + esc(j.err) + '</div>';
    else if (!a) body = '<div class="m">' + (tpl.data ? 'Đang tải…' : 'Chưa có API Data Center.') + '</div>';
    else if (!a.length) body = '<div class="w">Không có tài khoản.</div>';
    else body = (a.note ? '<div class="w">' + esc(a.note) + '</div>' : '') + '<div><b>Còn ' + a.length + ' tài khoản' + cubSum(a) + '</b></div><div class="s"><table><tr><th>#</th><th>ID</th><th>Tên tài khoản</th><th>Cuboid <button class="cp" data-copy="' + esc(j.id) + '" title="Copy cột Cuboid theo thứ tự">📋</button></th></tr>' +
      a.map(function (x, i) { return '<tr><td>' + (i + 1) + '</td><td>' + esc(x.id) + '</td><td>' + (x.name ? esc(x.name) : '<span style="color:#98a2b3">—</span>') + '</td><td>' + (x.cub == null ? '' : esc(x.cub)) + '</td></tr>'; }).join('') + '</table></div>';
    return '<div class="j"><span class="r">' + role + '</span><div class="m">' + esc(j.id) + ' · ' + esc(j.status) + '</div>' + body + '</div>';
  }
  function render() {
    $('#bpl-out').innerHTML = res.map(function (g) {
      return '<div class="g"><div class="gh">' + esc(g.base) + '</div><div class="c">' + ROLES.map(function (r) { return jobHtml(r, g.jobs[r.toLowerCase()]); }).join('') + '</div></div>';
    }).join('');
  }
  function log(t) { $('#bpl-log').textContent = t; }
  async function run() {
    var q = $('#bpl-q').value.trim(); if (!q) return;
    tpl = loadTpl();
    updateBadge();
    res = []; render(); lastTs = new Date().toLocaleString('vi-VN');
    try {
      log('Đang tìm job…');
      var rows = await searchJobs(q), g = {};
      rows.forEach(function (r) { var p = parts(r.name); (g[p.base] = g[p.base] || {})[p.role] = r; });
      res = Object.keys(g).map(function (b) { return { base: b, jobs: g[b] }; });
      render();
      if (!rows.length) { log('Không thấy job nào khớp tên.'); return; }
      if (!tpl.data) { log('Đã tìm thấy job. Chưa học được API Data Center nên chưa có tài khoản.'); return; }
      var n = 0;
      learnedRole = '';
      res.forEach(function (g) { ROLES.forEach(function (r) { var jj = g.jobs[r.toLowerCase()]; if (jj && jj.id.match(/(\d+)$/)[1] === tpl.data.jobId) learnedRole = r.toLowerCase(); }); });
      cubRole = '';
      if (tpl.cub && tpl.cub.jobId) res.forEach(function (g) { ROLES.forEach(function (r) { var jj = g.jobs[r.toLowerCase()]; if (jj && jj.id.match(/(\d+)$/)[1] === tpl.cub.jobId) cubRole = r.toLowerCase(); }); });
      var tasks = [];
      log('Đang lấy dữ liệu…');
      res.forEach(function (g) {
        ROLES.forEach(function (r) {
          var j = g.jobs[r.toLowerCase()]; if (!j) return;
          tasks.push((async function () {
            try { var jn = j.id.match(/(\d+)$/)[1]; j.accounts = await fetchAccounts(r, jn, j.id); render(); await fillCub(j, j.accounts); } catch (e) { j.err = e.message; }
            render();
          })());
        });
      });
      await Promise.all(tasks);
      log('Dữ liệu lúc ' + lastTs);
    } catch (e) { log('Lỗi: ' + e.message); }
  }
  function copyText(t) {
    function fb() { var ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); }
    try { navigator.clipboard.writeText(t).catch(fb); } catch (e) { fb(); }
  }
  function showShot(dataUrl) {
    var ov = document.createElement('div'), tip = document.createElement('div'), im = new Image(), bt = document.createElement('button');
    ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483647;background:rgba(0,0,0,.6);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px';
    tip.style.cssText = 'color:#fff;font:13px sans-serif;text-align:center;padding:0 12px';
    tip.textContent = 'Chuột phải vào ảnh → Sao chép hình ảnh';
    im.style.cssText = 'max-width:92vw;max-height:78vh;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.5)';
    bt.textContent = 'Đóng'; bt.style.cssText = 'padding:5px 18px;border-radius:6px;border:0;cursor:pointer';
    bt.onclick = function () { ov.remove(); };
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    ov.appendChild(tip); ov.appendChild(im); ov.appendChild(bt);
    im.onload = function () { document.body.appendChild(ov); };
    im.src = dataUrl;
  }
  function shot() {
    if (!res.length) { log('Chưa có kết quả để chụp.'); return; }
    var out = $('#bpl-out'), w = Math.ceil(out.getBoundingClientRect().width);
    var c = document.createElement('div');
    c.id = 'bpl'; c.className = 'full';
    c.appendChild(out.cloneNode(true));
    [].forEach.call(c.querySelectorAll('.cp'), function (b) { b.remove(); });
    var base = 'max-height:none;overflow:visible;border:0;border-radius:0;box-shadow:none;padding:2px;background:#fff;width:' + w + 'px;';
    c.style.cssText = 'position:fixed;left:-99999px;top:0;' + base;
    document.body.appendChild(c);
    var h = Math.ceil(c.getBoundingClientRect().height) + 2;
    c.style.cssText = 'position:static;' + base;
    var xml = new XMLSerializer().serializeToString(c);
    c.remove();
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '"><foreignObject x="0" y="0" width="' + w + '" height="' + h + '"><style>' + CSS_TEXT + '</style>' + xml + '</foreignObject></svg>';
    var img = new Image();
    img.onload = function () {
      var k = Math.min(1.5, 16000 / h), cv = document.createElement('canvas');
      cv.width = Math.round(w * k); cv.height = Math.round(h * k);
      var g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.scale(k, k); g.drawImage(img, 0, 0);
      showShot(cv.toDataURL('image/png'));
    };
    img.onerror = function () { log('Lỗi khi chụp ảnh.'); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function mount() {
    css();
    panel = document.createElement('div'); panel.id = 'bpl';
    panel.innerHTML = '<div class="h" id="bpl-h"><span>🔎 BPO Job Lookup</span><span id="bpl-t" style="cursor:pointer">–</span></div>' +
      '<div class="b"><span style="position:relative;display:inline-block;width:min(560px,100%)"><input id="bpl-q" style="width:100%;padding-right:28px" placeholder="Nhập tên job gốc, ví dụ: 行车-周视OD-L-1102-4-v1.1.0-同源-路口通行"><button id="bpl-x" title="Xóa" style="display:none;position:absolute;right:4px;top:50%;transform:translateY(-50%);border:0;background:transparent;padding:2px 6px;font-size:14px;color:#667085">✕</button></span><button class="p" id="bpl-go">Tìm</button><button id="bpl-shot">📷 Chụp ảnh</button><button id="bpl-log2">📋 Log</button><button id="bpl-clr">Xóa log</button><button id="bpl-rst" title="Xóa API đã học">Reset API</button>' +
      '<div class="m" id="bpl-badge"></div><div class="m" id="bpl-log"></div><div id="bpl-out"></div></div>';
    document.body.appendChild(panel);
    $ = function (s) { return panel.querySelector(s); };
    updateBadge();
    $('#bpl-go').onclick = run; $('#bpl-shot').onclick = shot; $('#bpl-log2').onclick = showReport; $('#bpl-clr').onclick = function () { gmSet(DK, '[]'); log('Đã xóa log.'); };
    $('#bpl-q').addEventListener('input', function () { $('#bpl-x').style.display = this.value ? '' : 'none'; });
    $('#bpl-x').onclick = function () { var q = $('#bpl-q'); q.value = ''; this.style.display = 'none'; q.focus(); };
    $('#bpl-out').addEventListener('click', function (e) {
      var id = e.target.getAttribute && e.target.getAttribute('data-copy'); if (!id) return;
      var vals = [];
      res.forEach(function (g) { ROLES.forEach(function (r) { var j = g.jobs[r.toLowerCase()]; if (j && j.id === id && j.accounts) vals = j.accounts.map(function (x) { return x.cub == null ? '' : x.cub; }); }); });
      copyText(vals.join('\n')); log('Đã copy ' + vals.length + ' giá trị cuboid theo thứ tự bảng');
    });
    $('#bpl-rst').onclick = function () { tpl = {}; saveTpl(); };
    $('#bpl-q').addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
    $('#bpl-t').onclick = function () { panel.classList.toggle('min'); };
    var h = $('#bpl-h'), dx, dy, drag = false;
    h.addEventListener('mousedown', function (e) { drag = true; var r = panel.getBoundingClientRect(); dx = e.clientX - r.left; dy = e.clientY - r.top; });
    document.addEventListener('mousemove', function (e) { if (!drag) return; panel.style.left = (e.clientX - dx) + 'px'; panel.style.top = (e.clientY - dy) + 'px'; panel.style.right = 'auto'; panel.style.bottom = 'auto'; });
    document.addEventListener('mouseup', function () { drag = false; });
  }
  if (/data-preview|lidar/.test(location.pathname)) [6000, 15000].forEach(function (ms) {
    setTimeout(function () {
      try {
        var h = document.documentElement.innerHTML, mm = h.match(/[^"'\s]{0,120}(manifest_|prev_label)[^"'\s]{0,160}/g) || [];
        diagPush({ c: 'DOM', t: ms, u: location.href.slice(0, 200), frames: document.querySelectorAll('iframe').length, urls: mm.slice(0, 4), head: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 300) });
      } catch (e) {}
    }, ms);
  });
  window.addEventListener('storage', function (e) { if (e.key === LS) { try { tpl = JSON.parse(e.newValue || '{}'); } catch (x) {} updateBadge(); } });
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (window.top === window.self && d && d.bpl === 1 && d.key === 'cub' && d.val && d.val.req && typeof d.val.req.url === 'string') { tpl.cub = d.val; saveTpl(); }
  });
  if (window.top === window.self && location.host === MAIN_HOST) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount(); }
})();
