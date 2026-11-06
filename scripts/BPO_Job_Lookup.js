// ==UserScript==
// @name         BPO Job Lookup
// @namespace    bpo-job-lookup
// @version      1.7
// @description  Tra cứu job/tài khoản/cuboid — chạy trên mọi trang web, gọi API trực tiếp (không thao tác giao diện)
// @match        *://*/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      *
// ==/UserScript==
(function () {
  'use strict';
  // Chạy ở mọi trang (top window). Iframe chỉ chạy khi thuộc host chính (để học API cuboid).
  var MAIN_HOST = 'global-autolabeling-service.evad.xiaomi.srv';
  var ON_MAIN = location.host === MAIN_HOST;
  if (!ON_MAIN && window.top !== window.self) return;

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
  function loadTpl() {
    try { var v = typeof GM_getValue === 'function' ? GM_getValue(LS, '{}') : localStorage.getItem(LS); return JSON.parse(v || '{}'); } catch (e) { return {}; }
  }
  tpl = loadTpl();
  function saveTpl() {
    try { var v = JSON.stringify(tpl); if (typeof GM_setValue === 'function') GM_setValue(LS, v); else localStorage.setItem(LS, v); } catch (e) {}
    updateBadge();
  }
  function abs(u) { try { return new URL(u, location.href).href; } catch (e) { return u; } }

  /* ===== Gọi request: cùng origin → fetch; khác origin (đang ở web khác) → GM_xmlhttpRequest ===== */
  function ORI() {
    if (ON_MAIN) return location.origin;
    var o = tpl && ((tpl.data && tpl.data.origin) || (tpl.list && tpl.list.origin));
    return o || 'https://' + MAIN_HOST;
  }
  function absMain(u) { try { return new URL(u, ORI() + '/').href; } catch (e) { return u; } }
  function xf(url, o) {
    o = o || {};
    var method = o.method || 'GET', hd = {}, org = '', cross = false;
    Object.keys(o.headers || {}).forEach(function (k) { if (!/^(content-length|host|cookie|origin|referer|user-agent)$/i.test(k)) hd[k] = o.headers[k]; });
    try { org = new URL(url).origin; cross = org !== location.origin; } catch (e) {}
    if (!cross || typeof GM_xmlhttpRequest !== 'function') {
      return origFetch(url, { method: method, headers: hd, body: method === 'GET' ? undefined : o.body, credentials: 'include' })
        .then(function (r) { return r.text().then(function (t) { return { ok: r.ok, status: r.status, text: t }; }); });
    }
    hd.Origin = org; hd.Referer = org + '/';
    return new Promise(function (ok, bad) {
      GM_xmlhttpRequest({
        method: method, url: url, headers: hd, data: method === 'GET' ? undefined : o.body, withCredentials: true, timeout: 60000,
        onload: function (r) { ok({ ok: r.status >= 200 && r.status < 300, status: r.status, text: r.responseText || '' }); },
        onerror: function () { bad(new Error('Lỗi mạng khi gọi ' + org)); },
        ontimeout: function () { bad(new Error('Hết thời gian chờ ' + org)); }
      });
    });
  }

  /* ===== API tìm job (thay cho thao tác giao diện) ===== */
  function eachKV(o, f, d) {
    d = d || 0; if (!o || typeof o !== 'object' || d > 3) return;
    Object.keys(o).forEach(function (k) { var v = o[k]; if (v && typeof v === 'object') eachKV(v, f, d + 1); else f(k, v, o); });
  }
  function parseReq(r) {
    var q = null, b = null, bj = false;
    try { q = new URL(r.url); } catch (e) {}
    if (r.body) { try { b = JSON.parse(r.body); bj = !!b && typeof b === 'object'; if (!bj) b = null; } catch (e) { try { b = new URLSearchParams(r.body); } catch (e2) {} } }
    return { q: q, b: b, bj: bj };
  }
  function rowOf(x) {
    var r = { id: '', name: '', type: '', status: '', time: '', contact: '' }, st = '', stName = '', names = [], role = '';
    (function walk(o, d) {
      if (d > 2 || !o || typeof o !== 'object') return;
      Object.keys(o).forEach(function (k) {
        var v = o[k];
        if (v && typeof v === 'object') { walk(v, d + 1); return; }
        if (typeof v === 'string') {
          if (!r.id && /^G\d+-F\d+-[QL]\d+$/.test(v)) r.id = v;
          else if (/name/i.test(k) && !/user|worker|contact|owner|creator|operator/i.test(k) && v) names.push(v);
          if (/^(Labeling Job|1 Round QA|2 Round QA)$/i.test(v)) role = v;
        }
        if (v != null && v !== '' && /status|state/i.test(k)) { if (/name|desc|text|label/i.test(k)) stName = String(v); else if (!st) st = String(v); }
        else if (v != null && /time|date/i.test(k) && !r.time) r.time = String(v);
      });
    })(x, 0);
    var nm = names.filter(function (n) { return SUF.test(n); })[0] || names[0] || '';
    if (nm && !SUF.test(nm) && role) nm += ' ' + role;
    r.name = nm; r.type = role; r.status = stName || st;
    return r.id && r.name ? r : null;
  }
  function findNameKey(req, rows) {
    var p = parseReq(req), best = '';
    function chk(k, v) { if (typeof v !== 'string' || !v || /^\d+$/.test(v)) return; if (rows.every(function (r) { return r.name.indexOf(v) >= 0; }) && (!best || /name/i.test(k))) best = k; }
    if (p.q) p.q.searchParams.forEach(function (v, k) { chk(k, v); });
    if (p.b) { if (p.bj) eachKV(p.b, chk); else p.b.forEach(function (v, k) { chk(k, v); }); }
    return best;
  }
  function learnList(req, arr) {
    try {
      var u = abs(req.url || ''); if (!/^https?:/.test(u)) return;
      var rows = arr.filter(function (x) { return x && typeof x === 'object'; }).map(rowOf).filter(Boolean);
      if (!rows.length) return;
      var r = { url: u, method: req.method || 'GET', body: req.body || null, headers: req.headers || {} };
      var nk = findNameKey(r, rows);
      tpl = loadTpl();
      if (tpl.list && tpl.list.nameKey && !nk) return; // giữ mẫu đã biết tham số tên job
      tpl.list = { req: r, nameKey: nk, origin: new URL(u).origin };
      saveTpl();
    } catch (e) {}
  }
  function applyList(t, q, page) {
    var rq = t.req, key = t.nameKey || '', done = false, p = parseReq(rq);
    var GU = key ? [key] : ['jobName', 'job_name', 'name', 'keyword', 'keywords', 'searchKey', 'search'];
    if (p.q) GU.forEach(function (k) { if (!done && p.q.searchParams.has(k)) { p.q.searchParams.set(k, q); done = true; } });
    if (!done && p.b) {
      if (p.bj) eachKV(p.b, function (k, v, o) { if (!done && GU.indexOf(k) > -1) { o[k] = q; done = true; } });
      else GU.forEach(function (k) { if (!done && p.b.has(k)) { p.b.set(k, q); done = true; } });
    }
    if (!done) throw new Error('Chưa xác định được tham số tên job — mở BPO Job List, nhập tên job rồi Search 1 lần để học lại.');
    var url = p.q ? p.q.href : rq.url, body = p.b ? (p.bj ? JSON.stringify(p.b) : p.b.toString()) : rq.body;
    url = setKey(url, CFG.PAGE_KEYS, page);
    if (body) body = setKey(body, CFG.PAGE_KEYS, page);
    return { url: url, body: body };
  }
  async function searchApi(q) {
    var t = tpl.list, out = [], seen = {}, total = null, sz = 10;
    var m = ((t.req.url || '') + ' ' + (t.req.body || '')).match(/[?&,{\s"']pageSize["']?\s*[=:]\s*["']?(\d+)/i); if (m) sz = +m[1];
    var p0 = firstPage((t.req.url || '') + ' ' + (t.req.body || ''));
    for (var p = p0; p < p0 + 20; p++) {
      var r = applyList(t, q, p);
      var rs = await xf(r.url, { method: t.req.method, headers: t.req.headers, body: r.body });
      var j = JSON.parse(rs.text), arr = (findArr(j) || []).filter(function (x) { return x && typeof x === 'object'; }), fresh = 0;
      arr.map(rowOf).filter(Boolean).forEach(function (x) { if (seen[x.id]) return; seen[x.id] = 1; fresh++; out.push(x); });
      var tt = findTotal(j); if (tt != null) total = tt;
      if (total != null && out.length >= total) break;
      if (arr.length < sz || !fresh) break;
    }
    return out.filter(function (r) { return r.name.indexOf(q) === 0 || parts(r.name).base === q; });
  }
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
  // Các key phân biệt cuboid — compile 1 lần
  var CUB_TYPE_KEYS = ['type', 'objectType', 'shape', 'toolType', 'geometryType', 'annotationType', 'className'];
  var CUB_CENTER_RE = /^(center|position|centerPoint)$/i;
  var CUB_SIZE_RE   = /^(size|dimension|dimensions|scale)$/i;
  function countCub(o, d) {
    d = d || 0; if (!o || typeof o !== 'object' || d > 10) return 0;
    if (!Array.isArray(o)) {
      // Kiểm tra type trước (nhanh, early-exit)
      for (var ti = 0; ti < CUB_TYPE_KEYS.length; ti++) {
        var tv = o[CUB_TYPE_KEYS[ti]];
        if (typeof tv === 'string' && /cuboid|3d/i.test(tv)) return 1;
      }
      // Kiểm tra center+size
      var hasCenter = false, hasSize = false;
      var ks = Object.keys(o);
      for (var ki = 0; ki < ks.length; ki++) {
        if (CUB_CENTER_RE.test(ks[ki])) hasCenter = true;
        else if (CUB_SIZE_RE.test(ks[ki])) hasSize = true;
        if (hasCenter && hasSize) return 1;
      }
    }
    // Tối ưu array: nếu array đồng nhất (item đầu là cuboid) → nhân length
    if (Array.isArray(o) && o.length > 1 && o[0] && typeof o[0] === 'object') {
      var sample = countCub(o[0], d + 1);
      if (sample === 1) return o.length; // tất cả item cùng loại
    }
    var n = 0;
    for (var x in o) {
      var v = o[x];
      if (v && typeof v === 'object') n += countCub(v, d + 1);
    }
    return n;
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
      if (/G\d+-F\d+-[QL]\d+/.test(JSON.stringify(arr[0]))) { learnList(req, arr); return; } // job list → học API tìm job
      var m = ((req.url || '') + ' ' + (req.body || '')).match(JOBID_RE);
      if (!m) return;
      var keys = Object.keys(arr[0]);
      if (!CFG.ID_KEYS.concat(CFG.NAME_KEYS).some(function (k) { return keys.indexOf(k) > -1; })) return;
      tpl = loadTpl();
      tpl.data = { req: { url: abs(req.url), method: req.method || 'GET', body: req.body || null, headers: req.headers || {} }, jobId: m[1], origin: (function () { try { return new URL(abs(req.url)).origin; } catch (e) { return ''; } })() };
      saveTpl();
    } catch (e) {}
  }
  var origFetch = W.fetch.bind(W);
  if (ON_MAIN) {
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
  }

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
    return { url: sub(absMain(t.url)), body: sub(t.body) };
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
  function sem(max) {
    var busy = 0, q = [], s = { max: max };
    // prio nhỏ chạy trước (0 = Labeling Job, 1 = 1 Round QA, 2 = 2 Round QA); cùng prio theo thứ tự đến
    s.acquire = function (prio) {
      prio = prio || 0;
      return new Promise(function (go) {
        if (busy < s.max && !q.length) { busy++; go(); return; }
        var i = q.length; while (i > 0 && q[i - 1].p > prio) i--;
        q.splice(i, 0, { p: prio, go: go });
      });
    };
    s.release = function () { busy--; while (q.length && busy < s.max) { busy++; q.shift().go(); } };
    return s;
  }
  // 48 request song song; nếu server báo quá tải (429/5xx) tự giảm xuống, tối thiểu 8
  var directSem = sem(48), frameSem = sem(4), dFail = 0;
  function throttle() { directSem.max = Math.max(8, Math.floor(directSem.max * 0.6)); }
  var cubCache = {}, cubInflight = {}, CUB_TTL = 30000;
  function dfail(rec, why, extra) {
    if (dFail++ < 4) diagPush({ c: 'DIRECT', rec: rec, why: why, extra: String(extra || '').slice(0, 500) });
    return null;
  }
  function normHtml(t) { return t.replace(/\\u002F/gi, '/').replace(/\\u0026/gi, '&').replace(/\\\//g, '/').replace(/&amp;/g, '&'); }
  var RE_PREV = /https?:\/\/[^"'\s\\<>]+\/api\/label\/appen\/v1\/prev_label\?[^"'\s\\<>]+/;
  var RE_MANI = /(https?:\/\/[^"'\s\\<>]+\/api\/label\/appen\/v1\/)manifest\?uuid=([^&"'\s\\<>]+)&name=manifest_([^&"'\s\\<>]+?\.json)/;
  // lookahead: chỉ chấp nhận khi phía sau còn đủ ký tự (tránh URL bị cắt giữa chunk)
  function findResultUrl(h, final) {
    var m = h.match(RE_PREV);
    if (m && (final || m.index + m[0].length + 8 <= h.length)) return m[0];
    var mf = h.match(RE_MANI);
    if (mf && (final || mf.index + mf[0].length + 8 <= h.length)) return mf[1] + 'prev_label?uuid=' + mf[2] + '&name=prev_label_' + mf[3];
    return '';
  }
  function httpErr(st) { var e = new Error('html status ' + st); e.status = st; return e; }
  // Lấy resultUrl: cùng origin → đọc stream và DỪNG ngay khi thấy link (không tải hết trang HTML)
  async function getResultUrl(url) {
    var cross = true; try { cross = new URL(url).origin !== location.origin; } catch (e) {}
    if (!cross) {
      var r = await origFetch(url, { credentials: 'include' });
      if (!r.ok) throw httpErr(r.status);
      var rd = r.body && r.body.getReader && r.body.getReader();
      if (rd) {
        var dec = new TextDecoder(), raw = '';
        for (;;) {
          var c = await rd.read();
          if (c.done) break;
          raw += dec.decode(c.value, { stream: true });
          var u = findResultUrl(normHtml(raw), false);
          if (u) { try { rd.cancel(); } catch (e) {} return { url: u }; }
        }
        var h1 = normHtml(raw); return { url: findResultUrl(h1, true), html: h1 };
      }
      var h2 = normHtml(await r.text()); return { url: findResultUrl(h2, true), html: h2 };
    }
    var r2 = await xf(url);
    if (!r2.ok) throw httpErr(r2.status);
    var h3 = normHtml(r2.text); return { url: findResultUrl(h3, true), html: h3 };
  }
  async function directCount(recId, pid, fid) {
    var url = ORI() + '/appen/mashup/ssr/data-preview?recordId=' + recId + '&projectId=' + pid + '&role=bpo&flowId=' + fid + '&locale=en-US';
    for (var at = 0; at < 3; at++) {
      try {
        var g = await getResultUrl(url);
        if (!g.url) {
          var html = g.html || '', ix = html.search(/prev_label|manifest/i);
          return dfail(recId, 'no url in html', 'len=' + html.length + ' idx=' + ix + ' ctx=' + (ix >= 0 ? html.slice(Math.max(0, ix - 150), ix + 250) : html.slice(0, 300)));
        }
        var res2 = await xf(ORI() + '/appen/pointcloud/contributor_proxy/v1/lidar/get_result', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resultUrl: g.url })
        });
        if (res2.status === 429 || res2.status >= 500) { throttle(); await sleep(250 * (at + 1)); continue; }
        var txt = res2.text, j = null;
        try { j = JSON.parse(txt); } catch (e) {}
        if (!res2.ok) return dfail(recId, 'get_result status ' + res2.status, txt.slice(0, 300));
        if (!j || !j.data || !Array.isArray(j.data.frames)) return dfail(recId, 'result shape', txt.slice(0, 300));
        return countFrames(j);
      } catch (e) {
        if (e && e.status && e.status !== 429 && e.status < 500) return dfail(recId, 'html status ' + e.status);
        if (e && e.status) throttle();
        await sleep(250 * (at + 1));
      }
    }
    return dfail(recId, 'retry exhausted');
  }
  function previewCount(job, recId) {
    var c = cubCache[recId];
    if (c && Date.now() - c.t < CUB_TTL) return Promise.resolve(c.n);
    if (cubInflight[recId]) return cubInflight[recId];
    var p = previewCount0(job, recId).then(function (n) { if (typeof n === 'number') cubCache[recId] = { n: n, t: Date.now() }; delete cubInflight[recId]; return n; },
      function (e) { delete cubInflight[recId]; throw e; });
    return (cubInflight[recId] = p);
  }
  async function previewCount0(job, recId) {
    var m = job.id.match(/^G(\d+)-F(\d+)-/);
    if (m) {
      await directSem.acquire(job.prio);
      try { var d = await directCount(recId, m[1], m[2]); if (d != null) return d; }
      catch (e) { dfail(recId, 'exception', e && e.message); }
      finally { directSem.release(); }
    }
    await frameSem.acquire(job.prio);
    try { return await previewCount1(job, recId); } finally { frameSem.release(); }
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
      f.src = ORI() + '/appen/mashup/ssr/data-preview?recordId=' + recId + '&projectId=' + m[1] + '&role=bpo&flowId=' + m[2] + '&locale=en-US';
      var t0 = Date.now(), iv = setInterval(function () {
        var v = gmGet(key, ''), done = false, out;
        if (v) { try { out = JSON.parse(v).n; done = true; } catch (e) {} }
        else {
          var lt = +gmGet(lkey, '0');
          if (lt && Date.now() - lt > 15000) { out = 0; done = true; } // giảm 25s → 15s
          else if (Date.now() - t0 > 45000) { out = '?'; done = true; } // giảm 60s → 45s
        }
        if (done) { clearInterval(iv); f.remove(); gmSet(key, ''); gmSet(lkey, ''); ok(out); }
      }, 150); // poll nhanh hơn: 400ms → 150ms
      document.body.appendChild(f);
    });
  }
  async function fillCub(job, list) {
    list.forEach(function (x) { x.cub = '…'; }); render();
    var renderScheduled = false;
    function scheduleRender() {
      if (renderScheduled) return;
      renderScheduled = true;
      requestAnimationFrame(function () { renderScheduled = false; render(); });
    }
    // Phát toàn bộ bài cùng lúc; directSem (toàn cục, tự điều chỉnh) giới hạn số request thật sự chạy song song
    await Promise.all(list.map(function (x) {
      return previewCount(job, x.id).then(function (n) { x.cub = n; }, function () { x.cub = '?'; }).then(scheduleRender);
    }));
    render();
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
        var res = await xf(r.url, { method: t.method, headers: headers, body: t.method === 'GET' ? undefined : r.body });
        j = JSON.parse(res.text);
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
  // Ưu tiên gọi API đã học (chạy ở mọi trang). Chưa học → tạm dùng giao diện nếu đang ở trang BPO Job List (lần Search này cũng giúp tool học API).
  async function searchJobs(q) {
    if (tpl.list && tpl.list.req) {
      try { return await searchApi(q); }
      catch (e) { if (!findInput('Job Name')) throw e; }
    }
    return searchDom(q);
  }
  async function searchDom(q) {
    var inp = findInput('Job Name');
    if (!inp) throw new Error('Chưa học API Job List — mở trang BPO Job List và Search 1 lần để tool tự học, sau đó dùng được ở mọi trang.');
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
  var res = [], panel, root, $, CSS_TEXT = '';
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
    CSS_TEXT += '#bpl,#bpl *{box-sizing:border-box}';
    CSS_TEXT += '#bpl .cp{padding:0 4px;margin-left:4px;font-size:11px}#bpl.full{max-height:none!important;overflow:visible!important}#bpl.full .s{max-height:none!important;overflow:visible!important}';
    s.textContent = CSS_TEXT;
    root.appendChild(s);
  }
  function cubSum(a) { var s = 0, ok = false; a.forEach(function (x) { if (typeof x.cub === 'number') { s += x.cub; ok = true; } }); return ok ? ' · ' + s + ' cuboid' : ''; }
  function badge() {
    var m = [];
    if (!tpl.list) m.push('Chưa học API Job List — mở trang BPO Job List và bấm Search 1 lần');
    if (!tpl.data) m.push('Chưa học API Data Center — mở trang Data Center của 1 job bất kỳ một lần');
    return m.length ? '<span class="w">● ' + m.join('<br>● ') + '</span>' : '';
  }
  function updateBadge() { var e = $ && $('#bpl-badge'); if (e) e.innerHTML = badge(); var rb = $ && $('#bpl-rst'); if (rb) rb.style.display = (tpl.data && tpl.list) ? 'none' : ''; }
  function jobHtml(role, j) {
    if (!j) return '<div class="j"><span class="r">' + role + '</span><p class="w">Không tìm thấy job này.</p></div>';
    var a = j.accounts, body;
    if (j.err) body = '<div class="w">Lỗi: ' + esc(j.err) + '</div>';
    else if (!a) body = '<div class="m">' + (tpl.data ? 'Đang tải…' : 'Chưa có API Data Center.') + '</div>';
    else if (!a.length) body = '<div class="w">Không có bài.</div>';
    else body = (a.note ? '<div class="w">' + esc(a.note) + '</div>' : '') + '<div><b>Còn ' + a.length + ' bài' + '</b></div><div class="s"><table><tr><th>#</th><th>ID</th><th>Tên tài khoản</th><th>Cuboid <button class="cp" data-copy="' + esc(j.id) + '" title="Copy cột Cuboid theo thứ tự">📋</button></th></tr>' +
      a.map(function (x, i) { return '<tr><td>' + (i + 1) + '</td><td>' + esc(x.id) + '</td><td>' + (x.name ? esc(x.name) : '<span style="color:#98a2b3">—</span>') + '</td><td>' + (x.cub == null ? '' : esc(x.cub)) + '</td></tr>'; }).join('') + '</table></div>';
    return '<div class="j"><span class="r">' + role + '</span><div class="m">' + esc(j.id) + ' · ' + esc(j.status) + '</div>' + body + '</div>';
  }
  // _builtKey[gi+'|'+ri] = số accounts đã render vào DOM (dùng để detect khi accounts mới load)
  var _builtKey = {}, _lastCub = {};

  function render() {
    var out = $('#bpl-out');
    var groups = out.children;

    // Full rebuild khi danh sách group thay đổi (search mới)
    if (groups.length !== res.length) {
      _builtKey = {}; _lastCub = {};
      out.innerHTML = res.map(function (g) {
        return '<div class="g"><div class="gh">' + esc(g.base) + '</div><div class="c">' +
          ROLES.map(function (r) { return jobHtml(r, g.jobs[r.toLowerCase()]); }).join('') +
        '</div></div>';
      }).join('');
      // Ghi nhận những cột đã có accounts ngay lần đầu
      res.forEach(function (g, gi) {
        ROLES.forEach(function (role, ri) {
          var j = g.jobs[role.toLowerCase()];
          if (j && j.accounts) _builtKey[gi + '|' + ri] = j.accounts.length;
        });
      });
      return;
    }

    // Patch mode: duyệt từng cột job
    res.forEach(function (g, gi) {
      var gEl = groups[gi]; if (!gEl) return;
      var jCols = gEl.querySelectorAll('.j');
      ROLES.forEach(function (role, ri) {
        var j = g.jobs[role.toLowerCase()];
        var jEl = jCols[ri]; if (!jEl) return;
        var bk = gi + '|' + ri;

        // Accounts vừa mới xuất hiện hoặc số lượng thay đổi → rebuild cột này
        var builtCount = _builtKey[bk];
        var nowCount = j && j.accounts ? j.accounts.length : -1;
        if (builtCount !== nowCount) {
          _builtKey[bk] = nowCount;
          // Xóa snapshot cuboid cũ của cột này
          Object.keys(_lastCub).forEach(function (k) { if (k.indexOf(gi + '|' + ri + '|') === 0) delete _lastCub[k]; });
          jEl.outerHTML = jobHtml(role, j);
          // Lấy lại jEl sau khi thay thế
          jEl = jCols[ri];
          return;
        }

        // Chỉ patch cuboid nếu accounts đã có trong DOM
        if (!j || !j.accounts) return;

        // Cập nhật dòng tổng
        var sumEl = jEl.querySelector('b');
        if (sumEl) {
          var newSum = 'Còn ' + j.accounts.length + ' bài';
          if (sumEl.textContent !== newSum) sumEl.textContent = newSum;
        }

        // Patch từng cell cuboid
        var rows = jEl.querySelectorAll('table tr');
        j.accounts.forEach(function (x, ai) {
          var k = gi + '|' + ri + '|' + ai;
          var cur = x.cub == null ? '' : String(x.cub);
          if (_lastCub[k] === cur) return;
          _lastCub[k] = cur;
          var tr = rows[ai + 1]; if (!tr) return;
          var td = tr.cells[3]; if (!td) return;
          td.textContent = cur;
        });
      });
    });
  }
  async function run() {
    var q = $('#bpl-q').value.trim(); if (!q) return;
    tpl = loadTpl();
    updateBadge();
    res = []; render(); lastTs = new Date().toLocaleString('vi-VN');
    try {
      $('#bpl-log').textContent = 'Đang tìm job…';
      var rows = await searchJobs(q), g = {};
      rows.forEach(function (r) { var p = parts(r.name); (g[p.base] = g[p.base] || {})[p.role] = r; });
      res = Object.keys(g).map(function (b) { return { base: b, jobs: g[b] }; });
      render();
      if (!rows.length) { $('#bpl-log').textContent = 'Không thấy job nào khớp tên.'; return; }
      if (!tpl.data) { $('#bpl-log').textContent = 'Đã tìm thấy job. Chưa học được API Data Center nên chưa có danh sách bài.'; return; }
      var n = 0;
      learnedRole = '';
      res.forEach(function (g) { ROLES.forEach(function (r) { var jj = g.jobs[r.toLowerCase()]; if (jj && jj.id.match(/(\d+)$/)[1] === tpl.data.jobId) learnedRole = r.toLowerCase(); }); });
      cubRole = '';
      if (tpl.cub && tpl.cub.jobId) res.forEach(function (g) { ROLES.forEach(function (r) { var jj = g.jobs[r.toLowerCase()]; if (jj && jj.id.match(/(\d+)$/)[1] === tpl.cub.jobId) cubRole = r.toLowerCase(); }); });
      // Fetch accounts tất cả role song song → ID/tên hiện đều nhau
      var accountTasks = [], labelFetch = [];
      res.forEach(function (g) {
        ROLES.forEach(function (r, ri) {
          var j = g.jobs[r.toLowerCase()]; if (!j) return;
          j.prio = ri; // 0 = Labeling Job → đếm cuboid trước, rồi 1 Round QA, 2 Round QA
          var p = (async function () {
            try { var jn = j.id.match(/(\d+)$/)[1]; j.accounts = await fetchAccounts(r, jn, j.id); render(); return true; }
            catch (e) { j.err = e.message; render(); return false; }
          })();
          if (ri === 0) labelFetch.push(p);
          accountTasks.push(p.then(async function (ok) {
            if (!ok) return;
            if (ri > 0) await Promise.all(labelFetch); // QA chỉ vào hàng đợi khi Labeling đã có danh sách bài
            await fillCub(j, j.accounts).catch(function () {});
          }));
        });
      });
      await Promise.all(accountTasks);
      $('#bpl-log').textContent = 'Dữ liệu lúc ' + lastTs;
    } catch (e) { $('#bpl-log').textContent = 'Lỗi: ' + e.message; }
  }
  function copyText(t) {
    function fb() { var ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); }
    try { navigator.clipboard.writeText(t).catch(fb); } catch (e) { fb(); }
  }
  function showShot(cv, w) {
    var ov = document.createElement('div'), tip = document.createElement('div'), box = document.createElement('div'), im = new Image(), row = document.createElement('div');
    var bc = document.createElement('button'), bt = document.createElement('button');
    ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483647;background:rgba(0,0,0,.6);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px';
    tip.style.cssText = 'color:#fff;font:13px sans-serif;text-align:center;padding:0 12px';
    box.style.cssText = 'max-width:94vw;max-height:76vh;overflow:auto;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.5)';
    im.style.cssText = 'display:block;max-width:none';
    im.width = Math.round(w); // hiển thị đúng kích thước thật trên màn hình (ảnh thật có thể nét gấp 1–2 lần)
    row.style.cssText = 'display:flex;gap:8px';
    [bc, bt].forEach(function (b) { b.style.cssText = 'padding:5px 18px;border-radius:6px;border:0;cursor:pointer'; });
    bc.textContent = 'Sao chép ảnh'; bt.textContent = 'Đóng';
    function onKey(e) { if (e.key === 'Escape') close(); }
    function close() { ov.remove(); document.removeEventListener('keydown', onKey, true); }
    function copy() {
      cv.toBlob(function (b) {
        var bad = function () { tip.textContent = 'Không tự copy được — chuột phải vào ảnh → Sao chép hình ảnh'; };
        try { navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]).then(function () { tip.textContent = '✔ Đã sao chép ảnh vào clipboard — dán (Ctrl+V) ở nơi cần gửi'; }, bad); } catch (e) { bad(); }
      }, 'image/png');
    }
    tip.textContent = 'Bấm "Sao chép ảnh" hoặc chuột phải vào ảnh → Sao chép hình ảnh';
    bc.onclick = copy; bt.onclick = close;
    ov.onclick = function (e) { if (e.target === ov) close(); };
    document.addEventListener('keydown', onKey, true);
    box.appendChild(im); row.appendChild(bc); row.appendChild(bt);
    ov.appendChild(tip); ov.appendChild(box); ov.appendChild(row);
    im.onload = function () { document.body.appendChild(ov); copy(); };
    im.src = cv.toDataURL('image/png');
  }
  function shot() {
    if (!res.length) { $('#bpl-log').textContent = 'Chưa có kết quả để chụp.'; return; }
    var out = $('#bpl-out'), w = Math.ceil(out.getBoundingClientRect().width);
    var c = document.createElement('div'), cl = out.cloneNode(true);
    cl.removeAttribute('id');
    c.id = 'bpl'; c.appendChild(cl);
    [].forEach.call(c.querySelectorAll('.cp'), function (b) { b.remove(); });
    // Giữ nguyên phần bảng ĐANG HIỂN THỊ (không bung hết các dòng ẩn trong thanh cuộn)
    var os = out.querySelectorAll('.s'), cs = cl.querySelectorAll('.s');
    [].forEach.call(os, function (s, i) {
      var d = cs[i]; if (!d) return;
      var rows = s.querySelectorAll('tr'), drows = d.querySelectorAll('tr');
      var hh = rows[0] ? rows[0].offsetHeight : 0, top = s.scrollTop;
      if (top > 0) for (var r = rows.length - 1; r >= 1; r--) if (rows[r].offsetTop + rows[r].offsetHeight <= top + hh) drows[r].remove();
      d.style.maxHeight = 'none'; d.style.overflow = 'hidden';
      if (s.scrollHeight > s.clientHeight) d.style.height = s.offsetHeight + 'px';
    });
    if (cl.firstElementChild) cl.firstElementChild.style.marginTop = '0';
    var base = 'display:flow-root;max-height:none;overflow:visible;border:0;border-radius:0;box-shadow:none;padding:0;background:#fff;width:' + w + 'px;';
    c.style.cssText = 'position:fixed;left:-99999px;top:0;' + base;
    root.appendChild(c);
    var h = Math.ceil(c.getBoundingClientRect().height);
    c.style.cssText = 'position:static;' + base;
    var xml = new XMLSerializer().serializeToString(c);
    c.remove();
    // CSS cho ảnh: bỏ media query, giữ bố cục đúng như đang thấy trên màn hình
    var css = CSS_TEXT.replace(/@media\(max-width:860px\)\{[^}]*\{[^}]*\}\}/, '');
    if (window.innerWidth <= 860) css += '#bpl .c{grid-template-columns:1fr}';
    // Độ nét chuẩn: = tỉ lệ màn hình (tối thiểu 1x, tối đa 2x), giới hạn cạnh dài ≤ 8000px
    var k = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    k = Math.min(k, 8000 / Math.max(w, h));
    var pw = Math.round(w * k), ph = Math.round(h * k);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + pw + '" height="' + ph + '" viewBox="0 0 ' + w + ' ' + h + '"><foreignObject x="0" y="0" width="' + w + '" height="' + h + '"><style>' + css + '</style>' + xml + '</foreignObject></svg>';
    var img = new Image();
    img.onload = function () {
      var cv = document.createElement('canvas'); cv.width = pw; cv.height = ph;
      var g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, pw, ph);
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(img, 0, 0, pw, ph); // SVG được raster đúng độ phân giải đích → không bị mờ
      showShot(cv, w);
    };
    img.onerror = function () { $('#bpl-log').textContent = 'Lỗi khi chụp ảnh.'; };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function mount() {
    if (!document.body || document.getElementById('bpo-lookup-host')) return;
    var host = document.createElement('div');
    host.id = 'bpo-lookup-host';
    host.style.cssText = 'all:initial;display:block;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647';
    root = host.attachShadow({ mode: 'open' }); // cô lập CSS với trang web bất kỳ
    css();
    panel = document.createElement('div'); panel.id = 'bpl';
    panel.innerHTML = '<div class="h" id="bpl-h"><span>🔎 BPO Job Lookup</span><span id="bpl-t" style="cursor:pointer">–</span></div>' +
      '<div class="b"><span style="position:relative;display:inline-block;width:min(560px,100%)"><input id="bpl-q" style="width:100%;padding-right:28px" placeholder="Nhập tên job gốc, ví dụ: 行车-周视OD-L-1102-4-v1.1.0-同源-路口通行"><button id="bpl-x" title="Xóa" style="display:none;position:absolute;right:4px;top:50%;transform:translateY(-50%);border:0;background:transparent;padding:2px 6px;font-size:14px;color:#667085">✕</button></span><button class="p" id="bpl-go">Tìm</button><button id="bpl-shot">📷 Chụp ảnh</button><button id="bpl-rst" title="Xóa API đã học">Reset API</button>' +
      '<div class="m" id="bpl-badge"></div><div class="m" id="bpl-log"></div><div id="bpl-out"></div></div>';
    root.appendChild(panel);
    document.body.appendChild(host);
    $ = function (s) { return root.querySelector(s); };
    if (!ON_MAIN) panel.classList.add('min');
    updateBadge();
    $('#bpl-go').onclick = run; $('#bpl-shot').onclick = shot;
    var qi = $('#bpl-q');
    ['keydown', 'keyup', 'keypress'].forEach(function (ev) { qi.addEventListener(ev, function (e) { e.stopPropagation(); }); }); // không để phím tắt của trang web bắt phím
    qi.addEventListener('input', function () { $('#bpl-x').style.display = this.value ? '' : 'none'; });
    $('#bpl-x').onclick = function () { qi.value = ''; this.style.display = 'none'; qi.focus(); };
    $('#bpl-out').addEventListener('click', function (e) {
      var id = e.target.getAttribute && e.target.getAttribute('data-copy'); if (!id) return;
      var vals = [];
      res.forEach(function (g) { ROLES.forEach(function (r) { var j = g.jobs[r.toLowerCase()]; if (j && j.id === id && j.accounts) vals = j.accounts.map(function (x) { return x.cub == null ? '' : x.cub; }); }); });
      copyText(vals.join('\n')); $('#bpl-log').textContent = 'Đã copy ' + vals.length + ' giá trị cuboid theo thứ tự bảng';
    });
    $('#bpl-rst').onclick = function () { tpl = {}; saveTpl(); };
    qi.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
    $('#bpl-t').onclick = function () { panel.classList.toggle('min'); };
    document.addEventListener('keydown', function (e) { if (e.altKey && (e.key === 'b' || e.key === 'B')) host.style.display = host.style.display === 'none' ? 'block' : 'none'; }, true); // Alt+B: ẩn/hiện
    var h = $('#bpl-h'), dx, dy, drag = false;
    h.addEventListener('mousedown', function (e) { drag = true; var r = panel.getBoundingClientRect(); dx = e.clientX - r.left; dy = e.clientY - r.top; });
    document.addEventListener('mousemove', function (e) { if (!drag) return; panel.style.left = (e.clientX - dx) + 'px'; panel.style.top = (e.clientY - dy) + 'px'; panel.style.right = 'auto'; panel.style.bottom = 'auto'; });
    document.addEventListener('mouseup', function () { drag = false; });
  }
  if (ON_MAIN && /data-preview|lidar/.test(location.pathname)) [6000, 15000].forEach(function (ms) {
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
  if (window.top === window.self) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount(); }
})();
