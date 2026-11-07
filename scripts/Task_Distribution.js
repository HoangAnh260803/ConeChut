// ==UserScript==
// @name         Task distribution
// @namespace    https://tampermonkey.net/
// @version      2.5
// @description
// @match        http://global-autolabeling-service.evad.xiaomi.srv/appen/ui*
// @require      https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
// @grant        none
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  const FIELD_LABEL = 'name';   // nhãn ô lọc trong popup
  const SEARCH_TIMEOUT = 5000;  // ms chờ bảng lọc ra kết quả
  const MODAL_TIMEOUT = 8000;   // ms chờ popup mở / đóng
  const STORE_KEY = 'bw-workers';

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const isVisible = (el) => !!el && el.getClientRects().length > 0;
  const norm = (s) => (s || '').trim().toLowerCase();
  // D = tài liệu đang được thao tác: mặc định là trang chính, khi chạy sẽ chuyển sang trang nền (iframe ẩn)
  let D = document;

  // ---- Gọi thẳng API của nền tảng (cùng origin, dùng cookie đăng nhập của trang) ----
  const API = '/appen/backend';
  const PAGE_SIZE = 10; // khớp số dòng mỗi trang của bảng để số trang không bị lệch
  // Tham số role của ô tìm worker: đã thấy role=4 với job QA. Job loại khác: lấy theo trang nếu bắt được, không thì bỏ qua
  const ROLE_BY_JOBTYPE = { QA: 4 };
  const rawFetch = window.fetch.bind(window);
  let listTpl = null;   // thân request danh sách data mà chính trang đã gửi (nếu bắt được)
  let curJobName = ''; // tên job hiện tại (lấy từ API), dùng để khớp với sheet Excel
  let roleParam = null; // tham số role mà popup Add workers của trang đã dùng (nếu bắt được)
  let releaseTpl = null; // URL + body template của request release mà trang đã gửi (nếu bắt được)

  // Chỉ "nghe" request của chính trang để học đúng tham số, không sửa gì
  function sniff(url, body) {
    try {
      if (/data-pool\/data\/bpo\/list/.test(url) && body) listTpl = JSON.parse(body);
      const m = /um\/bpo-worker\/list\?(?:.*&)?role=(\d+)/.exec(url);
      if (m) roleParam = m[1];
      // Học endpoint release: bắt request có "release" hoặc "assign" trên path /project/ hoặc /job/
      if (!releaseTpl && /\/(project|job)\/.*(\brelease\b|\bassign\b)/i.test(url) && body) {
        const b = JSON.parse(body);
        releaseTpl = { url, body: b };
      }
    } catch (e) { /* bỏ qua */ }
  }
  window.fetch = function (input, init) {
    sniff(typeof input === 'string' ? input : (input && input.url) || '', init && typeof init.body === 'string' ? init.body : '');
    return rawFetch.apply(null, arguments);
  };
  const XP = XMLHttpRequest.prototype;
  const xhrOpen = XP.open;
  const xhrSend = XP.send;
  XP.open = function (m, u) { this.__bwUrl = String(u); return xhrOpen.apply(this, arguments); };
  XP.send = function (b) { sniff(this.__bwUrl || '', typeof b === 'string' ? b : ''); return xhrSend.apply(this, arguments); };

  async function api(path, opts = {}) {
    const hasBody = opts.body !== undefined;
    const res = await rawFetch(API + path, {
      method: opts.method || 'GET',
      credentials: 'same-origin',
      headers: hasBody ? { Accept: 'application/json', 'Content-Type': 'application/json;charset=UTF-8' } : { Accept: 'application/json' },
      body: hasBody ? JSON.stringify(opts.body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch (e) { /* không phải JSON */ }
    if (!res.ok || !json || (json.status !== undefined && json.status !== 200)) {
      throw new Error((json && json.message) || 'HTTP ' + res.status);
    }
    return json.data;
  }

  // jobId / projectId / flowId / cycle: ưu tiên đúng thân request mà trang đã gửi, không thì suy từ chi tiết job
  async function jobCtx(jobId) {
    const d = await api('/job/bpo-job-detail?jobId=' + jobId);
    curJobName = d.jobName || '';
    const t = listTpl && String(listTpl.jobId) === String(jobId) ? listTpl : null;
    return {
      jobId: String(jobId),
      projectId: String((t && t.projectId) || d.projectId),
      flowId: String((t && t.flowId) || d.flowId),
      cycle: t && t.cycle != null ? t.cycle : (d.qaCycleOrder || 1),
      jobType: d.jobType,
    };
  }

  // Lấy mọi dòng của bảng Data (tab chưa hoàn thành), từng trang một
  async function fetchAllRecords(jobId, onPage) {
    const ctx = await jobCtx(jobId);
    const found = new Map();
    let lastFirst = null;
    let complete = false;
    for (let p = 0; p < 500; p++) {
      const d = await api('/project/data-pool/data/bpo/list', {
        method: 'POST',
        body: { jobId: ctx.jobId, projectId: ctx.projectId, cycle: ctx.cycle, flowId: ctx.flowId,
          finished: false, pageSize: PAGE_SIZE, pageIndex: p, recordIds: [] },
      });
      const rs = (d && d.results) || [];
      if (!rs.length || String(rs[0].recordId) === lastFirst) { complete = true; break; } // hết dữ liệu / API lặp lại trang cuối
      lastFirst = String(rs[0].recordId);
      rs.forEach((r, idx) => found.set(String(r.recordId), {
        id: String(r.recordId), worker: (r.contributor && r.contributor.name) || '', page: p + 1, idx }));
      if (onPage) onPage(p + 1, found.size);
      if (rs.length < PAGE_SIZE) { complete = true; break; }
    }
    return { found, complete, ctx };
  }

  // Tên -> worker (khớp nguyên tên uniqueName)
  async function findWorker(name, jobType) {
    const role = roleParam != null ? roleParam : ROLE_BY_JOBTYPE[jobType];
    for (let p = 0; p < 50; p++) {
      const q = new URLSearchParams({ pageSize: '10', pageIndex: String(p), name });
      if (role != null) q.set('role', String(role));
      const d = await api('/um/bpo-worker/list?' + q);
      const hit = ((d && d.results) || []).find((w) => norm(w.uniqueName) === norm(name));
      if (hit) return hit;
      if (p + 1 >= ((d && d.totalPages) || 1)) break;
    }
    return null;
  }

  // Tập workerId đã có trong job
  async function jobWorkerIds(jobId) {
    const ids = new Set();
    for (let p = 0; p < 300; p++) {
      const d = await api(`/job/bpo/workers?jobId=${jobId}&pageIndex=${p}&pageSize=10`);
      const rs = (d && d.results) || [];
      const before = ids.size;
      rs.forEach((w) => ids.add(String(w.workerId)));
      if (rs.length < 10 || ids.size === before) break;
    }
    return ids;
  }

  const addWorkers = (jobId, workerIds) =>
    api('/job/bpo-workers-add?jobId=' + jobId, { method: 'POST', body: workerIds });

  // Release một bản ghi sang worker mới qua API.
  // Dùng releaseTpl nếu đã sniff được; nếu chưa thì thử các endpoint phổ biến theo thứ tự.
  async function releaseRecord(recordId, workerId, ctx) {
    // Nếu đã học được endpoint từ trang, dùng lại với recordId + workerId thay thế
    if (releaseTpl) {
      const b = { ...releaseTpl.body, recordId: String(recordId), workerId: String(workerId) };
      // Thêm context nếu body gốc có các trường này
      if ('jobId' in releaseTpl.body) b.jobId = ctx.jobId;
      if ('projectId' in releaseTpl.body) b.projectId = ctx.projectId;
      if ('flowId' in releaseTpl.body) b.flowId = ctx.flowId;
      // Trích path từ URL đã sniff (bỏ origin và /appen/backend prefix nếu có)
      const path = releaseTpl.url.replace(/^.*\/appen\/backend/, '').replace(/^https?:\/\/[^/]+/, '');
      return api(path, { method: 'POST', body: b });
    }
    // Chưa sniff được: thử các endpoint phổ biến theo thứ tự, lưu lại cái thành công
    const attempts = [
      { path: '/project/data-pool/data/bpo/release', body: { recordId: String(recordId), workerId: String(workerId), jobId: ctx.jobId, projectId: ctx.projectId, flowId: ctx.flowId, cycle: ctx.cycle } },
      { path: '/project/data/bpo/release',           body: { recordId: String(recordId), workerId: String(workerId), jobId: ctx.jobId } },
      { path: '/job/bpo/data/release',               body: { recordId: String(recordId), workerId: String(workerId), jobId: ctx.jobId } },
    ];
    for (const a of attempts) {
      try {
        const result = await api(a.path, { method: 'POST', body: a.body });
        releaseTpl = { url: API + a.path, body: a.body }; // nhớ cái thành công
        return result;
      } catch (e) {
        if (a === attempts[attempts.length - 1]) throw e;
      }
    }
  }
  // ---- hết khối API ----

  // jobId của trang bất kỳ (Workforce hoặc Data)
  function anyJobId() {
    const h = location.hash;
    return (h.match(/bpo-job\/(\d+)/) || h.match(/[?&]jobId=(\d+)/) || h.match(/\/(\d{3,})(?:[/?]|$)/) || [])[1];
  }

  async function waitFor(fn, timeout, step = 100) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const v = fn();
      if (v) return v;
      await sleep(step);
    }
    return null;
  }

  function parseNames(text) {
    const seen = new Set();
    return text.split(/[\n\r,;\t]+/).map((s) => s.trim()).filter((s) => {
      const k = s.toLowerCase();
      if (!s || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  // rows: mảng 2 chiều từ Excel -> [{name, roles:[...]}]
  // shortcut: đoán cột theo tiêu đề (name/tên/user, role/vai trò); không có tiêu đề thì cột 1 = tên, cột 2 = role
  function parseRows(rows) {
    const head = (rows[0] || []).map((c) => String(c));
    const nameIdx = head.findIndex((c) => /name|tên|user|account/i.test(c));
    const roleIdx = head.findIndex((c) => /role|vai trò|chức vụ|position/i.test(c));
    const hasHeader = nameIdx >= 0 || roleIdx >= 0;
    const nIdx = nameIdx >= 0 ? nameIdx : 0;
    const rIdx = hasHeader ? roleIdx : 1;
    return rows.slice(hasHeader ? 1 : 0).map((r) => ({
      name: String(r[nIdx] ?? '').trim(),
      roles: rIdx < 0 ? [] : String(r[rIdx] ?? '').split(/[,;\/|]+/).map((s) => s.trim()).filter(Boolean),
    })).filter((w) => w.name);
  }
  (() => {
    const w = parseRows([['Name', 'Role'], ['a', 'QC'], ['b', 'QC, Annotator'], ['', 'QC']]);
    console.assert(w.length === 2 && w[1].roles[1] === 'Annotator', 'parseRows self-check failed');
  })();

  function setNativeValue(el, value) {
    const w = el.ownerDocument.defaultView; // element có thể thuộc iframe nên dùng đúng window của nó
    const proto = el.tagName === 'TEXTAREA' ? w.HTMLTextAreaElement.prototype : w.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new w.Event('input', { bubbles: true }));
  }

  // ---------- Thao tác với trang ----------
  const findAddButton = () =>
    [...D.querySelectorAll('button')].find((b) => isVisible(b) && norm(b.textContent) === 'add more workers');

  function getDialog() {
    const list = [...D.querySelectorAll('.ant-modal-wrap, .ant-drawer-open')].filter(isVisible);
    const top = list[list.length - 1];
    return top ? top.querySelector('.ant-modal-content, .ant-drawer-content') || top : null;
  }

  async function openDialog() {
    const btn = findAddButton();
    if (!btn) throw new Error('Không thấy nút "Add more workers"');
    btn.click();
    const dlg = await waitFor(getDialog, MODAL_TIMEOUT);
    if (!dlg) throw new Error('Popup không mở');
    await sleep(300);
    return dlg;
  }

  async function closeDialog(dlg) {
    const x = dlg.querySelector('.ant-modal-close, .ant-drawer-close');
    if (x) x.click();
    await waitFor(() => !getDialog(), 3000);
  }

  function findFieldInput(dlg) {
    const item = [...dlg.querySelectorAll('.ant-form-item')].find((it) => {
      const label = it.querySelector('.ant-form-item-label label');
      return label && /^(name|worker|contactname|username)$/.test(norm(label.textContent).replace(/[:：*\s]/g, ''));
    });
    return (item && item.querySelector('input.ant-input, input[type="text"]')) ||
      dlg.querySelector('input.ant-input:not(.ant-select-selection-search-input)');
  }

  const rowsOf = (dlg) => [...dlg.querySelectorAll('.ant-table-tbody tr.ant-table-row')];
  // Cột 1 là checkbox, cột 2 là Contact Name
  const rowHas = (row, name) => [...row.querySelectorAll('td')].some((td) => norm(td.textContent) === norm(name));

  // Gõ tên vào ô Name -> chờ bảng lọc -> tick dòng khớp. Trả về 'ok' | 'notfound' | 'disabled'
  async function selectWorker(dlg, name) {
    const input = findFieldInput(dlg);
    if (!input) throw new Error(`Không thấy ô "${FIELD_LABEL}" trong popup`);
    setNativeValue(input, name);

    const find = () => rowsOf(dlg).find((r) => rowHas(r, name));
    let row = await waitFor(find, 1500);
    if (!row) { // nếu bảng không tự lọc thì nhấn Enter
      ['keydown', 'keypress', 'keyup'].forEach((t) =>
        input.dispatchEvent(new (D.defaultView.KeyboardEvent)(t, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true })));
      row = await waitFor(find, SEARCH_TIMEOUT);
    }
    if (!row) return 'notfound';
    await sleep(300); // chờ bảng render xong, tránh tick vào dòng sắp bị thay
    row = find();
    const cb = row && row.querySelector('input.ant-checkbox-input, input.ant-radio-input');
    if (!cb || cb.disabled) return 'disabled';
    if (!cb.checked) cb.click();
    return (await waitFor(() => cb.checked, 2000)) ? 'ok' : 'notfound';
  }

  async function confirmDialog(dlg) {
    const ok = [...dlg.querySelectorAll('button.ant-btn-primary')].filter((b) => !b.disabled).pop();
    if (!ok) throw new Error('Không thấy nút Ok trong popup');
    ok.click();
    return !!(await waitFor(() => !getDialog(), MODAL_TIMEOUT));
  }

  // "Total 23 items" / "1-10 of 23" -> 23
  const totalFromText = (t) => {
    const n = (String(t).match(/\d+/g) || []).map(Number);
    return n.length ? Math.max(...n) : null;
  };
  // ---------- Giao diện ----------
  let stopFlag = false;
  let running = false;
  let workers = [];
  try {
    const st = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    workers = st.workers || [];
  } catch (e) { /* bỏ qua */ }


  // ---------- Giao diện (tông xanh lá #1c7a70) ----------
  const style = document.createElement('style');
  style.textContent = `
    .bw{position:fixed;right:16px;bottom:16px;width:290px;z-index:99999;display:none;overflow:hidden;
      background:#f2f9f8;color:#0d2e2b;border:1px solid #9fd0cb;border-radius:8px;
      box-shadow:0 4px 16px rgba(28,122,112,.15);
      font:13px/1.45 -apple-system,"Segoe UI",Roboto,sans-serif}
    .bw-wide{width:350px}
    .bw-left{right:auto;left:16px}
    .bw-left .bw-list{max-height:calc(100vh - 230px)}
    .bw-side{right:auto;bottom:auto;border-radius:8px}
    .bw-side .bw-body{height:calc(100% - 40px);overflow:auto}
    .bw-side .bw-list{max-height:none}
    .bw-side .bw-row{flex-wrap:wrap}
    .bw-side .bw-jt,.bw-side .bw-stg{font-size:11px}
    .bw *{box-sizing:border-box}
    .bw-head{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;
      background:linear-gradient(135deg,#1c7a70,#145c54);color:#fff;font-weight:600;font-size:13.5px}
    .bw-body{padding:12px;background:#fff}
    .bw input[type=text],.bw textarea,.bw select{width:100%;padding:6px 9px;color:#0d2e2b;background:#fff;
      border:1px solid #b8dbd8;border-radius:6px;outline:none;font:inherit;transition:border-color .15s}
    .bw input[type=text]:focus,.bw textarea:focus,.bw select:focus{border-color:#1c7a70;box-shadow:0 0 0 2px rgba(28,122,112,.15)}
    .bw textarea{resize:vertical;height:104px}
    .bw ::placeholder{color:#7ab5b0}
    .bw-row{display:flex;gap:8px;align-items:flex-start}
    .bw-row + .bw-row,.bw-mt{margin-top:10px}
    .bw-row.sel{align-items:center;margin-bottom:8px}
    .bw-row.sel select:first-child{width:112px;flex:none}
    .bw button{font:inherit;cursor:pointer;border-radius:6px;transition:background .15s,transform .05s;outline:none}
    .bw button:active{transform:scale(.97)}
    .bw-primary{flex:1;padding:8px;border:0;color:#fff;font-weight:600;background:#1c7a70}
    .bw-primary:hover{background:#22968a}
    .bw-primary:disabled{opacity:.5;cursor:default}
    .bw-stop{display:none;padding:8px 14px;color:#1c7a70;background:#fff;border:1px solid #9fd0cb}
    .bw-stop:hover{background:#f2f9f8}
    .bw-ghost{flex:none;padding:5px 10px;color:#1c7a70;background:#e8f5f4;border:1px solid #9fd0cb}
    .bw-ghost:hover{background:#cceae7}
    .bw-ghost:disabled{opacity:.5;cursor:default}
    .bw-roles{display:none;flex-wrap:wrap;gap:5px;margin-bottom:10px}
    .bw-chip{padding:2px 10px;font-size:12px;color:#145c54;background:#e8f5f4;border:1px solid #9fd0cb;border-radius:999px}
    .bw-chip:hover{background:#cceae7;border-color:#5bb8b0}
    .bw-list{max-height:262px;overflow:auto;background:#fff;border:1px solid #b8dbd8;border-radius:6px}
    .bw-line{display:flex;gap:8px;align-items:center;padding:5px 8px;border-bottom:1px solid #dff0ee}
    .bw-line:last-child{border-bottom:0}
    .bw-line:hover{background:#f2f9f8}
    .bw-line input[type=text]{width:152px;flex:none;padding:3px 8px}
    .bw-lbl{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .bw-hint{padding:10px;color:#5a9e99;font-size:12px}
    .bw-log{display:none;margin-top:10px;max-height:120px;overflow:auto;padding:7px 9px;background:#f2f9f8;
      border:1px solid #b8dbd8;border-radius:6px;font:12px Consolas,monospace;white-space:pre-wrap}
    .bw-foot{display:flex;gap:14px;margin-top:10px;font-size:11px;color:#5a9e99}
    .bw-foot label{cursor:pointer}
    .bw-foot label:hover{color:#1c7a70}
    .bw ::-webkit-scrollbar{width:7px;height:7px}
    .bw ::-webkit-scrollbar-thumb{background:#9fd0cb;border-radius:6px}
    .bw,.bw *{scrollbar-width:thin;scrollbar-color:#9fd0cb transparent}
    .bw-sug{position:fixed;z-index:100000;display:none;min-width:180px;max-height:200px;overflow:auto;padding:4px;
      background:#fff;color:#0d2e2b;border:1px solid #9fd0cb;border-radius:6px;box-shadow:0 3px 12px rgba(28,122,112,.15);
      font:13px -apple-system,"Segoe UI",Roboto,sans-serif}
    .bw-sug-item{display:flex;justify-content:space-between;gap:12px;padding:5px 9px;border-radius:4px;cursor:pointer}
    .bw-sug-item.on,.bw-sug-item:hover{background:#e8f5f4}
    .bw-sug-tag{color:#5a9e99;font-size:11px}
    .bw-stat{margin-top:6px;font-size:11px;color:#5a9e99}
    .bw-stg{line-height:1.75}
    .bw-stg b{margin-right:4px;color:#145c54}
    .bw-acc{display:inline-block;margin:0 4px 2px 0;padding:0 7px;color:#145c54;background:#e8f5f4;border:1px solid #9fd0cb;border-radius:999px}
    .bw-acc i{margin-left:3px;font-style:normal;color:#5a9e99}
  `;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.className = 'bw';
  panel.innerHTML = `
    <div id="bw-head" class="bw-head"><b>⚡ Workforce</b><span id="bw-toggle">–</span></div>
    <div id="bw-body" class="bw-body">
      <div id="bw-roles" class="bw-roles"></div>
      <div class="bw-row">
        <textarea id="bw-names" placeholder="Mỗi dòng một tên (gõ vài ký tự để gợi ý từ Excel)"></textarea>
        <button id="bw-clear" class="bw-ghost" title="Xóa hết tên trong ô">Xóa</button>
      </div>
      <div class="bw-row">
        <button id="bw-run" class="bw-primary" title="Ctrl+Enter">Bắt đầu</button>
        <button id="bw-stop" class="bw-stop">Dừng</button>
      </div>
      <div id="bw-log" class="bw-log"></div>
      <div class="bw-foot">
        <label>Upload Excel<span id="bw-info"></span>
          <input id="bw-file" type="file" accept=".xlsx,.xls,.csv" style="display:none">
        </label>
      </div>
    </div>`;
  document.body.appendChild(panel);

  const $ = (id) => panel.querySelector('#' + id);
  const colors = { ok: '#1c7a70', err: '#cf1322', info: '#5a9e99' };
  function log(text, type = 'info') {
    const box = $('bw-log');
    box.style.display = 'block';
    const line = document.createElement('div');
    line.style.color = colors[type];
    line.textContent = text;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  function updateCount() {
    const n = parseNames($('bw-names').value).length;
    $('bw-run').textContent = n ? `Bắt đầu (${n})` : 'Bắt đầu';
  }

  function setNames(list) {
    $('bw-names').value = list.join('\n');
    updateCount();
  }

  // Mỗi role là một nút: bấm vào sẽ lọc người có role đó và đưa vào ô nhập
  function renderRoles() {
    const box = $('bw-roles');
    box.textContent = '';
    box.style.display = workers.length ? 'flex' : 'none';
    $('bw-info').textContent = workers.length ? ` (${workers.length} người)` : '';
    if (!workers.length) return;
    const counts = {};
    workers.forEach((w) => w.roles.forEach((r) => { counts[r] = (counts[r] || 0) + 1; }));
    const add = (label, pick) => {
      const b = document.createElement('button');
      b.className = 'bw-chip';
      b.textContent = label;
      b.onclick = () => setNames(workers.filter(pick).map((w) => w.name));
      box.appendChild(b);
    };
    add(`Tất cả (${workers.length})`, () => true);
    Object.keys(counts).forEach((r) => add(`${r} (${counts[r]})`, (w) => w.roles.includes(r)));
  }

  // Dùng chung cho cả 2 panel: say = hàm log của panel đang upload
  async function loadExcel(e, say) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
      workers = parseRows(rows);
      localStorage.setItem(STORE_KEY, JSON.stringify({ file: file.name, workers }));
      renderRoles();
      renderRows();
      say(`Đã nạp ${workers.length} người từ ${file.name}`, 'ok');
    } catch (err) {
      say('Không đọc được file: ' + err.message, 'err');
    }
    e.target.value = '';
  }
  $('bw-file').onchange = (e) => loadExcel(e, log);

  $('bw-head').onclick = () => {
    if ($('bw-head').dataset.drag) return; // vừa kéo thì không thu gọn
    const hide = $('bw-body').style.display !== 'none';
    $('bw-body').style.display = hide ? 'none' : 'block';
    $('bw-toggle').textContent = hide ? '+' : '–';
  };
  $('bw-names').oninput = updateCount;
  $('bw-clear').onclick = () => setNames([]);
  $('bw-stop').onclick = () => { stopFlag = true; log('Đang dừng...'); };

  // Flag: người dùng tắt tay bằng phím 2, interval không tự bật lại
  let manualHideWf = false;
  let manualHideData = false;
  let lastHashWf = '';
  let lastHashData = '';

  // Trang là SPA dùng hash route: mỗi trang hiện một panel riêng
  setInterval(() => {
    const onWf = /\/workforce/.test(location.hash);
    const onData = /\/bpo-job\/\d+\/data/.test(location.hash);
    // Reset flag ẩn khi chuyển sang trang khác (hash mới)
    if (location.hash !== lastHashWf) { lastHashWf = location.hash; if (onWf) manualHideWf = false; }
    if (location.hash !== lastHashData) { lastHashData = location.hash; if (onData) manualHideData = false; }
    panel.style.display = onWf ? (manualHideWf ? 'none' : 'block') : 'none';
    panel2.style.display = onData ? (manualHideData ? 'none' : 'block') : 'none';
    if (!onWf) hideTa();
    if (!onWf && !onData && bgFrame && !running && !scanning) { bgFrame.remove(); bgFrame = null; } // rời trang -> bỏ trang nền
    if (!onData || running || scanning) return;

    const key = jobOfHash();
    if (key !== jobKey) { jobKey = key; curJobName = ''; allRows.clear(); scanned = false; renderRows(); } // đổi job -> bỏ ID cũ
    if (!scanned) { // vào trang Data: tự lấy toàn bộ ID qua API
      scanned = true;
      sleep(600).then(() => scanAll());
    }
  }, 700);

  $('bw-run').onclick = async () => {
    if (running) return;
    const queue = parseNames($('bw-names').value);
    if (!queue.length) return log('Chưa nhập tên nào', 'err');

    const doneNames = new Set();
    let done = 0;
    running = true;
    stopFlag = false;
    $('bw-run').disabled = true;
    $('bw-stop').style.display = 'block';
    $('bw-log').textContent = '';

    try {
      const jobId = anyJobId();
      if (!jobId) throw new Error('Không đọc được jobId từ địa chỉ trang (gửi mình URL của trang Workforce)');
      const detail = await api('/job/bpo-job-detail?jobId=' + jobId);
      const have = await jobWorkerIds(jobId);
      log(`Job ${jobId} (${detail.jobType}): đã có ${have.size} worker`);

      // 1) tên -> workerId
      const todo = [];
      for (const name of queue) {
        if (stopFlag) break;
        const w = await findWorker(name, detail.jobType);
        if (!w) log(`✗ ${name}: không tìm thấy`, 'err');
        else if (w.activeStatus && w.activeStatus !== 'ACTIVE') log(`✗ ${name}: tài khoản không hoạt động (${w.activeStatus})`, 'err');
        else if (have.has(String(w.workerId))) log(`✗ ${name}: đã có trong job`, 'err');
        else todo.push({ name, id: w.workerId });
      }

      // 2) thêm theo lô; lô lỗi thì thử từng người để biết ai lỗi
      const attempted = [];
      for (let i = 0; i < todo.length && !stopFlag; i += 20) {
        const chunk = todo.slice(i, i + 20);
        attempted.push(...chunk);
        try {
          await addWorkers(jobId, chunk.map((c) => c.id));
        } catch (e) {
          log(`Lô ${chunk.length} người bị lỗi (${e.message}), thử từng người...`, 'err');
          for (const c of chunk) {
            try { await addWorkers(jobId, [c.id]); } catch (e2) { log(`✗ ${c.name}: ${e2.message}`, 'err'); }
          }
        }
      }

      // 3) chỉ báo thành công khi server thực sự có người đó trong job
      if (attempted.length) {
        const after = await jobWorkerIds(jobId);
        attempted.forEach((c) => {
          if (after.has(String(c.id))) { log(`✓ ${c.name}`, 'ok'); doneNames.add(c.name); done++; }
          else log(`✗ ${c.name}: chưa thấy trong job sau khi thêm`, 'err');
        });
      }
    } catch (e) {
      log('Lỗi: ' + e.message, 'err');
    } finally {
      running = false;
      $('bw-run').disabled = false;
      $('bw-stop').style.display = 'none';
      const left = queue.filter((n) => !doneNames.has(n));
      log(`Xong: ${done} thành công, ${left.length} lỗi/chưa xử lý`, left.length ? 'err' : 'ok');
      setNames(left); // chỉ giữ lại tên chưa xong để chạy lại
    }
  };

  // ======================= Trang Data Center: release data sang QC =======================
  let pickedRole = 'qc'; // role dùng làm danh sách người nhận, mặc định QC
  const targets = new Map(); // recordId -> tên QC được chọn
  let rowSig = '';
  const allRows = new Map(); // id -> {id, worker, page, idx}: gom từ MỌI trang của bảng
  let scanning = false;      // đang lật trang để quét ID
  let scanned = false;       // đã quét tự động cho job hiện tại chưa
  let jobKey = '';
  let searchQ = '';

  // key (chữ thường) -> tên role gốc trong Excel
  function allRoles() {
    const m = new Map();
    workers.forEach((w) => w.roles.forEach((r) => { if (!m.has(norm(r))) m.set(norm(r), r); }));
    return m;
  }
  const roleNames = () => workers.filter((w) => w.roles.some((r) => norm(r) === pickedRole)).map((w) => w.name);

  // Cột: [checkbox, Record ID, Current worker, Data status, Operation]
  // Chỉ đọc các dòng của bảng chính ĐANG HIỆN (1 trang), không lấy bảng trong popup
  function dataRows() {
    return [...D.querySelectorAll('tr.ant-table-row[data-row-key]')]
      .filter((tr) => !tr.closest('.ant-modal-wrap, .ant-drawer'))
      .map((tr) => ({
        id: tr.dataset.rowKey,
        worker: (tr.querySelectorAll('td')[2]?.textContent || '').trim(),
      }));
  }
  const rowEl = (id) => [...D.querySelectorAll(`tr.ant-table-row[data-row-key="${CSS.escape(id)}"]`)]
    .find((tr) => !tr.closest('.ant-modal-wrap, .ant-drawer'));

  // ---- Trang nền: mở cùng địa chỉ trong iframe ẩn, mọi thao tác chạy ở đó, không đụng tới màn hình đang xem ----
  let bgFrame = null;
  let bgKey = '';
  async function bgDoc(key, ready) {
    if (bgFrame && bgKey !== key) { bgFrame.remove(); bgFrame = null; }
    if (!bgFrame) {
      bgFrame = document.createElement('iframe');
      // Phải có kích thước thật thì antd mới render đủ; ẩn bằng opacity, đặt sau trang và không nhận chuột
      bgFrame.style.cssText = 'position:fixed;left:0;top:0;width:1400px;height:900px;border:0;opacity:0;pointer-events:none;z-index:-1';
      bgFrame.setAttribute('aria-hidden', 'true');
      bgFrame.tabIndex = -1;
      bgFrame.src = location.href;
      bgKey = key;
      document.body.appendChild(bgFrame);
    }
    const doc = await waitFor(() => {
      try { const d = bgFrame.contentDocument; return d && ready(d) ? d : null; } catch (e) { return null; }
    }, 30000, 300);
    if (!doc) { bgFrame.remove(); bgFrame = null; }
    return doc;
  }
  const jobOfHash = () => (location.hash.match(/\/bpo-job\/(\d+)\/data/) || [])[1];
  const dataBg = () => bgDoc('data:' + jobOfHash(), (d) => !!d.querySelector('tr.ant-table-row[data-row-key]'));
  const BG_ERR = 'Không mở được trang nền (trang có thể chặn iframe hoặc tải quá lâu)';

  // ---- Phân trang: lật từng trang để gom đủ ID (bảng chỉ render 1 trang một lần) ----
  const pageSig = () => dataRows().map((r) => r.id).join(',');
  const mainPager = () => [...D.querySelectorAll('.ant-pagination')]
    .find((p) => isVisible(p) && !p.closest('.ant-modal-wrap, .ant-drawer'));
  function currentPage() {
    const a = mainPager()?.querySelector('.ant-pagination-item-active');
    return a ? parseInt(a.getAttribute('title') || a.textContent, 10) || 1 : 1;
  }
  function pageBtn(dir) { // 'next' | 'prev' -> null nếu hết trang
    const li = mainPager()?.querySelector(`.ant-pagination-${dir}`);
    return li && !li.classList.contains('ant-pagination-disabled') && li.getAttribute('aria-disabled') !== 'true' ? li : null;
  }
  // Bấm nút phân trang rồi chờ bảng đổi sang dữ liệu mới (không rỗng, khác trang cũ)
  async function clickPager(el) {
    const before = pageSig();
    (el.querySelector('button') || el).click();
    const ok = await waitFor(() => { const s = pageSig(); return s && s !== before; }, 8000);
    if (ok) await sleep(250);
    return !!ok;
  }
  async function stepPage(dir) { // 'ok' | 'end' (hết trang) | 'timeout'
    const btn = pageBtn(dir);
    if (!btn) return 'end';
    return (await clickPager(btn)) ? 'ok' : 'timeout';
  }
  async function toPage(n) {
    for (let i = 0; i < 300 && currentPage() !== n; i++) {
      const direct = mainPager()?.querySelector(`.ant-pagination-item-${n}`);
      const btn = direct || pageBtn(n > currentPage() ? 'next' : 'prev');
      if (!btn || !(await clickPager(btn))) return false;
    }
    return currentPage() === n;
  }

  // Quét từ trang 1 tới trang cuối TRONG TRANG NỀN, nên trang đang xem không bị đổi
  async function scanUI() {
    if (scanning) return false;
    scanning = true;
    $2('d-rescan').disabled = true;
    const prev = D;
    const found = new Map();
    let complete = false;
    try {
      setStat('Đang mở trang nền...');
      const doc = await dataBg();
      if (!doc) throw new Error(BG_ERR);
      D = doc;
      if (currentPage() !== 1) await toPage(1);
      for (let i = 0; i < 300; i++) {
        const p = currentPage();
        dataRows().forEach((r, idx) => found.set(r.id, { ...r, page: p, idx }));
        setStat(`Đang quét trang ${p}... (${found.size} ID)`);
        const st = await stepPage('next');
        if (st === 'end') { complete = true; break; }
        if (st !== 'ok') break;
      }
    } catch (e) {
      log2('Lỗi khi quét trang: ' + e.message, 'err');
    } finally {
      D = prev;
      if (complete) allRows.clear(); // quét đủ -> thay hẳn dữ liệu cũ
      found.forEach((v, k) => allRows.set(k, v));
      scanning = false;
      $2('d-rescan').disabled = false;
      renderRows();
    }
    return complete;
  }

  // Lấy toàn bộ ID qua API, không đụng tới giao diện. page = pageIndex + 1 (10 dòng/trang), dùng khi cần nhảy trang để Release
  async function scanAll() {
    if (scanning) return false;
    scanning = true;
    $2('d-rescan').disabled = true;
    let res = null;
    try {
      const jobId = jobOfHash();
      if (!jobId) throw new Error('Không đọc được jobId từ địa chỉ trang');
      setStat('Đang lấy danh sách ID...');
      res = await fetchAllRecords(jobId, (p, n) => setStat(`Đang lấy trang ${p}... (${n} ID)`));

    } catch (e) {
      log2('Lỗi khi lấy danh sách: ' + e.message, 'err');
    } finally {
      if (res && res.complete) allRows.clear(); // lấy đủ -> thay hẳn dữ liệu cũ
      if (res) res.found.forEach((v, k) => allRows.set(k, v));
      scanning = false;
      $2('d-rescan').disabled = false;
      renderRows();
    }
    return !!(res && res.complete);
  }

  const listRows = () => [...allRows.values()].sort((a, b) => a.page - b.page || a.idx - b.idx);
  // Ô tìm ID: khớp một phần; dán nhiều ID (cách nhau bởi dấu cách / , / ;) thì khớp bất kỳ ID nào
  function filteredRows() {
    const toks = searchQ.split(/[\s,;]+/).map(norm).filter(Boolean);
    const rows = listRows();
    return toks.length ? rows.filter((r) => toks.some((t) => norm(r.id).includes(t))) : rows;
  }

  // Đảm bảo dòng `id` đang hiện trên bảng: nhảy tới trang đã nhớ, nếu lệch thì quét lại
  async function ensureRow(id) {
    if (rowEl(id)) return true;
    const c = allRows.get(id);
    if (c && (await toPage(c.page)) && rowEl(id)) return true;
    await scanUI(); // số trang API lệch với bảng (vd đổi số dòng/trang) -> quét lại bằng giao diện
    const c2 = allRows.get(id);
    if (c2 && c2.page !== currentPage()) await toPage(c2.page);
    return !!rowEl(id);
  }

  const visibleOptions = () => [...D.querySelectorAll(
    '.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')];

  // Khớp nguyên tên, hoặc tên là một "từ" trong option (vd "Name (email)")
  function optionMatches(opt, name) {
    const t = norm(opt.getAttribute('title') || opt.textContent);
    const n = norm(name);
    return t === n || t.split(/[\s()<>|,\-]+/).includes(n);
  }

  async function pickInSelect(sel, name) {
    const input = sel.querySelector('input.ant-select-selection-search-input');
    const selector = sel.querySelector('.ant-select-selector');
    if (!sel.classList.contains('ant-select-open')) {
      ['mousedown', 'mouseup', 'click'].forEach((t) => selector.dispatchEvent(new (D.defaultView.MouseEvent)(t, { bubbles: true, cancelable: true })));
    }
    await sleep(300);
    if (!getDialog()) throw new Error('Popup tự đóng ngay khi mở ô chọn người nhận (gửi ảnh popup để chỉnh)');
    if (input) {
      if (D === document) input.focus(); // trang nền thì không giành focus của người dùng
      if (!input.readOnly) setNativeValue(input, name);
    }
    await sleep(300); // debounce của remote search
    const match = await waitFor(() => visibleOptions().find((o) => optionMatches(o, name)), SEARCH_TIMEOUT);
    if (!match || match.classList.contains('ant-select-item-option-disabled')) return false;
    match.click();
    await sleep(200);
    return true;
  }

  // Dropdown của antd mở khi hover (hoặc click tuỳ cấu hình): thử hover trước, không được thì click
  const fire = (el, types) => types.forEach((t) => el.dispatchEvent(new (D.defaultView.MouseEvent)(t, { bubbles: true })));
  const menuItem = (text) => [...D.querySelectorAll(
    '.ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu-item')].find((li) => norm(li.textContent) === text);

  // Dòng 3 chấm -> Release -> popup. Trả về popup, hoặc null nếu không còn dòng đó
  async function openRelease(id) {
    if (!(await ensureRow(id))) return null; // tự chuyển sang trang chứa ID này
    const tr = rowEl(id);
    const icon = tr && tr.querySelector('.anticon-ellipsis');
    if (!icon) return null;
    fire(icon, ['mouseenter', 'mouseover', 'mousemove']);
    let item = await waitFor(() => menuItem('release'), 1200);
    if (!item) {
      icon.click();
      item = await waitFor(() => menuItem('release'), 2000);
    }
    if (!item) throw new Error('Không thấy menu Release sau khi mở nút 3 chấm');
    item.click();
    const dlg = await waitFor(getDialog, MODAL_TIMEOUT);
    if (!dlg) throw new Error('Popup Release không mở');
    await sleep(300);
    return dlg;
  }

  // Chọn lựa chọn "Release data to assigned worker" nếu popup có nhiều lựa chọn
  async function chooseAssigned(dlg) {
    const hit = [...dlg.querySelectorAll('*')].filter((el) =>
      !el.closest('.ant-modal-header, .ant-modal-title, .ant-modal-footer') &&
      norm(el.textContent).includes('assigned worker') &&
      ![...el.children].some((c) => norm(c.textContent).includes('assigned worker')));
    const el = hit[0];
    if (!el) return;
    const wrap = el.closest('.ant-radio-wrapper, .ant-checkbox-wrapper');
    if (wrap) { if (!/-checked/.test(wrap.className)) wrap.click(); } else el.click();
    await sleep(300);
  }

  async function fillWorker(dlg, name) {
    // Popup dạng "Name + Tag + bảng": gõ tên vào ô Name rồi tick dòng khớp (không đụng ô Tag)
    if (findFieldInput(dlg) && dlg.querySelector('.ant-table')) return (await selectWorker(dlg, name)) === 'ok';
    const sel = [...dlg.querySelectorAll('.ant-select')].filter(isVisible).find((x) => {
      const lab = x.closest('.ant-form-item')?.querySelector('.ant-form-item-label label');
      return !lab || !/tag/i.test(lab.textContent);
    });
    if (sel) return pickInSelect(sel, name);
    const inp = findFieldInput(dlg);
    if (inp) { setNativeValue(inp, name); return true; }
    throw new Error('Không nhận diện được ô nhập tên trong popup Release');
  }

  const panel2 = document.createElement('div');
  panel2.className = 'bw bw-wide';
  panel2.innerHTML = `
    <div id="d-head" class="bw-head"><b>⚡ Data Center</b><span id="d-toggle">–</span></div>
    <div id="d-body" class="bw-body">
      <div class="bw-row sel">
        <select id="d-role" title="Nhóm role dùng làm người nhận"></select>
        <select id="d-all"></select>
      </div>
      <div class="bw-row sel">
        <input id="d-search" type="text" placeholder="Tìm ID (có thể dán nhiều ID)" autocomplete="off">
        <button id="d-rescan" class="bw-ghost" title="Quét lại tất cả các trang của bảng">↻</button>
      </div>
      <div id="d-list" class="bw-list"></div>
      <div id="d-stat" class="bw-stat"></div>
      <div class="bw-row bw-mt">
        <button id="d-run" class="bw-primary" title="Ctrl+Enter">Bắt đầu</button>
        <button id="d-stop" class="bw-stop">Dừng</button>
      </div>
      <div id="d-log" class="bw-log"></div>
      <div class="bw-foot">
        <label>Upload Excel<span id="d-info"></span>
          <input id="d-file" type="file" accept=".xlsx,.xls,.csv" style="display:none">
        </label>
      </div>
    </div>`;
  document.body.appendChild(panel2);

  const $2 = (id) => panel2.querySelector('#' + id);
  function log2(text, type = 'info') {
    const box = $2('d-log');
    box.style.display = 'block';
    const line = document.createElement('div');
    line.style.color = colors[type];
    line.textContent = text;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  const hint = (text) => {
    const d = document.createElement('div');
    d.className = 'bw-hint';
    d.textContent = text;
    return d;
  };
  const addOpt = (sel, value, label) => {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    sel.appendChild(o);
  };

  // ---- Gợi ý tên khi gõ: ưu tiên người thuộc role đang chọn, sau đó đến mọi người trong Excel ----
  const sug = document.createElement('div');
  sug.className = 'bw-sug';
  document.body.appendChild(sug);
  let sugItems = [];
  let sugIdx = 0;
  let sugTouched = false; // đã dùng phím mũi tên để chọn

  function suggestions(q) {
    const k = norm(q);
    const seen = new Set();
    const pool = [...roleNames(), ...workers.map((w) => w.name)].filter((n) => !seen.has(norm(n)) && seen.add(norm(n)));
    const hits = pool.filter((n) => norm(n).includes(k));
    hits.sort((a, b) => norm(b).startsWith(k) - norm(a).startsWith(k)); // bắt đầu bằng chuỗi gõ lên trước
    return hits.slice(0, 8);
  }

  function renderSug() {
    sug.textContent = '';
    sugItems.forEach((name, i) => {
      const d = document.createElement('div');
      d.className = 'bw-sug-item' + (i === sugIdx ? ' on' : '');
      const w = workers.find((x) => norm(x.name) === norm(name));
      const tag = document.createElement('span');
      tag.className = 'bw-sug-tag';
      tag.textContent = w ? w.roles.join(', ') : '';
      d.append(document.createTextNode(name), tag);
      d.onmousedown = (e) => { e.preventDefault(); acceptSug(name); }; // preventDefault để ô nhập không mất focus
      sug.appendChild(d);
    });
  }

  function showSuggest(inp) {
    sugItems = suggestions(inp.value);
    sugIdx = 0;
    sugTouched = false;
    if (!sugItems.length) return hideSuggest();
    sug.dataset.for = inp.dataset.id;
    renderSug();
    sug.style.display = 'block';
    const r = inp.getBoundingClientRect();
    const h = Math.min(200, sug.scrollHeight);
    sug.style.left = r.left + 'px';
    sug.style.top = (innerHeight - r.bottom < h + 8 ? r.top - h - 2 : r.bottom + 2) + 'px'; // hết chỗ phía dưới thì mở lên trên
  }

  function hideSuggest() { sug.style.display = 'none'; }

  function acceptSug(name) {
    const inp = panel2.querySelector(`#d-list input[data-id="${CSS.escape(sug.dataset.for)}"]`);
    if (inp) { inp.value = name; targets.set(inp.dataset.id, name); updateRunLabel(); }
    hideSuggest();
  }

  function focusNext(inp, step) {
    const all = [...panel2.querySelectorAll('#d-list input')];
    const n = all[all.indexOf(inp) + step];
    if (n) n.focus();
  }

  // Tab / Enter: nhận gợi ý đang chọn (nếu đã gõ chữ hoặc đã dùng mũi tên) rồi sang dòng tiếp theo
  function suggestKey(e, inp) {
    if (e.ctrlKey || e.metaKey) return; // Ctrl+Enter dành cho nút Bắt đầu
    const open = sug.style.display === 'block' && sugItems.length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!open) return showSuggest(inp);
      e.preventDefault();
      sugTouched = true;
      sugIdx = (sugIdx + (e.key === 'ArrowDown' ? 1 : sugItems.length - 1)) % sugItems.length;
      renderSug();
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      if (open && (inp.value.trim() || sugTouched)) acceptSug(sugItems[sugIdx]);
      if (e.key === 'Enter') { e.preventDefault(); focusNext(inp, 1); }
      else hideSuggest(); // Tab: trình duyệt tự chuyển sang ô kế tiếp
    } else if (e.key === 'Escape') {
      hideSuggest();
    }
  }

  // ---- Gợi ý tên trong ô nhập của "Add workers": gõ vài ký tự -> gợi ý tên trùng trong Excel ----
  const taEl = $('bw-names');
  const sugTa = document.createElement('div');
  sugTa.className = 'bw-sug';
  document.body.appendChild(sugTa);
  let taItems = [];
  let taIdx = 0;
  let taTouched = false; // đã dùng phím mũi tên để chọn

  // Đoạn tên đang gõ: từ dấu phân cách gần nhất trước con trỏ tới dấu phân cách kế tiếp
  function taToken() {
    const v = taEl.value;
    const pos = taEl.selectionStart;
    const isSep = (c) => '\n\r,;\t'.includes(c);
    let start = pos;
    while (start > 0 && !isSep(v[start - 1])) start--;
    let end = pos;
    while (end < v.length && !isSep(v[end])) end++;
    return { start, end, query: v.slice(start, pos).trim() };
  }

  function hideTa() { sugTa.style.display = 'none'; taItems = []; }

  function placeTa() {
    const r = taEl.getBoundingClientRect();
    const cs = getComputedStyle(taEl);
    const lh = parseFloat(cs.lineHeight) || 18;
    const line = taEl.value.slice(0, taEl.selectionStart).split('\n').length - 1;
    const y = Math.min(r.bottom, Math.max(r.top + lh, r.top + (parseFloat(cs.paddingTop) || 0) + (line + 1) * lh - taEl.scrollTop));
    const h = Math.min(200, sugTa.scrollHeight);
    sugTa.style.left = r.left + 'px';
    sugTa.style.minWidth = Math.min(r.width, 240) + 'px';
    sugTa.style.top = (innerHeight - y < h + 8 ? y - lh - h - 2 : y + 2) + 'px'; // hết chỗ phía dưới thì mở lên trên
  }

  function renderTa() {
    sugTa.textContent = '';
    taItems.forEach((name, i) => {
      const d = document.createElement('div');
      d.className = 'bw-sug-item' + (i === taIdx ? ' on' : '');
      const w = workers.find((x) => norm(x.name) === norm(name));
      const tag = document.createElement('span');
      tag.className = 'bw-sug-tag';
      tag.textContent = w ? w.roles.join(', ') : '';
      d.append(document.createTextNode(name), tag);
      d.onmousedown = (e) => { e.preventDefault(); acceptTa(name, false); }; // không làm mất focus ô nhập
      sugTa.appendChild(d);
    });
    sugTa.children[taIdx]?.scrollIntoView({ block: 'nearest' });
  }

  function taSuggest() {
    const { start, end, query } = taToken();
    const k = norm(query);
    if (!k || !workers.length) return hideTa();
    const v = taEl.value;
    const taken = new Set(parseNames(v.slice(0, start) + '\n' + v.slice(end)).map(norm)); // tên đã có ở dòng khác
    const seen = new Set();
    const hits = workers.map((w) => w.name).filter((n) => {
      const key = norm(n);
      if (seen.has(key) || taken.has(key) || !key.includes(k)) return false;
      seen.add(key);
      return true;
    });
    hits.sort((a, b) => norm(b).startsWith(k) - norm(a).startsWith(k)); // bắt đầu bằng chuỗi gõ lên trước
    taItems = hits.slice(0, 8);
    if (!taItems.length || (taItems.length === 1 && norm(taItems[0]) === k)) return hideTa(); // đã gõ đủ tên
    taIdx = 0;
    taTouched = false;
    sugTa.style.display = 'block';
    renderTa();
    placeTa();
  }

  function acceptTa(name, newline) {
    const { start, end } = taToken();
    const v = taEl.value;
    const tail = v.slice(end);
    const ins = name + (newline && !/^[\n\r]/.test(tail) ? '\n' : '');
    taEl.value = v.slice(0, start) + ins + tail;
    taEl.setSelectionRange(start + ins.length, start + ins.length);
    updateCount();
    hideTa();
  }

  taEl.addEventListener('input', taSuggest);
  taEl.addEventListener('click', taSuggest);
  taEl.addEventListener('blur', hideTa);
  taEl.addEventListener('scroll', hideTa);
  taEl.addEventListener('keyup', (e) => { if (/^(ArrowLeft|ArrowRight|Home|End)$/.test(e.key)) taSuggest(); });
  // Mũi tên: chọn gợi ý · Tab: nhận gợi ý · Enter: nhận gợi ý và xuống dòng · Esc: đóng
  taEl.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // Ctrl+Enter dành cho nút Bắt đầu
    if (!(sugTa.style.display === 'block' && taItems.length)) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      taTouched = true;
      taIdx = (taIdx + (e.key === 'ArrowDown' ? 1 : taItems.length - 1)) % taItems.length;
      renderTa();
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      const exact = taItems.some((n) => norm(n) === norm(taToken().query));
      if (exact && !taTouched) return hideTa(); // đã gõ đúng một tên: Enter/Tab hoạt động bình thường
      e.preventDefault();
      acceptTa(taItems[taIdx], e.key === 'Enter');
    } else if (e.key === 'Escape') {
      hideTa();
    }
  });

  const pendingJobs = () => listRows().filter((r) => targets.get(r.id) && norm(targets.get(r.id)) !== norm(r.worker));

  function updateRunLabel() {
    const n = pendingJobs().length;
    $2('d-run').textContent = n ? `Bắt đầu (${n})` : 'Bắt đầu';
  }

  const setStat = (t) => { $2('d-stat').textContent = t; };

  // Vẽ lại toàn bộ panel: các ô chọn role + danh sách ID (từ mọi trang)
  function renderRows() {
    const roles = allRoles();
    if (roles.size && !roles.has(pickedRole)) pickedRole = roles.has('qc') ? 'qc' : roles.keys().next().value;
    const qcs = roleNames();
    $2('d-info').textContent = workers.length ? ` (${workers.length} người)` : '';

    const roleSel = $2('d-role');
    roleSel.textContent = '';
    roles.forEach((label, key) => addOpt(roleSel, key, label));
    roleSel.value = pickedRole;

    const all = $2('d-all');
    all.textContent = '';
    addOpt(all, '__', 'Gán tất cả dòng cho...');
    addOpt(all, '', '— Bỏ chọn tất cả —');
    qcs.forEach((n) => addOpt(all, n, n));

    renderList();
  }

  // Danh sách "59: nguyenhoanganh -> [chọn QC]" cho các ID khớp ô tìm kiếm (mọi trang)
  function renderList() {
    const total = allRows.size;
    const rows = filteredRows();
    const searching = !!searchQ.trim();
    const pages = new Set(listRows().map((r) => r.page)).size;
    const first = $2('d-all').options[0];
    if (first) first.textContent = searching ? 'Gán các dòng đang lọc cho...' : 'Gán tất cả dòng cho...';

    const list = $2('d-list');
    list.textContent = '';
    if (!workers.length) list.appendChild(hint('Chưa có Excel: vẫn gõ tay được, upload Excel để có gợi ý tên.'));
    if (!total) list.appendChild(hint('Không có dòng nào trên bảng.'));
    else if (!rows.length) list.appendChild(hint('Không có ID nào khớp.'));
    rows.forEach((r) => {
      const line = document.createElement('div');
      line.className = 'bw-line';
      const label = document.createElement('span');
      label.className = 'bw-lbl';
      label.textContent = `${r.id}: ${r.worker || '(trống)'} ->`;
      label.title = `${label.textContent}  (trang ${r.page})`;
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.placeholder = '— bỏ qua —';
      inp.autocomplete = 'off';
      inp.dataset.id = r.id;
      inp.value = targets.get(r.id) || '';
      inp.oninput = () => { targets.set(r.id, inp.value.trim()); updateRunLabel(); showSuggest(inp); };
      inp.onfocus = () => showSuggest(inp);
      inp.onblur = hideSuggest;
      inp.onkeydown = (e) => suggestKey(e, inp);
      line.append(label, inp);
      list.appendChild(line);
    });
    setStat(total ? (searching ? `${rows.length}/${total} ID khớp` : `${total} ID`) + ` · ${pages} trang` : '');
    updateRunLabel();
  }

  $2('d-role').onchange = (e) => {
    pickedRole = e.target.value;
    targets.clear(); // tên đã chọn thuộc role cũ nên bỏ đi
    renderRows();
  };
  $2('d-all').onchange = (e) => {
    const v = e.target.value;
    if (v === '__') return;
    filteredRows().forEach((r) => targets.set(r.id, v)); // đang tìm kiếm thì chỉ gán các dòng đang lọc
    renderRows();
  };
  $2('d-search').oninput = (e) => { searchQ = e.target.value; renderList(); };
  $2('d-rescan').onclick = async () => {
    if (running || scanning) return;
    const ok = await scanAll();
    log2(ok ? `Đã lấy ${allRows.size} ID` : 'Chưa lấy hết ID, thử lại bằng nút ↻', ok ? 'ok' : 'err');
  };
  $2('d-file').onchange = (e) => loadExcel(e, log2);
  $2('d-head').onclick = () => {
    if ($2('d-head').dataset.drag) return;
    const hide = $2('d-body').style.display !== 'none';
    $2('d-body').style.display = hide ? 'none' : 'block';
    $2('d-toggle').textContent = hide ? '+' : '–';
  };
  $2('d-stop').onclick = () => { stopFlag = true; log2('Đang dừng...'); };

  $2('d-run').onclick = async () => {
    if (running) return;
    const jobs = pendingJobs().map((r) => ({ id: r.id, from: r.worker, to: targets.get(r.id) }));
    if (!jobs.length) return log2('Chưa chọn người nhận cho dòng nào', 'err');

    running = true;
    stopFlag = false;
    $2('d-run').disabled = true;
    $2('d-stop').style.display = 'block';
    $2('d-log').textContent = '';
    let done = 0;
    let failed = 0;

    try {
      const jobId = jobOfHash();
      if (!jobId) throw new Error('Không đọc được jobId từ địa chỉ trang');
      const ctx = await jobCtx(jobId);

      for (const j of jobs) {
        if (stopFlag) break;
        // Tìm workerId theo tên
        const w = await findWorker(j.to, ctx.jobType);
        if (!w) { log2(`✗ ${j.id}: không tìm thấy worker "${j.to}"`, 'err'); failed++; continue; }

        try {
          await releaseRecord(j.id, w.workerId, ctx);
          log2(`✓ ${j.id}: ${j.from || '(trống)'} -> ${j.to}`, 'ok');
          targets.delete(j.id);
          const cached = allRows.get(j.id);
          if (cached) cached.worker = j.to;
          done++;
        } catch (e) {
          // Nếu API release thất bại (endpoint chưa đúng), fallback về UI automation cho record này
          if (!releaseTpl) {
            log2(`API chưa học được endpoint, chuyển sang UI cho ${j.id}...`, 'info');
            try {
              const doc = await dataBg();
              if (!doc) throw new Error(BG_ERR);
              D = doc;
              if (getDialog()) await closeDialog(getDialog());
              const dlg = await openRelease(j.id);
              if (!dlg) { log2(`✗ ${j.id}: không còn trên bảng`, 'err'); failed++; continue; }
              await chooseAssigned(dlg);
              if (!(await fillWorker(dlg, j.to))) {
                log2(`✗ ${j.id}: không tìm thấy "${j.to}" trong popup`, 'err'); failed++;
                await closeDialog(dlg);
              } else if (await confirmDialog(dlg)) {
                log2(`✓ ${j.id}: ${j.from || '(trống)'} -> ${j.to} (UI)`, 'ok');
                targets.delete(j.id);
                const cached = allRows.get(j.id);
                if (cached) cached.worker = j.to;
                done++;
                await sleep(600);
              } else {
                log2(`✗ ${j.id}: popup không đóng sau khi bấm Ok`, 'err'); failed++;
                await closeDialog(dlg);
              }
            } finally {
              D = document;
            }
          } else {
            log2(`✗ ${j.id}: ${e.message}`, 'err');
            failed++;
          }
        }
      }
    } catch (e) {
      log2('Lỗi: ' + e.message, 'err');
    } finally {
      D = document;
      running = false;
      $2('d-run').disabled = false;
      $2('d-stop').style.display = 'none';
      log2(`Xong: ${done} thành công, ${failed} lỗi`, failed ? 'err' : 'ok');
      renderRows();
      scanAll();
    }
  };

  renderRows();

  // Phím 2 = bật/tắt panel đang hiện (không nhấn khi đang gõ vào ô nhập liệu)
  document.addEventListener('keydown', (e) => {
    if (e.key === '2' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const onWf = /\/workforce/.test(location.hash);
      const onData = /\/bpo-job\/\d+\/data/.test(location.hash);
      if (onWf) {
        manualHideWf = !manualHideWf;
        panel.style.display = manualHideWf ? 'none' : 'block';
      } else if (onData) {
        manualHideData = !manualHideData;
        panel2.style.display = manualHideData ? 'none' : 'block';
      }
      return;
    }
  });

  // Ctrl+Enter = bấm Bắt đầu của panel đang hiện
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.key !== 'Enter' || running) return;
    const btn = panel2.style.display === 'block' ? $2('d-run') : panel.style.display === 'block' ? $('bw-run') : null;
    if (btn) { e.preventDefault(); btn.click(); }
  });

  // Kéo panel bằng thanh tiêu đề tới bất kỳ đâu; vị trí được nhớ cho lần sau
  function makeDraggable(box, head, key) {
    head.style.cursor = 'move';
    head.style.userSelect = 'none';
    const place = (l, t) => {
      box.style.left = Math.min(Math.max(0, l), innerWidth - 80) + 'px';
      box.style.top = Math.min(Math.max(0, t), innerHeight - 40) + 'px';
      box.style.right = box.style.bottom = 'auto';
    };
    try {
      const p = JSON.parse(localStorage.getItem(key) || 'null');
      if (p) place(p.l, p.t);
    } catch (e) { /* bỏ qua */ }

    head.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const r = box.getBoundingClientRect();
      const offX = e.clientX - r.left;
      const offY = e.clientY - r.top;
      let moved = false;
      const move = (ev) => {
        if (!moved && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 4) return;
        moved = true;
        place(ev.clientX - offX, ev.clientY - offY);
      };
      const up = () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        if (!moved) return;
        localStorage.setItem(key, JSON.stringify({ l: parseFloat(box.style.left), t: parseFloat(box.style.top) }));
        head.dataset.drag = '1'; // chặn cú click sau khi thả chuột
        setTimeout(() => delete head.dataset.drag, 0);
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });

    window.addEventListener('resize', () => { // giữ panel không bị văng khỏi màn hình
      if (box.style.left) place(parseFloat(box.style.left), parseFloat(box.style.top));
    });
  }
  makeDraggable(panel, $('bw-head'), 'bw-pos-workforce');
  makeDraggable(panel2, $2('d-head'), 'bw-pos-data');

  renderRoles();
})();