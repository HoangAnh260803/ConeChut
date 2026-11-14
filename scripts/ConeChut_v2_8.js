// ==UserScript==
// @name         ConeChut_v2.8.22
// @namespace    local
// @version      2.8.22
// @description  no
// @match        *://global-autolabeling-service.evad.xiaomi.srv/appen/mashup/ssr/tools/lidar.html*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
(function () {
  'use strict';
/* ============================================================
 * MỤC LỤC MODULE — tìm bằng Ctrl+F: @MODULE[tên-phím]   (vd: @MODULE[alt+q])
 * Mỗi tag là phím mặc định của chức năng (đổi phím được trong menu alt+s).
 * Bản chia module: tag trùng tên file trong src/ (vd @MODULE[alt+q] = src/alt+q.js);
 * ký tự không hợp lệ trong tên file: '/' -> '_' , ':' -> '-' (vd core:ctx = src/core-ctx.js, left/right = src/left_right.js, ,/. = src/comma_period.js).
 * Ghép lại thành 1 file userscript: node build.js  (thứ tự ghép trong src/_order.txt).
 * Muốn sửa/thêm một chức năng: chỉ cần mở đúng module của phím đó.
 *
 *  @MODULE[cfg]            Cấu hình mặc định (CFG, CFG_DEF) – sửa mặc định/phím gán nhanh ở đây
 *  @MODULE[b]              Dán sát đất            (b, shift+b, alt+d)
 *  @MODULE[core:ctx]       Lõi: ctx / loader / điểm lidar / frame hiện tại
 *  @MODULE[core:ui]        Lõi: toast, bắt phím, macro
 *  @MODULE[3/4/g/h/j/l]    Thuộc tính + phím gán nhanh (attrKeys)
 *  @MODULE[alt+s:cone]     Xoá cọc tiêu (nút trong menu alt+s)
 *  @MODULE[alt+s]          Menu cài đặt, bảng phím tắt, bảng gán thuộc tính nhanh
 *  @MODULE[alt+g]          Kéo đầu xe vào thân / xe sau theo xe trước (alt+g, shift+alt+g, shift+g, ctrl+shift+g)
 *  @MODULE[core:yaw]       Lõi: căn hướng (yaw/heading)
 *  @MODULE[7]              FOCUS 7 camera
 *  @MODULE[8]              Bảng thuộc tính
 *  @MODULE[6]              Đổi class (6, arrowup, arrowdown)
 *  @MODULE[ctrl+drag]      Ctrl + kéo khít
 *  @MODULE[alt+q]          Bảng kiểm tra nhãn (r1…r11: hướng, kích thước, xa, thuộc tính đường, đầu xe lòi…)
 *  @MODULE[9]              Bộ lọc box
 *  @MODULE[left/right]     Chuyển ID kế/trước
 *  @MODULE[v]              Sát rìa xe (v hoặc ';' theo CFG, shift+v)
 *  @MODULE[,/.]            Khít đầu / khít đuôi (, . shift+, shift+.)
 *  @MODULE[alt+a]          Đồng nhất kích thước + khít đầu/đuôi (alt+u) – đã bỏ tự động hoá alt+a
 *  @MODULE[delete/i/alt+f] Xoá id, chiều rộng cố định, đồng bộ chiều đầu/đuôi
 *  @MODULE[shift+f]        Mũi tên hướng đỏ trên ảnh 2D 7 cam + 3D (shift+f bật/tắt)
 *  @MODULE[core:recolor]   Lõi: điểm mây trong box đổi màu ngay sau khi tool đổi box (gọi updateHighlightPoints)
 *  @MODULE[core:profile]   Lõi: __snapProfile(giây) đo hàm nền tảng nào tốn thời gian
 *  @MODULE[alt+z]          Hoàn tác (alt+z, z)
 *  @MODULE[shift+wasdqe]   Di chuyển mịn  ┐ chung một khối
 *  @MODULE[wasdqe]         Khoá trục xoay ┘
 *  @MODULE[alt+l]          Bố cục canvas
 *  @MODULE[alt+u:fps]      Mở khoá FPS vẽ 3D
 *  @MODULE[init]           Khởi động: bảng ACTIONS (phím → hàm), event listener
 * ============================================================ */

/* ============================================================
 * @MODULE[cfg]  CONFIG (CFG)
 * Toàn bộ cấu hình mặc định. Khi thêm option mới, chỉ cần sửa
 * đây và mục MENU_SECTIONS tương ứng.
 * (Header này nằm NGOÀI cặp marker SAVED_CFG vì "lưu vào code" ghi đè mọi thứ giữa hai marker.)
 * ============================================================ */
  /*@@SAVED_CFG@@*/
  var SAVED_CFG = {};
  /*@@END@@*/
  var CFG = {
    margin: 0.15,
    minGroundPts: 8,
    percentile: 0.5,
    markHuman: true,
    recolorBox: true,
    pauseWhileDragging: true,
    hoverSyncKeys: true,
    fpsHoverBoost: true,
    quietEdit: true,
    showArrows: true,
    keyArrow: 'shift+f',
    arrowExt: 1,
    arrowFlip: false,
    arrowOrtho: false,
    arrowWidth: 1,
    arrow3dSize: 2,
    arrowHead: 1,
    envMargin: 1.0,
    tilt: true,
    maxTiltDeg: 15,
    topPercentile: 0.5,
    gap: 0,
    redOnly: true,
    redHueMax: 40,
    minRedPts: 30,
    keySnap:     'b',
    keySnapAll:  'shift+b',
    keyRed:      'alt+d',
    keyMenu:     'alt+s',
    keyHead:     'alt+g',
    keyHeadAll:  'shift+alt+g',
    keyChain:    'shift+g',
    keyChainAll: 'ctrl+shift+g',
    keyCams:     '7',
    keyAttrPanel: '8',
    keyClassPrev: 'arrowup',
    keyClassNext: 'arrowdown',
    classCycle: ['卡车', '货车', '油罐车', '卡车-挂车', '货车-挂车', '油罐车-挂车'],
    classCycleWrap: true,
    classCycleSkipMissing: true,
    classCycleDelay: 350,
    classCycleFixCargo: true,
    classCycleLabels: { '卡车': 'Xe tải', '货车': 'Xe chở hàng', '油罐车': 'Xe bồn chở xăng dầu', '卡车-挂车': 'Xe đầu kéo, rơ moóc', '货车-挂车': 'Xe rơ moóc với thùng container', '油罐车-挂车': 'Xe bồn rơ moóc' },
    keyConvert:  '6',
    dirStepDeg: 90,
    dirSwapDims: false,
    dirCopyYaw: false,
    keyDirAll:   'alt+f',
    keyUndo:     'alt+z',
    keyWidth:    'i',
    widthValue:  2.7,
    platformUndo: false,
    zUndo: true,
    histKey:     'w',
    keepAnchor:  true,
    keyLayoutToggle: 'alt+l',
    layoutOn: true,
    layoutDockCams: true,
    layoutFill: true,
    layoutTopH: 45,
    layoutLeftW: 13,
    layoutW: [20, 16, 0, 21, 22, 21],
    layoutRects: null,
    layoutCustom: [],
    tabNative: true,
    layoutSnap: true,
    layoutOverflow: 30,
    keyDeleteAll: 'delete',
    fineMove: true,
    fineMoveKeys: ['KeyA', 'KeyW', 'KeyS', 'KeyD', 'KeyQ', 'KeyE'],
    fineMoveScale: 0.25,
    axisLock: false,
    axisLockViews: { front: 'z', top: 'y', side: 'x' },
    groundWeighted: true,
    groundRidge: 0.04,
    keyCheck:    'alt+q',
    keyNextId:   'arrowright',
    keyPrevId:   'arrowleft',
    nextSkipHidden: false,
    nextWrap: true,
    nextBestFrame: true,
    keyFitHead:     ',',
    keyFitTail:     '.',
    keyFitHeadAll:  'shift+,',
    keyFitTailAll:  'shift+.',
    tailWin: 1.0,
    tailGap: 0.3,
    tailPick: 'auto',
    tailBand: 0.3,
    tailAfterUnify: false,
    keyUnifyTail: 'alt+u',
    keyEdge:     ';',
    keyEdgeAll:  'shift+v',
    edgeSlice: 0.10,
    mirrorIgnore: 0.30,
    edgeDrop: 2,
    edgeMaxShift: 0.6,
    edgeAlignYaw: true,
    edgeYawMax: 25,
    edgeYawMin: 0.3,
    edgeYawBand: [0.2, 0.85],
    sideCell: 0.25,
    sideLowCut: 0.25,
    sideOutMax: 0.04,
    sideMargin: 0.01,
    sideMinCover: 0.3,
    camArrange: 'auto',
    camZ: 900,
    camShowMax:  2,
    attrPanelOpen: false,
    attrPanelPin: true,
    attrKeepTab: true,
    attrKeyToast: false,
    attrPanelHideRe: '',
    attrPanelShort: [],
    fpsMode: 'screen',      /* cố định: bỏ giới hạn FPS theo tần số màn hình */
    fpsTarget: 'screen',    /* cố định: FPS tối đa theo màn hình */
    fps3d: true,            /* cố định: script tự vẽ lại cảnh 3D */
    fpsShow: true,
    tabPauseHidden: true,
    toolKeyMap: [['1','['],['2',']'],['mouseforward','.'],['mouseback',','],['shift+mouseforward','shift+.'],['shift+mouseback','shift+,'],['alt','alt+v']],
    attrKeys: [
      {k:'3',scope:'frame',sets:[{field:'role:cipo',val:'CIPO3'}]},
      {k:'4',scope:'frame',sets:[{field:'role:cipo',val:'CIPO4'}]},
      {k:'g',scope:'frame',sets:[{field:'role:valid',val:'yes'},{field:'role:occ',val:'slightly occluded'},{field:'name:subname',val:'None'},{field:'name:jira_key_obj',val:'False'}]},
      {k:'h',scope:'frame',sets:[{field:'role:valid',val:'yes'},{field:'role:occ',val:'occluded'},{field:'name:subname',val:'None'},{field:'name:jira_key_obj',val:'False'}]},
      {k:'j',scope:'frame',sets:[{field:'role:cipo',val:'CIPO4'},{field:'role:valid',val:'no'},{field:'role:occ',val:'heavily occluded'},{field:'name:subname',val:'None'},{field:'name:jira_key_obj',val:'False'}]},
      {k:'l',scope:'copyall',sets:[]}
    ],
    keyFilterPanel: '9',
    macroDelay: 60,
    convertA: '轿车-小汽车',
    convertB: 'SUV',
    coneConvertTo: '骑动物的人',
    riderClassRe: 'cưỡi|cuoi dong vat|骑.{0,3}(动物|牲|马|驴|牛)|动物.{0,3}骑|ride[rd]?.{0,8}animal|animal.{0,8}ride',
    coneClassName: '锥桶',
    coneClassRe: '锥|cone|cọc|coc tieu|路锥|雪糕筒|路障',
    chkValidRe:  'valid|有效|合法|hợp lệ|hop le',
    chkOccRe:    'occlu|遮挡|che phủ|che khuat|cover',
    chkCipoRe:   'cipo|cipv',
    chkMotionRe: 'motion|动静|động|tĩnh|dong tinh',
    chkSize: {
      'SUV':         { n: 'Suv', under: 4 },
      '面包车':      { n: 'Xe bánh mì', under: 4 },
      '卡车':        { n: 'Xe tải', over: 16, wOver: 2.7 },
      '货车':        { n: 'Xe chở hàng', over: 16, wOver: 2.7 },
      '油罐车':      { n: 'Xe bồn', wOver: 2.7 },
      '卡车-挂车':   { n: 'Xe rơ móc', under: 16, wOver: 2.7 },
      '货车-挂车':   { n: 'Xe rơ móc container', under: 16, wOver: 2.7 },
      '油罐车-挂车': { n: 'Xe bồn rơ móc', wOver: 2.7 },
      '大车车头':    { n: 'Xe đầu kéo lớn', head: true }
    },
    chkHeadWithTruck: ['卡车', '货车', '油罐车'],
    chkHeadWithTrailer: ['卡车-挂车', '货车-挂车', '油罐车-挂车'],
    chkHeadTruckMax: 3, chkHeadTrailerMin: 5, chkHeadTrailerMax: 7,
    chkHeadOutTol: 0.05,
    chkAutoRefresh: true,
    chkAutoDelay: 700,
    chkDirClassRe: '锥桶|水马|障碍物|防撞柱|防撞桶|三角警示牌|锥|cone|路障|cọc|coc tieu|chướng ngại|chuong ngai|water-?hoesr|rào chắn|rao chan|tam giác|tam giac',
    chkDirCam: 0,
    chkDirMaxDeg: 90,
    chkDirOpposite: false,
    chkDirCamYaw: null,
    chkCipoLinkValue: '1',
    chkFarDist: 250,
    chkFarCenter: [0, 0],
    chkLinkAllAttrs: false,
    chkLinkIgnoreRe: '',
    chkCargoRe: '载货|装货|载物|cargo|chở hàng|cho hang|hàng hóa|hang hoa|freight',
    chkCargoDenyRe: '大车车头|xe đầu kéo lớn|xe dau keo lon',
    chkCargoClassRe: '卡车|xe tải|xe tai|xe đầu kéo(?! lớn)|xe dau keo(?! lon)',
    chkCipoValue: '4',
    chkRoadRe:   '场景标签|scene.?(label|tag)|nhãn cảnh|road|道路|车道|路面|lane|đường|duong',
    chkCityRe:   '市政|đô thị|do thi|municipal|special.?vehicle|city',
    chkKeyRe:    '关键目标|mục tiêu liên quan|muc tieu lien quan|key.?target|key.?obj|important',
    chkStaticClassRe: '锥|cone|cọc|coc tieu|路锥|rào|rao chan|barrier|栏|隔离|水马|防撞|bollard|挡'
      + '|障碍物|chướng ngại|chuong ngai|三角警示牌|tam giác cảnh báo|tam giac canh bao'
      + '|无人自行车|xe đạp tự lái|xe dap tu lai|无人电动|xe máy không có người lái|xe may khong co nguoi lai'
      + '|无人三轮车|xe ba bánh không có người lái|xe ba banh khong co nguoi lai'
      + '|^婴儿车$|^xe đẩy trẻ em$|^xe day tre em$',
    headSideGap: 0,
    headCopyAttrs: true,
    headCopyRe: 'cipo|cipv|valid|有效|合法|hợp lệ|occlu|遮挡|che phủ|che khuat|motion|动静|động|tĩnh',
    chainFrontBy: 'link',
    chainGap: 0.003,
    chainLift: 0,
    chainEveryFrame: false,
    chainCopyAttrs: true,
    chainResetOthers: true,
    chainCopyRe: 'cipo|cipv|valid|有效|合法|hợp lệ|occlu|遮挡|che phủ|che khuat|motion|动静|động|tĩnh',
    ctrlDragSnap: true,
    snapWin: 0.5,
    snapDrop: 0,
    snapGround: 0.15,
    snapDelay: 60,
    ctrlLockHeight: true
  };

/* ============================================================
 * @MODULE[b]  DÁN SÁT ĐẤT
 * Phím: b (keySnap) · shift+b (keySnapAll, cả track) · alt+d (keyRed, bật/tắt chỉ dùng đất đỏ)
 * groundHeight, fitPlane, refineGround, fitGroundPlane,
 * tiltedPose, snapOne, doSnap, redMask, onlyRed
 * Phụ thuộc: ctx, framePoints, curFrame, selectedId, toast,
 *            recBegin/End, trackFrames, runOnFrames
 * ============================================================ */
  function groundHeight(pts, flags, cube, cfg) {
    var c = cube.position, d = cube.dimension, th = heading(cube.rotation);
    var cs = Math.cos(th), sn = Math.sin(th);
    for (var round = 0; round < 2; round++) {
      var hx = d.x / 2 + cfg.margin * (round + 1), hz = d.z / 2 + cfg.margin * (round + 1);
      var ys = [];
      for (var i = 0, n = pts.length / 3; i < n; i++) {
        if (flags && !flags[i]) continue;
        var dx=pts[3*i]-c.x,dz=pts[3*i+2]-c.z,lx=dx*cs-dz*sn,lz=dx*sn+dz*cs;
        if(Math.abs(lx)<=hx&&Math.abs(lz)<=hz)ys.push(pts[3*i+1]);
      }
      if (ys.length >= cfg.minGroundPts) {
        ys.sort(function (a, b) { return a - b; });
        var p = flags ? cfg.percentile : 0.1;
        return { y: ys[Math.floor((ys.length - 1) * p)], n: ys.length };
      }
    }
    return null;
  }
  function snappedPosition(cube,gy){return{x:cube.position.x,y:gy+cube.dimension.y/2,z:cube.position.z};}
  function heading(r){return Math.atan2(Math.sin(r.y),Math.cos(r.y)*Math.cos(r.x));}
  function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
  function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
  function norm(a){var l=Math.sqrt(dot(a,a))||1;return[a[0]/l,a[1]/l,a[2]/l];}
  function wrap(v,ref){return v-2*Math.PI*Math.round((v-ref)/(2*Math.PI));}
  function fitPlane(pts, flags, cube, cfg) {
    var c = cube.position, d = cube.dimension, th = heading(cube.rotation);
    var cs = Math.cos(th), sn = Math.sin(th);
    var ext = flags ? cfg.margin : cfg.envMargin;
    var hx = d.x / 2 + ext, hz = d.z / 2 + ext, P = [], cells = {}, cellsIn = {};
    for (var i = 0, n = pts.length / 3; i < n; i++) {
      if (flags && !flags[i]) continue;
      var dx = pts[3 * i] - c.x, dz = pts[3 * i + 2] - c.z;
      var lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
      if (Math.abs(lx) > hx || Math.abs(lz) > hz) continue;
      var y = pts[3 * i + 1];
      if (flags) P.push([lx, lz, y]);
      else {
        var key = Math.floor(lx / 0.25) + ',' + Math.floor(lz / 0.25), inside = Math.abs(lx) <= d.x / 2 && Math.abs(lz) <= d.z / 2;
        var tgt = inside ? cellsIn : cells;
        (tgt[key] || (tgt[key] = [])).push([lx, lz, y]);
      }
    }
    if (!flags) {
      var pick = function (cs) { return Object.keys(cs).map(function (k) { var c = cs[k].sort(function (a, b) { return a[2] - b[2]; }); return c[Math.floor((c.length - 1) * 0.2)]; }); };
      P = pick(cells);
      if (P.length < cfg.minGroundPts * 3) { Object.keys(cellsIn).forEach(function (k) { cells[k] = (cells[k] || []).concat(cellsIn[k]); }); P = pick(cells); }
      if (P.length < cfg.minGroundPts * 3) return null;
      var sy = P.map(function (p) { return p[2]; }).sort(function (a, b) { return a - b; });
      var base = sy[Math.floor((sy.length - 1) * 0.1)];
      P = P.filter(function (p) { return p[2] <= base + 0.3; });
    }
    var fit = null;
    for (var pass = 0; pass < 3; pass++) {
      if (P.length < cfg.minGroundPts * 3) return null;
      var s = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      P.forEach(function (p) { s[0] += p[0]; s[1] += p[1]; s[2] += p[0] * p[0]; s[3] += p[0] * p[1]; s[4] += p[1] * p[1];
        s[5] += p[2]; s[6] += p[0] * p[2]; s[7] += p[1] * p[2]; });
      var N = P.length;
      var rg = cfg.groundWeighted ? (cfg.groundRidge || 0) : 0;
      var M = [[N, s[0], s[1], s[5]], [s[0], s[2] + rg, s[3], s[6]], [s[1], s[3], s[4] + rg, s[7]]];
      for (var k = 0; k < 3; k++) {
        var piv = k; for (var r = k + 1; r < 3; r++) if (Math.abs(M[r][k]) > Math.abs(M[piv][k])) piv = r;
        if (Math.abs(M[piv][k]) < 1e-9) return null;
        var t = M[k]; M[k] = M[piv]; M[piv] = t;
        for (var r2 = k + 1; r2 < 3; r2++) { var f = M[r2][k] / M[k][k]; for (var cc = k; cc < 4; cc++) M[r2][cc] -= f * M[k][cc]; }
      }
      var cz = M[2][3] / M[2][2], bz = (M[1][3] - M[1][2] * cz) / M[1][1], az = (M[0][3] - M[0][1] * bz - M[0][2] * cz) / M[0][0];
      fit = { a: az, b: bz, c: cz, n: N };
      var res = P.map(function (p) { return p[2] - (az + bz * p[0] + cz * p[1]); });
      var sd = Math.sqrt(res.reduce(function (q, e) { return q + e * e; }, 0) / N);
      var lim = Math.max(0.05, 2 * sd);
      P = P.filter(function (p, i2) { return Math.abs(res[i2]) <= lim; });
    }
    return fit;
  }
  function refineGround(pts, flags, cube, pl, cfg, keepFlat) {
    var c = cube.position, d = cube.dimension, th = heading(cube.rotation);
    var cs = Math.cos(th), sn = Math.sin(th);
    var ext = flags ? Math.max(cfg.margin, 0.5) : cfg.envMargin;
    var hx0 = d.x / 2, hz0 = d.z / 2, hx = hx0 + ext, hz = hz0 + ext;
    var ring = [], all = [];
    for (var i = 0, n = pts.length / 3; i < n; i++) {
      if (flags && !flags[i]) continue;
      var dx = pts[3 * i] - c.x, dz = pts[3 * i + 2] - c.z;
      var lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
      if (Math.abs(lx) > hx || Math.abs(lz) > hz) continue;
      var y = pts[3 * i + 1], r = y - (pl.a + pl.b * lx + pl.c * lz);
      if (r < -0.6 || r > 1.2) continue;
      var ox = Math.max(0, Math.abs(lx) - hx0), oz = Math.max(0, Math.abs(lz) - hz0), od = Math.sqrt(ox * ox + oz * oz);
      var q = [lx, lz, y, r, cfg.groundWeighted ? 1 / (1 + (od / 0.4) * (od / 0.4)) : 1];
      all.push(q);
      if (Math.abs(lx) > hx0 || Math.abs(lz) > hz0) ring.push(q);
    }
    var Q = ring.length >= 30 ? ring : (flags ? all : all.filter(function (q) { return Math.abs(q[0]) > hx0 || Math.abs(q[1]) > hz0 || q[3] < 0.15; }));
    if (Q.length < 10) return null;
    var bin = 0.02, H = {}, best = null;
    Q.forEach(function (q) { var k = Math.floor(q[3] / bin); H[k] = (H[k] || 0) + 1; });
    Object.keys(H).forEach(function (k) {
      var s3 = (H[k - 1] || 0) + H[k] + (H[+k + 1] || 0);
      if (!best || s3 > best.n) best = { k: +k, n: s3 };
    });
    var mode = (best.k + 0.5) * bin;
    if (cfg.groundWeighted) {
      var ms = 0, mw = 0;
      Q.forEach(function (q) { if (Math.abs(q[3] - mode) <= 0.03) { ms += q[3] * q[4]; mw += q[4]; } });
      if (mw > 0) mode = ms / mw;
    }
    var S = Q.filter(function (q) { return Math.abs(q[3] - mode) <= 0.08; });
    if (S.length < 10) return null;
    var A = pl.a + mode, B = keepFlat ? 0 : pl.b, C = keepFlat ? 0 : pl.c;
    if (cfg.groundWeighted) {
      var bands = [0.15, 0.08, 0.05, 0.04];
      for (var bi = 0; bi < bands.length; bi++) {
        var fp = groundWPlane(Q, A, B, C, bands[bi], keepFlat, cfg.groundRidge || 0);
        if (!fp) break;
        A = fp.a; B = fp.b; C = fp.c;
      }
      var A2 = A, B2 = B, C2 = C;
      S = Q.filter(function (q) { return Math.abs(q[2] - (A2 + B2 * q[0] + C2 * q[1])) <= 0.06; });
      if (S.length < 10) return null;
    } else
    for (var pass = 0; pass < 2 && !keepFlat; pass++) {
      var sx = 0, sz = 0, sxx = 0, sxz = 0, szz = 0, sy = 0, sxy = 0, szy = 0, N = S.length;
      S.forEach(function (q) { sx += q[0]; sz += q[1]; sxx += q[0] * q[0]; sxz += q[0] * q[1]; szz += q[1] * q[1];
        sy += q[2]; sxy += q[0] * q[2]; szy += q[1] * q[2]; });
      var M = [[N, sx, sz, sy], [sx, sxx, sxz, sxy], [sz, sxz, szz, szy]], ok = true;
      for (var k = 0; k < 3 && ok; k++) {
        var piv = k; for (var r1 = k + 1; r1 < 3; r1++) if (Math.abs(M[r1][k]) > Math.abs(M[piv][k])) piv = r1;
        if (Math.abs(M[piv][k]) < 1e-9) { ok = false; break; }
        var t = M[k]; M[k] = M[piv]; M[piv] = t;
        for (var r2 = k + 1; r2 < 3; r2++) { var f = M[r2][k] / M[k][k]; for (var cc = k; cc < 4; cc++) M[r2][cc] -= f * M[k][cc]; }
      }
      if (!ok) break;
      C = M[2][3] / M[2][2]; B = (M[1][3] - M[1][2] * C) / M[1][1]; A = (M[0][3] - M[0][1] * B - M[0][2] * C) / M[0][0];
      var A_ = A, B_ = B, C_ = C;
      S = Q.filter(function (q) { return Math.abs(q[2] - (A_ + B_ * q[0] + C_ * q[1])) <= 0.06; });
      if (S.length < 10) return null;
    }
    var res = S.map(function (q) { return q[2] - (A + B * q[0] + C * q[1]); }).sort(function (a, b) { return a - b; });
    var p = Math.min(1, Math.max(0, cfg.topPercentile));
    return { a: A + res[Math.floor((res.length - 1) * p)] + cfg.gap, b: B, c: C, n: S.length };
  }
  function groundWPlane(P, A0, B0, C0, band, flat, ridge) {
    var cells = {}, G = [];
    P.forEach(function (q) {
      if (Math.abs(q[2] - (A0 + B0 * q[0] + C0 * q[1])) > band) return;
      var key = Math.floor(q[0] / 0.2) + ',' + Math.floor(q[1] / 0.2), c = cells[key];
      if (!c) c = cells[key] = [0, 0, 0, 0, 0];
      c[0] += q[0]; c[1] += q[1]; c[2] += q[2]; c[3] += q[4]; c[4]++;
    });
    Object.keys(cells).forEach(function (k) { var c = cells[k], n = c[4]; G.push([c[0] / n, c[1] / n, c[2] / n, (c[3] / n) * Math.sqrt(n)]); });
    if (G.length < (flat ? 3 : 5)) return null;
    var A = A0, B = flat ? 0 : B0, C = flat ? 0 : C0;
    for (var it = 0; it < 3; it++) {
      var sw = 0, sx = 0, sz = 0, sxx = 0, sxz = 0, szz = 0, sy = 0, sxy = 0, szy = 0;
      var A1 = A, B1 = B, C1 = C;
      G.forEach(function (g) {
        var u = Math.abs(g[2] - (A1 + B1 * g[0] + C1 * g[1])) / band, t = u < 1 ? (1 - u * u) * (1 - u * u) : 0, w = g[3] * t;
        sw += w; sx += w * g[0]; sz += w * g[1]; sxx += w * g[0] * g[0]; sxz += w * g[0] * g[1]; szz += w * g[1] * g[1];
        sy += w * g[2]; sxy += w * g[0] * g[2]; szy += w * g[1] * g[2];
      });
      if (sw < 1e-6) break;
      if (flat) { A = sy / sw; continue; }
      var rg = (ridge || 0) * (sw / G.length);
      var M = [[sw, sx, sz, sy], [sx, sxx + rg, sxz, sxy], [sz, sxz, szz + rg, szy]], ok = true;
      for (var k = 0; k < 3 && ok; k++) {
        var piv = k; for (var r1 = k + 1; r1 < 3; r1++) if (Math.abs(M[r1][k]) > Math.abs(M[piv][k])) piv = r1;
        if (Math.abs(M[piv][k]) < 1e-9) { ok = false; break; }
        var tt = M[k]; M[k] = M[piv]; M[piv] = tt;
        for (var r2 = k + 1; r2 < 3; r2++) { var f = M[r2][k] / M[k][k]; for (var cc = k; cc < 4; cc++) M[r2][cc] -= f * M[k][cc]; }
      }
      if (!ok) break;
      C = M[2][3] / M[2][2]; B = (M[1][3] - M[1][2] * C) / M[1][1]; A = (M[0][3] - M[0][1] * B - M[0][2] * C) / M[0][0];
    }
    return { a: A, b: B, c: C };
  }
  function fitGroundPlane(pts, flags, cube, cfg) {
    var exts = flags ? [cfg.margin, 0.5, 1.0, 1.5] : [cfg.envMargin, cfg.envMargin * 1.6];
    var key = flags ? 'margin' : 'envMargin', i, c2, pl, rf;
    for (i = 0; i < exts.length; i++) {
      c2 = Object.assign({}, cfg); c2[key] = exts[i];
      pl = fitPlane(pts, flags, cube, c2);
      if (!pl) continue;
      rf = refineGround(pts, flags, cube, pl, c2, false);
      if (rf) return rf;
    }
    for (i = 0; i < exts.length; i++) {
      c2 = Object.assign({}, cfg); c2[key] = Math.max(exts[i], 0.5);
      var g = groundHeight(pts, flags, cube, c2);
      if (!g) continue;
      rf = refineGround(pts, flags, cube, { a: g.y, b: 0, c: 0 }, c2, false);
      if (rf) return rf;
    }
    return null;
  }
  window.__refineGround = refineGround; window.__fitGroundPlane = fitGroundPlane;
  function tiltedPose(cube, pl, maxDeg) {
    var th = heading(cube.rotation), cs = Math.cos(th), sn = Math.sin(th);
    var ex = [cs, 0, -sn], ez = [sn, 0, cs];
    var tx = [ex[0], pl.b, ex[2]], tz = [ez[0], pl.c, ez[2]];
    var up = norm(cross(tz, tx)); if (up[1] < 0) up = [-up[0], -up[1], -up[2]];
    if (Math.acos(Math.min(1, up[1])) * 180 / Math.PI > maxDeg) return null;
    var k = dot(tz, up), zA = norm([tz[0] - up[0] * k, tz[1] - up[1] * k, tz[2] - up[2] * k]);
    var xA = norm(cross(up, zA));
    var m13 = zA[0], y0, x0, z0;
    y0 = Math.asin(Math.max(-1, Math.min(1, m13)));
    if (Math.abs(m13) < 0.9999999) { x0 = Math.atan2(-zA[1], zA[2]); z0 = Math.atan2(-up[0], xA[0]); }
    else { x0 = Math.atan2(up[2], up[1]); z0 = 0; }
    var ref = cube.rotation, cands = [
      { x: wrap(x0, ref.x), y: wrap(y0, ref.y), z: wrap(z0, ref.z) },
      { x: wrap(x0 + Math.PI, ref.x), y: wrap(Math.PI - y0, ref.y), z: wrap(z0 + Math.PI, ref.z) }];
    function cost(c) { return Math.abs(c.x - ref.x) + Math.abs(c.y - ref.y) + Math.abs(c.z - ref.z); }
    var rot = cost(cands[0]) <= cost(cands[1]) ? cands[0] : cands[1];
    var h = cube.dimension.y / 2, dx = -up[0] * h, dz = -up[2] * h;
    var lxb = dx * ex[0] + dz * ex[2], lzb = dx * ez[0] + dz * ez[2];
    var yb = pl.a + pl.b * lxb + pl.c * lzb;
    return { position: { x: cube.position.x, y: yb + up[1] * h, z: cube.position.z }, rotation: rot,
      tiltDeg: Math.acos(Math.min(1, up[1])) * 180 / Math.PI };
  }
  window.__fitPlane = fitPlane; window.__tiltedPose = tiltedPose; window.__groundHeight = groundHeight;

/* ============================================================
 * @MODULE[core:ctx]  CONTEXT / LOADER (lõi, không có phím)
 * ctx, findLoader, sceneFallback, framePoints
 * curFrame, selectedId, selIdAny
 * ============================================================ */
  function ctx() {
    var S = window.lidarInstances, V = window.view;
    return (S && V) ? { S: S, V: V, L: findLoader(S, V) } : null;
  }
  var _loader = null, _loaderPath = '';
  function findLoader(S, V) {
    if (_loader && _loader.pointsObjectMap) return _loader;
    var seen = new Set(), q = [[S, 'lidarInstances', 0], [V, 'view', 0]], n = 0;
    while (q.length && n++ < 8000) {
      var it = q.shift(), o = it[0];
      if(!o||typeof o!=='object'||seen.has(o))continue;
      seen.add(o);
      if(o.nodeType||ArrayBuffer.isView(o)||o.isObject3D||o.isBufferGeometry)continue;
      var pom;
      try { pom = o.pointsObjectMap; } catch (e) {}
      if (pom && typeof pom === 'object') { _loader = o; _loaderPath = it[1]; return o; }
      if (it[2] >= 4) continue;
      var ks; try { ks = Object.keys(o); } catch (e) { continue; }
      for (var i = 0; i < ks.length && i < 200; i++) {
        var v; try { v = o[ks[i]]; } catch (e) { continue; }
        if (v && typeof v === 'object') q.push([v, it[1] + '.' + ks[i], it[2] + 1]);
      }
    }
    return null;
  }
  function sceneFallback(V) {
    var sc = V.selectedCube; if (!sc) return null;
    var root = sc; while (root.parent) root = root.parent;
    var best = null;
    root.traverse(function (o) {
      if (o.isPoints && o.visible !== false && o.geometry && o.geometry.attributes.position) {
        var c = o.geometry.attributes.position.count;
        if (!best || c > best.count) best = { o: o, count: c };
      }
    });
    return best && { lidar: best.o, isGround: null };
  }
  function framePoints(C, f) {
    var S = C.S, o = C.L && C.L.pointsObjectMap && C.L.pointsObjectMap[f];
    if (!o && f === curFrame(C)) o = sceneFallback(C.V);
    if (!o || !o.lidar) return null;
    var arr = o.lidar.geometry.attributes.position.array;
    o.lidar.updateMatrixWorld && o.lidar.updateMatrixWorld(true);
    var m = o.lidar.matrixWorld && o.lidar.matrixWorld.elements;
    var ident = !m || (m[12] === 0 && m[13] === 0 && m[14] === 0 && m[0] === 1 && m[5] === 1 && m[10] === 1);
    var fl = (o.isGround && o.isGround.length * 3 === arr.length) ? o.isGround : null;
    if (ident) return { pts: arr, flags: fl, lidar: o.lidar };
    var out = new Float32Array(arr.length);
    for (var i = 0; i < arr.length; i += 3) {
      var x = arr[i], y = arr[i + 1], z = arr[i + 2];
      out[i] = m[0] * x + m[4] * y + m[8] * z + m[12];
      out[i + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
      out[i + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
    }
    return { pts: out, flags: fl, lidar: o.lidar };
  }
  function redMask(lidar, cfg) {
    var mat = lidar && lidar.material, u = mat && mat.uniforms;
    if (!u || !u.colorStep || !u.factorMin || !u.factorMax) return null;
    var steps = (u.colorStep.value || []).slice().sort(function (a, b) { return a.value - b.value; });
    if (steps.length < 2) return null;
    var mode = mat.colorMapping || 'Intensity';
    if (mode !== 'Intensity' && mode !== 'Elevation') return null;
    var g = lidar.geometry, pos = g.attributes.position.array, ex = g.attributes.extra && g.attributes.extra.array;
    if (mode === 'Intensity' && !ex) return null;
    var fmin = u.factorMin.value, fmax = u.factorMax.value, span = (fmax - fmin) || 1;
    var hues = steps.map(function (s) { return s.hsv ? s.hsv.x : 0; }), vals = steps.map(function (s) { return s.value; });
    var lim = cfg.redHueMax / 360, n = pos.length / 3, out = new Uint8Array(n);
    for (var i = 0; i < n; i++) {
      var r = ((mode === 'Elevation' ? pos[3 * i + 1] : ex[i]) - fmin) / span, h;
      if (r <= vals[0]) h = hues[0];
      else if (r >= vals[vals.length - 1]) h = hues[hues.length - 1];
      else {
        h = hues[0];
        for (var k = 0; k < vals.length - 1; k++) {
          if (r >= vals[k] && r < vals[k + 1]) { h = hues[k] + (hues[k + 1] - hues[k]) * (r - vals[k]) / (vals[k + 1] - vals[k]); break; }
        }
      }
      h = h - Math.floor(h);
      if (h <= lim || h >= 1 - lim / 4) out[i] = 1;
    }
    return out;
  }
  window.__redMask = redMask;
  function onlyRed(fp, cfg) {
    if (!cfg.redOnly || !fp.lidar) return fp;
    var m = redMask(fp.lidar, cfg);
    if (!m) { fp.redInfo = 'khong doc duoc mau, dung moi diem'; return fp; }
    var cnt = 0; for (var i = 0; i < m.length; i++) if (m[i] && (!fp.flags || fp.flags[i])) cnt++;
    if (cnt < cfg.minRedPts) { fp.redInfo = 'qua it diem do, dung moi diem'; return fp; }
    var P = new Float32Array(cnt * 3), j = 0;
    for (var k = 0; k < m.length; k++) {
      if (!m[k] || (fp.flags && !fp.flags[k])) continue;
      P[j++] = fp.pts[3 * k]; P[j++] = fp.pts[3 * k + 1]; P[j++] = fp.pts[3 * k + 2];
    }
    return { pts: P, flags: null, lidar: fp.lidar, redInfo: cnt + ' diem do' };
  }
  var lastTilt = 0, lastRedInfo = '';
  function snapOne(C, id, f) {
    var cube = C.S.instancesTree[id] && C.S.instancesTree[id].cubes[f];
    var fp = framePoints(C, f);
    if (!cube) return 'nocube';
    if (!fp) return 'skip';
    fp = onlyRed(fp, CFG); lastRedInfo = fp.redInfo || '';
    var pose = null, res = 'ok';
    if (CFG.tilt) {
      var pl = fitGroundPlane(fp.pts, fp.flags, cube, CFG);
      pose = pl && tiltedPose(cube, pl, CFG.maxTiltDeg);
    }
    if (pose) res = 'tilt';
    else {
      var g = groundHeight(fp.pts, fp.flags, cube, CFG);
      if (!g) return 'noground';
      var rf = refineGround(fp.pts, fp.flags, cube, { a: g.y, b: 0, c: 0 }, CFG, true);
      var gy = rf ? rf.a : g.y + CFG.gap;
      pose = { position: snappedPosition(cube, gy), rotation: cube.rotation, tiltDeg: 0 };
    }
    C.S.updateCubeMatrix(id, f, { position: pose.position, rotation: pose.rotation, dimension: cube.dimension });
    if (CFG.markHuman && C.S.changeCubeInterpolation) C.S.changeCubeInterpolation(id, f, false, 'human');
    C.S.calcPointCount && C.S.calcPointCount(id, f);
    lastTilt = pose.tiltDeg;
    return res;
  }

/* ============================================================
 * @MODULE[core:ui]  UI UTILS (lõi, không có phím)
 * toast, esc, kdisp, synthKey, ensureNavGuard,
 * bindKeyCapture, mouseSpec, runMacro
 * ============================================================ */
  var _lastToast = 0;
  function info(msg, ms) { if (CFG.quietEdit) console.log('[snap]', msg); else toast(msg, ms); }   // thông báo THÀNH CÔNG của chức năng đổi box (lỗi vẫn dùng toast)
  function toast(msg, ms) { console.log('[snap]', msg); _lastToast = Date.now(); var d = document.createElement('div');
    d.textContent = msg; d.className = '__snapToast';
    d.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);background:#fff3f8;color:#5a2a40;padding:8px 16px;border-radius:10px;border:1px solid #f1bdd2;box-shadow:0 6px 20px rgba(120,60,90,.2);z-index:2147483647;font:13px/1.45 Segoe UI,Arial,sans-serif;max-width:80vw;pointer-events:none';
    var host = document.fullscreenElement || document.documentElement || document.body;
    host.appendChild(d); setTimeout(function () { d.remove(); }, ms || 1800); }
  function curFrame(C) {
    var f = C.S.currentFrame; return typeof f==='number'?f:C.V.currentFrame;
  }
  window.__snapDebug = function () {
    var C = ctx(); if (!C) return console.log('[snap] chua co lidarInstances/view');
    var id = selectedId(C), f = curFrame(C), out = {};
    out.currentFrame = f; out.selectedId = id; out.loaderPath = _loaderPath || null;
    out.storeKeys = Object.keys(C.S).slice(0, 60);
    out.loaderFrames = C.L && Object.keys(C.L.pointsObjectMap);
    var e = C.L && C.L.pointsObjectMap[f];
    out.entryKeys = e && Object.keys(e);
    out.isGround = e && e.isGround ? { len: e.isGround.length, nonzero: Array.prototype.filter.call(e.isGround, Boolean).length } : null;
    out.pointCount = e && e.lidar ? e.lidar.geometry.attributes.position.count : null;
    out.cubeFrames = id != null && C.S.instancesTree[id] ? Object.keys(C.S.instancesTree[id].cubes) : null;
    out.cube = id != null && C.S.instancesTree[id] ? C.S.instancesTree[id].cubes[f] : null;
    console.log('[snap] debug', JSON.parse(JSON.stringify(out)));
    return out;
  };
  function selectedId(C) {
    var sc = C.V.selectedCube; return sc && sc.userData && sc.userData.id;
  }
  function selIdAny(C) {
    var id = selectedId(C); if (id != null) return id;
    try { var ss = C.V.state && C.V.state.selectedShape; if (ss != null && ss !== '' && C.S.instancesTree[ss]) return ss; } catch (e) {}
    return id;
  }
  function snapMsg(res) {
    if (res === 'tilt') return 'xoay theo đường ' + lastTilt.toFixed(1) + '°';
    if (res === 'ok') return 'hạ sát đường' + (CFG.tilt ? ' (không xoay được: nghiêng > ' + CFG.maxTiltDeg + '° hoặc thiếu điểm)' : '');
    if (res === 'noground') return 'không thấy điểm đường quanh box' + (CFG.redOnly ? ' (thử Alt+D tắt đất đỏ)' : '');
    if (res === 'skip') return 'frame chưa tải điểm lidar';
    return res === 'nocube' ? 'không có box ở frame này' : String(res);
  }
  function doSnap(all) {
    var C = ctx(); if (!C) return toast('Tool chua san sang');
    var id = selectedId(C); if (id == null) return toast('Chua chon cube');
    if (!all) {
      var f0 = curFrame(C), res = snapOne(C, id, f0);
      console.log('[snap] sat dat id', id, res);
      info('Dán sát đất frame ' + (f0 + 1) + ': ' + snapMsg(res) + (lastRedInfo ? ' | ' + lastRedInfo : ''), 3000);
      if (res !== 'ok' && res !== 'tilt') window.__snapDebug();
      return;
    }
    if (_frameRun) return toast('Đang chạy, đợi xong đã…', 2000);
    var frames = trackFrames(C.S, id);
    if (!frames.length) return toast('Không có keyframe nào', 2500);
    var rr = recBegin('dán sát đất mọi keyframe'), ended = false;
    var end = function () { if (!ended) { ended = true; recEnd(rr); rr = null; } };
    info('Dán sát đất ' + frames.length + ' keyframe của id ' + id + '…', 1500);
    try {
      runOnFrames(id, frames, function (C1, f) { return snapOne(C1, id, f); }, function (list) {
        try { var Cx = ctx(); Cx && Cx.V.gridView && Cx.V.gridView.current && Cx.V.gridView.current.updateAllFramesCube(); } catch (e) {}
        end();
        var r = { ok: 0, tilt: 0, skip: 0, noground: 0, nocube: 0, err: 0 }, why = '';
        list.forEach(function (o) {
          var k = typeof o.r === 'string' ? o.r : 'err'; r[k] = (r[k] || 0) + 1;
          if (k !== 'ok' && k !== 'tilt' && !why) why = (o.f + 1) + ': ' + (k === 'err' ? (o.r && o.r.why) : snapMsg(k));
        });
        console.log('[snap] sat dat moi keyframe id', id, r);
        info('Dán sát đất ' + frames.length + ' keyframe: ' + (r.ok + r.tilt) + ' OK (' + r.tilt + ' xoay theo đường)' + (why ? ' | bỏ qua ' + (frames.length - r.ok - r.tilt) + ' – ' + why : '') + ' | Alt+Z hoàn tác', 5000);
      }, function (k, n, f) { if (n > 1 && (k === 1 || k % 5 === 0)) info('Dán sát đất: frame ' + (f + 1) + ' (' + k + '/' + n + ')…', 1200); });
    } catch (e) { end(); console.error('[snap] sat dat moi keyframe', e); toast('LỖI dán sát đất: ' + (e && e.message || e), 5000); }
  }
  window.__doSnap = doSnap;

/* ============================================================
 * @MODULE[3/4/g/h/j/l]  THUỘC TÍNH / PHÍM GÁN NHANH
 * Phím: các phím gán thuộc tính nhanh (CFG.attrKeys; mặc định 3 4 g h j l — cấu hình trong menu alt+s)
 * getFields/getAllFields, parseLabels, applyAttrs,
 * setOneAttr, doAttrKey, copyAttrsForward, normAttr
 * attrFieldOf, reselectBox, ensureBoxAt
 * ============================================================ */
  var FALLBACK_FIELDS = [
    { name: 'motion_state', type: 'RADIO', label: '动静态 Động/tĩnh',
      options: [{ value: 'moving', label: '运动 đang di chuyển' }, { value: 'parked', label: '静止 đỗ xe' }] },
    { name: 'door status', type: 'CHECKBOX', label: '车门 Cửa xe',
      options: [{ value: 'close', label: '关闭 đóng' }] },
    { name: 'side mirror status', type: 'RADIO', label: '后视镜 Gương chiếu hậu',
      options: [{ value: 'unknown', label: '未知 không xác định' }] }
  ];
  var CONE_RE = /cone|锥|cọc|coc tieu|cọc tiêu|倒地/i, _coneKeys = {};
  function isConeField(f) { return CONE_RE.test(String(f.name || '')) || CONE_RE.test(String(f.label || f.title || '')); }
  function isConeKey(k) { return !!_coneKeys[k] || CONE_RE.test(String(k)); }
  function dropCone(obj) { var o = {}; Object.keys(obj).forEach(function (k) { if (!isConeKey(k)) o[k] = obj[k]; }); return o; }
  var _fields = null, _fieldsSrc = '';
  function looksLikeFields(f) {
    return Array.isArray(f) && f.length && f.every(function (x) { return x && typeof x.name === 'string' && Array.isArray(x.options); });
  }
  function getFields(C) {
    var all = getAllFields(C);
    all.forEach(function (f) { if (isConeField(f)) _coneKeys[f.name] = 1; });
    return all.filter(function (f) { return !isConeField(f); });
  }
  function getAllFields(C) {
    if (_fields) return _fields;
    var V = C.V, cands = [V.labelConfig, V.props && V.props.labelConfig, V.state && V.state.labelConfig];
    for (var i = 0; i < cands.length; i++) if (cands[i] && looksLikeFields(cands[i].fields)) { _fieldsSrc = 'tool'; return (_fields = cands[i].fields); }
    var seen = new Set(), q = [[V, 0], [C.S, 0]], n = 0;
    while (q.length && n++ < 8000) {
      var it = q.shift(), o = it[0];
      if(!o||typeof o!=='object'||seen.has(o))continue;
      seen.add(o);
      if(o.nodeType||ArrayBuffer.isView(o)||o.isObject3D||o.isBufferGeometry)continue;
      var lc; try { lc = o.labelConfig; } catch (e) {}
      if (lc && looksLikeFields(lc.fields)) { _fieldsSrc = 'tool'; return (_fields = lc.fields); }
      if (it[1] >= 4) continue;
      var ks; try { ks = Object.keys(o); } catch (e) { continue; }
      for (var k = 0; k < ks.length && k < 200; k++) {
        var v; try { v = o[ks[k]]; } catch (e) { continue; }
        if (v && typeof v === 'object') q.push([v, it[1] + 1]);
      }
    }
    _fieldsSrc = 'fallback';
    return FALLBACK_FIELDS;
  }
  function isMulti(f){return String(f.type||'').toUpperCase()==='CHECKBOX';}
  function parseLabels(raw){
    if(raw==null||raw==='')return{};
    if(typeof raw==='string'){try{return JSON.parse(raw)||{};}catch(e){return{};}}
    return Object.assign({},raw);
  }
  function treeCategory(tree){
    if(!tree)return'';
    if(tree.category)return tree.category;
    var ks=tree.cubes?Object.keys(tree.cubes):[];
    for(var i=0;i<ks.length;i++){var c=tree.cubes[ks[i]];var cat=c&&(c.category||(c.userData&&c.userData.category));if(cat)return cat;}
    return'';
  }
  function applyAttrs(S, values, opts) {
    values = dropCone(values);
    var res = { ids: 0, cubes: 0, changed: 0 }, keys = Object.keys(values);
    opts.ids.forEach(function (id) {
      var tree = S.instancesTree[id]; if (!tree || !tree.cubes) return;
      if (opts.categories && opts.categories.indexOf(treeCategory(tree)) < 0) return;
      res.ids++;
      Object.keys(tree.cubes).forEach(function (fk) {
        var f = Number(fk), cube = tree.cubes[fk];
        if (!cube || (opts.fromFrame != null && f < opts.fromFrame)) return;
        res.cubes++;
        var raw = cube.labels, isStr = typeof raw === 'string' || raw == null || raw === '';
        var obj = parseLabels(raw), n = 0;
        keys.forEach(function (k) {
          if (opts.onlyExisting && !(k in obj)) return;
          if (JSON.stringify(obj[k]) !== JSON.stringify(values[k])) { obj[k] = values[k]; n++; }
        });
        if (n) { S.updateCubeLabel(id, f, isStr ? JSON.stringify(obj) : obj); res.changed++; }
      });
    });
    return res;
  }
  window.__applyAttrs = applyAttrs;

/* ============================================================
 * @MODULE[alt+s:cone]  XOÁ CỌC TIÊU (nút trong menu alt+s)
 * coneIds, deleteConeIds, doDeleteConesModal
 * ============================================================ */
  function coneIds(S) {
    var re = new RegExp(CFG.coneClassRe, 'i');
    return Object.keys(S.instancesTree).filter(function (i) { return re.test(treeCategory(S.instancesTree[i]) || ''); });
  }
  function deleteConeIds(C, done) {
    var S = C.S, V = C.V, ids = coneIds(S), res = { ok: 0, fail: 0, total: ids.length };
    if (typeof V.removeCubeFromFrames !== 'function' || typeof V.setSelectedShape !== 'function') { res.err = 'tool không có chức năng xoá (removeCubeFromFrames)'; return done(res); }
    var um = V.unitedMode || (V.props && V.props.unitedMode);
    var type = (um === 'UNITED_ADDING' || um === 'UNITED_MANUAL') ? 'cube' : 'combined';
    var n = S.dataLength || S.frameLength || V.frameLength || 0, frames = [];
    for (var f = 0; f < n; f++) frames.push(f);
    var k = 0;
    (function next() {
      if (k >= ids.length) { try { V.unsetSelectedCube && V.unsetSelectedCube(); V.detachCubeControl && V.detachCubeControl(); } catch (e) {} return done(res); }
      var id = ids[k++], tries = 0;
      try { V.setSelectedShape(id, type); } catch (e) { console.warn('[snap] chon id', id, e); }
      (function waitSel() {
        if ((V.state && String(V.state.selectedShape) === String(id)) || tries > 20) {
          try {
            var fr = frames.length ? frames : trackFrames(S, id);
            V.removeCubeFromFrames(fr);
            var t = S.instancesTree[id];
            if (!t || !t.cubes || !Object.keys(t.cubes).length) res.ok++; else res.fail++;
          } catch (e) { console.warn('[snap] xoa id', id, e); res.fail++; }
          return setTimeout(next, 0);
        }
        tries++; setTimeout(waitSel, 10);
      })();
    })();
  }
  window.__deleteConeIds = deleteConeIds;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

/* ============================================================
 * @MODULE[alt+s]  MENU CÀI ĐẶT
 * Phím: alt+s (keyMenu). Gồm cả bảng phím tắt & bảng gán thuộc tính nhanh (drawRemap, drawAttrKeys)
 * MENU_SECTIONS, CFG_DEF, toggleMenu, cfgSave/cfgInit,
 * saveToCode, drawNav/drawSec, drawRemap, drawAttrKeys
 * ============================================================ */
  var MENU_SECTIONS = [
    { t: 'Phím tắt', d: 'Bấm vào ô phím rồi nhấn phím mới (Backspace = tắt phím). Ô đỏ = trùng với chức năng khác.', items: [
      ['#', 'Dán sát'],
      ['keySnap', 'Dán sát đất'], ['keySnapAll', 'Dán sát đất mọi keyframe của id'], ['keyEdge', 'Sát rìa xe'], ['keyEdgeAll', 'Sát rìa xe mọi keyframe'],
      ['keyRed', 'Bật/tắt chỉ dùng đất ĐỎ'],
      ['#', 'Khít & kích thước'],
      ['keyFitHead', 'Khít đầu (frame hiện tại)'], ['keyFitTail', 'Khít đuôi (frame hiện tại)'], ['keyFitHeadAll', 'Khít đầu mọi keyframe'], ['keyFitTailAll', 'Khít đuôi mọi keyframe'], ['keyUnifyTail', 'Đồng nhất kích thước + khít đầu/đuôi'], ['keyWidth', 'Đặt chiều rộng cố định mọi frame'],
      ['#', 'Xe & liên kết'],
      ['keyHead', 'Kéo đầu xe vào thân'], ['keyHeadAll', 'Kéo đầu xe vào thân mọi frame'], ['keyChain', 'Xe sau theo xe trước'], ['keyChainAll', 'Xe sau theo xe trước mọi frame'],
      ['keyDirAll', 'Đồng bộ chiều đầu/đuôi mọi keyframe'],
      ['#', 'Đổi class'],
      ['keyClassPrev', 'Đổi class xe tải trước'], ['keyClassNext', 'Đổi class xe tải sau'], ['keyConvert', 'Đổi sedan ⇄ SUV / cọc ⇄ người cưỡi'],
      ['#', 'Chuyển ID'],
      ['keyNextId', 'ID kế tiếp'], ['keyPrevId', 'ID trước đó'],
      ['#', 'Chung'],
      ['keyMenu', 'Mở menu này'], ['keyLayoutToggle', 'Tạm tắt/bật bố cục tùy chỉnh'], ['keyCams', 'Bật/tắt FOCUS 7 camera'], ['keyAttrPanel', 'Bật/tắt bảng thuộc tính'], ['keyCheck', 'Bật/tắt danh sách kiểm tra'], ['keyFilterPanel', 'Bật/tắt bộ lọc box'], ['keyUndo', 'Hoàn tác thao tác script'], ['keyDeleteAll', 'Xoá toàn bộ frame của ID']
    ] },
    { t: 'Tùy chọn', d: 'Bật/tắt và chỉnh các hành vi của script.', items: [
      ['#', 'Di chuyển & kích thước'],
      ['fineMove', 'Di chuyển mịn – Shift+A/W/S/D/Q/E, hoàn tác bằng Z của tool'],
      ['fineMoveScale', 'Bước di chuyển mịn – 0.25 = 1/4 bước thường'],
      ['axisLock', 'Phím A/W/S/D/Q/E: chỉ xoay đúng 1 trục theo ô đang trỏ (FRONT/TOP/SIDE)'],
      ['groundWeighted', 'Dán sát đất (B): fit đất có trọng số + loại ngoại lai (chính xác hơn)'],
      ['groundRidge', 'Dán sát đất (B): ridge chống nghiêng ảo (0 = tắt)'],
      ['keepAnchor', 'Đổi kích thước: giữ mặt nhiều điểm lidar – chỉ phần kéo ra/thu vào thay đổi'],
      ['widthValue', 'Chiều rộng cố định (m) – dùng cho phím đặt chiều rộng'],
      ['ctrlDragSnap', 'Bật Ctrl+kéo khít'],
      ['recolorBox', 'Điểm mây trong box đổi màu ngay sau khi dùng chức năng của tool (giống khi kéo tay)'],
      ['pauseWhileDragging', 'Tạm dừng các việc định kỳ của tool khi đang kéo/zoom (nhường CPU cho nền tảng)'],
      ['hoverSyncKeys', 'Đồng bộ view dưới con trỏ ngay lúc bấm A/W/S/D/Q/E (sửa lỗi nhầm view khi chuyển nhanh front/top/side)'],
      ['fpsHoverBoost', 'Rê chuột trên view: tạm bỏ giới hạn FPS của script __toiUu (nếu có cài) để hover không bị trễ'],
      ['quietEdit', 'Tắt thông báo khi chức năng đổi box chạy xong (B, V, khít đầu/đuôi, chiều rộng…) – lỗi và cảnh báo vẫn hiện'],
      ['#', 'Mũi tên hướng đỏ (ảnh 2D 7 cam + 3D)'],
      ['keyArrow', 'Phím bật/tắt mũi tên hướng của từng box đang hiển thị'],
      ['showArrows', 'Hiện mũi tên hướng (box bị ẩn thì không có mũi tên)'],
      ['arrowExt', 'Độ dài mũi tên thò ra ngoài mặt đầu box (m)'],
      ['arrowFlip', 'Đảo chiều mũi tên (nếu đầu box là phía ngược lại)'],
      ['arrowOrtho', 'Vẽ mũi tên cả trong view front/side/top (mặc định tắt cho nhẹ; chỉ vẽ trong 3D chính)'],
      ['arrowWidth', 'Độ dày thân mũi tên trên ảnh 2D (px)'],
      ['arrowHead', 'Cỡ đầu mũi tên (nón) – 1 = mặc định, lớn hơn = đầu to hơn (cả 2D và 3D)'],
      ['arrow3dSize', 'Độ dày thân mũi tên trong 3D (kích thước chấm, px)'],
      ['#', 'Khác'],
      ['ctrlLockHeight', 'Ctrl+kéo chỉ di chuyển ngang – giữ nguyên độ cao'],
      ['#', 'Dán sát đất'],
      ['redOnly', 'Chỉ dùng điểm đất màu ĐỎ'],
      ['tilt', 'Xoay box theo mặt đất'],
      ['topPercentile', 'Độ cao đáy box so với dải điểm đường: 0 = mép thấp nhất, 0.5 = giữa dải (khớp), 1 = mép cao nhất'],
      ['gap', 'Khe hở thêm dưới đáy box (m) – 0 = sát'],
      ['zUndo', 'Phím Z hoàn tác thao tác của tool (sát đất, sát rìa, khít, đầu xe…) khi đó là thao tác gần nhất; sau đó Z trở lại hoàn tác của nền tảng'],
      ['platformUndo', 'Cách cũ: giả lập bấm phím để ghi lịch sử Z của nền tảng (hay không ăn – nên tắt)'],
      ['#', 'Chuyển ID'],
      ['nextBestFrame', 'Tự nhảy tới frame nhiều điểm lidar nhất'],
      ['nextSkipHidden', 'Bỏ qua ô gạch sọc'],
      ['nextWrap', 'Hết danh sách thì quay vòng'],
      ['#', 'Đổi class qua lại'],
      ['convertA', 'Class A', menuClasses],
      ['convertB', 'Class B', menuClasses],
      ['#', 'FOCUS camera'],
      ['camArrange', 'Cách xếp camera FOCUS', ['auto', 'h', 'v'], ['Tự động (trong ô canvas = ngang)', 'Ngang', 'Dọc']],
      ['camZ', 'Lớp hiển thị bảng FOCUS (z-index) – thấp hơn hộp thoại nền tảng; tăng nếu bị ô khác che'],
      ['#', 'FPS'],
      ['fpsShow', 'Hiện đồng hồ FPS ở góc dưới trái'],
      ['#', 'Hệ thống'],
      ['histKey', 'Phím của tool dùng để ghi lịch sử Z – a / w / s / d / q / e']
    ] },
    { t: 'Giao diện canvas', d: 'Bấm nút xanh rồi kéo thả trực tiếp các ô trên màn hình – không cần nhập số.',
      btn: ['Chỉnh bố cục bằng kéo thả', function () { lyEdit(true); }, '#ff4fa3'],
      extra: ['layoutRects', 'layoutCustom', 'layoutTopH', 'layoutLeftW', 'layoutW', 'attrPanelShort'],
      items: [
        ['layoutOn', 'Dùng bố cục tùy chỉnh – tắt = trở về bố cục gốc của tool'],
        ['tabNative', 'Tab đồng bộ với tool – script phóng to ô ngay (không nháy) và vẫn gửi Tab cho tool; tắt = chỉ script xử lý'],
        ['layoutSnap', 'Hít vào lưới và cạnh ô bên cạnh – giữ Alt khi kéo để tạm tắt'],
        ['layoutOverflow', 'Cho ô kéo vượt ra ngoài viền canvas – số % tối đa vượt mỗi phía (0 = không cho vượt)'],
        ['attrPanelPin', 'Bảng thuộc tính: cố định vào ô trong bố cục – tắt = kéo thả tự do như FOCUS (cũng bấm được nút ghim trên bảng)'],
        ['attrKeepTab', 'Bảng thuộc tính: chỉ hiện khi Tab phóng to Cam chính hoặc CamFocus / 7 Cam; FOCUS nền tảng, FRONT / TOP / SIDE và các ô khác sẽ ẩn bảng'],
        ['attrKeyToast', 'Hiện thông báo khi bấm phím gán thuộc tính nhanh (lỗi vẫn luôn báo)'],
        ['attrPanelHideRe', 'Bảng thuộc tính: ẩn các trường có tên/nhãn khớp regex này'],
        ['tabPauseHidden', 'Tab: tạm dừng vẽ 3D ở các ô bị ẩn khi phóng to – mượt hơn; tắt nếu ô 3D không vẽ lại sau khi thu nhỏ']
      ]
    },
    { t: 'Đổi phím & thuộc tính', d: 'Gán phím mới cho phím gốc của tool, macro nhiều phím, và phím gán thuộc tính nhanh.', remap: true, items: [['toolKeyMap', 'Đổi phím'], ['macroDelay', 'Nghỉ giữa các phím macro (ms)'], ['attrKeys', 'Phím gán thuộc tính']] },
    { t: 'Cọc tiêu', d: 'Công cụ riêng cho cọc tiêu.',
      btn: ['Xoá toàn bộ cọc tiêu', function () { doDeleteConesModal(); }],
      items: []
    }
  ];
  var CLASS_VN = {"轿车-小汽车": "Ô tô/Sedan", "车门": "cửa xe", "SUV": "Xe gầm cao", "皮卡": "Xe bán tải", "面包车": "Xe hình bánh mì", "公交车-客车": "Xe buýt/Xe buýt chở khách", "卡车": "Xe tải", "货车": "Xe chở hàng", "油罐车": "Xe bồn chở xăng dầu", "大车车头": "Xe đầu kéo lớn", "卡车-挂车": "Xe đầu kéo, rơ moóc", "货车-挂车": "Xe rơ moóc với thùng container", "油罐车-挂车": "Xe bồn rơ moóc chở dầu, xăng", "挂车车头": "Đầu xe rơ moóc", "挂车车尾": "Đuôi xe rơ moóc", "其他车辆": "Loại xe khác", "摩托车拖挂": "Rơ moóc xe máy", "自行车拖挂": "Rơ moóc xe đạp", "无人自行车": "Xe đạp tự lái", "无人电动-摩托车": "Xe điện/xe máy không có người lái", "无人三轮车": "Xe ba bánh không có người lái", "人群": "crowd", "行人": "Người đi bộ", "自行车（有人）": "Xe đạp (có người lái)", "电动-摩托车（有人）": "Xe điện/Xe máy (có người lái)", "三轮车（有人）": "Xe ba bánh (có người lái)", "骑动物的人": "Người cưỡi động vật", "锥桶": "Cọc tiêu", "水马": "water-hoesr", "水马区域": "Rào chắn chứa nước", "障碍物": "Chướng ngại vật", "防撞柱": "Cọc chắn va chạm", "防撞桶": "Rào chắn va chạm", "三角警示牌": "Tam giác cảnh báo", "婴儿车": "Xe đẩy trẻ em", "婴儿车（有人）": "Xe đẩy trẻ em (có người lái)", "手推车": "Xe đẩy", "手推车（有人）": "Xe đẩy (có người lái)", "假人": "Hình nộm", "假骑行人": "Người giả lái xe", "假车": "Xe giả", "动物": "Động vật", "未知": "unknow", "困难": "difficulty"};
  var _cachedClasses = null, _cachedClassesTime = 0;
  function classVN() {
    var m = Object.assign({}, CLASS_VN), known = Object.keys(m);
    try { knownCategories(ctx()).forEach(function (c) { if (known.indexOf(c) < 0) known.push(c); }); } catch (e) {}
    [].forEach.call(document.querySelectorAll('.b-Sidebar__category[title]'), function (el) {
      var t = el.getAttribute('title') || '', k = known.filter(function (c) { return t.indexOf(c) === 0; }).sort(function (a, b) { return b.length - a.length; })[0];
      if (!k) { var mm = t.match(/^(\S+?[）)]|\S+)\s*(.*)$/); if (!mm || !mm[2]) return; k = mm[1]; }
      var tr = t.slice(k.length).trim(); if (tr && !m[k]) m[k] = tr;
    });
    return m;
  }
  function classLabel(c) { var m = classVN(); return m[c] ? m[c] + '  (' + c + ')' : c; }
  window.__classVN = classVN;
  function menuClasses() {
    var now = Date.now();
    if (_cachedClasses && (now - _cachedClassesTime < 10000)) return _cachedClasses;
    var C = ctx(), l = [], m = classVN(); try { l = knownCategories(C).slice(); } catch (e) {}
    Object.keys(m).forEach(function (k) { if (l.indexOf(k) < 0) l.push(k); });
    var order = Object.keys(CLASS_VN);
    _cachedClasses = l.sort(function (a, b) { var ia = order.indexOf(a), ib = order.indexOf(b); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b); });
    _cachedClassesTime = now;
    return _cachedClasses;
  }
  menuClasses.label = classLabel;
  var CFG_DEF = null, MENU_STORE = '__snapCfgV1';
  var KEY_CODE_CHAR = { Semicolon: ';', Comma: ',', Period: '.', Slash: '/', Quote: "'", BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backquote: '`', Backslash: '\\' };
  function cfgSaved() { try { return JSON.parse(localStorage.getItem(MENU_STORE) || '{}') || {}; } catch (e) { return {}; } }
  function cfgSave() {
    var d = {};
    Object.keys(CFG_DEF).forEach(function (k) { if (JSON.stringify(CFG[k]) !== JSON.stringify(CFG_DEF[k])) d[k] = CFG[k]; });
    try { localStorage.setItem(MENU_STORE, JSON.stringify(d)); return true; } catch (e) { return false; }
  }
  var CFG_ORIG = null;
  function cfgInit() {
    CFG_ORIG = JSON.parse(JSON.stringify(CFG));
    Object.keys(SAVED_CFG || {}).forEach(function (k) { if (k in CFG_ORIG || /^key/.test(k)) CFG[k] = SAVED_CFG[k]; });
    CFG_DEF = JSON.parse(JSON.stringify(CFG));
    var sv = cfgSaved(); Object.keys(sv).forEach(function (k) { if (k in CFG_DEF || /^key/.test(k)) CFG[k] = sv[k]; });
    var OLDK = { keyFitHead: 'alt+,', keyFitTail: 'alt+.', keyFitHeadAll: 'shift+alt+,', keyFitTailAll: 'shift+alt+.' };
    Object.keys(OLDK).forEach(function (k) { if (CFG[k] === OLDK[k]) CFG[k] = CFG_DEF[k]; });
  }
  function cfgDiffFromOrig() {
    var d = {}; Object.keys(CFG).forEach(function (k) { if (!(k in CFG_ORIG) || JSON.stringify(CFG[k]) !== JSON.stringify(CFG_ORIG[k])) { if (CFG[k] !== undefined) d[k] = CFG[k]; } });
    return d;
  }
  function copyText(t) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t); return true; } } catch (e) {}
    try { var ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(ta); ta.select(); var ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; }
  }
  function saveToCode() {
    var d = cfgDiffFromOrig(), json = JSON.stringify(d, null, 2).replace(/\n/g, '\n  ');
    var block = '/*@@SAVED_CFG@@*/' + json + '/*@@END@@*/';
    var src = null; try { src = (typeof GM_info !== 'undefined' && GM_info) ? (GM_info.scriptSource || null) : null; } catch (e) {}
    var re = /\/\*@@SAVED_CFG@@\*\/[\s\S]*?\/\*@@END@@\*\//;
    if (src && re.test(src)) {
      var out = src.replace(re, function () { return block; });
      var copied = copyText(out);
      try {
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out], { type: 'text/javascript' })); a.download = 'ConeChut_v2.1.user.js';
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      } catch (e) {}
      return { full: true, copied: copied, n: Object.keys(d).length };
    }
    var line = 'var SAVED_CFG = ' + block + ';';
    return { full: false, copied: copyText(line), n: Object.keys(d).length, line: line };
  }
  window.__saveToCode = saveToCode;
  function keyFromEvent(e) {
    if (/^(Shift|Alt|Control|Meta)/.test(e.key) || e.key === 'AltGraph') return null;
    var k = /^Key[A-Z]$/.test(e.code) ? e.code.slice(3).toLowerCase() : /^Digit[0-9]$/.test(e.code) ? e.code.slice(5) : KEY_CODE_CHAR[e.code] || String(e.key).toLowerCase();
    return (e.ctrlKey ? 'ctrl+' : '') + (e.shiftKey ? 'shift+' : '') + (e.altKey ? 'alt+' : '') + k;
  }
  function modName(e) { var k = String(e.key); return k === 'Control' ? 'ctrl' : k === 'Alt' ? 'alt' : k === 'Shift' ? 'shift' : null; }
  function bindKeyCapture(inp, cb, pre) {
    var pend = null;
    inp.onkeydown = function (e) {
      e.preventDefault(); e.stopPropagation();
      var m = modName(e);
      if (m) {
        if (e.repeat) return;
        var other = (m !== 'ctrl' && e.ctrlKey) || (m !== 'alt' && e.altKey) || (m !== 'shift' && e.shiftKey);
        pend = (pend === null && !other) ? m : false;
        return;
      }
      pend = false;
      if (pre && pre(e)) return;
      var nk = keyFromEvent(e); if (nk) cb(nk);
    };
    inp.onkeyup = function (e) {
      e.preventDefault(); e.stopPropagation();
      var m = modName(e);
      if (m && pend === m) { pend = null; cb(m); return; }
      if (!e.ctrlKey && !e.altKey && !e.shiftKey) pend = null;
    };
  }
  var MOUSE_BTN = { 3: 'mouseback', 4: 'mouseforward' };
  function mouseSpec(e) {
    var b = MOUSE_BTN[e.button]; if (!b) return null;
    return (e.ctrlKey ? 'ctrl+' : '') + (e.shiftKey ? 'shift+' : '') + (e.altKey ? 'alt+' : '') + b;
  }
  function kdisp(v) { return String(v).toUpperCase().replace('MOUSEBACK', '🖱 BACK').replace('MOUSEFORWARD', '🖱 FORWARD'); }
  var _navGuard = false;
  function ensureNavGuard() {
    if (_navGuard) return; _navGuard = true;
    try { history.pushState({ snapGuard: 1 }, '', location.href); } catch (e) {}
    window.addEventListener('popstate', function () {
      var mb = window.__snapMouseBound || {};
      if (_menu || mb.mouseback || mb.mouseforward) { try { history.pushState({ snapGuard: 1 }, '', location.href); } catch (e) {} }
    });
  }
  var TOOL_KEYS = [['[', 'Ảnh camera trước'], [']', 'Ảnh camera sau'], ['z', 'Hoàn tác'], ['y', 'Làm lại'], ['t', 'Nhìn từ trên xuống'], ['x', 'Đổi camera view chính'],
    ['.', 'Frame sau'], [',', 'Frame trước'], ['shift+.', 'Tiến 10 frame'], ['shift+,', 'Lùi 10 frame'], ['l', 'Tải lại frame'], ['j', 'Bật/tắt bỏ mặt đất'], ['n', 'Kiểm tra tiếp (validate)'],
    ['shift+n', 'Chỉ giữ góc xoay Y'], ['shift+f', 'Lật box 180°'], ['alt+v', 'Đồng nhất kích thước'], ['ctrl+s', 'Lưu'], ['alt+g', 'Ẩn/hiện lưới'], ['tab', 'Phóng to ô đang trỏ chuột'],
    ['delete', 'Xoá'], ['escape', 'Huỷ'], ['1', 'Duyệt (approve)'], ['3', 'Tạm hoãn (suspend)']];
  var KEYCODE = { '[': 219, ']': 221, ';': 186, '=': 187, ',': 188, '-': 189, '.': 190, '/': 191, '`': 192, '\\': 220, "'": 222,
    backspace: 8, tab: 9, enter: 13, escape: 27, esc: 27, space: 32, ' ': 32, delete: 46, arrowleft: 37, arrowup: 38, arrowright: 39, arrowdown: 40, home: 36, end: 35, pageup: 33, pagedown: 34 };
  var CODE_OF = { '[': 'BracketLeft', ']': 'BracketRight', ';': 'Semicolon', '=': 'Equal', ',': 'Comma', '-': 'Minus', '.': 'Period', '/': 'Slash', '`': 'Backquote', '\\': 'Backslash', "'": 'Quote',
    backspace: 'Backspace', tab: 'Tab', enter: 'Enter', escape: 'Escape', esc: 'Escape', space: 'Space', delete: 'Delete', arrowleft: 'ArrowLeft', arrowup: 'ArrowUp', arrowright: 'ArrowRight', arrowdown: 'ArrowDown' };
  var SHIFTED = { '[': '{', ']': '}', ';': ':', '=': '+', ',': '<', '-': '_', '.': '>', '/': '?', '`': '~', '\\': '|', "'": '"' };
  function synthKey(spec, type) {
    var p = String(spec).toLowerCase().replace(/\s+/g, '').split('+'), k = p.pop(), sh = p.indexOf('shift') >= 0;
    var MD = { ctrl: ['Control', 'ControlLeft', 17], alt: ['Alt', 'AltLeft', 18], shift: ['Shift', 'ShiftLeft', 16] };
    if (MD[k]) {
      var dn = type === 'keydown', m0 = MD[k];
      var ev0 = new KeyboardEvent(type, { key: m0[0], code: m0[1], bubbles: true, cancelable: true, composed: true,
        ctrlKey: k === 'ctrl' ? dn : p.indexOf('ctrl') >= 0, altKey: k === 'alt' ? dn : p.indexOf('alt') >= 0, shiftKey: k === 'shift' ? dn : sh, metaKey: false });
      try { Object.defineProperty(ev0, 'keyCode', { get: function () { return m0[2]; } }); Object.defineProperty(ev0, 'which', { get: function () { return m0[2]; } }); } catch (e) {}
      ev0.__snapSynth = true;
      var tg0 = document.activeElement && document.activeElement !== document.body && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) ? document.activeElement : document.body;
      tg0.dispatchEvent(ev0); return;
    }
    var kc = KEYCODE[k] || (/^[a-z]$/.test(k) ? k.toUpperCase().charCodeAt(0) : /^[0-9]$/.test(k) ? 48 + (+k) : /^f([1-9]|1[0-2])$/.test(k) ? 111 + (+k.slice(1)) : 0);
    var code = CODE_OF[k] || (/^[a-z]$/.test(k) ? 'Key' + k.toUpperCase() : /^[0-9]$/.test(k) ? 'Digit' + k : k.toUpperCase());
    var key = /^[a-z]$/.test(k) ? (sh ? k.toUpperCase() : k) : (sh && SHIFTED[k]) || ({ escape: 'Escape', esc: 'Escape', delete: 'Delete', backspace: 'Backspace', tab: 'Tab', enter: 'Enter', space: ' ',
      arrowleft: 'ArrowLeft', arrowup: 'ArrowUp', arrowright: 'ArrowRight', arrowdown: 'ArrowDown' }[k] || k);
    var ev = new KeyboardEvent(type, { key: key, code: code, bubbles: true, cancelable: true, composed: true,
      ctrlKey: p.indexOf('ctrl') >= 0, altKey: p.indexOf('alt') >= 0, shiftKey: sh, metaKey: false });
    try { Object.defineProperty(ev, 'keyCode', { get: function () { return kc; } }); Object.defineProperty(ev, 'which', { get: function () { return kc; } }); } catch (e) {}
    ev.__snapSynth = true;
    var tg = document.activeElement && document.activeElement !== document.body && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) ? document.activeElement : document.body;
    tg.dispatchEvent(ev);
  }
  window.__synthKey = synthKey;
  var ATTR_ROLES = [['role:cipo', 'CIPO'], ['role:occ', 'Độ che phủ'], ['role:motion', 'Động / tĩnh'], ['role:valid', 'Hợp lệ']];
  function attrFieldOf(C, spec) {
    if (!spec) return null;
    if (spec.indexOf('role:') === 0) { var F = chkFields(C); return F[spec.slice(5)] || null; }
    var nm = spec.slice(5), V = C.V, r = null;
    cfgFields(V.labelConfig).forEach(function (f) { if (!r && f.name === nm && !isConeField(f)) r = { f: f, src: 'box' }; });
    cfgFields(V.instanceLabelConfig).forEach(function (f) { if (!r && f.name === nm && !isConeField(f)) r = { f: f, src: 'id' }; });
    if (!r) getFields(C).forEach(function (f) { if (!r && f.name === nm) r = { f: f, src: 'box' }; });
    return r;
  }
  function optText(f, v) { var o = (f.options || []).filter(function (x) { return String(x.value) === String(v); })[0]; return o ? String(o.label || o.value) : String(v); }
  function normAttr(x) {
    x = x || {};
    var sets = Array.isArray(x.sets) ? x.sets.filter(function (q) { return q && q.field; }).map(function (q) { return { field: q.field, val: q.val == null ? '__cycle__' : q.val }; })
      : (x.field ? [{ field: x.field, val: x.val == null ? '__cycle__' : x.val }] : []);
    return { k: x.k || '', scope: x.scope || 'frame', sets: sets };
  }
  function ensureBoxAt(C, id, f0) {
    var S = C.S;
    if (S.instancesTree[id].cubes[f0]) return;
    var e = effCube(S, id, f0); if (e) writePose(S, id, f0, { position: Object.assign({}, e.cube.position), rotation: Object.assign({}, e.cube.rotation), dimension: Object.assign({}, e.cube.dimension) }, e.base || e.cube);
  }
  function reselectBox(C, id, force) {
    try { if (!force && C.V.state && String(C.V.state.selectedShape) === String(id)) return; } catch (e0) {}
    try { var um = C.V.unitedMode || (C.V.props && C.V.props.unitedMode); C.V.setSelectedShape && C.V.setSelectedShape(id, (um === 'UNITED_ADDING' || um === 'UNITED_MANUAL') ? 'cube' : 'combined'); } catch (e3) {}
  }
  function setOneAttr(C, id, set, f0, fr) {
    var S = C.S, fx = attrFieldOf(C, set.field);
    if (!fx) return { err: 'không thấy trường ' + String(set.field).replace(/^(role|name):/, '') };
    if (fx.src === 'box' && fr.indexOf(f0) >= 0) ensureBoxAt(C, id, f0);
    var name = fx.f.name, opts = fx.f.options || [], multi = isMulti(fx.f), cur = null, n = 0, newV = null;
    var curObj = fx.src === 'id' ? instAttrAt(S, id, f0) : parseLabels((S.instancesTree[id].cubes[f0] || {}).labels);
    cur = curObj[name]; if (Array.isArray(cur)) cur = cur[0];
    if (set.val === '__cycle__') {
      if (!opts.length) return { err: (fx.f.label || name) + ': không có danh sách đáp án' };
      var ix = opts.map(function (o) { return String(o.value); }).indexOf(String(cur));
      newV = opts[(ix + 1) % opts.length].value;
    } else { var o2 = opts.filter(function (o) { return String(o.value) === String(set.val); })[0]; newV = o2 ? o2.value : set.val; }
    var put = multi ? [newV] : newV;
    fr.forEach(function (f) {
      if (fx.src === 'id') { if (!S.updateInstanceLabel) return; var A = instAttrAt(S, id, f); A[name] = put; S.updateInstanceLabel(id, f, A); n++; return; }
      var c = S.instancesTree[id].cubes[f]; if (!c) return;
      var obj = parseLabels(c.labels), isStr = typeof c.labels === 'string' || c.labels == null; obj[name] = put;
      S.updateCubeLabel(id, f, isStr ? JSON.stringify(obj) : obj); n++;
    });
    return { text: (fx.f.label || fx.f.name) + ' → ' + optText(fx.f, newV), n: n };
  }
  function copyAttrsForward(C, id, f0) {
    var S = C.S, later = trackFrames(S, id).filter(function (x) { return x > f0; });
    if (!later.length) return { err: 'không có keyframe nào phía sau frame ' + (f0 + 1) };
    ensureBoxAt(C, id, f0);
    var src = S.instancesTree[id].cubes[f0]; if (!src) return { err: 'không đọc được thuộc tính frame ' + (f0 + 1) };
    var boxObj = parseLabels(src.labels), instObj = S.updateInstanceLabel ? instAttrAt(S, id, f0) : null, n = 0;
    later.forEach(function (f) {
      var c = S.instancesTree[id].cubes[f]; if (!c) return;
      var isStr = typeof c.labels === 'string' || c.labels == null, o = JSON.parse(JSON.stringify(boxObj));
      S.updateCubeLabel(id, f, isStr ? JSON.stringify(o) : o);
      if (instObj) S.updateInstanceLabel(id, f, JSON.parse(JSON.stringify(instObj)));
      n++;
    });
    return { n: n, text: 'chép mọi thuộc tính frame ' + (f0 + 1) + ' → ' + n + ' keyframe sau' };
  }
  function doAttrKey(spec) {
    try {
      var C = ctx(); if (!C) return;
      var S = C.S, id = selectedId(C); if (id == null) return toast('Chưa chọn box', 2000);
      var it = normAttr(spec), f0 = curFrame(C), tf = trackFrames(S, id);
      var fr = it.scope === 'all' ? tf : it.scope === 'from' ? tf.filter(function (x) { return x >= f0; }) : [f0];
      var msgs = [], errs = [];
      it.sets.forEach(function (st) { var r = setOneAttr(C, id, st, f0, fr); if (r.err) errs.push(r.err); else msgs.push(r.text); });
      if (it.scope === 'copyall') { var cr = copyAttrsForward(C, id, f0); if (cr.err) errs.push(cr.err); else msgs.push(cr.text); }
      _emit(S);
      reselectBox(C, id);
      var where = it.scope === 'copyall' ? '' : ' (' + (fr.length > 1 ? fr.length + ' keyframe' : 'frame ' + (f0 + 1)) + ')';
      if (errs.length) toast((msgs.join(' · ') || 'Chưa chọn thuộc tính nào') + where + ' | LỖI: ' + errs.join('; '), 4500);
      else if (CFG.attrKeyToast) toast((msgs.join(' · ') || 'Chưa chọn thuộc tính nào') + where, 2200);
    } catch (e) { console.error('[snap] gan thuoc tinh nhanh', e); toast('LỖI gán thuộc tính: ' + (e && e.message || e), 4000); }
  }
  window.__doAttrKey = doAttrKey;
  function runMacro(seq) {
    var i = 0;
    (function next() {
      if (i >= seq.length) return;
      var k = seq[i++]; synthKey(k, 'keydown'); synthKey(k, 'keyup');
      if (i < seq.length) setTimeout(next, CFG.macroDelay);
    })();
  }
  var _coneDeleteArm = false, _coneDeleteTimer = null;
  function doDeleteConesModal(btn, statusFn) {
    var C = ctx(); if (!C) return toast('Tool chưa sẵn sàng');
    var ids = coneIds(C.S);
    if (!ids.length) {
      if (statusFn) statusFn('Không có id cọc tiêu nào (class khớp "' + CFG.coneClassRe + '").', true);
      return toast('Không có cọc tiêu nào trong bài', 2500);
    }
    if (!_coneDeleteArm) {
      _coneDeleteArm = true;
      if (btn) { btn.textContent = 'Xác nhận XOÁ ' + ids.length + ' id cọc tiêu?'; btn.style.background = '#b8264f'; }
      if (statusFn) statusFn('Bấm lại lần nữa để XOÁ TOÀN BỘ ' + ids.length + ' id cọc tiêu khỏi mọi frame!', true);
      clearTimeout(_coneDeleteTimer);
      _coneDeleteTimer = setTimeout(function () {
        _coneDeleteArm = false;
        if (btn) { btn.textContent = 'Xoá toàn bộ cọc tiêu'; btn.style.background = '#d6456f'; }
      }, 4500);
      return;
    }
    _coneDeleteArm = false; clearTimeout(_coneDeleteTimer);
    if (btn) { btn.disabled = true; btn.textContent = 'Đang xoá cọc tiêu…'; }
    deleteConeIds(C, function (r) {
      if (btn) { btn.disabled = false; btn.textContent = 'Xoá toàn bộ cọc tiêu'; btn.style.background = '#d6456f'; }
      if (r.ok) undoPushPlatform('xoá ' + r.ok + ' id cọc tiêu');
      var msg = r.err ? 'LỖI: ' + r.err : 'Đã xoá ' + r.ok + '/' + r.total + ' id cọc tiêu' + (r.fail ? ' (' + r.fail + ' chưa xoá hết)' : '') + '. Bấm Lưu trên tool.';
      if (statusFn) statusFn(msg, !!(r.err || r.fail));
      toast(msg.split('.')[0], 4000);
    });
  }
  var _menu = null;
  function toggleMenu() {
    if (_menu) { window.removeEventListener('keydown', _menu.esc, true); _menu.host.remove(); _menu = null; return; }
    ensureNavGuard();
    var host = document.createElement('div'), root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    host.style.cssText = 'position:fixed !important;z-index:2147483001 !important;left:' + Math.max(10, (window.innerWidth - 860) / 2) + 'px;top:50px;width:860px;max-width:calc(100vw - 20px);height:min(650px,calc(100vh - 70px));will-change:transform;';
    root.innerHTML = '<style>:host{all:initial}*{box-sizing:border-box;font:12.5px Segoe UI,Arial,sans-serif}::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-thumb{background:#f1bfd2;border-radius:6px}::-webkit-scrollbar-thumb:hover{background:#e79ab8}::-webkit-scrollbar-track{background:transparent}.w{position:absolute;inset:0;display:flex;flex-direction:column;background:#fff8fb;color:#4a2f3b;border:1px solid #f1c4d5;border-radius:12px;overflow:hidden;box-shadow:0 12px 36px rgba(120,60,90,.22)}.hd{display:flex;align-items:center;gap:8px;padding:10px 14px;background:#fde4ee;border-bottom:1px solid #f1c4d5;cursor:move;user-select:none}.hd b{flex:1;color:#7a3552;font-size:14px;font-weight:600}.bd{flex:1;display:flex;min-height:0}.nav{width:178px;border-right:1px solid #f4d3df;overflow:auto;flex:0 0 auto;background:#fff1f6;padding:8px 0}.nav div{padding:8px 12px;cursor:pointer;margin:2px 8px;border-radius:8px;color:#8a5a6e}.nav div:hover{background:#fde4ee;color:#6a2f48}.nav div.on{background:#f6b8d0;color:#5a1f3a;font-weight:600}.nav div .c{float:right;color:#d06a92}.ct{flex:1;overflow:auto;padding:14px 18px}.ct h3{margin:0 0 8px;font-size:14px;color:#8a3a5c;display:flex;align-items:center;gap:8px;font-weight:600}.desc{color:#9b7686;margin:0 0 8px}.gh{margin:14px 0 4px;padding:3px 0;border-bottom:1px solid #f1c4d5;color:#b0537c;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.4px}.row{display:flex;align-items:center;gap:10px;padding:6px 6px;border-bottom:1px solid #f7e1ea;border-radius:6px}.row:hover{background:#fff0f5}.row .l{flex:1;min-width:0}.row .k{color:#9b7686;font-size:11px}input,select{background:#fff;color:#4a2f3b;border:1px solid #efc3d3;border-radius:6px;padding:3px 7px}input:focus,select:focus{outline:none;border-color:#e27ba2;box-shadow:0 0 0 2px rgba(226,123,162,.18)}input[type=checkbox]{accent-color:#e27ba2;width:16px;height:16px}input[type=number]{width:80px}input.tx{width:260px}input.key{width:140px;text-align:center;cursor:pointer}input.key.rec{border-color:#e27ba2;background:#ffeaf2}input.bad{border-color:#d6456f;background:#ffe9ee}.ch{color:#b0537c;font-size:11px}.warn{color:#d6456f;font-size:11px}button{background:#fff;color:#7a3552;border:1px solid #efc3d3;border-radius:6px;padding:4px 12px;cursor:pointer;transition:background .12s,border-color .12s}button:hover{background:#fde4ee;border-color:#e79ab8}button:active{background:#f8d3e1}button.g{background:#f3a9c6;color:#4a1a32;border-color:#ec93b6}button.g:hover{background:#ee93b8}button.o{background:#d6456f;border-color:#d6456f;color:#fff}button.o:hover{background:#c23a63}.ft{padding:8px 14px;border-top:1px solid #f4d3df;background:#fff1f6;display:flex;gap:8px;align-items:center}.ft .s{flex:1;color:#9b5a77}</style>'
      + '<div class="w"><div class="hd"><b>Cài đặt</b><button class="x">Đóng</button></div>'
      + '<div class="bd"><div class="nav"></div><div class="ct"></div></div>'
      + '<div class="ft"><span class="s"></span><button class="rall">Mặc định TẤT CẢ</button></div></div>';
    ['keydown', 'keyup', 'keypress', 'mousedown', 'wheel', 'contextmenu', 'pointerdown'].forEach(function (ev) { host.addEventListener(ev, function (e) { e.stopPropagation(); }); });
    document.body.appendChild(host);
    var nav = root.querySelector('.nav'), ct = root.querySelector('.ct'), st = root.querySelector('.s');
    _menu = { host: host, sec: toggleMenu.sec || 0, rec: null };
    _menu.esc = function (e) {
      if (e.key !== 'Escape') return; var t = e.composedPath ? e.composedPath()[0] : e.target;
      if (t && t.classList && t.classList.contains('key')) return;
      e.preventDefault(); e.stopPropagation(); toggleMenu();
    };
    window.addEventListener('keydown', _menu.esc, true);
    var secs = MENU_SECTIONS;
    secs.forEach(function (s) { s.items = s.items.filter(function (it) { return it[0] === '#' || it[0] in CFG_DEF; }); });
    var status = function (t, bad) { st.textContent = t; st.style.color = bad ? '#d6456f' : '#9b5a77'; };
    var keyOwners = function () { var m = {}; Object.keys(CFG).forEach(function (k) { if (/^key/.test(k) && CFG[k]) { var v = String(CFG[k]).toLowerCase(); (m[v] = m[v] || []).push(k); } }); return m; };
    var labelOf = function (k) { var r = k; secs.forEach(function (s) { s.items.forEach(function (it) { if (it[0] === k) r = it[1]; }); }); return r; };
    var changedIn = function (s) { return s.items.filter(function (it) { return it[0] !== '#' && JSON.stringify(CFG[it[0]]) !== JSON.stringify(CFG_DEF[it[0]]); }).length + (s.extra || []).filter(function (k) { return JSON.stringify(CFG[k]) !== JSON.stringify(CFG_DEF[k]); }).length; };
    var apply = function (k, v) {
      CFG[k] = v; if (window.__snapRebuildKeys) window.__snapRebuildKeys();
      if (/^fps(?:Mode|Target|3d|Show)$/.test(k)) { try { applyFps(); } catch (e) { console.warn('[snap] FPS', e); } }
      if (_cam) { try { camLayout(); camRender(); } catch (e) {} }
      status(cfgSave() ? 'Đã lưu: ' + labelOf(k) : 'Đã áp dụng (trình duyệt không cho lưu – mất khi tải lại trang)', false);
      drawNav();
    };
    var applyFilter = function () {
      var qi = root.querySelector('.q'), q = qi ? (qi.value || '').trim().toLowerCase() : '';
      [].forEach.call(ct.querySelectorAll('.row[data-t]'), function (r) { r.style.display = !q || r.getAttribute('data-t').indexOf(q) >= 0 ? '' : 'none'; });
      [].forEach.call(ct.querySelectorAll('.gh'), function (h) { h.style.display = q ? 'none' : ''; });
    };
    var drawNav = function () {
      nav.innerHTML = '';
      secs.forEach(function (s, i) {
        var d = document.createElement('div'), n = changedIn(s); d.textContent = s.t; if (i === _menu.sec) d.className = 'on';
        d.onclick = function () { _menu.sec = toggleMenu.sec = i; drawNav(); drawSec(); }; nav.appendChild(d);
      });
    };
    var drawSec = function () {
      var s = secs[_menu.sec] || secs[0], owners = keyOwners();
      ct.innerHTML = ''; var h = document.createElement('h3'); h.textContent = s.t;
      var rs = document.createElement('button'); rs.textContent = 'Mặc định mục này'; rs.style.marginLeft = 'auto';
      rs.onclick = function () { s.items.forEach(function (it) { if (it[0] === '#') return; CFG[it[0]] = JSON.parse(JSON.stringify(CFG_DEF[it[0]])); }); (s.extra || []).forEach(function (k) { CFG[k] = JSON.parse(JSON.stringify(CFG_DEF[k])); }); if (window.__snapRebuildKeys) window.__snapRebuildKeys(); cfgSave(); status('Đã trả mục "' + s.t + '" về mặc định'); drawNav(); drawSec(); };
      h.appendChild(rs); ct.appendChild(h);
      if (s.remap) return drawRemap(owners);
      if (s.btn) {
        var b = document.createElement('button'); b.className = s.btn[2] ? 'g' : 'o'; b.textContent = s.btn[0]; b.style.cssText = 'margin-bottom:8px;padding:6px 14px;font-weight:600;';
        b.onclick = function () { s.btn[1] ? s.btn[1]() : doDeleteConesModal(b, status); };
        ct.appendChild(b);
      }
      s.items.forEach(function (it) {
        if (it[0] === '#') { var gh = document.createElement('div'); gh.className = 'gh'; gh.textContent = it[1]; ct.appendChild(gh); return; }
        var k = it[0], v = CFG[k], dv = CFG_DEF[k], row = document.createElement('div'); row.className = 'row'; row.setAttribute('data-t', (it[1] + ' ' + k).toLowerCase());
        var pr = String(it[1]).split(' – '), l = document.createElement('div'); l.className = 'l';
        l.innerHTML = '<div class="t">' + esc(pr[0]) + '</div>';
        row.appendChild(l);
        var inp;
        if (/^key/.test(k)) {
          inp = document.createElement('input'); inp.className = 'key'; inp.readOnly = true; inp.value = v ? kdisp(v) : '(tắt)';
          var dup = v && (owners[String(v).toLowerCase()] || []).filter(function (o) { return o !== k; });
          if (dup && dup.length) { inp.classList.add('bad'); var w = document.createElement('div'); w.className = 'warn'; w.textContent = 'trùng: ' + dup.map(labelOf).join(', '); l.appendChild(w); }
          inp.onfocus = function () { inp.classList.add('rec'); inp.value = 'bấm phím / nút chuột…'; if (_menu) _menu.rec = { set: function (nk) { apply(k, nk); drawSec(); } }; };
          inp.onblur = function () { inp.classList.remove('rec'); inp.value = CFG[k] ? kdisp(CFG[k]) : '(tắt)'; if (_menu) _menu.rec = null; };
          bindKeyCapture(inp, function (nk) { apply(k, nk); drawSec(); }, function (e) {
            if (e.key === 'Escape') { inp.blur(); return true; }
            if ((e.key === 'Backspace' || e.key === 'Delete') && !e.ctrlKey && !e.altKey && !e.shiftKey) { apply(k, ''); drawSec(); return true; }
            return false;
          });
        } else if (it[2]) {
          inp = document.createElement('select');
          var opts = typeof it[2] === 'function' ? it[2]() : it[2];
          if (opts.indexOf(v) < 0 && v != null && v !== '') opts = [v].concat(opts);
          opts.forEach(function (o, j) { var op = document.createElement('option'); op.value = o; op.textContent = typeof it[2] === 'function' ? (it[2].label ? it[2].label(o) : o) : ((it[3] && it[3][j]) || o); if (o === v) op.selected = true; inp.appendChild(op); });
          inp.onchange = function () { apply(k, inp.value); drawSec(); };
        } else if (typeof dv === 'boolean') {
          inp = document.createElement('input'); inp.type = 'checkbox'; inp.checked = !!v; inp.onchange = function () { apply(k, inp.checked); drawSec(); };
        } else if (typeof dv === 'number') {
          inp = document.createElement('input'); inp.type = 'number'; inp.step = 'any'; inp.value = v;
          inp.onchange = function () { var n = parseFloat(inp.value); if (!isFinite(n)) { inp.classList.add('bad'); return status('Số không hợp lệ', true); } apply(k, n); drawSec(); };
        } else if (Array.isArray(dv)) {
          inp = document.createElement('span');
          dv.forEach(function (x, j) {
            var e2 = document.createElement('input'); e2.type = 'number'; e2.step = 'any'; e2.value = (v || dv)[j]; e2.style.width = '64px'; e2.style.marginLeft = '4px';
            e2.onchange = function () { var a = (CFG[k] || dv).slice(), n = parseFloat(e2.value); if (!isFinite(n)) return status('Số không hợp lệ', true); a[j] = n; apply(k, a); drawSec(); };
            inp.appendChild(e2);
          });
        } else {
          inp = document.createElement('input'); inp.className = 'tx'; inp.value = v == null ? '' : v;
          inp.onchange = function () {
            if (/Re$/.test(k)) { try { new RegExp(inp.value, 'i'); } catch (er) { inp.classList.add('bad'); return status('Regex sai: ' + er.message, true); } }
            apply(k, inp.value); drawSec();
          };
        }
        row.appendChild(inp); ct.appendChild(row);
      });
      applyFilter();
    };
    var toolLabel = function (k) { k = String(k || '').toLowerCase(); var r = ''; TOOL_KEYS.forEach(function (x) { if (x[0] === k) r = x[1]; }); return r; };
    var seqText = function (v) { var a = [].concat(v || []).filter(Boolean); return a.length ? a.map(function (x) { return String(x).toUpperCase(); }).join('  →  ') : ''; };
    var drawRemap = function (owners) {
      var list = (CFG.toolKeyMap || []).map(function (x) { return [x[0] || '', x[1] || '']; });
      var save = function () { apply('toolKeyMap', list.filter(function (x) { return x[0] || (x[1] && x[1].length); }).map(function (x) { var t = [].concat(x[1] || []).filter(Boolean); return [x[0], t.length > 1 ? t : (t[0] || '')]; })); };
      var rec1 = function (val, cb) {
        var inp = document.createElement('input'); inp.className = 'key'; inp.readOnly = true; inp.value = val ? kdisp(val) : '(chưa đặt)';
        inp.onfocus = function () { inp.classList.add('rec'); inp.value = 'phím / nút chuột…'; if (_menu) _menu.rec = { set: cb }; };
        inp.onblur = function () { inp.classList.remove('rec'); inp.value = val ? kdisp(val) : '(chưa đặt)'; if (_menu) _menu.rec = null; };
        bindKeyCapture(inp, cb);
        return inp;
      };
      var recSeq = function (val, cb) {
        var inp = document.createElement('input'); inp.className = 'key'; inp.readOnly = true; inp.style.width = '170px';
        var cur = [].concat(val || []).filter(Boolean), buf = null;
        inp.value = seqText(cur) || '(chưa đặt)';
        inp.onfocus = function () { buf = []; inp.classList.add('rec'); inp.value = 'bấm lần lượt các phím…'; if (_menu) _menu.rec = { set: function () { status('Phím đích / macro chỉ nhận phím bàn phím (nút chuột chỉ dùng làm phím MỚI)', true); } }; };
        bindKeyCapture(inp, function (nk) { if (!buf) return; buf.push(nk); inp.value = seqText(buf) + '  …'; });
        inp.onblur = function () { inp.classList.remove('rec'); if (_menu) _menu.rec = null; if (buf && buf.length) { cur = buf; cb(buf); } else inp.value = seqText(cur) || '(chưa đặt)'; buf = null; };
        return inp;
      };
      list.forEach(function (pair, i) {
        var row = document.createElement('div'); row.className = 'row';
        var a = rec1(pair[0], function (nk) { list[i][0] = nk; save(); drawSec(); });
        var arrow = document.createElement('span'); arrow.textContent = '→';
        var b = recSeq(pair[1], function (seq) { list[i][1] = seq; save(); drawSec(); });
        var seq = [].concat(pair[1] || []).filter(Boolean);
        var lab = document.createElement('div'); lab.className = 'l';
        lab.textContent = seq.length > 1 ? 'Macro: ' + seq.map(function (k) { return toolLabel(k) || String(k).toUpperCase(); }).join(' → ')
          : (toolLabel(seq[0]) || (seq[0] ? 'phím ' + String(seq[0]).toUpperCase() + ' của tool' : ''));
        var own = pair[0] && (owners[String(pair[0]).toLowerCase()] || []);
        var dupe = pair[0] && list.filter(function (x) { return x[0] === pair[0]; }).length > 1;
        if ((own && own.length) || dupe || toolLabel(pair[0])) {
          var w = document.createElement('div'); w.className = 'warn';
          w.textContent = 'phím mới ' + kdisp(pair[0]) + ' sẽ che: ' + [].concat(own && own.length ? own.map(labelOf) : [], toolLabel(pair[0]) ? ['tool: ' + toolLabel(pair[0])] : [], dupe ? ['dòng khác'] : []).join(', ');
          lab.appendChild(w);
        }
        var del = document.createElement('button'); del.textContent = '✕'; del.onclick = function () { list.splice(i, 1); save(); drawSec(); };
        row.appendChild(a); row.appendChild(arrow); row.appendChild(b); row.appendChild(lab); row.appendChild(del); ct.appendChild(row);
      });
      var bar = document.createElement('div'); bar.style.cssText = 'display:flex;gap:8px;margin-top:10px;align-items:center;flex-wrap:wrap';
      var sel = document.createElement('select'); sel.innerHTML = '<option value="">+ Thêm chức năng của tool…</option>' + TOOL_KEYS.map(function (x) { return '<option value="' + esc(x[0]) + '">' + esc(x[1]) + ' (' + esc(x[0].toUpperCase()) + ')</option>'; }).join('');
      sel.onchange = function () { if (!sel.value) return; list.push(['', sel.value]); save(); drawSec(); };
      var add = document.createElement('button'); add.textContent = '+ Dòng trống / macro'; add.onclick = function () { list.push(['', '']); CFG.toolKeyMap = list; drawSec(); };
      var dl = document.createElement('span'); dl.style.color = '#9b7686'; dl.innerHTML = 'nghỉ giữa các phím macro ';
      var di = document.createElement('input'); di.type = 'number'; di.value = CFG.macroDelay; di.style.width = '60px'; di.onchange = function () { var n = parseFloat(di.value); if (isFinite(n) && n >= 0) apply('macroDelay', n); };
      dl.appendChild(di); dl.appendChild(document.createTextNode(' ms'));
      bar.appendChild(sel); bar.appendChild(add); bar.appendChild(dl); ct.appendChild(bar);
      drawAttrKeys(owners);
    };
    var drawAttrKeys = function (owners) {
      var C = ctx(), list = (CFG.attrKeys || []).map(normAttr);
      var h = document.createElement('h3'); h.style.marginTop = '18px'; h.textContent = 'Phím gán thuộc tính nhanh (box đang chọn)'; ct.appendChild(h);
      var saveA = function () { apply('attrKeys', list); };
      var fieldOpts = [];
      try { getFields(C).forEach(function (f) { fieldOpts.push(['name:' + f.name, (f.label || f.title || f.name) + ' [' + f.name + ']']); }); } catch (e) {}
      var ROLES = [['role:cipo', 'CIPO', vsCipo], ['role:valid', 'Hợp lệ', vsValid], ['role:occ', 'Che phủ', vsOcc], ['role:motion', 'Động/tĩnh', vs]];
      var SCOPES = [['frame', 'frame này', 'Chỉ frame hiện tại'], ['from', 'từ frame này', 'Frame hiện tại và các keyframe sau'], ['all', 'mọi frame', 'Mọi keyframe của id'], ['copyall', 'chép hết →sau', 'Gán cho frame hiện tại rồi chép MỌI thuộc tính của nó sang các keyframe sau']];
      var idxOf = function (it, field) { for (var j = 0; j < it.sets.length; j++) if (it.sets[j].field === field) return j; return -1; };
      var fxOf = function (field) { try { return C && attrFieldOf(C, field); } catch (e) { return null; } };
      var CW = { key: 84, sel: 80, scope: 96, more: 34, del: 26 };
      var size = function (el, w) { el.style.width = w + 'px'; el.style.minWidth = w + 'px'; el.style.fontSize = '11px'; el.style.padding = '2px 3px'; return el; };
      var mkSel = function (fx, cur, noneText, fmt, onPick, w) {
        var sel = size(document.createElement('select'), w || CW.sel), seen = { '__cycle__': 1 };
        var add = function (v, t) { var op = document.createElement('option'); op.value = v; op.textContent = t; if (v === cur) op.selected = true; sel.appendChild(op); };
        if (noneText != null) add('', noneText);
        add('__cycle__', '↻ xoay vòng');
        ((fx && fx.f.options) || []).forEach(function (o) { seen[String(o.value)] = 1; add(String(o.value), fmt(o.label || o.value) || String(o.value)); });
        if (cur && !seen[cur]) add(cur, cur);
        if (!fx) { sel.disabled = true; sel.title = 'không thấy trường này trong form'; }
        sel.onchange = function () { onPick(sel.value); };
        sel.onmouseover = function () { var o = sel.options[sel.selectedIndex]; sel.title = fx ? (o ? o.textContent : '') : 'không thấy trường này trong form'; };
        return sel;
      };
      var line = function (extra) { var d = document.createElement('div'); d.style.cssText = 'display:flex;align-items:center;gap:5px;padding:3px 0;border-bottom:1px solid #f7e1ea;flex-wrap:wrap' + (extra || ''); return d; };
      var head = line(';border-bottom:1px solid #f1c4d5;color:#9b7686;font-size:10px');
      [['Phím', CW.key]].concat(ROLES.map(function (r) { return [r[1], CW.sel]; }), [['Áp dụng cho', CW.scope], ['', CW.more + CW.del + 5]]).forEach(function (c) { var d = document.createElement('div'); d.textContent = c[0]; d.style.cssText = 'width:' + c[1] + 'px;min-width:' + c[1] + 'px'; head.appendChild(d); });
      ct.appendChild(head);
      list.forEach(function (it, i) {
        var row = line();
        var kin = size(document.createElement('input'), CW.key); kin.className = 'key'; kin.readOnly = true; kin.value = it.k ? kdisp(it.k) : '(chưa đặt)';
        kin.onfocus = function () { kin.classList.add('rec'); kin.value = 'bấm…'; if (_menu) _menu.rec = { set: function (nk) { list[i].k = nk; saveA(); drawSec(); } }; };
        kin.onblur = function () { kin.classList.remove('rec'); kin.value = it.k ? kdisp(it.k) : '(chưa đặt)'; if (_menu) _menu.rec = null; };
        bindKeyCapture(kin, function (nk) { list[i].k = nk; saveA(); drawSec(); }, function (e) { if (e.key === 'Escape') { kin.blur(); return true; } return false; });
        row.appendChild(kin);
        ROLES.forEach(function (r) {
          var j = idxOf(it, r[0]);
          row.appendChild(mkSel(fxOf(r[0]), j >= 0 ? String(it.sets[j].val) : '', '—', r[2], function (v) {
            var k2 = idxOf(list[i], r[0]);
            if (!v) { if (k2 >= 0) list[i].sets.splice(k2, 1); } else if (k2 >= 0) list[i].sets[k2].val = v; else list[i].sets.push({ field: r[0], val: v });
            saveA(); drawSec();
          }));
        });
        var ss = size(document.createElement('select'), CW.scope);
        SCOPES.forEach(function (o) { var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; op.title = o[2]; if (o[0] === it.scope) op.selected = true; ss.appendChild(op); });
        ss.title = (SCOPES.filter(function (o) { return o[0] === it.scope; })[0] || SCOPES[0])[2];
        ss.onchange = function () { list[i].scope = ss.value; saveA(); drawSec(); };
        row.appendChild(ss);
        var more = size(document.createElement('select'), CW.more); more.title = 'Thêm thuộc tính khác của form';
        more.innerHTML = '<option value="">＋</option>' + fieldOpts.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join('');
        more.onchange = function () { if (!more.value) return; list[i].sets.push({ field: more.value, val: '__cycle__' }); saveA(); drawSec(); };
        row.appendChild(more);
        var del = size(document.createElement('button'), CW.del); del.textContent = '✕'; del.title = 'Xoá dòng'; del.style.padding = '2px 0'; del.onclick = function () { list.splice(i, 1); saveA(); drawSec(); };
        row.appendChild(del);
        ct.appendChild(row);
        it.sets.forEach(function (st, j) {
          if (st.field.indexOf('role:') === 0) return;
          var sub = line(';padding-left:' + (CW.key + 5) + 'px;border-bottom:none');
          var fsel = size(document.createElement('select'), 165);
          fieldOpts.forEach(function (o) { var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; if (o[0] === st.field) op.selected = true; fsel.appendChild(op); });
          if (!fieldOpts.some(function (o) { return o[0] === st.field; })) { var op0 = document.createElement('option'); op0.value = st.field; op0.textContent = st.field; op0.selected = true; fsel.appendChild(op0); }
          fsel.onchange = function () { list[i].sets[j] = { field: fsel.value, val: '__cycle__' }; saveA(); drawSec(); };
          var vsel = mkSel(fxOf(st.field), String(st.val), null, String, function (v) { list[i].sets[j].val = v; saveA(); drawSec(); }, 130);
          var dx = size(document.createElement('button'), CW.del); dx.textContent = '✕'; dx.style.padding = '2px 0'; dx.onclick = function () { list[i].sets.splice(j, 1); saveA(); drawSec(); };
          sub.appendChild(document.createTextNode('+')); sub.appendChild(fsel); sub.appendChild(vsel); sub.appendChild(dx); ct.appendChild(sub);
        });
        var own = it.k && (owners[String(it.k).toLowerCase()] || []);
        if ((own && own.length) || toolLabel(it.k)) {
          var w = document.createElement('div'); w.className = 'warn'; w.style.paddingLeft = (CW.key + 5) + 'px';
          w.textContent = 'phím ' + kdisp(it.k) + ' sẽ che: ' + [].concat(own || []).map(labelOf).concat(toolLabel(it.k) ? ['tool: ' + toolLabel(it.k)] : []).join(', ');
          ct.appendChild(w);
        }
      });
      var bar = document.createElement('div'); bar.style.cssText = 'margin-top:8px';
      var addB = document.createElement('button'); addB.textContent = '+ Thêm phím gán';
      addB.onclick = function () { list.push({ k: '', scope: 'frame', sets: [] }); saveA(); drawSec(); };
      bar.appendChild(addB); ct.appendChild(bar);
    };
    [].forEach.call(root.querySelectorAll('.x'), function (b) { b.onclick = toggleMenu; });
    var svb = root.querySelector('.sv'); if (svb) svb.onclick = function () {
      var r = saveToCode(), ct2 = ct;
      ct2.innerHTML = '';
      var h = document.createElement('h3'); h.textContent = '💾 Lưu cài đặt vào code'; ct2.appendChild(h);
      var d = document.createElement('div'); d.style.lineHeight = '1.7';
      if (r.full) d.innerHTML = '<b style="color:#8c8">Đã tạo lại toàn bộ script có sẵn ' + r.n + ' cài đặt của bạn</b>' + (r.copied ? ' – đã COPY vào clipboard' : '') + ' và tải về file <b>ConeChut_v1.8.user.js</b>.<br><br>'
        + '<b>Làm 1 lần để ghi vào Tampermonkey:</b><br>1. Bấm biểu tượng Tampermonkey → <b>Bảng điều khiển</b> → bấm vào tên script này.<br>2. Bấm vào khung code → <b>Ctrl+A</b> → <b>Ctrl+V</b> (hoặc mở file vừa tải, copy toàn bộ rồi dán).<br>3. <b>Ctrl+S</b> để lưu, rồi tải lại trang tool.<br><br>'
        + 'Từ đó cài đặt nằm luôn trong code: không mất khi xoá dữ liệu trình duyệt, đổi máy, hay gửi script cho người khác. Khi nhờ cập nhật script, cứ gửi file này – khối cài đặt sẽ được giữ nguyên.';
      else d.innerHTML = '<b style="color:#fc6">Tampermonkey không cho đọc mã của script</b>, nên chỉ ' + (r.copied ? 'COPY được' : 'tạo được') + ' dòng cài đặt (' + r.n + ' mục).<br>Mở script trong Tampermonkey, tìm dòng bắt đầu bằng <code>var SAVED_CFG =</code> (gần đầu file), thay cả dòng bằng dòng dưới đây rồi Ctrl+S:'
        + '<textarea readonly style="width:100%;height:160px;margin-top:6px;background:#111;color:#cfc;border:1px solid #555;font:11px monospace"></textarea>';
      ct2.appendChild(d);
      var ta = d.querySelector('textarea'); if (ta) { ta.value = r.line; ta.onclick = function () { ta.select(); }; }
      status(r.full ? 'Đã tạo script có cài đặt – dán vào Tampermonkey để lưu hẳn' : 'Đã copy dòng cài đặt', !r.full);
    };
    root.querySelector('.rall').onclick = function () {
      Object.keys(CFG_DEF).forEach(function (k) { CFG[k] = JSON.parse(JSON.stringify(CFG_DEF[k])); });
      try { localStorage.removeItem(MENU_STORE); } catch (e) {}
      if (window.__snapRebuildKeys) window.__snapRebuildKeys(); status('Đã trả TẤT CẢ về mặc định'); drawNav(); drawSec();
    };
    root.querySelector('.hd').addEventListener('mousedown', function (e) {
      if (e.button !== 0 || /^(BUTTON|INPUT)$/.test(e.target.tagName)) return;
      var r = host.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, rafId = 0, curX = r.left, curY = r.top;
      var mv = function (ev) {
        curX = Math.max(0, r.left + ev.clientX - sx);
        curY = Math.max(0, r.top + ev.clientY - sy);
        if (!rafId) {
          rafId = requestAnimationFrame(function () {
            host.style.left = curX + 'px';
            host.style.top = curY + 'px';
            rafId = 0;
          });
        }
      };
      var up = function () {
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; host.style.left = curX + 'px'; host.style.top = curY + 'px'; }
        window.removeEventListener('mousemove', mv, true); window.removeEventListener('mouseup', up, true);
      };
      window.addEventListener('mousemove', mv, true); window.addEventListener('mouseup', up, true);
    });
    status(Object.keys(cfgSaved()).length ? 'Đang dùng ' + Object.keys(cfgSaved()).length + ' thông số đã chỉnh' : 'Đang dùng mặc định');
    drawNav(); drawSec();
  }
  window.__snapMenu = toggleMenu;
  var HEAD_RE = /车头|牵引|head|tractor|cab|đầu/i, BODY_RE = /卡车|挂车|车厢|车身|半挂|truck|trailer|body|thân/i;
  CFG.headGap = 0.003;
  CFG.headLift = 0.003;
  CFG.headRoofDrop = 0.10;
  CFG.headNarrow = 0.02;
  if (CFG.headSideGap == null) CFG.headSideGap = 0;
  CFG.headAlign = true;
  CFG.headEveryFrame = false;

/* ============================================================
 * @MODULE[alt+g]  KÉO ĐẦU XE VÀO THÂN / XE SAU THEO XE TRƯỚC
 * Phím: alt+g (keyHead) · shift+alt+g (keyHeadAll) · shift+g (keyChain) · ctrl+shift+g (keyChainAll)
 * eulerMat, mulV/mulTV, headSnapPos, doHeadSnap,
 * chainSnapPos, doChainSnap
 * Phụ thuộc: ctx, selectedId, curFrame, trackFrames,
 *            runOnFrames, toast, recBegin/End
 * ============================================================ */
  function eulerMat(r){
    var a=Math.cos(r.x),b=Math.sin(r.x),c=Math.cos(r.y),d=Math.sin(r.y),e=Math.cos(r.z),f=Math.sin(r.z);
    return[[c*e,-c*f,d],[a*f+b*e*d,a*e-b*f*d,-b*c],[b*f-a*e*d,b*e+a*f*d,a*c]];
  }
  function mulV(M,v){return[M[0][0]*v[0]+M[0][1]*v[1]+M[0][2]*v[2],M[1][0]*v[0]+M[1][1]*v[1]+M[1][2]*v[2],M[2][0]*v[0]+M[2][1]*v[1]+M[2][2]*v[2]];}
  function mulTV(M,v){return[M[0][0]*v[0]+M[1][0]*v[1]+M[2][0]*v[2],M[0][1]*v[0]+M[1][1]*v[1]+M[2][1]*v[2],M[0][2]*v[0]+M[1][2]*v[1]+M[2][2]*v[2]];}
  function headSnapPos(head, body, gap, lift, side, sideGap, center) {
    sideGap = sideGap || 0;
    lift = lift || 0;
    var RT = eulerMat(body.rotation), RH = eulerMat(head.rotation);
    var bp = body.position, hp = head.position, bd = body.dimension, hd = head.dimension;
    var hc = mulTV(RT, [hp.x - bp.x, hp.y - bp.y, hp.z - bp.z]);
    var s = side || (hc[2] >= 0 ? 1 : -1);
    var minX = Infinity, maxX = -Infinity, minY = Infinity, minZ = Infinity, maxZ = -Infinity;
    for (var i = 0; i < 8; i++) {
      var lc = [(i & 1 ? 1 : -1) * hd.x / 2, (i & 2 ? 1 : -1) * hd.y / 2, (i & 4 ? 1 : -1) * hd.z / 2];
      var p = mulTV(RT, mulV(RH, lc));
      minX = Math.min(minX, hc[0] + p[0]); maxX = Math.max(maxX, hc[0] + p[0]);
      minY = Math.min(minY, hc[1] + p[1]); minZ = Math.min(minZ, hc[2] + p[2]); maxZ = Math.max(maxZ, hc[2] + p[2]);
    }
    var dz = s > 0 ? (bd.z / 2 - gap) - maxZ : (-bd.z / 2 + gap) - minZ;
    var dy = -bd.y / 2 + lift - minY;
    var dx = 0;
    var lim = bd.x / 2 - sideGap;
    if (center || maxX - minX >= 2 * lim) dx = -(minX + maxX) / 2;
    else if (maxX > lim) dx = lim - maxX;
    else if (minX < -lim) dx = -lim - minX;
    var w = mulV(RT, [hc[0] + dx, hc[1] + dy, hc[2] + dz]);
    return { position: { x: bp.x + w[0], y: bp.y + w[1], z: bp.z + w[2] }, side: s, moved: Math.sqrt(dx * dx + dy * dy + dz * dz) };
  }
  window.__headSnapPos = headSnapPos;
  function cubeCategory(S, id, f) {
    var t = S.instancesTree[id], c = t && t.cubes && t.cubes[f];
    var cat = (c && (c.category || (c.userData && c.userData.category))) || treeCategory(t);
    if (!cat && S.getActualCube) { try { var a = S.getActualCube(id, f); cat = a && a.userData && a.userData.category; } catch (e) {} }
    return cat || '';
  }
  function trackFrames(S,id){
    var t=S.instancesTree[id];if(!t||!t.cubes)return[];
    return Object.keys(t.cubes).map(Number).filter(function(f){return t.cubes[f];}).sort(function(a,b){return a-b;});
  }
  function lerpAng(a,b,t){return a+(wrap(b,a)-a)*t;}
  function effCube(S, id, f) {
    var t = S.instancesTree[id]; if (!t || !t.cubes) return null;
    if (t.cubes[f]) return { cube: t.cubes[f], stored: true };
    var fr = trackFrames(S, id), prev, next;
    for (var i = 0; i < fr.length; i++) { if (fr[i] < f) prev = fr[i]; else if (fr[i] > f && next === undefined) next = fr[i]; }
    if (prev === undefined || next === undefined) return null;
    var A = t.cubes[prev], B = t.cubes[next], k = (f - prev) / (next - prev);
    function L(p, q) { return { x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k, z: p.z + (q.z - p.z) * k }; }
    return { stored: false, base: A, cube: { position: L(A.position, B.position), dimension: L(A.dimension, B.dimension),
      rotation: { x: lerpAng(A.rotation.x, B.rotation.x, k), y: lerpAng(A.rotation.y, B.rotation.y, k), z: lerpAng(A.rotation.z, B.rotation.z, k) } } };
  }
  window.__effCube = effCube;
  function writePose(S, id, f, pose, base) {
    var t = S.instancesTree[id];
    if (t.cubes[f]) {
      S.updateCubeMatrix(id, f, pose);
    } else {
      var src = base || t.cubes[trackFrames(S, id)[0]];
      var c = JSON.parse(JSON.stringify(src));
      delete c.attr_string; delete c.pointCount; delete c.review;
      c.id = src.id != null ? src.id : id; c.frameNum = f;
      c.position = pose.position; c.rotation = pose.rotation; c.dimension = pose.dimension;
      c.interpolated = false; c.annotatedBy = 'human';
      if (S.putCube) S.putCube(c); else if (S.addCube) S.addCube(c); else return false;
      if (!t.cubes[f]) return false;
    }
    if(CFG.markHuman&&S.changeCubeInterpolation)S.changeCubeInterpolation(id,f,false,'human');
    _calc(S,id,f);
    return true;
  }
  function pickHead(S, a, b, f) {
    var ca = cubeCategory(S, a, f) || treeCategory(S.instancesTree[a]), cb = cubeCategory(S, b, f) || treeCategory(S.instancesTree[b]);
    if (HEAD_RE.test(ca) && !HEAD_RE.test(cb)) return { head: a, body: b, by: 'loai' };
    if (HEAD_RE.test(cb) && !HEAD_RE.test(ca)) return { head: b, body: a, by: 'loai' };
    if (BODY_RE.test(ca) && !BODY_RE.test(cb)) return { head: b, body: a, by: 'loai' };
    if (BODY_RE.test(cb) && !BODY_RE.test(ca)) return { head: a, body: b, by: 'loai' };
    var A = S.instancesTree[a].cubes[trackFrames(S, a)[0]], B = S.instancesTree[b].cubes[trackFrames(S, b)[0]];
    return A.dimension.z <= B.dimension.z ? { head: a, body: b, by: 'ngan hon' } : { head: b, body: a, by: 'ngan hon' };
  }
  function linkedIds(S, id, f) {
    var R = S.relations || [], out = {}, frames = [f];
    for (var k = 0; k < R.length; k++) if (k !== f) frames.push(k);
    for (var j = 0; j < frames.length; j++) {
      (R[frames[j]] || []).forEach(function (r) {
        if (!r || (r.type && String(r.type).toLowerCase() !== 'cube')) return;
        if (String(r.from) === String(id) && S.instancesTree[r.to]) out[r.to] = r;
        if (String(r.to) === String(id) && S.instancesTree[r.from]) out[r.from] = r;
      });
      if (Object.keys(out).length) break;
    }
    return out;
  }
  window.__linkedIds = linkedIds;
  function ensureRelation(S, rel, f) {
    if (!S.relations || !rel) return false;
    var arr = S.relations[f]; if (!arr) return false;
    var has = arr.some(function (r) { return r && r.relation === rel.relation && String(r.from) === String(rel.from) && String(r.to) === String(rel.to); });
    if (!has) { arr.push(JSON.parse(JSON.stringify(rel))); return true; }
    return false;
  }
  function remapRelations(S, oldId, newId) {
    var R = S.relations; if (!R || oldId == null || newId == null || String(oldId) === String(newId)) return 0;
    if (S.instancesTree[oldId]) return -1;
    var n = 0, to = function (v) { return typeof v === 'number' && !isNaN(+newId) ? +newId : String(newId); };
    for (var f = 0; f < R.length; f++) {
      var arr = R[f], hit = 0; if (!arr) continue;
      arr.forEach(function (r) {
        if (!r) return;
        if (String(r.from) === String(oldId)) { r.from = to(r.from); hit++; }
        if (String(r.to) === String(oldId)) { r.to = to(r.to); hit++; }
      });
      if (!hit) continue;
      n += hit;
      var seen = {}, keep = arr.filter(function (r) { if (!r) return true; var k = [r.relation, r.type, r.from, r.to].join('|'); if (seen[k]) return false; seen[k] = 1; return true; });
      if (keep.length !== arr.length) { arr.length = 0; keep.forEach(function (r) { arr.push(r); }); }
    }
    return n;
  }
  function remapRelationsSoon(S, oldId, newId) {
    var tries = 0;
    (function go() {
      var n = remapRelations(S, oldId, newId);
      if (n < 0 && tries++ < 8) return setTimeout(go, 250);
      if (n > 0) { _emit(S); console.log('[snap] chuyen lien ket', oldId, '->', newId, n); }
    })();
  }
  function cfgFields(cfg) { return cfg && Array.isArray(cfg.fields) ? cfg.fields : []; }
  function fieldText(f) { return String(f.name || '') + ' ' + String(f.label || f.title || ''); }
  function noValue(f, strict) {
    var opts = f.options || [], NO = /^(no|none|null|false|0|n|否|无|不是|không|khong)$|否|无|không|none/i;
    var o = opts.filter(function (x) { return NO.test(String(x.value)) || NO.test(String(x.label || '')); })[0];
    if (isMulti(f)) return o ? [o.value] : (strict ? null : []);
    if (o) return o.value;
    return strict ? null : (f.defaultValue !== undefined ? f.defaultValue : null);
  }
  function headAttrPatch(fields, headObj, bodyObj, used, keepOthers, reSrc, fill) {
    var copyRe = new RegExp(reSrc || CFG.headCopyRe, 'i'), out = {}, n = 0, seen = {};
    fields.forEach(function (f) {
      if (isConeField(f)) return; seen[f.name] = 1;
      var tx = fieldText(f);
      if (copyRe.test(tx)) { if (f.name in bodyObj) { out[f.name] = bodyObj[f.name]; used.copy[f.label || f.name] = 1; } }
      else if (!keepOthers) {
        var v = noValue(f, true);
        if ((v === null || v === undefined) && fill) { v = noValue(f, false); if (Array.isArray(v) && !v.length) v = null; }
        if (v !== null && v !== undefined) { out[f.name] = v; used.no[f.label || f.name] = 1; }
        else if (fill) { var cur0 = headObj[f.name]; if (cur0 == null || cur0 === '' || (Array.isArray(cur0) && !cur0.length)) (used.blank = used.blank || {})[f.label || f.name] = 1; }
      }
    });
    Object.keys(bodyObj).forEach(function (k) { if (!seen[k] && !isConeKey(k) && copyRe.test(k)) { out[k] = bodyObj[k]; used.copy[k] = 1; } });
    Object.keys(out).forEach(function (k) { if (JSON.stringify(headObj[k]) !== JSON.stringify(out[k])) n++; });
    return n ? out : null;
  }
  function instAttrAt(S, id, f) {
    var A = S.instanceAttributes && S.instanceAttributes[id]; if (!A) return {};
    if (A[f]) return parseLabels(A[f]);
    var ks = Object.keys(A).map(Number).filter(function (k) { return k <= f; }).sort(function (a, b) { return b - a; });
    if (!ks.length) ks = Object.keys(A).map(Number).sort(function (a, b) { return a - b; });
    return ks.length ? parseLabels(A[ks[0]]) : {};
  }
  function syncHeadAttrs(C, headId, bodyId, f, eb, used, keepOthers, reSrc, fill) {
    if (!(reSrc ? CFG.chainCopyAttrs : CFG.headCopyAttrs)) return 0;
    var S = C.S, V = C.V, changed = 0;
    getFields(C);
    var hc = S.instancesTree[headId].cubes[f];
    if (hc) {
      var bodyLab = parseLabels(eb.stored ? eb.cube.labels : (eb.base && eb.base.labels));
      var headLab = parseLabels(hc.labels), fields = cfgFields(V.labelConfig);
      var pt = headAttrPatch(fields, headLab, bodyLab, used, keepOthers, reSrc, fill);
      if (pt) { var isStr = typeof hc.labels === 'string' || hc.labels == null; S.updateCubeLabel(headId, f, isStr ? JSON.stringify(Object.assign(headLab, pt)) : Object.assign(headLab, pt)); changed++; }
    }
    var ifields = cfgFields(V.instanceLabelConfig);
    if (ifields.length && S.updateInstanceLabel) {
      var hA = instAttrAt(S, headId, f), bA = instAttrAt(S, bodyId, f);
      var pi = headAttrPatch(ifields, hA, bA, used, keepOthers, reSrc, fill);
      if (pi) { S.updateInstanceLabel(headId, f, Object.assign(hA, pi)); changed++; }
    }
    return changed;
  }
  window.__syncHeadAttrs = syncHeadAttrs;
  function doHeadSnap(all) {
    var C = ctx(); if (!C) return toast('Tool chua san sang');
    var S = C.S, id = selectedId(C); if (id == null) return toast('Chua chon dau xe / than xe');
    var cur = curFrame(C), links = linkedIds(S, id, cur), partners = Object.keys(links);
    if (!partners.length) return toast('Id ' + id + ' chua co lien ket (关联) voi box nao');
    var r = { ok: 0, created: 0, miss: 0, rel: 0, attr: 0 }, info = [], used = { copy: {}, no: {} };
    partners.forEach(function (p) {
      var hb = pickHead(S, id, p, cur), frames;
      if (all) {
        var bf = trackFrames(S, hb.body), hf = trackFrames(S, hb.head), seen = {};
        if (!bf.length) return;
        var lo = bf[0], hi = bf[bf.length - 1];
        frames = [];
        for (var f0 = lo; f0 <= hi; f0++) frames.push(f0);
        hf.forEach(function (f1) { if (f1 >= lo && f1 <= hi) seen[f1] = 1; });
        if (CFG.headEveryFrame === false) frames = bf.concat(Object.keys(seen).map(Number)).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
      } else frames = [cur];
      var side = 0, cand = [cur].concat(trackFrames(S, hb.head).sort(function (a, b) { return Math.abs(a - cur) - Math.abs(b - cur); }));
      for (var ci = 0; ci < cand.length && !side; ci++) {
        var b0 = effCube(S, hb.body, cand[ci]), h0 = effCube(S, hb.head, cand[ci]);
        if (b0 && h0) side = headSnapPos(h0.cube, b0.cube, 0, 0).side;
      }
      var ehc = effCube(S, hb.head, cur), ebc = effCube(S, hb.body, cur), hfs = trackFrames(S, hb.head);
      if (!ehc && hfs.length) ehc = { cube: S.instancesTree[hb.head].cubes[hfs.reduce(function (a, b) { return Math.abs(b - cur) < Math.abs(a - cur) ? b : a; })] };
      if (!ehc) { r.miss++; return; }
      var refDim = vec3(ehc.cube.dimension), wide = false;
      if (ebc) {
        var bdm = ebc.cube.dimension;
        if (refDim.x > bdm.x) { refDim.x = Math.max(0.5, bdm.x - 2 * CFG.headNarrow); wide = true; }
        if (refDim.y > bdm.y) refDim.y = Math.max(0.5, bdm.y - CFG.headRoofDrop - CFG.headLift);
        if (refDim.z > bdm.z) refDim.z = Math.max(0.5, bdm.z - CFG.headGap - CFG.headNarrow);
      }
      hfs.forEach(function (f1) {
        var c1 = S.instancesTree[hb.head].cubes[f1]; if (!c1 || sameDim(c1.dimension, refDim)) return;
        S.updateCubeMatrix(hb.head, f1, { position: vec3(c1.position), rotation: vec3(c1.rotation), dimension: vec3(refDim) });
      });
      frames.forEach(function (f) {
        var eb = effCube(S, hb.body, f), eh = effCube(S, hb.head, f);
        if (!eb) { r.miss++; return; }
        if (!eh) {
          var hf2 = trackFrames(S, hb.head); if (!hf2.length) { r.miss++; return; }
          var near = hf2.reduce(function (a, b) { return Math.abs(b - f) < Math.abs(a - f) ? b : a; });
          eh = { stored: false, base: S.instancesTree[hb.head].cubes[near], cube: S.instancesTree[hb.head].cubes[near] };
        }
        var body = eb.cube, head = eh.cube;
        var rot = CFG.headAlign ? { x: body.rotation.x, y: body.rotation.y, z: body.rotation.z } : { x: head.rotation.x, y: head.rotation.y, z: head.rotation.z };
        var dim = vec3(refDim);
        var res = headSnapPos({ position: head.position, rotation: rot, dimension: dim }, body, CFG.headGap, CFG.headLift, side, CFG.headSideGap, wide);
        if (!writePose(S, hb.head, f, { position: res.position, rotation: rot, dimension: dim }, eh.base || eh.cube)) { r.miss++; return; }
        if (!eh.stored) r.created++;
        if (ensureRelation(S, links[p], f)) r.rel++;
        try { if (syncHeadAttrs(C, hb.head, hb.body, f, eb, used)) r.attr++; } catch (e) { console.warn('[snap] thuoc tinh dau xe', e); }
        r.ok++;
        if (f === cur) info.push('đầu ' + hb.head + ' → thân ' + hb.body + ' (' + hb.by + ', dịch ' + res.moved.toFixed(2) + 'm)');
      });
      if (all && !info.length) info.push('đầu ' + hb.head + ' → thân ' + hb.body + ' (' + hb.by + ')');
    });
    _emit(S);
    _grid(C.V);
    info('Kéo đầu xe: ' + r.ok + ' frame' + (r.created ? ' (tạo mới ' + r.created + ' keyframe)' : '')
      + (r.rel ? ', thêm liên kết ' + r.rel + ' frame' : '') + (r.miss ? ', ' + r.miss + ' frame bỏ qua' : '')
      + (info.length ? ' | ' + info.join('; ') : '')
      + (CFG.headCopyAttrs ? ' | thuộc tính: ' + (Object.keys(used.copy).length ? 'chép ' + Object.keys(used.copy).join(', ') : 'không thấy CIPO/hợp lệ/che phủ/động tĩnh')
        + (Object.keys(used.no).length ? '; = None/Không: ' + Object.keys(used.no).join(', ') : '') + ' (' + r.attr + ' lần ghi)' : ''), 6000);
  }
  window.__doHeadSnap = doHeadSnap;
  function chainSnapPos(front, rear, side, gap, lift) {
    var RT = eulerMat(front.rotation), fp = front.position, rp = rear.position, fd = front.dimension, rd = rear.dimension;
    var hc = mulTV(RT, [rp.x - fp.x, rp.y - fp.y, rp.z - fp.z]);
    var loc = [hc[0], -fd.y / 2 + rd.y / 2 + (lift || 0), side * (fd.z / 2 + rd.z / 2 + (gap || 0))];
    var w = mulV(RT, loc);
    return { x: fp.x + w[0], y: fp.y + w[1], z: fp.z + w[2] };
  }
  window.__chainSnapPos = chainSnapPos;
  function doChainSnap(all) {
    try { return doChainSnap_(all); }
    catch (e) { console.error('[snap] loi xe truoc/xe sau', e); toast('LỖI xe trước/xe sau: ' + (e && e.message || e) + ' (xem Console F12)', 6000); }
  }
  function doChainSnap_(all) {
    var C = ctx(); if (!C) return toast('Tool chua san sang');
    var S = C.S, id = selectedId(C); if (id == null) return toast('Chưa chọn xe (xe trước hoặc xe sau)');
    var cur = curFrame(C), links = linkedIds(S, id, cur), partners = Object.keys(links);
    if (!partners.length) return toast('Id ' + id + ' chưa có liên kết (关联) với box nào');
    var r = { ok: 0, created: 0, miss: 0, rel: 0, attr: 0 }, info = [], used = { copy: {}, no: {} };
    partners.forEach(function (p) {
      var rec = links[p], fr, rr;
      if (CFG.chainFrontBy === 'selected') { fr = String(id); rr = String(p); }
      else { fr = String(rec.from); rr = String(rec.to); }
      if (!S.instancesTree[fr] || !S.instancesTree[rr]) { r.miss++; return; }
      var ff = trackFrames(S, fr), rf = trackFrames(S, rr);
      if (!ff.length || !rf.length) { r.miss++; return; }
      var frames;
      if (all) {
        var lo = Math.max(ff[0], rf[0]), hi = Math.min(ff[ff.length - 1], rf[rf.length - 1]);
        if (lo > hi) { r.miss++; return; }
        frames = [];
        if (CFG.chainEveryFrame) { for (var f0 = lo; f0 <= hi; f0++) frames.push(f0); }
        else frames = ff.concat(rf).filter(function (v, i, a) { return v >= lo && v <= hi && a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
      } else frames = [cur];
      var side = 0, cand = [cur].concat(rf.slice().sort(function (a, b) { return Math.abs(a - cur) - Math.abs(b - cur); }));
      for (var ci = 0; ci < cand.length && !side; ci++) {
        var a0 = effCube(S, fr, cand[ci]), b0 = effCube(S, rr, cand[ci]);
        if (a0 && b0) {
          var hc0 = mulTV(eulerMat(a0.cube.rotation), [b0.cube.position.x - a0.cube.position.x, b0.cube.position.y - a0.cube.position.y, b0.cube.position.z - a0.cube.position.z]);
          side = hc0[2] >= 0 ? 1 : -1;
        }
      }
      if (!side) { r.miss++; return; }
      frames.forEach(function (f) {
        var ef = effCube(S, fr, f), er = effCube(S, rr, f);
        if (!ef || !er) { r.miss++; return; }
        var A = ef.cube, B = er.cube;
        var rot = { x: wrap(A.rotation.x, B.rotation.x), y: wrap(A.rotation.y, B.rotation.y), z: wrap(A.rotation.z, B.rotation.z) };
        var dim = { x: B.dimension.x, y: B.dimension.y, z: B.dimension.z };
        var pos = chainSnapPos({ position: A.position, rotation: A.rotation, dimension: A.dimension }, { position: B.position, dimension: dim }, side, CFG.chainGap, CFG.chainLift);
        var moved = Math.sqrt(Math.pow(pos.x - B.position.x, 2) + Math.pow(pos.y - B.position.y, 2) + Math.pow(pos.z - B.position.z, 2));
        if (!writePose(S, rr, f, { position: pos, rotation: rot, dimension: dim }, er.base || er.cube)) { r.miss++; return; }
        if (!er.stored) r.created++;
        if (ensureRelation(S, rec, f)) r.rel++;
        try { if (syncHeadAttrs(C, rr, fr, f, ef, used, !CFG.chainResetOthers, CFG.chainCopyRe, true)) r.attr++; } catch (e) { console.warn('[snap] thuoc tinh xe sau', e); }
        r.ok++;
        if (f === cur) info.push('xe sau ' + rr + ' → đuôi xe trước ' + fr + ' (dịch ' + moved.toFixed(2) + 'm)');
      });
      if (all && !info.length) info.push('xe sau ' + rr + ' → đuôi xe trước ' + fr);
    });
    _emit(S);
    _grid(C.V);
    info('Xe sau theo xe trước: ' + r.ok + ' frame' + (r.created ? ' (tạo mới ' + r.created + ' keyframe)' : '')
      + (r.rel ? ', thêm liên kết ' + r.rel + ' frame' : '') + (r.miss ? ', ' + r.miss + ' bỏ qua' : '')
      + (info.length ? ' | ' + info.join('; ') : '')
      + (CFG.chainCopyAttrs ? ' | thuộc tính: ' + (Object.keys(used.copy).length ? 'chép ' + Object.keys(used.copy).join(', ') : 'không thấy CIPO/hợp lệ/che phủ/động tĩnh')
      + (Object.keys(used.no).length ? '; = Không/mặc định: ' + Object.keys(used.no).join(', ') : '')
      + (used.blank && Object.keys(used.blank).length ? '; ⚠ CÒN TRỐNG (form không có đáp án Không/mặc định): ' + Object.keys(used.blank).join(', ') : '')
      + ' (' + r.attr + ' lần ghi)' : ''), 6000);
  }
  window.__doChainSnap = doChainSnap;
  CFG.alignStep = 180;
  CFG.alignHeading = false;
  CFG.alignCopyTilt = true;

/* ============================================================
 * @MODULE[core:yaw]  YAW / ALIGN (tiện ích căn hướng, không có phím riêng)
 * eulerFromMat, setHeading, refRotWithYaw,
 * alignedHeading, doAlignClass
 * ============================================================ */
  function eulerFromMat(m, ref) {
    var y0 = Math.asin(Math.max(-1, Math.min(1, m[0][2]))), x0, z0;
    if (Math.abs(m[0][2]) < 0.9999999) { x0 = Math.atan2(-m[1][2], m[2][2]); z0 = Math.atan2(-m[0][1], m[0][0]); }
    else { x0 = Math.atan2(m[2][1], m[1][1]); z0 = 0; }
    var c = [{ x: wrap(x0, ref.x), y: wrap(y0, ref.y), z: wrap(z0, ref.z) },
      { x: wrap(x0 + Math.PI, ref.x), y: wrap(Math.PI - y0, ref.y), z: wrap(z0 + Math.PI, ref.z) }];
    function cost(e) { return Math.abs(e.x - ref.x) + Math.abs(e.y - ref.y) + Math.abs(e.z - ref.z); }
    return cost(c[0]) <= cost(c[1]) ? c[0] : c[1];
  }
  function setHeading(r, target) {
    var d = target - heading(r), cs = Math.cos(d), sn = Math.sin(d), M = eulerMat(r);
    var Ry = [[cs, 0, sn], [0, 1, 0], [-sn, 0, cs]], N = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) N[i][j] = Ry[i][0] * M[0][j] + Ry[i][1] * M[1][j] + Ry[i][2] * M[2][j];
    return eulerFromMat(N, r);
  }
  window.__setHeading = setHeading;
  function refRotWithYaw(refRot, d, near) {
    var cs = Math.cos(d), sn = Math.sin(d), M = eulerMat(refRot);
    var Ry = [[cs, 0, sn], [0, 1, 0], [-sn, 0, cs]], N = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) N[i][j] = Ry[i][0] * M[0][j] + Ry[i][1] * M[1][j] + Ry[i][2] * M[2][j];
    return eulerFromMat(N, near || refRot);
  }
  function alignedHeading(cur, ref, stepDeg) {
    var st = stepDeg * Math.PI / 180, k = Math.round((cur - ref) / st);
    return ref + k * st;
  }
  function doAlignClass(all) {
    try { return doAlignClass_(all); }
    catch (e) { console.error('[snap] loi xoay thang huong', e); toast('LỖI xoay thẳng hướng: ' + (e && e.message || e) + ' (xem Console F12)', 6000); }
  }
  function doAlignClass_(all) {
    var C = ctx(); if (!C) return toast('Tool chua san sang');
    var S = C.S, id = selectedId(C); if (id == null) return toast('Chưa chọn xe mẫu (click chọn 1 box rồi bấm lại)', 4000);
    var cur = curFrame(C), ec = effCube(S, id, cur); if (!ec) return toast('Xe mẫu ' + id + ' không có ở frame hiện tại', 4000);
    var cat = treeCategory(S.instancesTree[id]) || cubeCategory(S, id, cur);
    if (!cat) return toast('Không đọc được loại (class) của xe mẫu', 4000);
    var refRot = ec.cube.rotation, ref = heading(refRot), r = { ids: 0, cubes: 0, changed: 0, created: 0, same: 0, fail: 0 }, total = 0;
    Object.keys(S.instancesTree).forEach(function (i) {
      var t = S.instancesTree[i]; if (!t || !t.cubes) return;
      if ((treeCategory(t) || cubeCategory(S, i, cur)) !== cat) return;
      total++;
      if (String(i) === String(id)) return;
      var frames = all ? trackFrames(S, i) : [cur], any = false;
      frames.forEach(function (f) {
        var e = effCube(S, i, f); if (!e) return;
        r.cubes++;
        var c = e.cube, h0 = heading(c.rotation), h1 = CFG.alignHeading ? alignedHeading(h0, ref, CFG.alignStep) : h0;
        var rot = CFG.alignCopyTilt ? refRotWithYaw(refRot, h1 - ref, c.rotation) : setHeading(c.rotation, h1);
        if (Math.abs(wrap(rot.x, c.rotation.x) - c.rotation.x) < 1e-4 && Math.abs(wrap(rot.y, c.rotation.y) - c.rotation.y) < 1e-4
          && Math.abs(wrap(rot.z, c.rotation.z) - c.rotation.z) < 1e-4) { r.same++; return; }
        var pose = { position: { x: c.position.x, y: c.position.y, z: c.position.z }, rotation: rot,
          dimension: { x: c.dimension.x, y: c.dimension.y, z: c.dimension.z } };
        if (!writePose(S, i, f, pose, e.base || c)) { r.fail++; return; }
        if (!e.stored) r.created++;
        r.changed++; any = true;
      });
      if (any) r.ids++;
    });
    _emit(S);
    _grid(C.V);
    var msg = (CFG.alignHeading ? 'Thẳng hướng "' : 'Chỉnh nghiêng "') + cat + '" theo id ' + id + ' (' + (ref * 180 / Math.PI).toFixed(1) + '°, ' + (all ? 'mọi keyframe' : 'frame ' + (cur + 1)) + '): '
      + 'xoay ' + r.changed + ' box / ' + r.ids + ' id' + (r.created ? ' (tạo ' + r.created + ' keyframe)' : '')
      + (r.same ? ', ' + r.same + ' box đã thẳng' : '') + (r.fail ? ', ' + r.fail + ' lỗi ghi' : '')
      + ' | class có ' + total + ' id' + (total <= 1 ? ' → không có xe nào khác cùng class!' : '');
    console.log('[snap] thang huong', { cat: cat, ref: ref, res: r, total: total });
    info(msg, 5000);
  }
  window.__doAlignClass = doAlignClass;
  var _cam = null, _bmCache = {};
  var _camDim = {};   /* FIX#5: nhớ kích thước ảnh từng camera -> chỉ tải ảnh của cam THẤY box (không tải đủ 7 cam mỗi lần đổi frame) */
  /* ---- FIX#5: bắt đổi frame/đổi box NGAY (mỗi khung hình ~16ms) thay vì chờ polling 350-400ms + bị uiBusy chặn ---- */
  var _fw = { raf: 0, f: NaN, id: undefined, nullAt: 0, camAt: 0, camT: 0 };
  function fwTick() {
    _fw.raf = 0;
    if (!_cam && !_ap) return;                         /* không còn panel nào -> dừng vòng lặp */
    _fw.raf = window.requestAnimationFrame(fwTick);
    var S = window.lidarInstances, V = window.view; if (!S || !V || document.hidden) return;
    var C = { S: S, V: V };                            /* không gọi ctx() ở đây: findLoader có thể quét nặng nếu chưa tìm thấy */
    var f = curFrame(C), id = selectedId(C), now = performance.now();
    if (id == null && _fw.id != null) {                /* nền tảng đôi khi bỏ chọn rồi chọn lại box khi đổi frame -> đợi 150ms tránh nháy */
      if (!_fw.nullAt) _fw.nullAt = now;
      if (now - _fw.nullAt < 150) return;
    }
    _fw.nullAt = 0;
    if (f === _fw.f && id === _fw.id) return;
    _fw.f = f; _fw.id = id;
    if (_ap) { try { apRender(false); } catch (e) { console.warn('[snap] fw attr', e); } }
    if (_cam) fwCam();
  }
  function fwCam() {
    var gap = 70 - (performance.now() - _fw.camAt);    /* kéo thanh frame liên tục: giới hạn ~14 lần/giây, lần cuối luôn được vẽ */
    if (gap > 0) { if (!_fw.camT) _fw.camT = setTimeout(function () { _fw.camT = 0; fwCamNow(); }, gap); return; }
    fwCamNow();
  }
  function fwCamNow() {
    if (!_cam || camHidden()) return;
    var C = ctx(); if (!C) return;
    _fw.camAt = performance.now();
    if (selectedId(C) !== _cam.id) _cam.zoom = null;
    _cam.sig = camSigOf(C);
    camRender();
  }
  function fwEnsure() {
    if (_fw.raf) return;
    var S = window.lidarInstances, V = window.view;
    if (S && V) { var C = { S: S, V: V }; _fw.f = curFrame(C); _fw.id = selectedId(C); }
    _fw.raf = window.requestAnimationFrame(fwTick);
  }
  function camSigOf(C2) {
    var id = selectedId(C2), f = curFrame(C2), t = id != null && C2.S.instancesTree[id], c = t && t.cubes && t.cubes[f];
    if (!c) return null;
    var p0 = c.position || {}, r0 = c.rotation || {}, d0 = c.dimension || {};
    return [p0.x, p0.y, p0.z, r0.x, r0.y, r0.z, d0.x, d0.y, d0.z];
  }
  /* tải trước ảnh các frame kề bên (chỉ cam thấy box) lúc rảnh -> chuyển frame là có ảnh ngay */
  function camPrefetch(id, f) {
    var N = CFG.camPrefetch == null ? 1 : +CFG.camPrefetch; if (!(N > 0)) return;
    var run = function () {
      if (!_cam || _cam.frame !== f || _cam.id !== id) return;   /* người dùng đã đi chỗ khác */
      var C2 = ctx(); if (!C2) return;
      for (var d = 1; d <= N; d++) [f + d, f - d].forEach(function (g) {
        if (g < 0) return;
        var s2 = imageSource(C2, g); if (s2.via !== 'loader' || !s2.list.length) return;   /* via 'react' chỉ có ảnh frame hiện tại -> không prefetch */
        for (var k = 0; k < s2.list.length; k++) {
          var dm = _camDim[k]; if (!dm) continue;
          var cast = projectCast(C2.S, id, g, k);
          if (cast && castVisible(cast, dm)) camBitmap(s2, g, k);
        }
      });
    };
    if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: 800 }); else setTimeout(run, 60);
  }

/* ============================================================
 * @MODULE[7]  FOCUS 7 CAMERA
 * Phím: 7 (keyCams)
 * imageSource, camBitmap, projectCast, castVisible,
 * drawCell, camRender, camFit, camLayout, camDrag,
 * toggleCams
 * ============================================================ */
  function camName(src, n) {
    var it = src.list[n] || {};
    var nm = it.camera || it.name || it.sensor || it.cameraName;
    if (!nm) { var u = String(it.url || it.link || ''); var m = u.match(/cam(?:era)?[._:]([A-Za-z0-9_]+)/i); nm = m ? m[1] : ''; }
    return nm || ('Camera ' + (n + 1));
  }
  var _rgbNode = null;
  function findRgbNode(V) {
    if (_rgbNode && _rgbNode.props && Array.isArray(_rgbNode.props.images) && _rgbNode.props.images.length) return _rgbNode;
    var root = V && (V._reactInternals || V._reactInternalFiber);
    if (!root) { var el = document.getElementById('rgbview'); if (el) { var k = Object.keys(el).filter(function (x) { return /^__react(Fiber|InternalInstance)\$/.test(x); })[0]; root = k && el[k]; } }
    var stack = root ? [root] : [], n = 0;
    while (stack.length && n++ < 30000) {
      var fb = stack.pop(), pr = fb.memoizedProps;
      if (pr && Array.isArray(pr.images) && pr.images.length && pr.images[0] && (pr.images[0].url || pr.images[0].link)) { _rgbNode = fb.stateNode && fb.stateNode.props ? fb.stateNode : { props: pr }; return _rgbNode; }
      if (fb.sibling) stack.push(fb.sibling);
      if (fb.child) stack.push(fb.child);
    }
    return null;
  }
  function imageSource(C, f) {
    var L = C.L || findLoader(C.S, C.V);
    if (L && L.images && L.images[f] && L.images[f].length) return { list: L.images[f], L: L, tag: L.tag, via: 'loader' };
    var node = findRgbNode(C.V), pr = node && node.props;
    if (pr && pr.images && pr.images.length) return { list: pr.images, L: null, tag: pr.tag || C.V.sceneDataTag || '', via: 'react' };
    return { list: [], L: L, tag: C.V.sceneDataTag || '', via: 'none' };
  }
  function tagUrl(u, tag) { return !u ? '' : (u.indexOf('?') >= 0 ? u : u + '?tag=' + (tag == null ? '' : tag)); }
  function toBitmap(x) {
    if (!x) return Promise.resolve(null);
    if (typeof ImageBitmap !== 'undefined' && x instanceof ImageBitmap) return Promise.resolve(x);
    if (x instanceof HTMLImageElement || x instanceof HTMLCanvasElement) return Promise.resolve(x);
    if (x instanceof Blob || x instanceof ImageData) return createImageBitmap(x);
    if (x instanceof ArrayBuffer || ArrayBuffer.isView(x)) return createImageBitmap(new Blob([x]));
    if (typeof x === 'string') return new Promise(function (res) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { res(null); }; im.src = x; });
    if (x.data) return toBitmap(x.data);
    return createImageBitmap(x);
  }
  function camBitmap(src, f, n) {
    var key = f + ':' + n + ':' + src.via;
    if (_bmCache[key]) return _bmCache[key];
    var it = src.list[n] || {}, L = src.L;
    var urls = [it.url, it.link].filter(Boolean);
    var p = Promise.resolve().then(function () { return L && L.getImage ? L.getImage(f, n) : null; })
      .then(function (x) { return x ? toBitmap(x) : null; })
      .catch(function (e) { console.warn('[snap] getImage', f, n, e); return null; })
      .then(function (img) {
        if (img) return { img: img };
        if (!urls.length) return { err: 'không có link ảnh' };
        var lastErr = '';
        var tryAt = function (i) {
          if (i >= urls.length) return { err: 'lỗi tải ảnh: ' + lastErr };
          return fetch(tagUrl(urls[i], src.tag)).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
            .then(createImageBitmap).then(function (b) { return { img: b }; })
            .catch(function (e) { lastErr = (e && e.message) || String(e); return tryAt(i + 1); });
        };
        return tryAt(0);
      });
    p.then(function (r) { if (!r.img) delete _bmCache[key]; });
    /* FIX#3: tăng cache lên 80 ảnh – tránh re-fetch khi chuyển qua lại giữa các frame */
    var ks = Object.keys(_bmCache); if (ks.length > 80) { delete _bmCache[ks[0]]; delete _bmCache[ks[1]]; }
    return (_bmCache[key] = p);
  }
  function projectCast(S, id, f, n) {
    if (!S.getProjectCast) return null;
    var t = S.instancesTree[id]; if (!t || !t.cubes) return null;
    var tmp = false, e = null;
    if (!t.cubes[f]) { e = effCube(S, id, f); if (!e) return null; t.cubes[f] = Object.assign({}, e.base, e.cube, { frameNum: f }); tmp = true; }
    try {
      var type = (S.projectTypes && S.projectTypes[n]) || undefined;
      return S.getProjectCast(id, f, f, n, type);
    } catch (err) { console.warn('[snap] project', err); return null; }
    finally { if (tmp) delete t.cubes[f]; }
  }
  function castVisible(cast, img) {
    if (!cast) return 0;
    try { cast.computeBoundingBox && cast.computeBoundingBox(); } catch (e) {}
    if (!isFinite(cast.x) || !isFinite(cast.w)) return 0;
    var x0 = Math.max(0, cast.x), y0 = Math.max(0, cast.y), x1 = Math.min(img.width, cast.x + cast.w), y1 = Math.min(img.height, cast.y + cast.h);
    if (x1 <= x0 || y1 <= y0) return 0;
    return (x1 - x0) * (y1 - y0) / (img.width * img.height);
  }
  function drawCell(cv, img, cast, full) {
    var W = cv.width, H = cv.height, g = cv.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    var a = img.width, b = img.height, sx, sy, sw, sh;
    if (full || !cast) { sx = 0; sy = 0; sw = a; sh = b; }
    else {
      var l = cast.x, c = cast.y, u = cast.w, h = cast.h, d = 1.2 * u, p = 1.2 * h;
      var m0 = Math.min(W / d, H / p); sw = W / m0; sh = H / m0; sx = l - 0.1 * u - (sw - d) / 2; sy = c - 0.1 * h - (sh - p) / 2;
    }
    var m = Math.min(W / sw, H / sh), ox = (W - sw * m) / 2, oy = (H - sh * m) / 2;
    g.drawImage(img, sx, sy, sw, sh, ox, oy, sw * m, sh * m);
    if (cast) { try { cast.draw(g, m, ox - sx * m, oy - sy * m); } catch (e) { console.warn('[snap] cast.draw', e); } }
  }
  function camRender() {
    if (!_cam || camHidden()) return;
    try { camRender_(); }
    catch (e) { console.error('[snap] FOCUS cam', e); _cam.msg.textContent = 'LỖI: ' + (e && e.message || e); }
  }
  function camRender_() {
    var C = ctx(); if (!C) return;
    var S = C.S, f = curFrame(C), id = selectedId(C), src = imageSource(C, f);
    _cam.frame = f; _cam.id = id; _cam.msg.textContent = '';
    var n = src.list.length || (S.calibs && S.calibs[f] && Object.keys(S.calibs[f]).length) || 0;
    var tr = id != null && S.instancesTree[id], name = tr ? treeCategory(tr) + ' ' + (tr.number != null ? tr.number : id) : '';
    if (src.via === 'none') _cam.msg.textContent = 'Không đọc được danh sách ảnh của tool';
    var G = _cam.grid;
    var note = function (t) { _cam.items = null; G.style.gridTemplateColumns = '1fr'; G.style.gridTemplateRows = '1fr'; G.innerHTML = '<div style="padding:16px;color:#b0b0b5">' + t + '</div>'; };
    if (!n) return note('Frame này chưa có ảnh camera.');
    if (!tr) return note('Chọn 1 box để xem camera thấy nó.');
    if (!_cam.items || _cam.itemsId !== id) note('Đang tìm camera thấy ' + name + '…');
    var token = {}; _cam.token = token;
    var jobs = [];
    for (var k = 0; k < n; k++) (function (k) {
      var cast = projectCast(S, id, f, k);
      if (!cast) return;
      var dm = _camDim[k];
      if (dm && !castVisible(cast, dm)) { jobs.push(Promise.resolve({ k: k, vis: 0, skip: true })); return; }   /* FIX#5: đã biết cỡ ảnh, cam này không thấy box -> khỏi tải ảnh */
      jobs.push(camBitmap(src, f, k).then(function (r) {
        var img = r && r.img; if (img && img.width) _camDim[k] = { width: img.width, height: img.height };
        return { k: k, cast: cast, img: img, err: r && r.err, vis: img ? castVisible(cast, img) : 0 };
      }).catch(function (e) { return { k: k, vis: 0, err: e && e.message }; }));
    })(k);
    Promise.all(jobs).then(function (list) {
      if (!_cam || _cam.token !== token) return;
      var seen = list.filter(function (o) { return o.vis > 0; }).sort(function (a, b) { return b.vis - a.vis; });
      var errs = list.filter(function (o) { return !o.img && !o.skip; });
      if (errs.length && !seen.length) _cam.msg.textContent = errs[0].err || 'không tải được ảnh';
      if (!seen.length) return note(name + ' không xuất hiện ở camera nào (Unavailable ở cả ' + n + ' camera).');
      var show = _cam.zoom != null ? seen.filter(function (o) { return o.k === _cam.zoom; }) : seen.slice(0, CFG.camShowMax);
      if (!show.length) { _cam.zoom = null; show = seen.slice(0, CFG.camShowMax); }
      var keyList = show.map(function (o) { return o.k; }).join(',') + '|' + (_cam.zoom != null);
      if (!_cam.items || _cam.cellKey !== keyList || G.children.length !== show.length) {
        G.innerHTML = '';
        show.forEach(function (o, i) {
          var cell = document.createElement('div'); cell.className = 'cell';
          var cv = document.createElement('canvas');
          var lab = document.createElement('div'); lab.className = 'lab';
          cell.appendChild(cv); cell.appendChild(lab); G.appendChild(cell);
          cell.onclick = function () { _cam.zoom = _cam.zoom == null ? o.k : null; camRender(); };
        });
        _cam.cellKey = keyList;
      }
      show.forEach(function (o, i) { var lab = G.children[i].querySelector('.lab'); lab.textContent = 'cam ' + (o.k + 1); });
      _cam.items = show; _cam.itemsId = id;
      camFit();
      try { camPrefetch(id, f); } catch (e) {}
    });
  }
  function camHidden() { return !!_ly.tabNat || !!(_ly.max && _ly.max !== 'cams' && !_ly.ed && CFG.layoutOn && !_ly.sus); }
  function camFit() {
    if (!_cam || !_cam.items || !_cam.items.length) return;
    if (camHidden()) return;
    var G = _cam.grid, show = _cam.items, N = show.length;
    var gw = Math.max(1, G.clientWidth - 8), gh = Math.max(1, G.clientHeight - 8);
    var img0 = show[0].img, asp = img0 ? img0.width / img0.height : 1.6;
    var cols = 1, bestSz = -1;
    var arr = CFG.camArrange; if (arr === 'v') { cols = 1; bestSz = 1; } else if (arr === 'h' || (arr !== 'v' && _cam.docked)) { cols = N; bestSz = 1; } else
    for (var c = 1; c <= N; c++) {
      var rr = Math.ceil(N / c), cw = (gw - 4 * (c - 1)) / c, ch = (gh - 4 * (rr - 1)) / rr;
      var sz = Math.min(cw, ch * asp);
      if (sz > bestSz) { bestSz = sz; cols = c; }
    }
    var rows = Math.ceil(N / cols);
    G.style.gridTemplateColumns = 'repeat(' + cols + ',minmax(0,1fr))';
    G.style.gridTemplateRows = 'repeat(' + rows + ',minmax(0,1fr))';
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    show.forEach(function (o, i) {
      var cell = G.children[i]; if (!cell) return;
      var cv = cell.querySelector('canvas'); if (!cv || !o.img) return;
      var w = Math.max(20, Math.round(cell.clientWidth * dpr)), h = Math.max(15, Math.round(cell.clientHeight * dpr));
      if (cv.width !== w) cv.width = w;
      if (cv.height !== h) cv.height = h;
      drawCell(cv, o.img, o.cast, _cam.zoom != null);
    });
  }
  function camFitSoon() {
    if (!_cam || _cam.fitReq) return;
    _cam.fitReq = requestAnimationFrame(function () { if (_cam) { _cam.fitReq = 0; camFit(); } });
  }
  function camLoadPos() { try { var v = JSON.parse(localStorage.getItem('__snapCamPos') || 'null'); return v && v.width ? v : null; } catch (e) { return null; } }
  function camSavePos(p) { try { localStorage.setItem('__snapCamPos', JSON.stringify(p)); } catch (e) {} }
  function camClampPos(p) {
    var W = window.innerWidth, H = window.innerHeight;
    p.width = Math.max(320, Math.min(p.width, W)); p.height = Math.max(160, Math.min(p.height, H));
    p.left = Math.max(0, Math.min(p.left, W - p.width)); p.top = Math.max(0, Math.min(p.top, H - p.height));
    return p;
  }
  function camLayout() {
    var base = 'position:fixed !important;z-index:' + (+CFG.camZ || 900) + ' !important;' + (camHidden() ? 'visibility:hidden !important;pointer-events:none !important;' : '');
    if (_cam.full) _cam.host.style.cssText = base + 'left:10px;right:10px;top:10px;bottom:10px;';
    else if (_cam.pos) { var p = _cam.docked ? _cam.pos : camClampPos(_cam.pos);  _cam.host.style.cssText = base + 'left:' + p.left + 'px;top:' + p.top + 'px;width:' + p.width + 'px;height:' + p.height + 'px;'; }
    else _cam.host.style.cssText = base + 'left:10px;right:10px;bottom:10px;height:30vh;';
    _cam.btnSize.textContent = _cam.full ? 'Thu gọn' : 'Phóng to';
    var nb = !!_cam.docked && !_cam.full;
    _cam.bar.style.display = nb ? 'none' : 'flex';
    _cam.grip.style.display = (_cam.full || nb) ? 'none' : 'block';
    if (_cam.gear) _cam.gear.style.top = nb ? '4px' : '30px';
  }
  function camDrag(e, mode) {
    if (e.button !== 0 || _cam.full) return;
    if (mode === 'move' && e.target.closest && e.target.closest('button')) return;
    e.preventDefault(); e.stopPropagation();
    var r = _cam.host.getBoundingClientRect();
    var start = { x: e.clientX, y: e.clientY, left: r.left, top: r.top, width: r.width, height: r.height };
    _cam.pos = { left: r.left, top: r.top, width: r.width, height: r.height }; _cam.docked = false;
    var mv = function (ev) {
      var dx = ev.clientX - start.x, dy = ev.clientY - start.y;
      if (mode === 'move') { _cam.pos.left = start.left + dx; _cam.pos.top = start.top + dy; }
      else { _cam.pos.width = start.width + dx; _cam.pos.height = start.height + dy; }
      camLayout(); if (mode === 'size') camFitSoon();
    };
    var up = function () {
      window.removeEventListener('mousemove', mv, true); window.removeEventListener('mouseup', up, true);
      camSavePos(_cam.pos); camFitSoon();
    };
    window.addEventListener('mousemove', mv, true); window.addEventListener('mouseup', up, true);
  }
  function toggleCams() {
    if (_cam) { clearInterval(_cam.timer); window.removeEventListener('resize', _cam.onResize); if (_cam.ro) _cam.ro.disconnect(); if (_cam.fitReq) cancelAnimationFrame(_cam.fitReq); _cam.host.remove(); _cam = null; return; }
    var C = ctx(); if (!C) return toast('Tool chua san sang');
    var host = document.createElement('div');
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    root.innerHTML = '<style>'
      + ':host{all:initial}*{box-sizing:border-box}'
      + '.wrap{position:absolute;inset:0;display:flex;flex-direction:column;background:#1b1b1d;border:0;border-radius:0;overflow:hidden;font:12px Segoe UI,Arial,sans-serif;color:#e6e6e8;box-shadow:none}'
      + '.bar{display:flex;align-items:center;gap:8px;padding:4px 10px;background:#2a2a2e;border-bottom:1px solid #3d3d43;flex:0 0 auto}'
      + '.bar b{flex:1 1 auto;color:#fff;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bar .hint{color:#b8b8bd;flex:0 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.msg{color:#d0d0d4;white-space:nowrap}.bar button{flex:0 0 auto}'
      + 'button{background:#34343a;color:#e6e6e8;border:1px solid #4a4a50;border-radius:6px;padding:2px 9px;cursor:pointer;font:12px Segoe UI,Arial,sans-serif}button:hover{background:#45454c;color:#fff;border-color:#5a5a62}'
      + '.grid{flex:1 1 auto;min-height:0;min-width:0;display:grid;gap:5px;padding:5px;overflow:hidden}'
      + '.cell{position:relative;background:#000;border:0;border-radius:0;cursor:pointer;overflow:hidden;min-width:0;min-height:0}'
      + '.cell canvas{position:absolute;left:0;top:0;width:100%;height:100%}'
      + '.lab{position:absolute;left:6px;top:4px;color:#fff;font-weight:bold;background:rgba(0,0,0,.6);padding:1px 7px;border-radius:5px;pointer-events:none}'
      + '.st{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;color:#fff;pointer-events:none}'
      + '.bar{cursor:move;user-select:none}.grip{position:absolute;right:0;bottom:0;width:16px;height:16px;cursor:nwse-resize;'
      + 'background:linear-gradient(135deg,transparent 50%,#6a6a72 50%,#6a6a72 60%,transparent 60%,transparent 70%,#6a6a72 70%,#6a6a72 80%,transparent 80%)}'
      + '.gear{position:absolute;right:4px;top:30px;z-index:3;opacity:.7;padding:0 6px;line-height:18px}.gear:hover{opacity:1}'
      + '.pop{position:absolute;right:4px;top:52px;z-index:4;display:none;background:#222226;border:1px solid #6a6a72;border-radius:8px;padding:8px;box-shadow:0 4px 16px rgba(0,0,0,.6)}.pop button.on{background:#6a6a72;border-color:#6a6a72;color:#fff}'
      + '</style><div class="wrap"><div class="bar"><b></b><span class="msg"></span>'
      + '<button class="rs" title="Về vị trí mặc định">⟲</button><button class="sz"></button><button class="x">✕ (' + String(CFG.keyCams).toUpperCase() + ')</button></div><div class="grid"></div><div class="grip" title="Kéo để đổi kích thước"></div><button class="gear" title="Tùy chọn camera FOCUS">⚙</button><div class="pop"></div></div>';
    ['mousedown', 'wheel', 'contextmenu', 'keydown'].forEach(function (ev) { host.addEventListener(ev, function (e) { e.stopPropagation(); }); });
    document.body.appendChild(host);
    _cam = { host: host, grid: root.querySelector('.grid'), title: root.querySelector('b'), msg: root.querySelector('.msg'),
      btnSize: root.querySelector('.sz'), grip: root.querySelector('.grip'), bar: root.querySelector('.bar'), full: false, zoom: null, frame: -1, id: undefined, pos: camLoadPos() };
    _cam.gear = root.querySelector('.gear'); _cam.pop = root.querySelector('.pop');
    var camPopRender = function () {
      var cur = CFG.camArrange || 'auto', h = '<div style="margin-bottom:4px;color:#fff;font-weight:bold">Cách xếp camera</div><div style="display:flex;gap:4px">';
      [['auto', 'Tự động'], ['h', 'Ngang ⬌'], ['v', 'Dọc ⬍']].forEach(function (o) { h += '<button data-a="' + o[0] + '"' + (cur === o[0] ? ' class="on"' : '') + '>' + o[1] + '</button>'; });
      h += '</div>';
      h += '<div style="margin-top:6px;color:#a8a8ae;font-size:11px">Tự lưu · thêm: Alt+S → Tùy chọn</div>';
      _cam.pop.innerHTML = h;
      [].forEach.call(_cam.pop.querySelectorAll('button[data-a]'), function (b) { b.onclick = function () { CFG.camArrange = b.getAttribute('data-a'); cfgSave(); camPopRender(); camFit(); }; });
    };
    _cam.gear.onclick = function (e) { e.stopPropagation(); var P = _cam.pop; if (P.style.display === 'block') P.style.display = 'none'; else { camPopRender(); P.style.display = 'block'; } };
    root.querySelector('.bar').addEventListener('mousedown', function (e) { camDrag(e, 'move'); });
    _cam.grip.addEventListener('mousedown', function (e) { camDrag(e, 'size'); });
    root.querySelector('.rs').onclick = function () { _cam.pos = null; _cam.full = false; _cam.docked = false; camSavePos(null); camLayout(); camFitSoon(); };
    root.querySelector('.x').onclick = toggleCams;
    _cam.btnSize.onclick = function () { _cam.full = !_cam.full; camLayout(); camFitSoon(); };
    _cam.onResize = function () { if (_cam) { camLayout(); camFitSoon(); } }; window.addEventListener('resize', _cam.onResize);
    if (window.ResizeObserver) { _cam.ro = new ResizeObserver(camFitSoon); _cam.ro.observe(_cam.grid); }
    camLayout(); setTimeout(camRender, 30); fwEnsure();
    _cam.timer = setInterval(function () {
      /* FIX#3: 350ms thay 200ms; bỏ qua khi _ptrDown để tránh lag khi kéo box */
      var C2 = ctx(); if (!_cam || !C2 || document.hidden || uiBusy() || camHidden() || _ptrDown) return;
      var id = selectedId(C2), f = curFrame(C2), sig = camSigOf(C2);
      var same = sig === _cam.sig || (sig && _cam.sig && sig.every(function (v, i) { return v === _cam.sig[i]; }));
      if (f !== _cam.frame || id !== _cam.id || !same) { _cam.sig = sig; if (id !== _cam.id) _cam.zoom = null; camRender(); }
    }, 350);
  }
  window.__toggleCams = toggleCams;
  /* ===== Bảng thuộc tính (chọn = đổi ngay) ===== */
  var _ap = null;

/* ============================================================
 * @MODULE[8]  BẢNG THUỘC TÍNH
 * Phím: 8 (keyAttrPanel)
 * apLayout, apRender, apSet, apCopyField, apRelSection,
 * apChangeClass, apClsOpen/Fill/Pick, toggleAttrPanel
 * ============================================================ */
  function apHidden() {
    if (_ly.tabNat) return true;
    if (!_ly.max || _ly.max === 'attr') return false;
    if (_ly.ed || !CFG.layoutOn || _ly.sus) return false;
    return !(CFG.attrKeepTab !== false && lyImgRole(_ly.max));
  }
  function apLoadPos() { try { var v = JSON.parse(localStorage.getItem('__snapAttrPos') || 'null'); return v && v.width ? v : null; } catch (e) { return null; } }
  function apSavePos(p) { try { localStorage.setItem('__snapAttrPos', JSON.stringify(p)); } catch (e) {} }
  function apClamp(p) {
    var W = window.innerWidth, H = window.innerHeight;
    p.width = Math.max(180, Math.min(p.width, W)); p.height = Math.max(120, Math.min(p.height, H));
    p.left = Math.max(0, Math.min(p.left, W - p.width)); p.top = Math.max(0, Math.min(p.top, H - p.height));
    return p;
  }
  function apDefaultPos() { var W = window.innerWidth; return { left: Math.max(0, W - 292), top: 90, width: 280, height: 340 }; }
  function apLayout() {
    if (!_ap) return;
    var base = 'position:fixed !important;z-index:' + (+CFG.camZ || 900) + ' !important;' + (apHidden() ? 'visibility:hidden !important;pointer-events:none !important;' : '');
    var p = _ap.docked ? _ap.pos : apClamp(_ap.pos || (_ap.pos = apDefaultPos()));
    _ap.host.style.cssText = base + 'left:' + p.left + 'px;top:' + p.top + 'px;width:' + p.width + 'px;height:' + p.height + 'px;';
    _ap.grip.style.display = _ap.docked ? 'none' : 'block';
    _ap.bar.style.cursor = _ap.docked ? 'default' : 'move';
    _ap.pin.classList.toggle('on', !!CFG.attrPanelPin);
    _ap.pin.textContent = CFG.attrPanelPin ? '📌 Cố định' : '✥ Tự do';
    _ap.pin.title = CFG.attrPanelPin ? 'Đang cố định vào ô trong bố cục canvas – bấm để chuyển sang kéo thả tự do' : 'Đang kéo thả tự do – bấm để cố định vào ô trong bố cục canvas';
    if (_ly.max && !_ly.ed && CFG.layoutOn && !_ly.sus && lyImgRole(_ly.max)) lyCssRefreshSoon();
  }
  function apRect(R) {
    var g = lyGrid(), t = R && R.attr; if (!g || !t || lyOff(t)) return null;
    var b = g.getBoundingClientRect();
    return { left: b.left + b.width * t.x / 100, top: b.top + b.height * t.y / 100, width: b.width * t.w / 100, height: b.height * t.h / 100 };
  }
  function apTrack(R) {
    if (!_ap || (_ly.ed && _ly.ed.drag)) return;
    R = R || lyCurrent();
    var p = (CFG.attrPanelPin && CFG.layoutOn && !_ly.sus && !_ly.tabNat) ? apRect(R) : null, q = _ap.pos;
    if (p) {
      if (_ap.docked && q && Math.abs(q.left - p.left) < 0.5 && Math.abs(q.top - p.top) < 0.5 && Math.abs(q.width - p.width) < 0.5 && Math.abs(q.height - p.height) < 0.5) return;
      _ap.docked = true; _ap.pos = p; apLayout();
    } else if (_ap.docked) {
      _ap.docked = false; _ap.pos = apLoadPos() || apDefaultPos(); apLayout();
    }
  }
  function apTogglePin() {
    if (!_ap || _ly.ed) return;
    if (CFG.attrPanelPin) {
      CFG.attrPanelPin = false; cfgSave();
      if (_ap.docked) { var q0 = _ap.host.getBoundingClientRect(); _ap.docked = false; _ap.pos = { left: q0.left, top: q0.top, width: q0.width, height: q0.height }; apSavePos(_ap.pos); }
      apLayout(); return toast('Bảng thuộc tính: kéo thả tự do', 1500);
    }
    CFG.attrPanelPin = true; cfgSave();
    if (!CFG.layoutOn || _ly.sus || !lyGrid()) { apLayout(); return toast('Cần bật bố cục tùy chỉnh (Alt+S → Giao diện canvas) để cố định vào canvas – sẽ tự cố định khi bật', 4500); }
    var R = lyRects();
    if (lyOff(R.attr)) {
      var gb = lyGrid().getBoundingClientRect(), q = _ap.host.getBoundingClientRect(), cl = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
      var w = cl(q.width / gb.width * 100, LY_MIN, 100), h = cl(q.height / gb.height * 100, LY_MIN, 100);
      R.attr = { x: cl((q.left - gb.left) / gb.width * 100, 0, 100 - w), y: cl((q.top - gb.top) / gb.height * 100, 0, 100 - h), w: w, h: h, off: false };
      CFG.layoutRects = R; cfgSave(); lyApply();
    }
    apTrack(lyCurrent()); toast('Bảng thuộc tính đã cố định vào canvas – chỉnh vị trí/cỡ ở Alt+S → Chỉnh bố cục bằng kéo thả', 3500);
  }
  function apDrag(e, mode) {
    if (e.button !== 0 || _ap.docked) return;
    if (mode === 'move' && e.target.closest && e.target.closest('button')) return;
    e.preventDefault(); e.stopPropagation();
    var r = _ap.host.getBoundingClientRect(), st = { x: e.clientX, y: e.clientY, left: r.left, top: r.top, width: r.width, height: r.height };
    _ap.pos = { left: r.left, top: r.top, width: r.width, height: r.height };
    var mv = function (ev) {
      var dx = ev.clientX - st.x, dy = ev.clientY - st.y;
      if (mode === 'move') { _ap.pos.left = st.left + dx; _ap.pos.top = st.top + dy; } else { _ap.pos.width = st.width + dx; _ap.pos.height = st.height + dy; }
      apLayout();
    };
    var up = function () { window.removeEventListener('mousemove', mv, true); window.removeEventListener('mouseup', up, true); apSavePos(_ap.pos); };
    window.addEventListener('mousemove', mv, true); window.addEventListener('mouseup', up, true);
  }
  var AP_CJK = /[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/g;
  function apClean(t, max) {
    t = String(t == null ? '' : t); var c = t.replace(AP_CJK, '').replace(/^[\s\-:/()（）|]+|[\s\-:/()（）|]+$/g, '').replace(/\s+/g, ' ');
    if (!c) c = t.trim();
    if (max && c.length > max) c = c.slice(0, max - 1) + '…';
    return c;
  }
  function apFieldName(f) {
    var tx = fieldText(f), list = [].concat(CFG.attrPanelShort || [], [[CFG.chkValidRe, 'Hợp lệ'], [CFG.chkOccRe, 'Che phủ'], [CFG.chkCipoRe, 'CIPO'], [CFG.chkMotionRe, 'Động/tĩnh']]);
    for (var i = 0; i < list.length; i++) { try { if (list[i] && list[i][0] && new RegExp(list[i][0], 'i').test(tx)) return list[i][1]; } catch (e) {} }
    var c = apClean(f.label || f.title || f.name, 16); return c.charAt(0).toUpperCase() + c.slice(1);
  }
  function apFields(C) {
    var hide = null; try { hide = CFG.attrPanelHideRe ? new RegExp(CFG.attrPanelHideRe, 'i') : null; } catch (e) {}
    return chkFields(C).all.filter(function (x) { return !isConeField(x.f) && (x.f.options || []).length && !(hide && hide.test(fieldText(x.f))); });
  }
  function apObj(C, id, f, fx) {
    var S = C.S, tr = S.instancesTree[id]; if (!tr) return {};
    if (fx.src === 'id') return instAttrAt(S, id, f);
    var fr = trackFrames(S, id); if (!fr.length) return {};
    var k = fr[0]; for (var i = 0; i < fr.length; i++) if (fr[i] <= f) k = fr[i];
    return parseLabels(tr.cubes[k].labels);
  }
  function apSet(fx, val) {
    try {
      var C = ctx(); if (!C) return;
      var S = C.S, id = selectedId(C); if (id == null) return toast('Chưa chọn box', 2000);
      var f0 = curFrame(C), name = fx.f.name, r = recBegin('thuộc tính ' + (fx.f.label || name));
      try {
        if (fx.src === 'box') ensureBoxAt(C, id, f0);
        var cur = apObj(C, id, f0, fx)[name], put = val;
        if (isMulti(fx.f)) {
          var a = Array.isArray(cur) ? cur.slice() : (cur == null || cur === '' ? [] : [cur]), ix = a.map(String).indexOf(String(val));
          if (ix >= 0) a.splice(ix, 1); else a.push(val); put = a;
        }
        if (fx.src === 'id') {
          if (!S.updateInstanceLabel) return toast('Tool không hỗ trợ thuộc tính theo ID', 3000);
          var A = instAttrAt(S, id, f0); A[name] = put; S.updateInstanceLabel(id, f0, A);
        } else {
          var c = S.instancesTree[id].cubes[f0]; if (!c) return toast('Không có box ở frame này', 2500);
          var obj = parseLabels(c.labels), isStr = typeof c.labels === 'string' || c.labels == null; obj[name] = put;
          S.updateCubeLabel(id, f0, isStr ? JSON.stringify(obj) : obj);
        }
      } finally { recEnd(r); }
      _emit(S);
      reselectBox(C, id); apRender(true);
    } catch (e) { console.error('[snap] bang thuoc tinh', e); toast('LỖI gán thuộc tính: ' + (e && e.message || e), 4000); }
  }
  function copyAttrsTo(C, id, f0, targets, label) {
    var S = C.S;
    if (!targets.length) return { err: 'không có keyframe nào để áp dụng' };
    ensureBoxAt(C, id, f0);
    var src = S.instancesTree[id].cubes[f0]; if (!src) return { err: 'không đọc được thuộc tính frame ' + (f0 + 1) };
    var boxObj = parseLabels(src.labels), instObj = S.updateInstanceLabel ? instAttrAt(S, id, f0) : null, n = 0;
    targets.forEach(function (f) {
      var c = S.instancesTree[id].cubes[f]; if (!c) return;
      var isStr = typeof c.labels === 'string' || c.labels == null, o = JSON.parse(JSON.stringify(boxObj));
      S.updateCubeLabel(id, f, isStr ? JSON.stringify(o) : o);
      if (instObj) S.updateInstanceLabel(id, f, JSON.parse(JSON.stringify(instObj)));
      n++;
    });
    return { n: n, text: 'Chép mọi thuộc tính frame ' + (f0 + 1) + ' → ' + n + ' keyframe ' + label };
  }
  function apCopy(all) {
    try {
      var C = ctx(); if (!C) return;
      var S = C.S, id = selectedId(C); if (id == null) return toast('Chưa chọn box', 2000);
      var f0 = curFrame(C), tf = trackFrames(S, id);
      var targets = tf.filter(function (x) { return all ? x !== f0 : x > f0; });
      var r = recBegin(all ? 'thuộc tính → mọi keyframe' : 'thuộc tính → các keyframe sau'), res;
      try { res = copyAttrsTo(C, id, f0, targets, all ? '(mọi keyframe)' : 'phía sau'); } finally { recEnd(r); }
      _emit(S);
      reselectBox(C, id);
      toast(res.err ? 'LỖI: ' + res.err : res.text + ' · Alt+Z hoàn tác', res.err ? 3500 : 2800);
    } catch (e) { console.error('[snap] chep thuoc tinh', e); toast('LỖI chép thuộc tính: ' + (e && e.message || e), 4000); }
  }
  function apCopyField(fx, all) {
    try {
      var C = ctx(); if (!C) return;
      var S = C.S, id = selectedId(C); if (id == null) return toast('Chưa chọn box', 2000);
      var f0 = curFrame(C), name = fx.f.name, nm = apFieldName(fx.f);
      var targets = trackFrames(S, id).filter(function (x) { return all ? x !== f0 : x > f0; });
      if (!targets.length) return toast('Không có keyframe ' + (all ? 'nào khác' : 'phía sau'), 2200);
      var r = recBegin('thuộc tính ' + nm + (all ? ' → mọi keyframe' : ' → keyframe sau')), n = 0;
      try {
        if (fx.src === 'box') ensureBoxAt(C, id, f0);
        var val = apObj(C, id, f0, fx)[name];
        if (fx.src === 'id' && !S.updateInstanceLabel) return toast('Tool không hỗ trợ thuộc tính theo ID', 3000);
        targets.forEach(function (f) {
          var v = val === undefined ? undefined : JSON.parse(JSON.stringify(val));
          if (fx.src === 'id') {
            var A = instAttrAt(S, id, f); if (v === undefined) delete A[name]; else A[name] = v;
            S.updateInstanceLabel(id, f, A); n++;
          } else {
            var c = S.instancesTree[id].cubes[f]; if (!c) return;
            var obj = parseLabels(c.labels), isStr = typeof c.labels === 'string' || c.labels == null;
            if (v === undefined) delete obj[name]; else obj[name] = v;
            S.updateCubeLabel(id, f, isStr ? JSON.stringify(obj) : obj); n++;
          }
        });
      } finally { recEnd(r); }
      _emit(S);
      reselectBox(C, id); apRender(true);
      toast(nm + ' → ' + n + ' keyframe ' + (all ? '(mọi keyframe)' : 'phía sau') + ' · Alt+Z hoàn tác', 2500);
    } catch (e) { console.error('[snap] chep thuoc tinh muc', e); toast('LỖI chép thuộc tính: ' + (e && e.message || e), 4000); }
  }
  /* ===== Relation (liên kết) trong bảng thuộc tính – đọc từ relations của nền tảng ===== */
  function relLblV(v) { v = String(v == null ? '' : v); return v.length > 10 ? v.slice(0, 8) + '…' : v; }
  function relLbl(S, k) { var tr = S.instancesTree[k]; return tr && tr.number != null ? relLblV(tr.number) : relLblV(k); }
  function relR(S) {
    var V = window.view;
    return S.relations || (V && (V.relations || (V.state && V.state.relations))) || null;
  }
  function relEnd(v) {
    if (v != null && typeof v === 'object') v = v.id != null ? v.id : (v.instanceId != null ? v.instanceId : (v.number != null ? v.number : null));
    return v;
  }
  var _relKM = { n: -1, m: {} };
  function relKeyOf(S, v) {
    v = relEnd(v); if (v == null || v === '') return '';
    var t = String(v); if (S.instancesTree[t]) return t;
    var ks = Object.keys(S.instancesTree);
    if (_relKM.n !== ks.length) { _relKM = { n: ks.length, m: {} }; ks.forEach(function (k) { var tr = S.instancesTree[k]; if (tr && tr.id != null && !(String(tr.id) in _relKM.m)) _relKM.m[String(tr.id)] = k; }); }
    return _relKM.m[t] || '';
  }
  function relFrames(S) {
    var R = relR(S), out = []; if (!R) return out;
    Object.keys(R).forEach(function (k) { if (Array.isArray(R[k]) && /^\d+$/.test(k)) out.push(+k); });
    return out.sort(function (a, b) { return a - b; });
  }
  function relNF(S) {
    if (S.dataLength != null) return S.dataLength;
    var fs = relFrames(S); return fs.length ? fs[fs.length - 1] + 1 : 0;
  }
  function relAt(S, id, f) {
    var R = relR(S), arr = (R && R[f]) || [], out = [], me = String(id);
    if (!Array.isArray(arr)) return out;
    arr.forEach(function (r) {
      if (!r || typeof r !== 'object') return;
      var a = relKeyOf(S, r.from), b = relKeyOf(S, r.to);
      if (a === me && b && b !== me) out.push({ r: r, p: b }); else if (b === me && a && a !== me) out.push({ r: r, p: a });
    });
    return out;
  }
  function relPartners(S, id, cur) {
    var map = {}, order = [];
    relFrames(S).forEach(function (f) {
      relAt(S, id, f).forEach(function (x) {
        var m = map[x.p] || (map[x.p] = { p: x.p, frames: [], rec: x.r, atCur: false });
        if (m.frames[m.frames.length - 1] !== f) m.frames.push(f);
        if (f === cur) { m.atCur = true; m.rec = x.r; }
        if (order.indexOf(x.p) < 0) order.push(x.p);
      });
    });
    return order.map(function (k) { return map[k]; });
  }
  function relMode(S) {
    var R = relR(S);
    for (var f = 0; R && f < relNF(S); f++) for (var i = 0; R[f] && i < R[f].length; i++) {
      var r = R[f][i], e = r && relEnd(r.from);
      if (e != null && S.instancesTree[String(e)]) return 'key';
      if (e != null && relKeyOf(S, e)) return 'tid';
    }
    return 'key';
  }
  function relTemplate(S) {
    var R = relR(S);
    for (var f = 0; R && f < relNF(S); f++) for (var i = 0; R[f] && i < R[f].length; i++) { var r = R[f][i]; if (r && relKeyOf(S, r.from) && relKeyOf(S, r.to) && r.relation != null) return cloneJ(r); }
    return { relation: '关联', type: 'cube' };
  }
  function relMk(S, sample, key) {
    var tr = S.instancesTree[key], val = relMode(S) === 'tid' && tr && tr.id != null ? tr.id : key;
    if (sample != null && typeof sample === 'object') { var o = cloneJ(sample); o.id = typeof o.id === 'number' && !isNaN(+val) ? +val : String(val); return o; }
    return typeof sample === 'number' && !isNaN(+val) ? +val : (typeof val === 'number' ? val : String(val));
  }
  function relFrameArr(S, f) { var R = relR(S); if (!R[f]) R[f] = []; return R[f]; }
  function relUndoBegin(S, label) {
    var snap = {};
    return {
      keep: function (f) { if (!(f in snap)) { var R = relR(S); snap[f] = cloneJ((R && R[f]) || []); } },
      end: function () {
        var fs = Object.keys(snap); if (!fs.length) return;
        _undo.push({ label: label, snaps: {}, created: {}, platform: '', relRestore: function () {
          fs.forEach(function (f) { var a = relFrameArr(S, f); a.length = 0; snap[f].forEach(function (x) { a.push(x); }); });
        } });
        if (_undo.length > UNDO_MAX) _undo.shift();
      }
    };
  }
  function relResolve(S, raw, selfId) {
    var t = String(raw == null ? '' : raw).trim().replace(/^#/, ''); if (!t) return { err: 'Chưa nhập id' };
    var hit = null;
    if (S.instancesTree[t]) hit = t;
    else {
      var m = Object.keys(S.instancesTree).filter(function (k) { var tr = S.instancesTree[k]; return tr && String(tr.number) === t && String(k) !== String(selfId); });
      if (m.length === 1) hit = m[0]; else if (m.length > 1) return { err: 'Có ' + m.length + ' xe cùng số ' + t + ' – hãy chọn id từ danh sách gợi ý' };
      else hit = relKeyOf(S, t) || null;
    }
    if (hit == null) return { err: 'Không có id ' + t };
    if (String(hit) === String(selfId)) return { err: 'Không thể liên kết với chính nó' };
    return { id: hit };
  }
  function relSetPartner(S, r, oldP, newP) {
    var which = relKeyOf(S, r.from) === String(oldP) ? 'from' : 'to';
    r[which] = relMk(S, r[which], newP);
  }
  function apRelAdd(raw, oldP) {
    try {
      var C = ctx(); if (!C) return;
      var S = C.S, id = selectedId(C); if (id == null) return toast('Chưa chọn box', 2000);
      if (!relR(S)) return toast('Không đọc được relations của tool (xem Console: __snapRelDebug())', 4000);
      var res = relResolve(S, raw, id); if (res.err) { apRender(true); return toast(res.err, 2800); }
      var f = curFrame(C), np = res.id, u = relUndoBegin(S, 'liên kết ' + relLbl(S, id) + ' ↔ ' + np);
      if (oldP != null) {
        /* đổi id đầu kia của liên kết: giữ nguyên bản ghi (relation, chiều from/to…), chỉ thay id – ở MỌI frame có liên kết này */
        var nf = 0, merged = 0, R = relR(S);
        relFrames(S).forEach(function (g) {
          var here = relAt(S, id, g), hits = here.filter(function (x) { return String(x.p) === String(oldP); });
          if (!hits.length) return;
          var has = here.some(function (x) { return String(x.p) === String(np); }), arr = R[g];
          u.keep(g);
          hits.forEach(function (h) {
            if (has) { var i = arr.indexOf(h.r); if (i >= 0) { arr.splice(i, 1); merged++; } }
            else { relSetPartner(S, h.r, oldP, np); has = true; }
          });
          nf++;
        });
        if (!nf) { apRender(true); return toast('Không tìm thấy liên kết ' + relLbl(S, id) + ' ↔ ' + oldP, 2500); }
        u.end(); _emit(S); _ap.sig = ''; apRender(true);
        return toast('Đổi liên kết ' + relLbl(S, id) + ' ↔ ' + relLbl(S, oldP) + ' → ' + relLbl(S, id) + ' ↔ ' + relLbl(S, np) + ' ở ' + nf + ' frame' + (merged ? ' (gộp ' + merged + ' bản trùng)' : '') + ' · Alt+Z hoàn tác', 3200);
      }
      var cur = relAt(S, id, f);
      if (cur.some(function (x) { return String(x.p) === String(np); })) { apRender(true); return toast('Đã có liên kết với ' + relLbl(S, np) + ' ở frame này', 2200); }
      u.keep(f);
      var tpl = relTemplate(S), rec = cloneJ(tpl); rec.from = relMk(S, tpl.from, id); rec.to = relMk(S, tpl.to, np); relFrameArr(S, f).push(rec);
      u.end(); _emit(S); _ap.sig = ''; apRender(true);
      toast('Thêm liên kết ' + relLbl(S, id) + ' ↔ ' + relLbl(S, np) + ' (frame ' + (f + 1) + ') · bấm All để áp cho mọi keyframe', 3000);
    } catch (e) { console.error('[snap] them lien ket', e); toast('LỖI liên kết: ' + (e && e.message || e), 4000); }
  }
  function apRelHere(p) {
    try {
      var C = ctx(); if (!C) return;
      var S = C.S, id = selectedId(C); if (id == null) return;
      var f = curFrame(C), pm = relPartners(S, id, f).filter(function (x) { return String(x.p) === String(p); })[0]; if (!pm || pm.atCur) return;
      var u = relUndoBegin(S, 'liên kết ' + relLbl(S, id) + ' ↔ ' + p); u.keep(f);
      relFrameArr(S, f).push(cloneJ(pm.rec)); u.end(); _emit(S); _ap.sig = ''; apRender(true);
      toast('Đã tạo liên kết ' + relLbl(S, id) + ' ↔ ' + relLbl(S, p) + ' ở frame ' + (f + 1), 2200);
    } catch (e) { console.error('[snap] tao lien ket', e); toast('LỖI liên kết: ' + (e && e.message || e), 4000); }
  }
  function apRelRemove(p) {
    try {
      var C = ctx(); if (!C) return;
      var S = C.S, id = selectedId(C); if (id == null) return;
      var R = relR(S); if (!R) return;
      var u = relUndoBegin(S, 'xoá liên kết ' + relLbl(S, id) + ' ↔ ' + relLbl(S, p) + ' (mọi keyframe)'), nf = 0, nr = 0;
      relFrames(S).forEach(function (f) {
        var del = relAt(S, id, f).filter(function (x) { return String(x.p) === String(p); }).map(function (x) { return x.r; });
        if (!del.length) return;
        u.keep(f); var arr = R[f];
        for (var i = arr.length - 1; i >= 0; i--) if (del.indexOf(arr[i]) >= 0) { arr.splice(i, 1); nr++; }
        nf++;
      });
      u.end(); _emit(S); _ap.sig = ''; apRender(true);
      toast('Đã xoá liên kết ' + relLbl(S, id) + ' ↔ ' + relLbl(S, p) + ' ở ' + nf + ' frame · Alt+Z hoàn tác', 2800);
    } catch (e) { console.error('[snap] xoa lien ket', e); toast('LỖI xoá liên kết: ' + (e && e.message || e), 4000); }
  }
  function apRelAll(all) {
    try {
      var C = ctx(); if (!C) return;
      var S = C.S, id = selectedId(C); if (id == null) return toast('Chưa chọn box', 2000);
      if (!relR(S)) return toast('Không đọc được relations của tool (xem Console: __snapRelDebug())', 4000);
      var f0 = curFrame(C), src = relAt(S, id, f0), nF = relNF(S), frames = [];
      for (var f = 0; f < nF; f++) if (f !== f0 && (all || f > f0) && effCube(S, id, f)) frames.push(f);
      if (!frames.length) return toast('Không có frame nào ' + (all ? 'khác' : 'phía sau') + ' để áp', 2200);
      if (!src.length && !confirm('Frame hiện tại KHÔNG có liên kết.\nÁp cho ' + (all ? 'mọi' : 'các') + ' keyframe sẽ XOÁ hết liên kết của id ' + relLbl(S, id) + ' ở ' + frames.length + ' frame. Tiếp tục?')) return;
      var u = relUndoBegin(S, 'liên kết ' + relLbl(S, id) + (all ? ' → mọi keyframe' : ' → keyframe sau')), add = 0, del = 0, want = {};
      src.forEach(function (x) { want[x.p] = x; });
      frames.forEach(function (f) {
        var cur = relAt(S, id, f), changed = false;
        cur.forEach(function (x) {
          if (want[x.p]) return;
          if (!changed) { u.keep(f); changed = true; }
          var arr = relFrameArr(S, f), i = arr.indexOf(x.r); if (i >= 0) { arr.splice(i, 1); del++; }
        });
        Object.keys(want).forEach(function (p) {
          if (!effCube(S, p, f) || cur.some(function (x) { return String(x.p) === p; })) return;
          if (!changed) { u.keep(f); changed = true; }
          relFrameArr(S, f).push(cloneJ(want[p].r)); add++;
        });
      });
      u.end(); _emit(S); _ap.sig = ''; apRender(true);
      toast('Liên kết ' + relLbl(S, id) + ' → ' + frames.length + ' frame ' + (all ? '(mọi keyframe)' : 'phía sau') + ': thêm ' + add + ', xoá ' + del + ' · Alt+Z hoàn tác', 3200);
    } catch (e) { console.error('[snap] ap lien ket', e); toast('LỖI áp liên kết: ' + (e && e.message || e), 4000); }
  }
  window.__snapRelDebug = function () {
    var C = ctx(); if (!C) return console.log('[snap] chua san sang');
    var S = C.S, R = relR(S), id = selectedId(C), out = { hasRelations: !!R, isArray: Array.isArray(R), frames: R ? relFrames(S).length : 0, selected: id, frame: curFrame(C) };
    if (R) { var fs = relFrames(S).filter(function (f) { return R[f].length; }); out.framesWithRelations = fs.length; out.sample = cloneJ(fs.length ? R[fs[0]].slice(0, 3) : []); out.raw = id != null ? fs.slice(0, 5).map(function (f) { return R[f].filter(function (r) { return r && (String(relEnd(r.from)) === String(id) || String(relEnd(r.to)) === String(id)); }); }) : null; }
    out.partners = id != null ? relPartners(S, id, curFrame(C)).map(function (x) { return { p: x.p, frames: x.frames.length, atCur: x.atCur }; }) : null;
    console.log('[snap] relation debug', JSON.parse(JSON.stringify(out))); return out;
  };
  function apRelSection(C, id, f) {
    var S = C.S, row = document.createElement('div'); row.className = 'fld';
    var hd = document.createElement('div'); hd.className = 'fh';
    var lb = document.createElement('div'); lb.className = 'fl'; lb.textContent = 'Liên kết'; lb.title = 'Relation (关联) của nền tảng – các xe đang liên kết với xe đang chọn'; hd.appendChild(lb);
    var fb = document.createElement('div'); fb.className = 'fb';
    [['All', true, 'Áp danh sách liên kết của frame hiện tại cho MỌI keyframe của id (thêm cái thiếu, xoá cái thừa)']].forEach(function (d) {
      var b = document.createElement('button'); b.textContent = d[0]; b.title = d[2]; b.onclick = function () { apRelAll(d[1]); }; fb.appendChild(b);
    });
    hd.appendChild(fb); row.appendChild(hd);
    if (!relR(S)) { var nr = document.createElement('div'); nr.className = 'sl no'; nr.textContent = 'Không đọc được relations của tool (Console: __snapRelDebug())'; row.appendChild(nr); return row; }
    var nc = {}; Object.keys(S.instancesTree).forEach(function (k) { var t = S.instancesTree[k]; if (t && t.number != null) nc[t.number] = (nc[t.number] || 0) + 1; });
    var shown = function (k) { var t = S.instancesTree[k]; if (t && t.number != null && nc[t.number] === 1 && (!S.instancesTree[String(t.number)] || String(t.number) === String(k))) return String(t.number); return String(k); };
    var dl = document.createElement('datalist'); dl.id = 'apids';
    Object.keys(S.instancesTree).forEach(function (k) {
      if (String(k) === String(id)) return; var tr = S.instancesTree[k]; if (!tr || !tr.cubes) return;
      var cat = treeCategory(tr), vn = ''; try { vn = classVN()[cat] || ''; } catch (e) {}
      var o = document.createElement('option'); o.value = shown(k); o.label = (vn || cat) + ' ' + (tr.number != null ? tr.number : k); o.textContent = o.label; dl.appendChild(o);
    });
    row.appendChild(dl);
    var mk = function (val) {
      var inp = document.createElement('input'); inp.className = 'ri'; inp.setAttribute('list', 'apids'); inp.value = val == null ? '' : val; inp.spellcheck = false; return inp;
    };
    var pts = relPartners(S, id, f), tf = trackFrames(S, id), tot = tf.length ? tf[tf.length - 1] - tf[0] + 1 : 0;
    pts.sort(function (a, b) { return (b.atCur ? 1 : 0) - (a.atCur ? 1 : 0); });
    var endLine = function (k, x) {
      var tr = S.instancesTree[k], d = document.createElement('div'), isP = String(k) === String(x.p);
      d.className = 're' + (String(k) === String(id) ? ' me' : '');
      var cat = tr ? treeCategory(tr) : '', vn = ''; try { vn = classVN()[cat] || ''; } catch (e) {}
      var n = document.createElement('span'), no = document.createElement('span'); n.className = 'en'; no.className = 'eno';
      n.textContent = tr ? (vn || cat) : '(đã xoá)'; no.textContent = tr ? (tr.number != null ? tr.number : k) : k;
      d.title = (vn ? vn + ' · ' : '') + cat + ' ' + (tr && tr.number != null ? tr.number : k) + ' | id nội bộ: ' + k
        + (isP ? ' | liên kết có ở ' + x.frames.length + (tot ? '/' + tot : '') + ' frame' : '');
      d.appendChild(n); d.appendChild(no);
      if (isP) {
        n.style.flex = '1 1 auto';
        var inp = mk(shown(x.p)); inp.title = 'Id xe liên kết – sửa rồi Enter để đổi id (áp cho mọi keyframe của liên kết này)'; inp.style.cssText = 'flex:0 0 46px;width:46px';
        var go = function () { if (String(inp.value).trim() !== shown(x.p)) apRelAdd(inp.value, x.p); };
        inp.onchange = go; inp.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } };
        d.appendChild(inp);
        if (!x.atCur) { var rh = document.createElement('button'); rh.className = 'rx'; rh.textContent = '＋'; rh.title = 'Chưa có ở frame hiện tại – bấm để tạo'; rh.onclick = function () { apRelHere(x.p); }; d.appendChild(rh); }
        var rx = document.createElement('button'); rx.className = 'rx'; rx.textContent = '✕'; rx.title = 'Xoá liên kết này ở TẤT CẢ keyframe'; rx.onclick = function () { apRelRemove(x.p); }; d.appendChild(rx);
      }
      return d;
    };
    if (!pts.length) { var no0 = document.createElement('div'); no0.className = 'sl no'; no0.textContent = 'Chưa liên kết với xe nào'; row.appendChild(no0); }
    pts.forEach(function (x) {
      var card = document.createElement('div'); card.className = 'rc' + (x.atCur ? '' : ' off');
      card.title = x.atCur ? '' : 'Liên kết này KHÔNG có ở frame hiện tại – chỉ có ở frame ' + (x.frames[0] + 1) + (x.frames.length > 1 ? '…' : '');
      var top = document.createElement('div'); top.className = 'rtop';
      var lab = document.createElement('div'); lab.className = 'rl'; lab.textContent = x.rec && x.rec.relation != null ? String(x.rec.relation) : '关联'; top.appendChild(lab);
      var ln = document.createElement('div'); ln.className = 'rln'; top.appendChild(ln);
      var br = document.createElement('div'); br.className = 'rbr'; top.appendChild(br);
      var col = document.createElement('div'); col.className = 'rcol';
      var a1 = x.rec ? relKeyOf(S, x.rec.from) : '', a2 = x.rec ? relKeyOf(S, x.rec.to) : '';
      if (!a1 || !a2) { a1 = String(id); a2 = String(x.p); }
      col.appendChild(endLine(a1, x)); col.appendChild(endLine(a2, x)); top.appendChild(col); card.appendChild(top);
      row.appendChild(card);
    });
    var ar = document.createElement('div'); ar.className = 'rr';
    var ni = mk(''); ni.placeholder = 'nhập / chọn id để thêm'; ni.style.cssText = 'flex:1 1 auto;width:auto';
    var ab = document.createElement('button'); ab.textContent = '+ Thêm'; ab.title = 'Thêm liên kết ở frame hiện tại';
    var add = function () { if (String(ni.value).trim()) apRelAdd(ni.value, null); };
    ab.onclick = add; ni.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); add(); } };
    ar.appendChild(ni); ar.appendChild(ab); row.appendChild(ar);
    return row;
  }
  function apSig(C) {
    var id = selectedId(C), f = curFrame(C), parts = [id, f, _clsBusy ? 1 : 0];
    if (id != null && C.S.instancesTree[id]) {
      parts.push(treeCategory(C.S.instancesTree[id]));
      parts.push(JSON.stringify(relPartners(C.S, id, f).map(function (x) { return [x.p, x.frames.length, x.atCur ? 1 : 0]; })));
      var fl = apFields(C); parts.push(fl.length);
      var seen = {}; fl.forEach(function (fx) { var k = fx.src; if (!seen[k]) { seen[k] = 1; parts.push(JSON.stringify(apObj(C, id, f, fx))); } });
    }
    return parts.join('|');
  }
  function apClsClose() { if (_ap && _ap.clist) _ap.clist.style.display = 'none'; }
  function apClsHi() {
    var it = _ap.cl.children;
    for (var i = 0; i < it.length; i++) it[i].classList.toggle('hi', i === _ap.chi);
    if (it[_ap.chi] && it[_ap.chi].scrollIntoView) it[_ap.chi].scrollIntoView({ block: 'nearest' });
  }
  function apClsFill() {
    var q = nrm(_ap.cq.value).toLowerCase().trim(), box = _ap.cl, cur = _ap.ccur, k = -1;
    box.innerHTML = ''; _ap.cmatch = [];
    (_ap.cls || []).forEach(function (c) {
      var lb = classLabel(c); if (q && nrm(lb + ' ' + c).toLowerCase().indexOf(q) < 0) return;
      _ap.cmatch.push(c); if (k < 0 && nrm(c) === nrm(cur)) k = _ap.cmatch.length - 1;
      var d = document.createElement('div'); d.className = 'ci' + (nrm(c) === nrm(cur) ? ' on' : ''); d.textContent = lb; d.title = c;
      d.onmousedown = function (e) { e.preventDefault(); e.stopPropagation(); apClsPick(c); };
      box.appendChild(d);
    });
    if (!_ap.cmatch.length) { var no = document.createElement('div'); no.className = 'cn'; no.textContent = 'Không có class khớp'; box.appendChild(no); }
    _ap.chi = _ap.cmatch.length ? (q ? 0 : Math.max(k, 0)) : -1; apClsHi();
  }
  function apClsOpen() {
    if (!_ap || _ap.csel.disabled) return;
    if (_ap.clist.style.display !== 'none') return apClsClose();
    var r = _ap.csel.getBoundingClientRect(), H = window.innerHeight, below = H - r.bottom - 8, above = r.top - 8, up = below < 180 && above > below, w = Math.max(r.width, 220);
    var left = Math.max(4, Math.min(r.left, window.innerWidth - w - 4));
    _ap.clist.style.cssText = 'display:flex;left:' + left + 'px;width:' + w + 'px;max-height:' + Math.max(120, Math.min(340, up ? above : below)) + 'px;' + (up ? 'bottom:' + (H - r.top + 2) + 'px;' : 'top:' + (r.bottom + 2) + 'px;');
    _ap.cq.value = ''; apClsFill(); _ap.cq.focus();
  }
  function apClsPick(c) { apClsClose(); if (_ap && nrm(c) !== nrm(_ap.ccur)) apChangeClass(c); }
  function apClassRow(C, id, tr) {
    var cid = _ap.cid;
    if (!tr) { cid.textContent = 'ID —'; cid.title = ''; _ap.cv.textContent = '—'; _ap.csel.disabled = true; _ap.cls = []; _ap.ccur = ''; apClsClose(); return; }
    var num = tr.number != null ? tr.number : id;
    cid.textContent = 'ID ' + relLblV(num);
    cid.title = 'Số thứ tự: ' + num + ' | id nội bộ: ' + id;
    cid.style.cssText = 'max-width:42%;overflow:hidden;text-overflow:ellipsis';
    var cat = treeCategory(tr), list = [];
    try { list = menuClasses().slice(); } catch (e) {}
    if (cat && list.map(nrm).indexOf(nrm(cat)) < 0) list.unshift(cat);
    _ap.cls = list; _ap.ccur = cat || '';
    _ap.cv.textContent = cat ? classLabel(cat) : '—';
    _ap.csel.title = (cat ? classLabel(cat) + ' – ' : '') + 'bấm để đổi class (xe sẽ chuyển sang class chọn)';
    _ap.csel.disabled = !!_clsBusy || !!_clsPend;
  }
  function apChangeClass(target) {
    if (!_ap) return;
    try {
      var C = ctx(); if (!C) return;
      var S = C.S, V = C.V, id = selectedId(C), tree = id != null && S.instancesTree[id];
      if (!tree) return toast('Chưa chọn box cần đổi class', 2500);
      if (toolBusy()) { apRender(true); return toast('Tool đang bận (đang mở hộp thoại) – thử lại sau', 2500); }
      if (_clsBusy) { apRender(true); return; }
      var src = treeCategory(tree);
      if (!target || nrm(target) === nrm(src)) return;
      if (typeof V.moveExchangeShape !== 'function') { apRender(true); return toast('Tool không có chức năng Move (moveExchangeShape)', 4000); }
      if (!Object.keys(_ontoSet).length) { try { knownCategories(C); } catch (e) {} }
      _ap.csel.disabled = true;
      convertClassTo(C, id, tree, src, target, function () { if (_ap) { _ap.sig = ''; apRender(true); } });
    } catch (e) { _clsBusy = false; console.error('[snap] bang thuoc tinh doi class', e); toast('LỖI đổi class: ' + (e && e.message || e), 5000); try { apRender(true); } catch (e2) {} }
  }
  function apRender(force) {
    if (!_ap || apHidden()) return;
    var C = ctx(); if (!C) return;
    var sig = apSig(C); if (!force && sig === _ap.sig) return; _ap.sig = sig;
    var id = selectedId(C), f = curFrame(C), tr = id != null && C.S.instancesTree[id], B = _ap.body;
    try { apClassRow(C, id, tr); } catch (e) { console.warn('[snap] hang class', e); }
    if (!tr) { _ap.who.textContent = ''; B.innerHTML = '<div class="note">Chọn 1 box để chỉnh thuộc tính.</div>'; return; }
    _ap.who.textContent = 'f' + (f + 1);
    var fl = apFields(C); B.innerHTML = '';
    if (!fl.length) { B.innerHTML = '<div class="note">Không đọc được danh sách thuộc tính của tool.</div>'; try { B.appendChild(apRelSection(C, id, f)); } catch (e) { console.warn('[snap] relation', e); } return; }
    var sm = document.createElement('div'); sm.className = 'sum';
    var reOf = function (src) { try { return src ? new RegExp(src, 'i') : null; } catch (e) { return null; } };
    var reV = reOf(CFG.chkValidRe), reO = reOf(CFG.chkOccRe), reC = reOf(CFG.chkCipoRe);
    var shortVal = function (f, lbl) {
      var tx = fieldText(f);
      if (reV && reV.test(tx)) return /không|无|invalid|\bnot\b/i.test(lbl) ? 'Không hợp lệ' : 'Hợp lệ';
      if (reO && reO.test(tx)) {
        var m = lbl.match(/[<>≤≥]\s*\d+\s*%|\d+\s*%?\s*[~\-–]\s*\d+\s*%/);
        if (m) return m[0].replace(/\s+/g, '').replace(/%?[~\-–]/, '-');
      }
      return lbl;
    };
    var s3 = document.createElement('div'), s3Items = []; s3.className = 's3';
    fl.forEach(function (fx) {
      var cur = apObj(C, id, f, fx)[fx.f.name], vals = (Array.isArray(cur) ? cur : [cur]).filter(function (v) { return v != null && v !== ''; }).map(String);
      var txt = vals.map(function (v) { var o = (fx.f.options || []).filter(function (x) { return String(x.value) === v; })[0]; return shortVal(fx.f, o && o.label != null ? String(o.label) : v); }).join(', ');
      /* FIX#4: tính màu chữ cho valid (xanh/đỏ) và occ (xanh/<30%=xanh, 30-70%=vàng, >70%=đỏ) */
      var tx = fieldText(fx.f), rk = reV && reV.test(tx) ? 0 : reO && reO.test(tx) ? 1 : reC && reC.test(tx) ? 2 : -1;
      var clrCls = '';
      if (txt && rk === 0) {
        /* valid: Hợp lệ=xanh, Không hợp lệ=đỏ */
        clrCls = /không hợp lệ|invalid|\bnot valid\b/i.test(txt) ? ' err' : ' ok';
      } else if (txt && rk === 1) {
        /* occ: <30% / slightly occluded = xanh; 30-70% / occluded = vàng; >70% / heavily occluded = đỏ
           shortVal có thể trả về chuỗi % (nếu label có %) hoặc label gốc (nếu không có %) */
        var occTxt = txt.toLowerCase();
        if (/heavily|>\s*70|70\s*[-–~]\s*100|≥\s*70/.test(occTxt)) clrCls = ' err';
        else if (/slightly|<\s*30/.test(occTxt)) clrCls = ' ok';
        else if (/\boccluded\b|30\s*[-–~]\s*70/.test(occTxt)) clrCls = ' warn';
        /* không xác định được level → không tô màu */
      }
      var ln = document.createElement('div'); ln.className = 'sl' + (txt ? clrCls : ' no'); ln.textContent = txt || '—'; ln.title = String(fx.f.label || fx.f.title || fx.f.name);
      if (rk >= 0) s3Items.push({ rk: rk, el: ln }); else sm.appendChild(ln);
    });
    s3Items.sort(function (a, b) { return a.rk - b.rk; }).forEach(function (x) { s3.appendChild(x.el); });
    if (s3Items.length) sm.insertBefore(s3, sm.firstChild);
    B.appendChild(sm);
    fl.forEach(function (fx) {
      var cur = apObj(C, id, f, fx)[fx.f.name], vals = (Array.isArray(cur) ? cur : [cur]).map(String);
      var row = document.createElement('div'); row.className = 'fld';
      var hd = document.createElement('div'); hd.className = 'fh';
      var lb = document.createElement('div'); lb.className = 'fl'; lb.textContent = apFieldName(fx.f); lb.title = String(fx.f.label || fx.f.title || fx.f.name); hd.appendChild(lb);
      var fb = document.createElement('div'); fb.className = 'fb';
      [['All', true, 'Áp giá trị mục này của frame hiện tại cho MỌI keyframe (trước và sau)'], ['Sau', false, 'Apply to all following frames – áp giá trị mục này cho các keyframe phía sau']].forEach(function (d) {
        var cb = document.createElement('button'); cb.textContent = d[0]; cb.title = d[2]; cb.onclick = function () { apCopyField(fx, d[1]); }; fb.appendChild(cb);
      });
      hd.appendChild(fb); row.appendChild(hd);
      var ops = document.createElement('div'); ops.className = 'ops';
      (fx.f.options || []).forEach(function (o) {
        var b = document.createElement('button'); b.className = 'op' + (vals.indexOf(String(o.value)) >= 0 ? ' on' : '');
        b.textContent = apClean(o.label != null ? o.label : o.value, 14); b.title = String(o.label != null ? o.label : o.value);
        b.onclick = function () { apSet(fx, o.value); };
        ops.appendChild(b);
      });
      row.appendChild(ops); B.appendChild(row);
    });
    try { B.appendChild(apRelSection(C, id, f)); } catch (e) { console.warn('[snap] relation', e); }
  }
  function toggleAttrPanel() {
    if (_ap && _ap.docked && CFG.layoutOn && !_ly.sus && !_ly.ed) {
      var R0 = lyRects(); if (R0.attr) { R0.attr.off = true; CFG.layoutRects = R0; cfgSave(); }
      lyApply();
    }
    if (_ap) { clearInterval(_ap.timer); window.removeEventListener('resize', _ap.onResize); _ap.host.remove(); _ap = null; CFG.attrPanelOpen = false; cfgSave(); lyCssRefreshSoon(); return; }
    var C = ctx(); if (!C) return toast('Tool chua san sang');
    var host = document.createElement('div'), root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    root.innerHTML = '<style>'
      + ':host{all:initial}*{box-sizing:border-box}'
      + '.wrap{position:absolute;inset:0;display:flex;flex-direction:column;background:#1b1b1d;border:1px solid #4a4a50;border-radius:8px;overflow:hidden;font:12px Segoe UI,Arial,sans-serif;color:#e6e6e8;box-shadow:0 8px 30px rgba(0,0,0,.6)}'
      + '.bar{display:flex;align-items:center;gap:6px;padding:4px 8px;background:#2a2a2e;border-bottom:1px solid #3d3d43;flex:0 0 auto;user-select:none}'
      + '.bar b{color:#fff;flex:0 0 auto}.who{flex:1 1 auto;min-width:0;color:#b8b8bd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      + 'button{background:#34343a;color:#e6e6e8;border:1px solid #4a4a50;border-radius:6px;padding:2px 8px;cursor:pointer;font:12px Segoe UI,Arial,sans-serif}button:hover{background:#45454c;color:#fff;border-color:#5a5a62}'
      + '.bar button{flex:0 0 auto;padding:1px 7px}.pin.on{background:#6a6a72;border-color:#7a7a82;color:#fff}'
      + '.cls{display:flex;align-items:center;gap:6px;padding:5px 8px;background:#222226;border-bottom:1px solid #3d3d43;flex:0 0 auto}.cid{flex:0 0 auto;color:#fff;font-weight:600;white-space:nowrap}'
      + '.csel{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:4px;text-align:left;padding:2px 6px}.csel:disabled{opacity:.55;cursor:wait}.cv{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '.clist{position:fixed;z-index:10;display:none;flex-direction:column;background:#2a2a2e;border:1px solid #6a6a72;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.6);overflow:hidden}.cq{flex:0 0 auto;margin:4px;background:#1b1b1d;color:#e6e6e8;border:1px solid #4a4a50;border-radius:5px;padding:3px 6px;font:12px Segoe UI,Arial,sans-serif}.cq:focus{outline:0;border-color:#8a8a92}.cl{flex:1 1 auto;min-height:0;overflow:auto}.ci{padding:4px 8px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#e6e6e8}.ci:hover,.ci.hi{background:#45454c}.ci.on{background:#6a6a72;color:#fff;font-weight:600}.cn{padding:6px 8px;color:#8a8a92}'
      + '.body{flex:1 1 auto;min-height:0;overflow:auto;padding:6px 8px;display:flex;flex-direction:column;gap:6px}'
      + '.fld{display:flex;flex-direction:column;gap:3px;padding-bottom:6px;border-bottom:1px solid #2e2e33}.fld:last-child{border-bottom:0}.fh{display:flex;align-items:center;gap:6px}.fl{flex:1 1 auto;min-width:0;color:#c8c8cc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fb{display:flex;gap:3px;flex:0 0 auto}.fb button{padding:0 7px;font-size:11px;line-height:16px;color:#a8a8ae;background:#2a2a2e}'
      + '.ops{display:flex;flex-wrap:wrap;gap:3px;min-width:0}.op{flex:1 1 auto;padding:3px 6px;background:#2a2a2e}'
      + '.op.on{background:#6a6a72;border-color:#8a8a92;color:#fff;font-weight:600}'
      + '.note{color:#b0b0b5;padding:8px 2px}.sum{padding-bottom:6px;border-bottom:1px solid #3d3d43;display:flex;flex-direction:column;gap:4px}.sl{color:#e6e6e8;line-height:1.3;word-break:break-word}.sl.no{color:#77777d}.rr{display:flex;align-items:center;gap:4px}.rn{flex:1 1 auto;min-width:0;color:#c8c8cc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ri{flex:0 0 76px;width:76px;min-width:0;background:#34343a;color:#e6e6e8;border:1px solid #4a4a50;border-radius:6px;padding:2px 4px;font:12px Segoe UI,Arial,sans-serif}.ri:focus{outline:0;border-color:#8a8a92}.rx{flex:0 0 auto;padding:0 6px}.rc{display:flex;flex-direction:column;gap:3px;padding:3px 0}.rc.off{opacity:.65}.rtop{display:flex;align-items:center;min-width:0}.rl{flex:0 0 auto;border:1px solid #6a6a72;border-radius:3px;padding:2px 6px;color:#e6e6e8;background:#26262a;font-weight:600}.rln{flex:0 0 8px;height:1px;background:#6a6a72}.rbr{flex:0 0 7px;align-self:stretch;margin:10px 0;border:1px solid #6a6a72;border-right:0}.rcol{flex:1 1 auto;min-width:0;display:flex;flex-direction:column}.re{display:flex;align-items:center;min-width:0;height:20px;gap:4px;padding-left:4px;color:#b8b8bd}.re.me{color:#fff;font-weight:600}.en{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.eno{flex:0 0 auto}.re .rx{padding:0 5px;line-height:16px;font-size:11px}.re .ri{height:18px;padding:0 3px;font-size:11px}.rt{white-space:pre;font-family:Consolas,Menlo,monospace}.rr.root .rt{color:#fff;font-weight:600}.rb{flex:0 0 auto;color:#8a8a92;font-size:11px}'
      + '.s3{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 0}.s3 .sl{flex:0 0 auto}.s3 .sl+.sl:before{content:"\\00a0-\\00a0";color:#77777d}'
      + '.sl.ok{color:#4caf80;font-weight:600}.sl.warn{color:#f5c842;font-weight:600}.sl.err{color:#e05555;font-weight:600}'
      + '.foot{display:flex;gap:6px;padding:6px 8px;border-top:1px solid #3d3d43;background:#222226;flex:0 0 auto}.foot button{flex:1 1 0;padding:4px 6px}'
      + '.grip{position:absolute;right:0;bottom:0;width:16px;height:16px;cursor:nwse-resize;background:linear-gradient(135deg,transparent 50%,#6a6a72 50%,#6a6a72 60%,transparent 60%,transparent 70%,#6a6a72 70%,#6a6a72 80%,transparent 80%)}'
      + '</style><div class="wrap"><div class="bar"><b>Thuộc tính</b><span class="who"></span><button class="pin"></button><button class="x" title="Đóng (' + String(CFG.keyAttrPanel).toUpperCase() + ')">✕</button></div>'
      + '<div class="cls"><span class="cid">ID —</span><button class="csel" type="button"><span class="cv"></span><span>▾</span></button></div>'
      + '<div class="body"></div><div class="grip" title="Kéo để đổi kích thước"></div>'
      + '<div class="clist"><input class="cq" placeholder="Tìm class…" spellcheck="false"><div class="cl"></div></div></div>';
    ['mousedown', 'wheel', 'contextmenu', 'keydown'].forEach(function (ev) { host.addEventListener(ev, function (e) { e.stopPropagation(); }); });
    document.body.appendChild(host);
    _ap = { host: host, root: root, cid: root.querySelector('.cid'), csel: root.querySelector('.csel'), cv: root.querySelector('.cv'), clist: root.querySelector('.clist'), cq: root.querySelector('.cq'), cl: root.querySelector('.cl'), cls: [], ccur: '', cmatch: [], chi: -1, body: root.querySelector('.body'), who: root.querySelector('.who'), bar: root.querySelector('.bar'), grip: root.querySelector('.grip'), pin: root.querySelector('.pin'), pos: apLoadPos() || apDefaultPos(), docked: false, sig: '' };
    root.querySelector('.bar').addEventListener('mousedown', function (e) { apDrag(e, 'move'); });
    _ap.grip.addEventListener('mousedown', function (e) { apDrag(e, 'size'); });
    _ap.pin.onclick = apTogglePin;
    _ap.csel.onclick = apClsOpen;
    _ap.cq.oninput = apClsFill;
    _ap.cq.onkeydown = function (e) {
      if (e.key === 'Escape') { e.preventDefault(); apClsClose(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); var n = _ap.cmatch.length; if (n) { _ap.chi = (_ap.chi + (e.key === 'ArrowDown' ? 1 : -1) + n) % n; apClsHi(); } return; }
      if (e.key === 'Enter') { e.preventDefault(); var c = _ap.cmatch[_ap.chi >= 0 ? _ap.chi : 0]; if (c != null) apClsPick(c); }
    };
    if (!window.__apClsDoc) { window.__apClsDoc = 1; document.addEventListener('mousedown', function (e) {
      if (!_ap || _ap.clist.style.display === 'none') return;
      var path = e.composedPath ? e.composedPath() : [e.target];
      if (path.indexOf(_ap.clist) >= 0 || path.indexOf(_ap.csel) >= 0) return;
      apClsClose();
    }, true); }
    root.querySelector('.x').onclick = toggleAttrPanel;
    _ap.onResize = function () { if (_ap) { apTrack(); apLayout(); } }; window.addEventListener('resize', _ap.onResize);
    CFG.attrPanelOpen = true; cfgSave();
    if (CFG.attrPanelPin && CFG.layoutOn && !_ly.sus && !_ly.ed && lyGrid()) {
      var R1 = lyRects();
      if (lyOff(R1.attr)) { var sh = R1.attr && R1.attr.w >= LY_MIN && R1.attr.h >= LY_MIN ? R1.attr : LY_SHOW.attr; R1.attr = { x: sh.x, y: sh.y, w: sh.w, h: sh.h, off: false }; CFG.layoutRects = R1; cfgSave(); lyApply(); }
    }
    apLayout(); try { apTrack(); } catch (e) {} apRender(true); fwEnsure();
    _ap.timer = setInterval(function () { if (!_ap || document.hidden || uiBusy()) return; try { apRender(false); } catch (e) { console.warn('[snap] attr panel', e); } }, 400); /* FIX#3: 400ms giảm CPU overhead */
  }
  window.__toggleAttrPanel = toggleAttrPanel;
  var _convertArm = { t: 0, key: '' }, _seenCats = {}, _ontoSet = {};

/* ============================================================
 * @MODULE[6]  ĐỔI CLASS
 * Phím: 6 (keyConvert, sedan ⇄ SUV / cọc ⇄ người cưỡi) · arrowup/arrowdown (keyClassPrev/Next, xe tải)
 * knownCategories, nrm, reTest, isRiderCat/isConeCat,
 * convertWith, doConvert, doClassCycle, convertClassTo,
 * commitClassCycle, fixCargoAfterConvert
 * ============================================================ */
  function knownCategories(C) {
    var set = {};
    Object.keys(C.S.instancesTree).forEach(function (i) { var c = treeCategory(C.S.instancesTree[i]); if (c) set[c] = 1; });
    var seen = new Set(), q = [[C.V, 0], [C.S, 0]], n = 0;
    while (q.length && n++ < 6000) {
      var it = q.shift(), o = it[0];
      if (!o || typeof o !== 'object' || seen.has(o) || o.nodeType || ArrayBuffer.isView(o) || o.isObject3D) continue;
      seen.add(o);
      var ol; try { ol = o.ontologyList || o.ontology; } catch (e) {}
      if (typeof ol === 'string' && ol.charAt(0) === '[') { try { ol = JSON.parse(ol); } catch (e) {} }
      if (Array.isArray(ol)) ol.forEach(function (x) { var nm = typeof x === 'string' ? x : x && (x.class_name || x.className || x.name || x.value || x.category); if (nm) { set[nm] = 1; _ontoSet[nm] = 1; } });
      if (it[1] >= 3) continue;
      var ks; try { ks = Object.keys(o); } catch (e) { continue; }
      for (var k = 0; k < ks.length && k < 150; k++) { var v; try { v = o[ks[k]]; } catch (e) { continue; } if (v && typeof v === 'object') q.push([v, it[1] + 1]); }
    }
    Object.keys(set).forEach(function (k) { _seenCats[k] = 1; });
    return Object.keys(_seenCats);
  }
  function nrm(x) { try { return String(x == null ? '' : x).normalize('NFC'); } catch (e) { return String(x); } }
  var _reC = {};
  function reTest(src, str) { var k = nrm(src), re = _reC[k] || (_reC[k] = new RegExp(k, 'i')); return re.test(nrm(str)); }
  function isRiderCat(c) { return !!c && (nrm(c) === nrm(CFG.coneConvertTo) || reTest(CFG.riderClassRe, c)); }
  function isConeCat(c) { return !!c && reTest(CFG.coneClassRe, c) && !isRiderCat(c); }
  function candidatesFor(C, kind) {
    var name = String(kind === 'rider' ? CFG.coneConvertTo : CFG.coneClassName || '').trim();
    return name ? [name] : [];
  }
  function convertWith(C, id, tree, src, cands, what, onDone) {
    var S = C.S, V = C.V, um = V.unitedMode || (V.props && V.props.unitedMode);
    var t1 = (um === 'UNITED_ADDING' || um === 'UNITED_MANUAL') ? 'cube' : 'combined', t2 = t1 === 'cube' ? 'combined' : 'cube';
    var fl = S.frameLength || V.frameLength || 0, frames = [];
    if (fl > 0) for (var f = 0; f < fl; f++) frames.push(f); else frames = trackFrames(S, id);
    var combos = []; cands.forEach(function (c) { [t1, t2].forEach(function (t) { combos.push([c, t]); }); });
    var before = {}; Object.keys(S.instancesTree).forEach(function (k) { before[k] = 1; });
    var num0 = tree.number, i = 0, tried = [], errs = [];
    console.log('[snap] doi class (' + what + '): id', id, 'src', src, 'ung vien', cands, 'so frame', frames.length);
    function changed() {
      var t = S.instancesTree[id], gone = !t || !t.cubes || !Object.keys(t.cubes).length, nid = null;
      Object.keys(S.instancesTree).forEach(function (k) { if (!before[k] && nid == null) nid = k; });
      var recat = !!t && !gone && nrm(treeCategory(t)) !== nrm(src);
      return (gone || nid != null || recat) ? { nid: nid != null ? nid : (recat ? id : null) } : null;
    }
    (function next() {
      if (i >= combos.length) {
        var cats = knownCategories(C);
        console.warn('[snap] doi class THAT BAI', { tried: tried, errors: errs, categories: cats });
        try { console.warn('[snap] moveExchangeShape =', String(V.moveExchangeShape).slice(0, 2500)); } catch (e) {}
        if (onDone) onDone(null, null);
        return toast('Không đổi được ' + what + '. Đã thử: ' + (tried.join(' | ') || '(không có tên class nào)') + (errs.length ? ' | lỗi: ' + errs[0] : '') + '. Class có trong bài: ' + cats.slice(0, 20).join(', ') + '. Mở Console (F12) xem chi tiết.', 14000);
      }
      var cb = combos[i++]; tried.push(cb[0] + ' [' + cb[1] + ']');
      try {
        if (V.setSelectedShape && !(V.state && String(V.state.selectedShape) === String(id))) V.setSelectedShape(id, cb[1]);
        V.moveExchangeShape('move', cb[1], { category: src, number: tree.number, id: tree.id != null ? tree.id : id }, { category: cb[0], number: -1, id: '' }, frames);
      } catch (e) { errs.push((e && e.message) || String(e)); console.warn('[snap] moveExchangeShape loi', cb, e); return next(); }
      var polls = 0;
      (function wait() {
        var ch = changed();
        if (!ch && polls++ < 10) return setTimeout(wait, 150);
        if (!ch) { console.warn('[snap] khong doi duoc voi', cb); return next(); }
        var nt = ch.nid != null && S.instancesTree[ch.nid];
        if (ch.nid != null) remapRelationsSoon(S, id, ch.nid);
        _emit(S);
        undoPushPlatform('đổi class ' + src + ' ' + num0);
        var extra = onDone ? onDone(ch.nid, cb[1]) : '';
        toast('Đã đổi ' + src + ' ' + num0 + ' → ' + (nt ? treeCategory(nt) || cb[0] : cb[0]) + (nt ? ' ' + (nt.number != null ? nt.number : ch.nid) + (String(ch.nid) !== String(id) ? ' (id mới)' : '') : '') + ', ' + (nt ? trackFrames(S, ch.nid).length : '?') + ' keyframe.' + (extra ? ' ' + extra : '') + ' Z để hoàn tác.', 5000);
      })();
    })();
  }
  function doConvert() {
    try {
      var C = ctx(); if (!C) return toast('Tool chua san sang');
      var S = C.S, V = C.V, id = selectedId(C); if (id == null) return toast('Chưa chọn box cần đổi class', 3000);
      var tree = S.instancesTree[id]; if (!tree) return toast('Không tìm thấy id ' + id, 3000);
      var src = treeCategory(tree), target = src === CFG.convertA ? CFG.convertB : src === CFG.convertB ? CFG.convertA : null;
      if (!target && (isRiderCat(src) || isConeCat(src))) {
        if (typeof V.moveExchangeShape !== 'function') return toast('Tool không có chức năng Move (moveExchangeShape)', 4000);
        var toRider = isConeCat(src), cands = candidatesFor(C, toRider ? 'rider' : 'cone');
        if (!cands.length) return toast('Không tìm thấy tên class ' + (toRider ? '"người cưỡi động vật"' : '"cọc tiêu"') + ' (sửa CFG.' + (toRider ? 'coneConvertTo' : 'coneClassName') + ' = class_name)', 6000);
        return convertWith(C, id, tree, src, cands, toRider ? 'cọc tiêu → người cưỡi động vật' : 'người cưỡi động vật → cọc tiêu');
      }
      if (!target) return toast('Id ' + id + ' là "' + src + '" – chỉ đổi qua lại "' + CFG.convertA + '" ⇄ "' + CFG.convertB + '" (sửa CFG.convertA / convertB)', 5000);
      if (typeof V.moveExchangeShape !== 'function') return toast('Tool không có chức năng Move (moveExchangeShape)', 4000);
      var cats = knownCategories(C);
      var armKey = id + '>' + target;
      if (cats.indexOf(target) < 0 && !(_convertArm.key === armKey && Date.now() - _convertArm.t < 3000)) {
        _convertArm = { t: Date.now(), key: armKey };
        return toast('Không thấy class "' + target + '" trong bài (có: ' + cats.slice(0, 12).join(', ') + '). Bấm lại trong 3 giây để vẫn đổi, hoặc sửa CFG.convertA / convertB.', 6000);
      }
      _convertArm = { t: 0, key: '' };
      var um = V.unitedMode || (V.props && V.props.unitedMode);
      var type = (um === 'UNITED_ADDING' || um === 'UNITED_MANUAL') ? 'cube' : 'combined';
      var fl = S.frameLength || V.frameLength || 0, frames = [];
      if (fl > 0) for (var f = 0; f < fl; f++) frames.push(f); else frames = trackFrames(S, id);
      var num0 = tree.number;
      recPlatform('đổi class ' + src + ' → ' + target);
      V.moveExchangeShape('move', type, { category: src, number: tree.number, id: tree.id != null ? tree.id : id }, { category: target, number: -1, id: '' }, frames);
      var nid = selectedId(C), nt = nid != null && S.instancesTree[nid];
      if (nid != null) remapRelationsSoon(S, id, nid);
      _emit(S);
      toast('Đã đổi ' + src + ' ' + num0 + ' → ' + target + (nt ? ' ' + nt.number + ' (id mới)' : '') + ', ' + (nt ? trackFrames(S, nid).length : '?') + ' keyframe. Z để hoàn tác.', 5000);
    } catch (e) { console.error('[snap] loi doi class', e); toast('LỖI đổi class: ' + (e && e.message || e), 6000); }
  }
  window.__doConvert = doConvert;
  var _clsBusy = false, _clsPend = null, _clsTip = null;
  function clsLabel(c) { return (CFG.classCycleLabels && CFG.classCycleLabels[c]) || c; }
  function clsTip(msg) {
    if (!_clsTip) {
      var d = document.createElement('div');
      d.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);background:#fff3f8;color:#5a2a40;padding:8px 16px;border-radius:10px;border:1px solid #f1bdd2;box-shadow:0 6px 20px rgba(120,60,90,.2);z-index:99999;font:13px/1.45 Segoe UI,Arial,sans-serif;max-width:80vw';
      document.body.appendChild(d); _clsTip = { el: d, t: 0 };
    }
    _clsTip.el.textContent = msg; clearTimeout(_clsTip.t);
    _clsTip.t = setTimeout(function () { if (_clsTip) { _clsTip.el.remove(); _clsTip = null; } }, 1500);
  }
  function toolBusy() { var V = window.view; return window.disableLidarHotkeys || (V && V.state && (V.state.currModalCubeId || V.state.currModalRectId)); }
  function cycleIndex(C) {
    try {
      var id = selectedId(C), tree = id != null && C.S.instancesTree[id], cat = tree && treeCategory(tree);
      if (!cat) return -1;
      var list = CFG.classCycle || [];
      for (var i = 0; i < list.length; i++) if (nrm(list[i]) === nrm(cat)) return i;
    } catch (e) {}
    return -1;
  }
  function canCycle() { var C = ctx(); return !!C && !toolBusy() && (!!_clsPend || _clsBusy || cycleIndex(C) >= 0); }
  function classExists(name) { for (var k in _ontoSet) return !!_ontoSet[name]; return true; }
  function cycleTarget(from, steps, skipped) {
    var list = CFG.classCycle || [], n = list.length, dir = steps < 0 ? -1 : 1, idx = from;
    for (var st = Math.abs(steps); st > 0; st--) {
      var nx = idx, ok = false;
      for (var t = 0; t < n && !ok; t++) {
        nx += dir;
        if (nx < 0 || nx >= n) { if (!CFG.classCycleWrap) break; nx = (nx + n) % n; }
        ok = !CFG.classCycleSkipMissing || classExists(list[nx]);
        if (!ok && skipped && skipped.indexOf(list[nx]) < 0) skipped.push(list[nx]);
      }
      if (!ok) break;
      idx = nx;
    }
    return idx;
  }
  function fixCargoAfterConvert(C, nid, target) {
    if (!CFG.classCycleFixCargo || nid == null || cargoAllowed(target)) return 0;
    var S = C.S, fx = chkFields(C).cargo, tr = S.instancesTree[nid]; if (!fx || !tr || !tr.cubes) return 0;
    var no = noValue(fx.f, true); if (no === null || no === undefined) return 0;
    var n = 0, nm = fx.f.name, r = recBegin('chở hàng → không');
    try {
      trackFrames(S, nid).forEach(function (f) {
        var cube = tr.cubes[f], box = parseLabels(cube.labels), inst = instAttrAt(S, nid, f);
        var pri = fx.src === 'id' ? inst : box, sec = fx.src === 'id' ? box : inst, inPri = nm in pri;
        var o = inPri ? pri : sec, isBox = inPri ? fx.src !== 'id' : fx.src === 'id';
        if (!(nm in o) || !chkYes(chkText(fx, o))) return;
        o[nm] = no;
        if (isBox) { S.updateCubeLabel(nid, f, (typeof cube.labels === 'string' || cube.labels == null) ? JSON.stringify(o) : o); n++; }
        else if (S.updateInstanceLabel) { S.updateInstanceLabel(nid, f, o); n++; }
      });
    } finally { recEnd(r); }
    if (n) { _emit(S); }
    return n;
  }
  function doClassCycle(dir) {
    try {
      var C = ctx(); if (!C || _clsBusy) return;
      var id = selectedId(C), i = cycleIndex(C); if (id == null || i < 0) { if (!_clsPend) return; }
      if (!_clsPend || _clsPend.id !== String(id)) {
        if (i < 0) return;
        _clsPend = { id: String(id), from: i, steps: 0, timer: 0 };
      }
      _clsPend.steps += dir;
      var list = CFG.classCycle || [], sk = [], j = cycleTarget(_clsPend.from, _clsPend.steps, sk);
      clsTip(clsLabel(list[_clsPend.from]) + (j === _clsPend.from ? ' (giữ nguyên)' : ' → ' + clsLabel(list[j]))
        + (sk.length ? ' (bỏ qua ' + sk.map(clsLabel).join(', ') + ': không có trong bài)' : ''));
      clearTimeout(_clsPend.timer);
      _clsPend.timer = setTimeout(commitClassCycle, CFG.classCycleDelay);
    } catch (e) { _clsPend = null; console.error('[snap] loi doi class xe tai', e); toast('LỖI đổi class: ' + (e && e.message || e), 6000); }
  }
  function convertClassTo(C, id, tree, src, target, after) {
    var V = C.V;
    _clsBusy = true;
    setTimeout(function () { _clsBusy = false; }, 8000);
    convertWith(C, id, tree, src, [target], clsLabel(src) + ' → ' + clsLabel(target), function (nid, type) {
      _clsBusy = false;
      var extra = '';
      try {
        if (type != null && nid != null) {
          try {
            if (String(selectedId(C)) !== String(nid) && V.setSelectedShape) V.setSelectedShape(nid, type);
          } catch (e) { console.warn('[snap] chon id moi', e); }
          try {
            var nc = fixCargoAfterConvert(C, nid, target);
            if (nc) extra = 'Đã đặt "chở hàng" = không (' + nc + ' keyframe).';
          } catch (e) { console.warn('[snap] dat cho hang', e); }
        }
      } finally { if (after) { try { after(nid, type); } catch (e) {} } }
      return extra;
    });
  }
  function commitClassCycle() {
    var P = _clsPend; _clsPend = null; if (!P) return;
    try {
      var C = ctx(); if (!C) return;
      var S = C.S, V = C.V, id = selectedId(C), tree = id != null && S.instancesTree[id], list = CFG.classCycle || [];
      if (!tree || String(id) !== P.id) return toast('Đã đổi lựa chọn – hủy đổi class', 2000);
      if (typeof V.moveExchangeShape !== 'function') return toast('Tool không có chức năng Move (moveExchangeShape)', 4000);
      var i = cycleIndex(C); if (i < 0) return;
      if (!Object.keys(_ontoSet).length) { try { knownCategories(C); } catch (e) {} }
      var j = cycleTarget(i, P.steps); if (j === i) return;
      var src = treeCategory(tree), target = list[j];
      convertClassTo(C, id, tree, src, target);
    } catch (e) { _clsBusy = false; console.error('[snap] loi doi class xe tai', e); toast('LỖI đổi class: ' + (e && e.message || e), 6000); }
  }
  window.__doClassCycle = doClassCycle;
  var _ctrlSnap = null;

/* ============================================================
 * @MODULE[ctrl+drag]  CTRL + KÉO KHÍT
 * Phím: giữ ctrl rồi kéo mặt box (CFG.ctrlDragSnap)
 * snapshotFrame, movedFace, lockHeight, snapFace,
 * snapMove, detectView, onCtrlDown/onCtrlUp
 * ============================================================ */
  function snapshotFrame(C) {
    var S = C.S, f = curFrame(C), out = {};
    Object.keys(S.instancesTree).forEach(function (id) {
      var e = effCube(S, id, f); if (!e) return;
      var c = e.cube; out[id] = JSON.parse(JSON.stringify({ position: c.position, rotation: c.rotation, dimension: c.dimension }));
    });
    return { f: f, cubes: out };
  }
  function changedCube(C, snap) {
    var S = C.S, best = null;
    Object.keys(snap.cubes).forEach(function (id) {
      var t = S.instancesTree[id], c = t && t.cubes && t.cubes[snap.f]; if (!c) return;
      var o = snap.cubes[id], d = 0;
      ['x', 'y', 'z'].forEach(function (k) { d += Math.abs(c.position[k] - o.position[k]) + Math.abs(c.dimension[k] - o.dimension[k]); });
      if (d > 1e-4 && (!best || d > best.d)) best = { id: id, d: d, before: o, now: c };
    });
    return best;
  }
  function movedFace(before, now) {
    var R = eulerMat(before.rotation), R2 = eulerMat(now.rotation), rotDiff = 0;
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) rotDiff = Math.max(rotDiff, Math.abs(R[i][j] - R2[i][j]));
    if (rotDiff > 0.01) return { why: 'box bị xoay' };
    var dc = mulTV(R, [now.position.x - before.position.x, now.position.y - before.position.y, now.position.z - before.position.z]);
    var ax = ['x', 'y', 'z'], best = null;
    for (var a = 0; a < 3; a++) {
      var d0 = before.dimension[ax[a]], d1 = now.dimension[ax[a]];
      var dMin = (dc[a] - d1 / 2) - (-d0 / 2), dMax = (dc[a] + d1 / 2) - (d0 / 2);
      [[dMin, -1], [dMax, 1]].forEach(function (v) { if (!best || Math.abs(v[0]) > Math.abs(best.delta)) best = { axis: a, side: v[1], delta: v[0], other: v[1] < 0 ? dMax : dMin }; });
    }
    if (!best || Math.abs(best.delta) < 0.005) return { why: 'không có mặt nào bị kéo' };
    if (Math.abs(best.other - best.delta) < 0.005) return { move: true, drag: [dc[0], dc[2]] };
    return best;
  }
  function lockHeight(C, id, f, before) {
    var S = C.S, cube = S.instancesTree[id].cubes[f]; if (!cube) return 0;
    var R = eulerMat(before.rotation), c = cube.position;
    var dc = mulTV(R, [c.x - before.position.x, c.y - before.position.y, c.z - before.position.z]);
    if (Math.abs(dc[1]) < 0.002) return 0;
    var w = mulV(R, [0, dc[1], 0]);
    S.updateCubeMatrix(id, f, { position: { x: c.x - w[0], y: c.y - w[1], z: c.z - w[2] }, rotation: cube.rotation, dimension: cube.dimension });
    if(CFG.markHuman&&S.changeCubeInterpolation)S.changeCubeInterpolation(id,f,false,'human');
    return dc[1];
  }
  function snapFace(C, id, f, face) {
    var S = C.S, cube = S.instancesTree[id].cubes[f];
    var fp = framePoints(C, f); if (!fp) return { why: 'không có điểm lidar của frame này' };
    var R = eulerMat(cube.rotation), c = cube.position, d = [cube.dimension.x, cube.dimension.y, cube.dimension.z];
    var a = face.axis, s = face.side, W = CFG.snapWin, h = [d[0] / 2, d[1] / 2, d[2] / 2];
    var faceAt = s * h[a], opp = -s * h[a], vals = [];
    var P = fp.pts, F = fp.flags, bottomCut = -h[1] + CFG.snapGround;
    for (var i = 0, n = P.length / 3; i < n; i++) {
      if (F && F[i] && !(a === 1 && s < 0)) continue;
      var v = [P[3 * i] - c.x, P[3 * i + 1] - c.y, P[3 * i + 2] - c.z], l = mulTV(R, v), ok = true;
      for (var b = 0; b < 3 && ok; b++) if (b !== a && (l[b] < -h[b] || l[b] > h[b])) ok = false;
      if (!ok) continue;
      if (a !== 1 && !F && l[1] < bottomCut) continue;
      var t = l[a];
      if (s > 0 ? (t < opp || t > faceAt + W) : (t > opp || t < faceAt - W)) continue;
      vals.push(t);
    }
    if (vals.length < 3) return { why: 'không có điểm lidar gần mặt vừa kéo (±' + W + ' m)' };
    vals.sort(function (x, y) { return x - y; });
    var k = Math.min(CFG.snapDrop, Math.floor((vals.length - 1) / 2));
    var target = s > 0 ? vals[vals.length - 1 - k] : vals[k];
    if (Math.abs(target - opp) < 0.1) return { why: 'mặt quá sát mặt đối diện' };
    var newDim = Math.abs(target - opp), shift = (target - faceAt) / 2;
    var dv = [0, 0, 0]; dv[a] = shift;
    var w = mulV(R, dv), dim = { x: d[0], y: d[1], z: d[2] }; dim[['x', 'y', 'z'][a]] = newDim;
    S.updateCubeMatrix(id, f, { position: { x: c.x + w[0], y: c.y + w[1], z: c.z + w[2] }, rotation: cube.rotation, dimension: dim });
    if(CFG.markHuman&&S.changeCubeInterpolation)S.changeCubeInterpolation(id,f,false,'human');
    _calc(S,id,f);
    return { moved: target - faceAt, n: vals.length };
  }
  function snapMove(C, id, f, axes, drag) {
    axes = axes || [1, 0]; drag = drag || [0, 0];
    var S = C.S, cube = S.instancesTree[id].cubes[f];
    var fp = framePoints(C, f); if (!fp) return { why: 'không có điểm lidar của frame này' };
    var R = eulerMat(cube.rotation), c = cube.position, h = [cube.dimension.x / 2, cube.dimension.y / 2, cube.dimension.z / 2];
    var Wa = [Math.max(CFG.snapWin, Math.abs(drag[0]) + 0.3), Math.max(CFG.snapWin, Math.abs(drag[1]) + 0.3)];
    var W = Math.max(Wa[0], Wa[1]), P = fp.pts, F = fp.flags, bottomCut = -h[1] + CFG.snapGround, pts = [];
    for (var i = 0, n = P.length / 3; i < n; i++) {
      if (F && F[i]) continue;
      var l = mulTV(R, [P[3 * i] - c.x, P[3 * i + 1] - c.y, P[3 * i + 2] - c.z]);
      if (l[1] < (F ? -h[1] : bottomCut) || l[1] > h[1]) continue;
      if (Math.abs(l[0]) <= h[0] + W && Math.abs(l[2]) <= h[2] + W) pts.push([l[0], l[2]]);
    }
    if (pts.length < 5) return { why: 'không có điểm lidar trong ±' + W + ' m quanh box' };
    var off = [0, 0], hh = [h[0], h[2]], nm = [['trái', 'phải'], ['đuôi', 'đầu']], used = [null, null];
    function outside(a, sft) {
      var b = 1 - a, cnt = 0;
      for (var j = 0; j < pts.length; j++) {
        var q = pts[j]; if (Math.abs(q[b] - off[b]) > hh[b] + 0.05) continue;
        if (q[a] < sft - hh[a] - 0.002 || q[a] > sft + hh[a] + 0.002) cnt++;
      }
      return cnt;
    }
    for (var pass = 0; pass < 2; pass++) axes.forEach(function (a) {
      var b = 1 - a, v = [];
      pts.forEach(function (q) { if (Math.abs(q[b] - off[b]) <= hh[b] + 0.05) v.push(q[a]); });
      if (v.length < 3) return;
      if (Math.abs(drag[a]) >= 0.02) {
        var sg = drag[a] > 0 ? 1 : -1, face = sg * hh[a], tg = null;
        var beyond = v.filter(function (x) { var dd = sg * (x - face); return dd > 0.002 && dd <= Wa[a]; });
        if (beyond.length >= 3) tg = sg > 0 ? Math.max.apply(null, beyond) : Math.min.apply(null, beyond);
        else {
          var inner = v.filter(function (x) { return sg * (face - x) >= -0.002; }).sort(function (x, y) { return sg * (y - x); });
          for (var ii = 0; ii < inner.length && tg === null; ii++) {
            var x0 = inner[ii], cnt = 0;
            for (var jj = ii; jj < inner.length && sg * (x0 - inner[jj]) <= 0.15; jj++) cnt++;
            if (cnt >= 4) tg = x0;
          }
          if (tg === null && inner.length) tg = inner[0];
        }
        if (tg !== null && Math.abs(tg - face) <= Wa[a]) { off[a] = tg - face; used[a] = sg > 0 ? 1 : 0; }
        return;
      }
      var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v);
      var cands = [{ s: off[a], side: used[a] }, { s: hi - hh[a], side: 1 }, { s: lo + hh[a], side: 0 }]
        .filter(function (o) { return Math.abs(o.s) <= W; });
      var best = null;
      cands.forEach(function (o) {
        o.out = outside(a, o.s);
        if (!best || o.out < best.out || (o.out === best.out && Math.abs(o.s) < Math.abs(best.s))) best = o;
      });
      if (best) { off[a] = best.s; if (best.side != null) used[a] = best.side; }
    });
    if (Math.abs(off[0]) < 0.005 && Math.abs(off[1]) < 0.005) return { why: 'box đã ôm đủ điểm, không cần dịch' };
    var info = [];
    if (Math.abs(off[1]) >= 0.005) info.push(nm[1][used[1] ? 1 : 0] + ' ' + (off[1] >= 0 ? '+' : '') + (off[1] * 100).toFixed(0) + 'cm');
    if (Math.abs(off[0]) >= 0.005) info.push(nm[0][used[0] ? 1 : 0] + ' ' + (off[0] >= 0 ? '+' : '') + (off[0] * 100).toFixed(0) + 'cm');
    var w = mulV(R, [off[0], 0, off[1]]);
    S.updateCubeMatrix(id, f, { position: { x: c.x + w[0], y: c.y + w[1], z: c.z + w[2] }, rotation: cube.rotation, dimension: cube.dimension });
    if(CFG.markHuman&&S.changeCubeInterpolation)S.changeCubeInterpolation(id,f,false,'human');
    _calc(S,id,f);
    var left = axes.reduce(function (sum, a) { return sum + outside(a, off[a]); }, 0);
    return { info: info.join(', ') + (left ? ' | còn ' + left + ' điểm ngoài box (box nhỏ hơn vật?)' : ' | ôm đủ điểm') };
  }
  window.__snapMove = snapMove;
  var FACE_NAME = [['trái', 'phải'], ['đáy', 'nóc'], ['đuôi', 'đầu']];
  function detectView(x, y) {
    var labs = [], all = document.querySelectorAll('div,span,button,label');
    for (var i = 0; i < all.length; i++) {
      var el = all[i]; if (el.children.length) continue;
      var tx = (el.textContent || '').trim().toUpperCase();
      if (tx !== 'SIDE' && tx !== 'FRONT' && tx !== 'TOP') continue;
      var r = el.getBoundingClientRect(); if (!r.width) continue;
      labs.push({ name: tx, el: el, r: r });
    }
    var hit = null;
    labs.forEach(function (L) {
      var p = L.el.parentElement;
      for (var k = 0; p && k < 6; k++, p = p.parentElement) {
        var others = labs.filter(function (o) { return o !== L && p.contains(o.el); }).length;
        if (others) break;
        var rr = p.getBoundingClientRect();
        if (rr.width > L.r.width * 2 && x >= rr.left && x <= rr.right && y >= rr.top && y <= rr.bottom) {
          if (!hit || rr.width * rr.height < hit.area) hit = { name: L.name, area: rr.width * rr.height };
          break;
        }
      }
    });
    if (hit) return hit.name;
    var best = null;
    labs.forEach(function (L) {
      if (L.r.left - 5 > x || L.r.top - 5 > y) return;
      var d = Math.hypot(x - L.r.left, y - L.r.top);
      if (d < 600 && (!best || d < best.d)) best = { name: L.name, d: d };
    });
    return best ? best.name : '';
  }
  window.__detectView = detectView;
  var _rightInfo = null;
  function onCtrlDown(e) {
    if (e.button === 2) {
      var t0 = e.composedPath ? e.composedPath()[0] : e.target, ok = !!t0 && !!t0.tagName;
      if (ok && t0.tagName !== 'CANVAS') {
        var root0 = t0.getRootNode ? t0.getRootNode() : document;
        /* FIX#2: shadow DOM của bảng thuộc tính (_ap) được phép – người dùng chuột phải vào relation panel
           cũng cần nhảy tới frame tốt nhất. Chỉ block shadow DOM của các panel khác (cam, menu…) */
        var inAttrPanel = _ap && _ap.host && (_ap.host === e.target || _ap.host.contains(e.target) ||
                          (_ap.root && (root0 === _ap.root || _ap.root.contains(t0))));
        if (root0 !== document && !inAttrPanel) ok = false;
        else if (!inAttrPanel && t0.closest && t0.closest('.b-Sidebar,.b-ShapeLabel,input,textarea,select,button,[contenteditable]')) ok = false;
      }
      var Cd = ok ? ctx() : null;
      _rightInfo = ok ? { x: e.clientX, y: e.clientY, t: Date.now(), id: Cd ? selectedId(Cd) : null } : null;
      return;
    }
    if (e.button !== 0 || e.altKey) return;
    if (!CFG.ctrlDragSnap || !e.ctrlKey) { _ctrlSnap = null; return; }
    var t = e.composedPath ? e.composedPath()[0] : e.target;
    if (!t || t.tagName !== 'CANVAS') { _ctrlSnap = null; return; }
    var C = ctx(); if (!C) return;
    try { _ctrlSnap = snapshotFrame(C); _ctrlSnap.ctrl = true; _ctrlSnap.view = detectView(e.clientX, e.clientY); } catch (err) { _ctrlSnap = null; }
  }
  function onCtrlUp(e) {
    if (e.button === 2) {
      var ri = _rightInfo; _rightInfo = null;
      if (ri && CFG.nextBestFrame && !e.altKey && Date.now() - ri.t < 800 && Math.hypot(e.clientX - ri.x, e.clientY - ri.y) < 15) {
        var tries = 0;
        setTimeout(function poll() {
          var C = ctx(); if (!C) return;
          var id = selIdAny(C);
          if (id != null) return gotoBestFrame(C, id, selectedId(C) == null);
          if (++tries < 5) return setTimeout(poll, 50);
          if (ri.id != null && C.S.instancesTree[ri.id]) gotoBestFrame(C, ri.id, true);
        }, 90);
      }
      return;
    }
    if (!_ctrlSnap || e.button !== 0) return;
    var snap = _ctrlSnap; _ctrlSnap = null;
    if (!snap.ctrl && !e.ctrlKey) return;
    setTimeout(recWrap('Ctrl+kéo khít điểm lidar', function () {
      try {
        var C = ctx(); if (!C || curFrame(C) !== snap.f) return;
        var ch = changedCube(C, snap); if (!ch) return;
        var face = movedFace(ch.before, ch.now), r;
        if (face.why) return;
        if (face.move) {
          var axes = snap.view === 'SIDE' ? [1] : snap.view === 'FRONT' ? [0] : [1, 0];
          var vn = snap.view === 'SIDE' ? 'SIDE – đầu/đuôi' : snap.view === 'FRONT' ? 'FRONT – trái/phải' : (snap.view || 'view chính') + ' – cả 2 chiều';
          var lock = CFG.ctrlLockHeight ? lockHeight(C, ch.id, snap.f, ch.before) : 0;
          r = snapMove(C, ch.id, snap.f, axes, face.drag);
          if (lock && r.why && /đủ điểm|không cần dịch/.test(r.why)) r = { info: 'giữ nguyên độ cao (bỏ ' + (lock > 0 ? '+' : '') + (lock * 100).toFixed(0) + 'cm lên/xuống)' };
          else if (lock && !r.why) r.info += ' | giữ độ cao';
          try { C.S.emitViewRefresh && C.S.emitViewRefresh(); } catch (e2) {}
          return;
        }
        r = snapFace(C, ch.id, snap.f, face);
        try { C.S.emitViewRefresh && C.S.emitViewRefresh(); } catch (e2) {}
        var nm = FACE_NAME[face.axis][face.side > 0 ? 1 : 0];
        console.log('[snap] Ctrl+keo mat ' + nm, r);
      } catch (err) { console.error('[snap] ctrl-drag', err); toast('LỖI Ctrl+kéo: ' + (err && err.message || err), 5000); }
    }), CFG.snapDelay);
  }
  window.__snapFace = snapFace; window.__movedFace = movedFace;
  var _chk = null;

/* ============================================================
 * @MODULE[alt+q]  BẢNG KIỂM TRA NHÃN
 * Phím: alt+q (keyCheck). Mỗi rule là một chkRun*: dir (hướng), size, far, road (thuộc tính đường), headout (đầu xe lòi)…
 * chkFields, chkScan, chkRender, toggleCheck,
 * chkRunDir, chkRunSize, chkRunFar, chkRunRoad,
 * roadFind, roadWalk, camYawProbe
 * ============================================================ */
  function chkFields(C) {
    var V = C.V, all = [];
    cfgFields(V.labelConfig).forEach(function (f) { all.push({ f: f, src: 'box' }); });
    cfgFields(V.instanceLabelConfig).forEach(function (f) { all.push({ f: f, src: 'id' }); });
    if (!all.length) getAllFields(C).forEach(function (f) { all.push({ f: f, src: 'box' }); });
    function find(re) { re = new RegExp(re, 'i'); return all.filter(function (x) { return !isConeField(x.f) && re.test(fieldText(x.f)); })[0] || null; }
    return { valid: find(CFG.chkValidRe), occ: find(CFG.chkOccRe), cipo: find(CFG.chkCipoRe), motion: find(CFG.chkMotionRe),
      city: find(CFG.chkCityRe), key: find(CFG.chkKeyRe), cargo: find(CFG.chkCargoRe), road: find(CFG.chkRoadRe), all: all };
  }
  function chkText(fx, obj) {
    if (!fx || !(fx.f.name in obj)) return null;
    var v = obj[fx.f.name]; if (v === undefined) return null;
    var vals = Array.isArray(v) ? v : [v];
    return vals.map(function (x) {
      var o = (fx.f.options || []).filter(function (op) { return String(op.value) === String(x); })[0];
      return String(x) + ' ' + (o ? String(o.label || '') : '');
    }).join(' | ');
  }
  var CHK_INVALID = /无效|不合法|invalid|không hợp lệ|khong hop le|^\s*(false|0|否|no)(\s|$)/i;
  var CHK_OCC70 = /(>|＞|≥|大于|超过|over|above)\s*70|70\s*%?\s*(以上|\+|及以上)|70\s*%?\s*[-~～]\s*100|>\s*0?\.7/i;
  var CHK_MOVING = /moving|运动|动态|dynamic|di chuyển|di chuyen/i;
  var _camFwd = null;
  function camYawProbe(S, tid, k, n, W) {
    var t = S.instancesTree[tid], orig = t.cubes[k], type = (S.projectTypes && S.projectTypes[n]) || undefined, sx = 0, sz = 0, cnt = 0;
    function probe(psi, dist) {
      t.cubes[k] = Object.assign({}, orig, { position: { x: Math.sin(psi) * dist, y: orig.position.y + 1, z: Math.cos(psi) * dist },
        dimension: { x: 1.5, y: 3, z: 1.5 }, rotation: { x: 0, y: 0, z: 0 }, frameNum: k });
      var c = null; try { c = S.getProjectCast(tid, k, k, n, type); } catch (e) {}
      if (!c) return null;
      try { c.computeBoundingBox && c.computeBoundingBox(); } catch (e) {}
      return (isFinite(c.x) && isFinite(c.w) && c.w > 0) ? c : null;
    }
    try {
      for (var d = -180; d < 180; d += 3) {
        var psi = d * Math.PI / 180, c1 = probe(psi, 20), c2 = c1 && probe(psi, 40);
        if (!c1 || !c2 || !(c1.w > c2.w * 1.2)) continue;
        var cx = c1.x + c1.w / 2; if (cx < 0 || cx > W) continue;
        sx += Math.sin(psi); sz += Math.cos(psi); cnt++;
      }
    } finally { t.cubes[k] = orig; }
    return cnt ? Math.atan2(sx, sz) : null;
  }
  function camProbeYaw(C, n) {
    var S = C.S, f = curFrame(C), tid = null, k0 = null;
    if (!S.getProjectCast) return Promise.resolve({ err: 'tool không có getProjectCast' });
    Object.keys(S.instancesTree).forEach(function (id) { var fr = trackFrames(S, id); if (fr.length && (k0 == null || fr[0] < k0)) { tid = id; k0 = fr[0]; } });
    if (tid == null) return Promise.resolve({ err: 'chưa có box nào để dò camera' });
    var src = imageSource(C, f);
    if (!src.list.length) return Promise.resolve({ err: 'frame hiện tại chưa có ảnh camera' });
    return camBitmap(src, f, n).then(function (r) {
      var img = r && r.img; if (!img) return { err: 'không tải được ảnh camera ' + (n + 1) };
      var yaw = camYawProbe(S, tid, k0, n, img.width);
      if (yaw == null) return { err: 'không dò được hướng camera ' + (n + 1) + ' (không có hướng nào chiếu vào ảnh)' };
      return { yaw: yaw, W: img.width };
    }).catch(function (e) { return { err: (e && e.message) || String(e) }; });
  }
  function ensureCamFwd(C) {
    /* dò lỗi (chưa có box / chưa có ảnh…) thì tự thử lại sau 3s thay vì kẹt mãi (trước đây phải bấm "Làm mới") */
    if (_camFwd && !_camFwd.busy && !_camFwd.fixed && _camFwd.yaw == null && Date.now() - (_camFwd.t || 0) > 3000) _camFwd = null;
    if (_camFwd) return _camFwd;
    if (typeof CFG.chkDirCamYaw === 'number') return (_camFwd = { yaw: CFG.chkDirCamYaw * Math.PI / 180, fixed: true });
    var st = _camFwd = { busy: true, byF: {}, t: Date.now() };
    camProbeYaw(C, CFG.chkDirCam).then(function (r) {
      if (_camFwd !== st) return;
      st.busy = false; st.yaw = r.yaw != null ? r.yaw : null; st.err = r.err; st.W = r.W; st.t = Date.now();
      if (_chk) { try { chkRender(true); } catch (e) { console.error('[snap] kiem tra', e); } }
    });
    return st;
  }
  window.__camFwd = function () { var C = ctx(); if (!C) return null; _camFwd = null; var r = ensureCamFwd(C); return r.busy ? 'đang dò… gọi lại sau 1-2s' : r; };
  var CHK_NO = /^\s*(false|0|否|无|no|none)(\s|$)|否|无|không|khong|没有/i, CHK_YES = /^\s*(true|1|是|有|yes)(\s|$)|有|是|có|\byes\b/i;
  function chkYes(t) { return t != null && !CHK_NO.test(t) && CHK_YES.test(t); }
  var _kfc = {}, _lblC = new Map(), _iakC = {};
  function chkCacheReset() { _kfc = {}; _lblC = new Map(); _iakC = {}; }
  function chkKf(S, id) { return _kfc[id] || (_kfc[id] = trackFrames(S, id)); }
  function parseLabelsC(raw) {
    if (typeof raw !== 'string') return parseLabels(raw);
    var h = _lblC.get(raw); if (!h) { h = parseLabels(raw); _lblC.set(raw, h); } return h;
  }
  function instAttrAtC(S, id, f) {
    var A = S.instanceAttributes && S.instanceAttributes[id]; if (!A) return {};
    if (A[f]) return parseLabelsC(A[f]);
    var ks = _iakC[id] || (_iakC[id] = Object.keys(A).map(Number).sort(function (a, b) { return a - b; })), pick = null;
    for (var i = 0; i < ks.length; i++) { if (ks[i] <= f) pick = ks[i]; else break; }
    if (pick == null && ks.length) pick = ks[0];
    return pick == null ? {} : parseLabelsC(A[pick]);
  }
  function chkObjAt(S, id, f, fx) {
    var tr = S.instancesTree[id], fr = chkKf(S, id); if (!tr || !fr.length || f < fr[0] || f > fr[fr.length - 1]) return null;
    var k = fr[0]; for (var i = 0; i < fr.length; i++) if (fr[i] <= f) k = fr[i];
    var box = parseLabelsC(tr.cubes[k].labels), inst = instAttrAtC(S, id, f);
    var o1 = fx.src === 'id' ? inst : box, o2 = fx.src === 'id' ? box : inst;
    return fx.f.name in o1 ? o1 : (fx.f.name in o2 ? o2 : null);
  }
  var _cipoRe = {};
  function chkCipoIs(fx, obj, n) {
    var v = obj[fx.f.name], vals = Array.isArray(v) ? v : [v], re = _cipoRe[n] || (_cipoRe[n] = new RegExp('^cipo\\D{0,2}' + n + '(?!\\d)', 'i'));
    return vals.some(function (x) {
      var sx = String(x).trim(), o = (fx.f.options || []).filter(function (op) { return String(op.value) === sx; })[0];
      return sx === String(n) || re.test(sx) || !!(o && re.test(String(o.label || '').trim()));
    });
  }
  function chkLinkPairs(S) {
    var R = S.relations || [], map = {};
    for (var f = 0; f < R.length; f++) (R[f] || []).forEach(function (r) {
      if (!r || (r.type && String(r.type).toLowerCase() !== 'cube')) return;
      var a = String(r.from), b = String(r.to); if (a === b || !S.instancesTree[a] || !S.instancesTree[b]) return;
      var key = a < b ? a + '|' + b : b + '|' + a, p = map[key] || (map[key] = { a: a < b ? a : b, b: a < b ? b : a, frames: [] });
      if (p.frames[p.frames.length - 1] !== f) p.frames.push(f);
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }
  function chkRunDir(C, S, r6) {
    r6.items = {};
      var cf = r6.cam = ensureCamFwd(C);
      if (cf.yaw != null) {
        var reD = new RegExp(CFG.chkDirClassRe, 'i'), opp = CFG.chkDirOpposite ? ' (cần ngược chiều)' : ' (cần cùng chiều)';
        Object.keys(S.instancesTree).forEach(function (id) {
          var tr = S.instancesTree[id], cat = treeCategory(tr) || '';
          if (!reD.test(cat)) return;
          var fr = chkKf(S, id); if (!fr.length) return;
          var f0 = fr[0], yaw = cf.yaw;
          if (!cf.fixed && cf.W) {
            if (!(f0 in cf.byF)) cf.byF[f0] = camYawProbe(S, id, f0, CFG.chkDirCam, cf.W);
            if (cf.byF[f0] != null) yaw = cf.byF[f0];
          }
          var bad = [], worst = 0;
          fr.forEach(function (f) {
            var d = Math.abs(wrap(heading(tr.cubes[f].rotation) - yaw, 0)) * 180 / Math.PI; if (CFG.chkDirOpposite) d = 180 - d;
            if (d > CFG.chkDirMaxDeg) { bad.push(f); if (d > worst) worst = d; }
          });
          if (bad.length) r6.items[id] = { id: id, cat: cat, number: tr.number, frames: bad, sample: { dirTxt: 'lệch ' + worst.toFixed(0) + '° (' + bad.length + '/' + fr.length + ' keyframe)' } };
        });
      }
  }
  var _cargoRx = null;
  function cargoAllowed(cat) {
    if (!_cargoRx) _cargoRx = { allow: new RegExp(CFG.chkCargoClassRe, 'i'), deny: new RegExp(CFG.chkCargoDenyRe, 'i') };
    return !_cargoRx.deny.test(cat) && _cargoRx.allow.test(cat);
  }
  function chkRunSize(S, R8) {
    var linkOf = {}, linkedAt = [], nF = S.dataLength != null ? S.dataLength : (S.cubes ? S.cubes.length : 0);
    (S.relations || []).forEach(function (rs, f) { (rs || []).forEach(function (r) {
      if (!r || (r.type && String(r.type).toLowerCase() !== 'cube') || !S.instancesTree[r.from] || !S.instancesTree[r.to]) return;
      var m = linkedAt[f] || (linkedAt[f] = {}); m[String(r.from)] = m[String(r.to)] = 1;
    }); });
    chkLinkPairs(S).forEach(function (p) { (linkOf[p.a] = linkOf[p.a] || []).push(p.b); (linkOf[p.b] = linkOf[p.b] || []).push(p.a); });
    Object.keys(S.instancesTree).forEach(function (id) {
      var tr = S.instancesTree[id], z = CFG.chkSize[treeCategory(tr) || '']; if (!z || !tr.cubes) return;
      var conds = [], frames = [], kf = chkKf(S, id);
      var add = function (f, txt) { if (conds.indexOf(txt) < 0) conds.push(txt); if (frames.indexOf(f) < 0) frames.push(f); };
      var partners = (linkOf[id] || []).map(function (q) { return treeCategory(S.instancesTree[q]) || ''; });
      if (z.head) {
        var miss = [];
        for (var f0 = 0; f0 < nF; f0++) if (!(linkedAt[f0] && linkedAt[f0][id]) && ((S.cubes && S.cubes[f0]) || []).some(function (x) { return String(x) === String(id); })) miss.push(f0);
        if (miss.length) { conds.push('chưa liên kết fr ' + chkRanges(miss)); miss.forEach(function (f) { if (frames.indexOf(f) < 0) frames.push(f); }); }
      }
      kf.forEach(function (f) {
        var d0 = tr.cubes[f] && tr.cubes[f].dimension; if (!d0) return;
        var d = { x: Math.round(d0.x * 100) / 100, z: Math.round(d0.z * 100) / 100 };
        if (z.under != null && d.z < z.under) add(f, 'dưới ' + z.under + 'm');
        if (z.over != null && d.z > z.over) add(f, 'trên ' + z.over + 'm');
        if (z.wOver != null && d.x > z.wOver) add(f, 'rộng trên ' + z.wOver + 'm');
        if (z.head) partners.forEach(function (c) {
          if (CFG.chkHeadWithTruck.indexOf(c) >= 0 && d.z > CFG.chkHeadTruckMax) add(f, 'trên ' + CFG.chkHeadTruckMax + 'm');
          if (CFG.chkHeadWithTrailer.indexOf(c) >= 0) {
            if (d.z < CFG.chkHeadTrailerMin) add(f, 'dưới ' + CFG.chkHeadTrailerMin + 'm');
            if (d.z > CFG.chkHeadTrailerMax) add(f, 'trên ' + CFG.chkHeadTrailerMax + 'm');
          }
        });
      });
      if (conds.length) { var no = tr.number != null ? tr.number : id; R8.items[id] = { id: id, cat: z.n, number: no, frames: frames.sort(function (a, b) { return a - b; }), sample: { txt: z.n + ' ' + no + ' ' + conds.join(', ') } }; }
    });
  }
  function chkBoxOutside(c, c0, lim) {
    var h = heading(c.rotation), sn = Math.sin(h), cs = Math.cos(h), p = c.position, d = c.dimension;
    var dx = c0[0] - p.x, dz = c0[1] - p.z;
    var u = dx * cs - dz * sn, v = dx * sn + dz * cs;
    var hx = d.x / 2, hz = d.z / 2;
    var du = u - Math.max(-hx, Math.min(hx, u)), dv = v - Math.max(-hz, Math.min(hz, v));
    return Math.sqrt(du * du + dv * dv) > lim;
  }
  function chkRunFar(S, R9) {
    var lim = CFG.chkFarDist, c0 = CFG.chkFarCenter || [0, 0];
    Object.keys(S.instancesTree).forEach(function (id) {
      var tr = S.instancesTree[id]; if (!tr || !tr.cubes) return;
      var bad = [];
      chkKf(S, id).forEach(function (f) {
        var c = tr.cubes[f]; if (!c || !c.position || !c.dimension || !c.rotation) return;
        if (chkBoxOutside(c, c0, lim)) bad.push(f);
      });
      if (bad.length) R9.items[id] = { id: id, cat: treeCategory(tr) || '', number: tr.number, frames: bad, sample: { txt: '' } };
    });
  }
  var _road = null;
  function roadWalk(roots, visit) {
    var seen = new Set(), q = roots.map(function (x) { return [x, 0]; }), n = 0, SK = /^(instancesTree|instanceAttributes|cubes|relations|calibs|images|pointsObjectMap|parent|children|_reactInternals|_reactInternalFiber)$/;
    while (q.length && n++ < 12000) {
      var it = q.shift(), o = it[0];
      if(!o||typeof o!=='object'||seen.has(o))continue;
      seen.add(o);
      if(o.nodeType||ArrayBuffer.isView(o)||o.isObject3D||o.isBufferGeometry)continue;
      if (visit(o) === true) return;
      if (it[1] >= 4) continue;
      var ks; try { ks = Object.keys(o); } catch (e) { continue; }
      for (var i = 0; i < ks.length && i < 200; i++) {
        if (SK.test(ks[i])) continue;
        var v; try { v = o[ks[i]]; } catch (e) { continue; }
        if (v && typeof v === 'object') q.push([v, it[1] + 1]);
      }
    }
  }
  function roadVal(e, nm, d) {
    if (typeof e === 'string') { var s0 = e.trim().charAt(0); if (s0 !== '{' && s0 !== '[') return undefined; try { e = JSON.parse(e); } catch (x) { return undefined; } }
    if (Array.isArray(e)) {
      for (var j = 0; j < e.length; j++) { var it = e[j]; if (it && typeof it === 'object' && (it.name === nm || it.key === nm || it.field === nm)) return 'value' in it ? it.value : it.val; }
      return undefined;
    }
    if (!e || typeof e !== 'object') return undefined;
    if (nm in e) return e[nm];
    if (!d) for (var i = 0, sb = ['labels', 'attributes', 'attrs', 'attr', 'data']; i < sb.length; i++) { if (e[sb[i]] != null) { var v = roadVal(e[sb[i]], nm, 1); if (v !== undefined) return v; } }
    return undefined;
  }
  function roadHits(st, nm) {
    var ks = Object.keys(st), h = 0;
    for (var i = 0; i < ks.length && i < 400; i++) if (/^\d+$/.test(ks[i]) && roadVal(st[ks[i]], nm) !== undefined) h++;
    return h;
  }
  var ROAD_KEY_RE = /frame.{0,12}(label|attr|tag|prop)|(label|attr|tag|prop).{0,12}frame|scene.{0,8}(label|attr|tag)|场景|帧/i;
  function roadFrameFields(fl) { return Array.isArray(fl) && fl.length > 0 && fl.every(function (x) { return x && typeof x.name === 'string'; }); }
  function roadNumKeys(st) { var n = 0, ks = Object.keys(st); for (var i = 0; i < ks.length && i < 2000; i++) if (/^\d+$/.test(ks[i])) n++; return n; }
  /* 0 = frame đánh số từ 0, 1 = từ 1 (panel hay hiện "Frame 19" kiểu 1-based) */
  function roadIdxMode(st, n) {
    var ks = Object.keys(st || {}), mn = Infinity, mx = -1, c = 0;
    for (var i = 0; i < ks.length && i < 4000; i++) {
      if (!/^\d+$/.test(ks[i])) continue;
      var v = +ks[i]; c++; if (v < mn) mn = v; if (v > mx) mx = v;
    }
    if (!c || mn === 0) return 0;
    return (n && mx >= n) ? 1 : 0;
  }
  function roadEntry(st, f, mode) {
    if (!st || typeof st !== 'object') return undefined;
    /* Chỉ lấy đúng frame đang xét (không fallback sang f±1) */
    var c = mode ? [f + 1, String(f + 1)] : [f, String(f)];
    for (var i = 0; i < c.length; i++) if (Object.prototype.hasOwnProperty.call(st, c[i])) return st[c[i]];
    return undefined;
  }
  var ROAD_EMPTY_STR = /^(null|undefined|nan|\[\s*\]|\{\s*\}|\[\s*(""|'')?\s*\]|\(trống\)|trống)$/i;
  function roadEmpty(y, opts) {
    if (y == null) return true;
    if (typeof y === 'number') return !isFinite(y);
    if (typeof y === 'string') {
      var t = y.replace(/[\s\u00a0\u200b-\u200d\u2060\ufeff\u3000]+/g, '');
      if (!t || ROAD_EMPTY_STR.test(t)) return true;
      var c0 = t.charAt(0);
      if (c0 === '[' || c0 === '{') { try { return roadEmpty(JSON.parse(y), opts); } catch (e) {} }
      return roadNotInOpts(y, opts);
    }
    if (Array.isArray(y)) return y.every(function (z) { return roadEmpty(z, opts); });
    if (typeof y === 'object') {
      if ('value' in y) return roadEmpty(y.value, opts);
      if ('label' in y) return roadEmpty(y.label, opts);
      return Object.keys(y).length === 0;
    }
    return roadNotInOpts(y, opts);
  }
  function roadNotInOpts(y, opts) {
    if (!opts || !opts.length) return false;
    var s = String(y).trim();
    return !opts.some(function (op) { return op && (String(op.value).trim() === s || String(op.label == null ? '' : op.label).trim() === s); });
  }
  function roadScore(t) {
    t = String(t || '');
    return (/场景标签/.test(t) ? 1000 : 0) + (/场景|scene.?tag|scene.?label/i.test(t) ? 200 : 0)
      + (/道路|road|车道|lane|路面|route|đường|duong|nhãn cảnh/i.test(t) ? 50 : 0);
  }
  /* Tên trường lấy trực tiếp từ dữ liệu frame attribute (dùng khi không thấy cấu hình trường) */
  function roadFieldFromData(st) {
    var re = new RegExp(CFG.chkRoadRe, 'i'), ks = Object.keys(st || {}), out = '', bs = 0;
    for (var i = 0; i < ks.length && i < 600; i++) {
      if (!/^\d+$/.test(ks[i])) continue;
      var e = st[ks[i]]; if (!e || typeof e !== 'object') continue;
      var list = [e, e.labels, e.attributes, e.attrs, e.attr, e.data];
      for (var c = 0; c < list.length; c++) {
        var o = list[c];
        if (typeof o === 'string') {
          var s0 = o.trim().charAt(0);
          if (s0 === '{' || s0 === '[') { try { o = JSON.parse(o); } catch (x) { o = null; } } else o = null;
        }
        if (!o || typeof o !== 'object') continue;
        if (Array.isArray(o)) {
          for (var a = 0; a < o.length; a++) {
            var it = o[a];
            if (it && typeof it === 'object' && typeof it.name === 'string' && re.test(it.name)) {
              var s1 = roadScore(it.name) + 1;
              if (s1 > bs) { bs = s1; out = it.name; }
            }
          }
          continue;
        }
        var ok = Object.keys(o);
        for (var j = 0; j < ok.length && j < 120; j++) {
          var k = ok[j]; if (!re.test(k)) continue;
          var v = o[k]; if (v && typeof v === 'object' && !Array.isArray(v)) continue;
          var sc = roadScore(k);
          if (sc > bs) { bs = sc; out = k; }
        }
      }
      if (out && bs >= 1000) break;
    }
    return out;
  }
  function roadFind(C) {
    var re = new RegExp(CFG.chkRoadRe, 'i'), V = C.V, S = C.S, L = C.L, roots = [V, S, L];
    var nF = S.dataLength != null ? S.dataLength : (S.cubes ? S.cubes.length : 0);
    if (_road && _road.field && _road.direct && S.frameAttributes === _road.store) return _road;
    if (_road && _road.field) {
      if (_road.owner && _road.key) {
        var cur; try { cur = _road.owner[_road.key]; } catch (e) {}
        if (cur && typeof cur === 'object' && roadHits(cur, _road.nm) > 0) { _road.store = cur; _road.mode = roadIdxMode(cur, nF); return _road; }
      }
      else if (_road.store && roadHits(_road.store, _road.nm) > 0) { _road.mode = roadIdxMode(_road.store, nF); return _road; }
    }
    var excl = [];
    [V.labelConfig, V.props && V.props.labelConfig, V.state && V.state.labelConfig, V.instanceLabelConfig, V.props && V.props.instanceLabelConfig, V.state && V.state.instanceLabelConfig]
      .forEach(function (c) { if (c && Array.isArray(c.fields)) excl.push(c.fields); });
    var cfgs = [], stores = [], dbg = { cfgKeys: [], storeKeys: [] };
    roadWalk(roots, function (o) {
      var ks; try { ks = Object.keys(o); } catch (e) { return; }
      for (var i = 0; i < ks.length && i < 300; i++) {
        if (!ROAD_KEY_RE.test(ks[i])) continue;
        var v; try { v = o[ks[i]]; } catch (e) { continue; }
        if (!v || typeof v !== 'object' || v.nodeType || v.isObject3D) continue;
        var fl = (Array.isArray(v) && roadFrameFields(v)) ? v : v.fields;
        if (roadFrameFields(fl)) { if (excl.indexOf(fl) < 0) { cfgs.push({ fields: fl, key: ks[i] }); dbg.cfgKeys.push(ks[i]); } }
        else if (roadNumKeys(v)) { stores.push({ owner: o, key: ks[i], store: v }); dbg.storeKeys.push(ks[i]); }
      }
    });
    var fld = null, from = null, fsc = 0;
    /* Chọn trường khớp nhất: ưu tiên đúng "场景标签", rồi tới scene/tag, rồi road/lane/道路 */
    cfgs.forEach(function (c) {
      c.fields.forEach(function (x) {
        var t = fieldText(x); if (!re.test(t)) return;
        var sc = roadScore(t);
        if (sc > fsc) { fsc = sc; fld = x; from = c.key; }
      });
    });
    if (!fld) cfgs.forEach(function (c) { if (!fld && c.fields.length === 1) { fld = c.fields[0]; from = c.key; } });
    if (!fld) roadWalk(roots, function (o) {
      var fl; try { fl = o.fields; } catch (e) {}
      if (looksLikeFields(fl) && excl.indexOf(fl) < 0) { var f1 = fl.filter(function (x) { return re.test(fieldText(x)); })[0]; if (f1) { fld = f1; return true; } }
    });
    if (!fld) {
      /* Không thấy cấu hình trường -> lấy tên trường ngay từ dữ liệu frame attribute */
      var dStore = null, dName = '';
      roadWalk([V, S, L], function (o) {
        if (!o || typeof o !== 'object' || o.nodeType) return;
        var ks; try { ks = Object.keys(o); } catch (e) { return; }
        if (!ks.length || ks.length > 20000) return;
        var nm2 = roadFieldFromData(o);
        if (nm2) { dName = nm2; dStore = o; return true; }
      });
      if (dName) return (_road = { field: { name: dName, label: dName }, nm: dName, store: dStore, owner: null, key: null,
        mode: roadIdxMode(dStore, nF), hits: roadHits(dStore, dName), cfgKey: '(dữ liệu)', dbg: dbg });
      return (_road = { field: null, dbg: dbg });
    }
    /* Tool lưu thuộc tính frame tại lidarInstances.frameAttributes[frame] (0-based). Mảng RỖNG nghĩa là mọi frame đều chưa điền
       -> vẫn phải coi là kho hợp lệ (trước đây bị bỏ qua vì không có key số nên rule báo \"đủ\" giả) */
    if (S.frameAttributes && typeof S.frameAttributes === 'object') {
      return (_road = { field: fld, nm: fld.name, store: S.frameAttributes, owner: S, key: 'frameAttributes', direct: true,
        mode: 0, hits: roadHits(S.frameAttributes, fld.name), cfgKey: from, dbg: dbg });
    }
    var pick = null, best = -Infinity;
    stores.forEach(function (s) {
      var h = roadHits(s.store, fld.name), cnt = roadNumKeys(s.store);
      var sc = h * 100000 + (nF ? -Math.abs(cnt - nF) : cnt);
      if (sc > best) { best = sc; pick = s; }
    });
    if (!pick || roadHits(pick.store, fld.name) === 0) {
      var bh = 0, bs = null;
      roadWalk(roots, function (o) { var k2; try { k2 = Object.keys(o); } catch (e) { return; } if (!k2.length || k2.length > 20000) return; var h = roadHits(o, fld.name); if (h > bh) { bh = h; bs = o; } });
      if (bs) pick = { owner: null, key: null, store: bs };
    }
    return (_road = { field: fld, nm: fld.name, store: pick ? pick.store : null, owner: pick ? pick.owner : null, key: pick ? pick.key : null,
      mode: pick ? roadIdxMode(pick.store, nF) : 0, hits: pick ? roadHits(pick.store, fld.name) : 0, cfgKey: from, dbg: dbg });
  }
  window.__roadDebug = function () {
    var C = ctx(); if (!C) return null; _road = null; var x = roadFind(C);
    console.log('[snap] thuoc tinh duong (frame attribute)', x.field ? { truong: x.field.name, label: x.field.label, cauHinhTuKhoa: x.cfgKey, khoLuuKhoa: x.key, khoLuu: x.store, danhSoFrame: x.mode ? '1-based' : '0-based', soFrameCoGiaTri: x.hits, ungVien: x.dbg }
      : { loi: 'khong thay truong khop ' + CFG.chkRoadRe, ungVien: x.dbg });
    if (x.field && x.store) {
      var S = C.S, n = Math.min(5, S.dataLength != null ? S.dataLength : (S.cubes ? S.cubes.length : 0));
      var nm = x.nm, mode = x.mode;
      var samples = [];
      for (var f = 0; f < (S.dataLength != null ? S.dataLength : (S.cubes ? S.cubes.length : 0)); f++) {
        var e = roadEntry(x.store, f, mode), v = roadVal(e, nm);
        samples.push({ frame: f + 1, entry: e, rawValue: v, typeofV: typeof v, isArray: Array.isArray(v) });
        if (samples.length >= 5) break;
      }
      console.log('[snap] __roadDebug mau gia tri 5 frame dau:', samples);
    }
    return x;
  };
  function chkRunRoad(C, R10) {
    var S = C.S, x = roadFind(C);
    if (!x.field) { R10.note = 'Không thấy trường thuộc tính đường trong frame attribute (tìm theo tên/nhãn: CFG.chkRoadRe) – chạy __roadDebug() trong Console (F12) và gửi kết quả'; R10.fail = true; return; }
    if (!x.store) { R10.note = 'KHÔNG ĐỌC ĐƯỢC giá trị thuộc tính đường của các frame (chưa kiểm tra được) – chạy __roadDebug() trong Console (F12) và gửi kết quả'; R10.fail = true; return; }
    var nm = x.nm, n = S.dataLength != null ? S.dataLength : (S.cubes ? S.cubes.length : 0);
    var mode = x.mode != null ? x.mode : roadIdxMode(x.store, n), bad = 0;
    var names = [nm]; if (x.field && x.field.label && x.field.label !== nm) names.push(x.field.label);
    for (var f = 0; f < n; f++) {
      var e = roadEntry(x.store, f, mode), v = undefined;
      for (var a = 0; a < names.length && v === undefined; a++) v = roadVal(e, names[a]);
      var empty = roadEmpty(v, x.field && x.field.options);
      if (empty) {
        bad++;
        R10.items[f] = { id: '', cat: '', number: f + 1, frames: [f], sample: { txt: '' } };
      }
    }
  }
  /* Đầu xe (大车车头) lòi ra ngoài / to hơn thân xe (mọi cạnh, mọi kích thước):
     - lòi ngang (x), lòi trước/sau (z), lòi trên/dưới (y): 4 góc + đỉnh/đáy box đầu xe chiếu vào hệ toạ độ box thân
     - to hơn thân: rộng/cao/dài của đầu xe lớn hơn của thân
     Thân xe tải/hàng/bồn (chkHeadWithTruck): kiểm tra đủ cả x, y, z.
     Rơ móc (chkHeadWithTrailer): đầu xe nằm phía trước rơ móc nên bỏ qua chiều dọc (z), chỉ kiểm tra rộng (x) và cao (y). */
  function chkHeadOverflow(h, b, trailer) {
    var hh = heading(h.rotation), sh = Math.sin(hh), ch = Math.cos(hh), hb = heading(b.rotation), sb = Math.sin(hb), cb = Math.cos(hb);
    var hx = h.dimension.x / 2, hz = h.dimension.z / 2, bx = b.dimension.x / 2, bz = b.dimension.z / 2, ox = 0, oz = 0;
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (q) {
      var a = q[0] * hx, c = q[1] * hz;
      var wx = h.position.x + a * ch + c * sh, wz = h.position.z - a * sh + c * ch;
      var dx = wx - b.position.x, dz = wz - b.position.z;
      var u = dx * cb - dz * sb, v = dx * sb + dz * cb;
      ox = Math.max(ox, Math.abs(u) - bx); oz = Math.max(oz, Math.abs(v) - bz);
    });
    var hTop = h.position.y + h.dimension.y / 2, hBot = h.position.y - h.dimension.y / 2;
    var bTop = b.position.y + b.dimension.y / 2, bBot = b.position.y - b.dimension.y / 2;
    return { x: ox, z: trailer ? 0 : oz, y: Math.max(0, hTop - bTop, bBot - hBot),
      sx: Math.max(0, h.dimension.x - b.dimension.x), sy: Math.max(0, h.dimension.y - b.dimension.y),
      sz: trailer ? 0 : Math.max(0, h.dimension.z - b.dimension.z) };
  }
  function chkRunHeadOut(S, R11) {
    var tol = CFG.chkHeadOutTol, heads = Object.keys(CFG.chkSize).filter(function (k) { return CFG.chkSize[k].head; });
    chkLinkPairs(S).forEach(function (p) {
      var ca = treeCategory(S.instancesTree[p.a]) || '', cb = treeCategory(S.instancesTree[p.b]) || '', hid, bid, cat;
      if (heads.indexOf(ca) >= 0 && heads.indexOf(cb) < 0) { hid = p.a; bid = p.b; cat = cb; }
      else if (heads.indexOf(cb) >= 0 && heads.indexOf(ca) < 0) { hid = p.b; bid = p.a; cat = ca; }
      else return;
      var trailer = CFG.chkHeadWithTrailer.indexOf(cat) >= 0;
      if (!trailer && CFG.chkHeadWithTruck.indexOf(cat) < 0) return;
      var kf = {}; chkKf(S, hid).concat(chkKf(S, bid)).forEach(function (f) { kf[f] = 1; });
      var bad = [], m = { x: 0, y: 0, z: 0, sx: 0, sy: 0, sz: 0 };
      p.frames.forEach(function (f) {
        if (!kf[f]) return;
        var eh = effCube(S, hid, f), eb = effCube(S, bid, f); if (!eh || !eb) return;
        var o = chkHeadOverflow(eh.cube, eb.cube, trailer), hit = false;
        Object.keys(m).forEach(function (k) { if (o[k] > tol) { hit = true; if (o[k] > m[k]) m[k] = o[k]; } });
        if (hit) bad.push(f);
      });
      if (!bad.length) return;
      var th = S.instancesTree[hid], parts = [], f2 = function (v) { return v.toFixed(2) + 'm'; };
      if (m.x > tol) parts.push('lòi ngang ' + f2(m.x));
      if (m.z > tol) parts.push('lòi trước/sau ' + f2(m.z));
      if (m.y > tol) parts.push('lòi trên/dưới ' + f2(m.y));
      var big = [];
      if (m.sx > tol) big.push('rộng +' + f2(m.sx));
      if (m.sy > tol) big.push('cao +' + f2(m.sy));
      if (m.sz > tol) big.push('dài +' + f2(m.sz));
      if (big.length) parts.push('to hơn thân: ' + big.join(', '));
      R11.items[hid + '|' + bid] = { id: hid, cat: heads.indexOf(ca) >= 0 ? ca : cb, number: (th.number != null ? th.number : hid) + ' ⇄ ' + (S.instancesTree[bid].number != null ? S.instancesTree[bid].number : bid),
        frames: bad, sample: { txt: (heads.indexOf(ca) >= 0 ? ca : cb) + ' ⇄ ' + cat + ': ' + parts.join('; ') } };
    });
  }
  function chkScan(C) {
    chkCacheReset();
    var S = C.S, F = chkFields(C), rules = [
      { key: 'r1', name: 'Không hợp lệ – che phủ chưa >70%', need: ['valid', 'occ'],
        test: function (t) { return CHK_INVALID.test(t.valid) && !CHK_OCC70.test(t.occ); } },
      { key: 'r2', name: 'Không hợp lệ – CIPO khác ' + CFG.chkCipoValue, need: ['valid', 'cipo'],
        test: function (t) {
          var nums = String(t.cipo).match(/\d+/g) || [];
          return CHK_INVALID.test(t.valid) && nums.indexOf(String(CFG.chkCipoValue)) < 0; } },
      { key: 'r3', name: 'Hợp lệ – che phủ >70%', need: ['valid', 'occ'],
        test: function (t) { return !CHK_INVALID.test(t.valid) && CHK_OCC70.test(t.occ); } },
      { key: 'r4', name: 'Vật thể tĩnh đang di chuyển', need: ['motion'], cls: new RegExp(CFG.chkStaticClassRe, 'i'),
        test: function (t) { return CHK_MOVING.test(t.motion); } },
      { key: 'r5', name: 'Chưa đánh xe đô thị / mục tiêu liên quan', need: ['city', 'key'], raw: true,
        test: function (t) {
          var c = t.cityRaw, cityNone = c != null && c !== '' && /^\s*none\s*$/i.test(String(Array.isArray(c) ? c.join('') : c));
          var k = t.keyRaw, keyFalse = k == null || k === '' || k === false || /^\s*false\s*$/i.test(String(k)) || (Array.isArray(k) && !k.length);
          return !cityNone && keyFalse; } }
    ];
    rules.push({ key: 'r6', dir: true, need: [], name: 'Hướng sai so với camera ' + (CFG.chkDirCam + 1) });
    rules.push({ key: 'r7', custom: true, need: [], name: 'Thuộc tính không khớp' });
    rules.push({ key: 'r8', custom: true, need: [], name: 'Check kích thước' });
    rules.push({ key: 'r9', custom: true, need: [], name: 'Box ngoài ' + CFG.chkFarDist + 'm' });
    rules.push({ key: 'r10', custom: true, need: [], name: 'Thiếu thuộc tính đường (场景标签)' });
    rules.push({ key: 'r11', custom: true, need: [], name: 'Đầu xe lòi ra ngoài thân xe' });
    rules.forEach(function (r) { r.items = {}; r.missing = r.need.filter(function (k) { return !F[k]; }); });
    Object.keys(S.instancesTree).forEach(function (id) {
      var tr = S.instancesTree[id], cat = treeCategory(tr) || '', clsOK = {};
      rules.forEach(function (r) { clsOK[r.key] = !r.cls || r.cls.test(cat); });
      chkKf(S, id).forEach(function (f) {
        var box = parseLabelsC(tr.cubes[f].labels), inst = instAttrAtC(S, id, f), t = {};
        ['city', 'key'].forEach(function (k) {
          var fx = F[k]; if (!fx) return;
          var o1 = fx.src === 'id' ? inst : box, o2 = fx.src === 'id' ? box : inst;
          t[k + 'Raw'] = fx.f.name in o1 ? o1[fx.f.name] : (fx.f.name in o2 ? o2[fx.f.name] : null);
          t[k] = t[k + 'Raw'] == null ? '(trống)' : String(t[k + 'Raw']);
        });
        ['valid', 'occ', 'cipo', 'motion'].forEach(function (k) {
          var fx = F[k]; if (!fx) return;
          t[k] = chkText(fx, fx.src === 'id' ? inst : box);
          if (t[k] == null) t[k] = chkText(fx, fx.src === 'id' ? box : inst);
        });
        rules.forEach(function (r) {
          if (r.dir || r.custom || r.missing.length) return;
          if (!clsOK[r.key]) return;
          if (r.need.some(function (k) { return t[k] == null; })) return;
          if (!r.test(t)) return;
          var it = r.items[id] || (r.items[id] = { id: id, cat: cat, number: tr.number, frames: [], sample: t });
          it.frames.push(f);
        });
      });
    });
    var r6 = rules.filter(function (r) { return r.key === 'r6'; })[0];
    if (r6) chkRunDir(C, S, r6);
    var R7 = rules.filter(function (r) { return r.key === 'r7'; })[0];
    if (R7) {
      var pairs = chkLinkPairs(S), notes = [];
      var nm = function (id) { var t = S.instancesTree[id]; return (treeCategory(t) || '') + ' ' + (t.number != null ? t.number : id); };
      var add = function (key, id, label, frames, txt) {
        var it = R7.items[key] || (R7.items[key] = { id: id, cat: label.cat, number: label.number, frames: [], txts: [], sample: {} });
        frames.forEach(function (f) { if (it.frames.indexOf(f) < 0) it.frames.push(f); });
        it.frames.sort(function (x, y) { return x - y; });
        if (it.txts.indexOf(txt) < 0) it.txts.push(txt);
        it.sample.txt = it.txts.join(' | ');
      };
      var pairLabel = function (p) { var ta = S.instancesTree[p.a]; return { cat: treeCategory(ta) || '', number: (ta.number != null ? ta.number : p.a) + ' ⇄ ' + nm(p.b) }; };
      var seenN = {}, cre = new RegExp(CFG.chkCipoRe, 'i'), gre = new RegExp(CFG.chkCargoRe, 'i'), ire = CFG.chkLinkIgnoreRe ? new RegExp(CFG.chkLinkIgnoreRe, 'i') : null;
      var cargoRe = { test: cargoAllowed };
      var syncRe = CFG.chkLinkAllAttrs ? null : new RegExp(CFG.chainCopyRe, 'i');
      var lf = (F.all || []).filter(function (x) { var t = fieldText(x.f); if (isConeField(x.f) || (ire && ire.test(t)) || (syncRe && !syncRe.test(t)) || seenN[x.f.name]) return false; seenN[x.f.name] = 1; x.kind = cre.test(t) ? 'cipo' : gre.test(t) ? 'cargo' : ''; return true; });
      if (!lf.length) notes.push('không có trường để so sánh');
      pairs.forEach(function (p) {
        var bad = [], diffs = {}, catA = treeCategory(S.instancesTree[p.a]) || '', catB = treeCategory(S.instancesTree[p.b]) || '';
        var cargoExempt = !cargoRe.test(catA) || !cargoRe.test(catB);
        p.frames.forEach(function (f) {
          var hit = false;
          lf.forEach(function (fx) {
            var oa = chkObjAt(S, p.a, f, fx), ob = chkObjAt(S, p.b, f, fx); if (!oa || !ob) return;
            var ta = chkText(fx, oa), tb = chkText(fx, ob); if (ta == null || tb == null || ta.trim() === tb.trim()) return;
            if (fx.kind === 'cipo' && (chkCipoIs(fx, oa, CFG.chkCipoLinkValue) || chkCipoIs(fx, ob, CFG.chkCipoLinkValue))) return;
            if (fx.kind === 'cargo' && cargoExempt) return;
            hit = true; if (!diffs[fx.f.name]) diffs[fx.f.name] = (fx.f.label || fx.f.name) + ': ' + ta.trim() + ' ≠ ' + tb.trim();
          });
          if (hit) bad.push(f);
        });
        if (bad.length) add(p.a + '|' + p.b, p.a, pairLabel(p), bad, 'liên kết khác nhau – ' + Object.keys(diffs).map(function (k) { return diffs[k]; }).join('; ') + (CFG.keyChain ? ' (' + CFG.keyChain.toUpperCase() + ': xe sau theo xe trước)' : ''));
      });
      if (!F.cipo) notes.push('thiếu trường CIPO');
      else {
        var linked = {}; pairs.forEach(function (p) { linked[p.a + '|' + p.b] = 1; });
        var nF = S.dataLength != null ? S.dataLength : (S.cubes ? S.cubes.length : 0), cp = {};
        for (var f = 0; f < nF; f++) {
          var on = [];
          ((S.cubes && S.cubes[f]) || []).forEach(function (id) { var o = chkObjAt(S, String(id), f, F.cipo); if (o && chkCipoIs(F.cipo, o, CFG.chkCipoLinkValue)) on.push(String(id)); });
          for (var x = 0; x < on.length; x++) for (var y = x + 1; y < on.length; y++) {
            var a1 = on[x] < on[y] ? on[x] : on[y], b1 = on[x] < on[y] ? on[y] : on[x], k1 = a1 + '|' + b1;
            (cp[k1] || (cp[k1] = { a: a1, b: b1, frames: [] })).frames.push(f);
          }
        }
        Object.keys(cp).forEach(function (k) { var q = cp[k];
          add(k, q.a, pairLabel(q), q.frames, 'cùng CIPO ' + CFG.chkCipoLinkValue); });
      }
      if (!F.cargo) notes.push('thiếu trường chở hàng');
      else {
        Object.keys(S.instancesTree).forEach(function (id) {
          var tr = S.instancesTree[id], cat = treeCategory(tr) || ''; if (cargoRe.test(cat)) return;
          var bad = [];
          trackFrames(S, id).forEach(function (f) { var o = chkObjAt(S, id, f, F.cargo); if (o && chkYes(chkText(F.cargo, o))) bad.push(f); });
          if (bad.length) add('c|' + id, id, { cat: cat, number: tr.number }, bad, 'chở hàng phải = không');
        });
      }
      if (notes.length) R7.note = 'Thiếu: ' + notes.join('; ');
    }
    var R8 = rules.filter(function (r) { return r.key === 'r8'; })[0];
    if (R8) chkRunSize(S, R8);
    var R9 = rules.filter(function (r) { return r.key === 'r9'; })[0];
    if (R9) chkRunFar(S, R9);
    var R10 = rules.filter(function (r) { return r.key === 'r10'; })[0];
    if (R10) chkRunRoad(C, R10);
    var R11 = rules.filter(function (r) { return r.key === 'r11'; })[0];
    if (R11) chkRunHeadOut(S, R11);
    return { rules: rules, F: F };
  }
  function countValid(C, F) {
    var S = C.S, fx = F.valid, r = { box: 0, valid: 0, invalid: 0, unknown: 0 };
    var kfs = {}, stc = {};
    function status(id, f) {
      var tr = S.instancesTree[id]; if (!tr || !tr.cubes) return 'unknown';
      var fr = kfs[id] || (kfs[id] = trackFrames(S, id)), k = null;
      for (var i = 0; i < fr.length && fr[i] <= f; i++) k = fr[i];
      if (k == null) k = fr[0];
      if (k == null || !fx) return 'unknown';
      var key = id + ':' + k; if (stc[key]) return stc[key];
      var box = parseLabelsC(tr.cubes[k].labels), inst = instAttrAtC(S, id, k);
      var t = chkText(fx, fx.src === 'id' ? inst : box); if (t == null) t = chkText(fx, fx.src === 'id' ? box : inst);
      return (stc[key] = t == null ? 'unknown' : CHK_INVALID.test(t) ? 'invalid' : 'valid');
    }
    var n = S.dataLength != null ? S.dataLength : (S.cubes ? S.cubes.length : 0);
    for (var f = 0; f < n; f++) {
      var ids = (S.cubes && S.cubes[f]) || [];
      for (var j = 0; j < ids.length; j++) { var st = status(ids[j], f); r.box++; r[st]++; }
    }
    return r;
  }
  window.__countValid = function () { var C = ctx(); if (!C) return null; chkCacheReset(); return countValid(C, chkFields(C)); };
  function chkRanges(fr) {
    var out = [], a = null, b = null;
    fr.slice().sort(function (x, y) { return x - y; }).map(function (f) { return f + 1; }).forEach(function (f) {
      if (a === null) { a = b = f; } else if (f === b + 1) b = f; else { out.push(a === b ? a : a + '-' + b); a = b = f; }
    });
    if (a !== null) out.push(a === b ? a : a + '-' + b);
    return out.join(', ');
  }
  function chkJump(C, id, f) {
    var V = C.V;
    if (id === '' || id == null) { try { V.loadFrame(f, 'bar'); } catch (e) { console.warn('[snap] loadFrame', e); } return; }
    var sel = function () { try { V.setSelectedShape(id, 'cube', { autoFocus: true }); } catch (e) { console.warn('[snap] chon', e); } };
    if (curFrame(C) === f) return sel();
    var p = null;
    try { p = V.loadFrame ? V.loadFrame(f, 'bar') : null; } catch (e) { console.warn('[snap] loadFrame', e); }
    if (p && p.then) p.then(function () { setTimeout(sel, 50); }); else setTimeout(sel, 300);
  }
  function vsValid(t) { return t == null ? '' : (CHK_INVALID.test(String(t)) ? 'Không hợp lệ' : 'Hợp lệ'); }
  function vsOcc(t) {
    var m = String(t == null ? '' : t).match(/(\d+\s*%?\s*[-~～–]\s*\d+|[>＞≥<＜≤]=?\s*\d+)\s*%?/);
    if (!m) return vs(t);
    return m[1].replace(/\s+/g, '').replace(/%/g, '').replace(/[~～–]/g, '-').replace('＞', '>').replace('≥', '>=').replace('＜', '<').replace('≤', '<=') + '%';
  }
  function vsCipo(t) { var m = String(t == null ? '' : t).match(/cipo\D{0,2}(\d+)/i); return m ? 'CIPO' + m[1] : vs(t); }
  function vs(t) {
    return String(t == null ? '' : t).split(' | ').map(function (p) {
      var q = p.replace(/[\u2E80-\u9FFF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF]/g, '').replace(/\s+/g, ' ').trim();
      var m = q.match(/^(true|false|none|\d+)\s+(.+)$/i); if (m) q = m[2];
      var tk = q.split(' ');
      q = tk.filter(function (x, i) { return !/\d/.test(x) || !tk.some(function (y, k) { return k !== i && y.toLowerCase().indexOf(x.toLowerCase()) >= 0 && (y.length > x.length || k < i); }); }).join(' ');
      return q || p.trim().split(/\s+/)[0] || '';
    }).join(' | ');
  }
  var _igKey = '__snapChkIgnore';
  function igTask() { return location.href.split('#')[0]; }
  function igLoad() { try { return JSON.parse(localStorage.getItem(_igKey) || '{}')[igTask()] || []; } catch (e) { return []; } }
  function igSave(a) {
    try { var o = JSON.parse(localStorage.getItem(_igKey) || '{}'); if (a.length) o[igTask()] = a; else delete o[igTask()]; localStorage.setItem(_igKey, JSON.stringify(o)); } catch (e) {}
  }
  function chkRender(reuse) {
    if (!_chk) return;
    var C = ctx(); if (!C) return;
    var res;
    if (reuse && _chk.last) {
      res = _chk.last;
      var rd = res.rules.filter(function (r) { return r.key === 'r6'; })[0]; if (rd) chkRunDir(C, C.S, rd);
    } else { res = _chk.last = chkScan(C); _chk.cv = null; }
    var F = res.F, box = _chk.body, total = 0, h = '', st = box.scrollTop;
    var cv = _chk.cv || (_chk.cv = countValid(C, F)), ig = igLoad(), igN = 0;
    h += '<div style="background:#ffeaf2;border-left:3px solid #e79ab8;border-radius:6px;padding:8px 10px;margin-bottom:8px">'
      + '<div style="font-size:15px;color:#4a2f3b">Box hợp lệ: <b style="color:#c2456f">' + cv.valid + ' / ' + cv.box + '</b></div>'
      + (F.valid ? '' : '<div style="color:#d6456f">Không tìm thấy trường "hợp lệ" trong form – mọi box tính là chưa hợp lệ.</div>')
      + '</div>';
    res.rules.forEach(function (r) {
      var ids = Object.keys(r.items).filter(function (id) { if (ig.indexOf(r.key + ':' + id) < 0) return true; igN++; return false; }); total += ids.length; var pend = r.dir && r.cam && r.cam.yaw == null;
      h += '<div style="margin-top:6px;color:' + (pend ? '#9b7686' : (ids.length || r.fail) ? '#d6456f' : '#3f9b73') + ';font-weight:bold">' + (pend ? '… ' : (ids.length || r.fail) ? '⚠ ' : '✓ ') + esc(r.name) + (r.fail ? ' (CHƯA KIỂM TRA ĐƯỢC)' : ' (' + ids.length + (r.key === 'r10' ? ' frame' : ' id') + ')') + '</div>';
      if (r.note) h += '<div style="color:#9b7686;margin-left:12px">' + esc(r.note) + '</div>';
      if (r.key === 'r10' && ids.length) h += '<div style="color:#b0537c;margin-left:12px">Frame thiếu: ' + esc(chkRanges(ids.map(function (k) { return r.items[k].frames[0]; }))) + '</div>';
      if (pend) { h += '<div style="color:#9b7686;margin-left:12px">' + (r.cam.busy ? 'Đang dò hướng camera ' + (CFG.chkDirCam + 1) + '…' : 'Bỏ qua: ' + esc(r.cam.err || '?')) + '</div>'; return; }
      if (r.missing.length) { h += '<div style="color:#d6456f;margin-left:12px">Bỏ qua: thiếu trường ' + r.missing.join(', ') + '</div>'; return; }
      ids.sort(function (a, b) { return (+r.items[a].number || 0) - (+r.items[b].number || 0); }).forEach(function (id) {
        var it = r.items[id], s = it.sample, det = s.txt != null ? vs(s.txt) : r.key === 'r5' ? 'đô thị: ' + vs(s.city) + ' / mục tiêu: ' + vs(s.key) : r.key === 'r6' ? s.dirTxt : r.key === 'r4' ? vs(s.motion) : r.key === 'r2' ? vsValid(s.valid) + ' / ' + vsCipo(s.cipo) : vsValid(s.valid) + ' / ' + vsOcc(s.occ);
        h += '<div class="row" title="Chuột phải: bỏ qua trường hợp đặc biệt" data-k="' + esc(r.key + ':' + id) + '" data-id="' + esc(it.id) + '" data-f="' + it.frames[0] + '" style="margin-left:12px;padding:2px 4px;cursor:pointer;border-radius:3px">'
          + (r.key === 'r10' ? 'Frame <b>' + (it.frames[0] + 1) + '</b></div>' : r.key === 'r8' ? esc(s.txt) + '</div>' : r.key === 'r9' ? esc(it.cat) + ' <b>' + esc(String(it.number != null ? it.number : it.id)) + '</b></div>' : esc(it.cat) + ' <b>' + esc(String(it.number != null ? it.number : it.id)) + '</b> – frame ' + esc(chkRanges(it.frames)) + ' <span style="color:#9b7686">(' + esc(det) + ')</span></div>');
      });
    });
    if (igN) h += '<div class="ig" style="margin-top:10px;color:#9b7686;cursor:pointer;text-decoration:underline">Đã bỏ qua ' + igN + ' trường hợp đặc biệt – bấm để hiện lại</div>';
    _chk.title.textContent = 'Kiểm tra nhãn – ' + total + ' id cần xem';
    box.innerHTML = h; box.scrollTop = st;
    [].forEach.call(box.querySelectorAll('.row'), function (el) {
      el.onmouseenter = function () { el.style.background = '#ffe6ef'; }; el.onmouseleave = function () { el.style.background = ''; };
      el.onclick = function () { chkJump(ctx(), el.getAttribute('data-id'), +el.getAttribute('data-f')); };
      el.oncontextmenu = function (e) {
        e.preventDefault(); var a = igLoad(), k = el.getAttribute('data-k'); if (a.indexOf(k) < 0) a.push(k);
        igSave(a); chkRender(true);
      };
    });
    var ib = box.querySelector('.ig'); if (ib) ib.onclick = function () { igSave([]); chkRender(true); };
  }
  function chkSig(C) {
    var S = C.S, h = 0, k = 0;
    Object.keys(S.instancesTree).forEach(function (id) {
      var t = S.instancesTree[id]; if (t && t.cubes) k += Object.keys(t.cubes).length;
      for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    });
    /* thuộc tính frame (场景标签/đường): sửa là panel tự cập nhật, không cần bấm làm mới */
    var fa = ''; try { fa = JSON.stringify(S.frameAttributes) || ''; } catch (e) {}
    var h2 = 0; for (var j = 0; j < fa.length; j++) h2 = (h2 * 31 + fa.charCodeAt(j)) | 0;
    return h + ':' + k + ':' + fa.length + ':' + h2;
  }
  function chkNotify() {
    if (!_chk || !CFG.chkAutoRefresh) return;
    clearTimeout(_chk.rt);
    _chk.rt = setTimeout(function () { if (_chk) { try { chkRender(); } catch (e) { console.error('[snap] tu lam moi', e); } } }, CFG.chkAutoDelay);
  }
  function toggleCheck() {
    if (_chk) { clearTimeout(_chk.rt); clearInterval(_chk.poll); _chk.host.remove(); _chk = null; return; }
    if (!ctx()) return toast('Tool chua san sang');
    var host = document.createElement('div');
    host.className = '__snapChk';
    host.style.cssText = 'position:fixed !important;z-index:2147483640 !important;left:20px;top:60px;width:540px;max-height:72vh;display:flex;flex-direction:column;background:#fff8fb;color:#4a2f3b;font:12px Segoe UI,Arial,sans-serif;border:1px solid #f1c4d5;border-radius:12px;overflow:hidden;box-shadow:0 12px 36px rgba(120,60,90,.22)';
    var BT = 'background:#fff;color:#7a3552;border:1px solid #efc3d3;border-radius:6px;padding:2px 10px;cursor:pointer';
    host.innerHTML = '<style>.__snapChk ::-webkit-scrollbar{width:9px;height:9px}.__snapChk ::-webkit-scrollbar-thumb{background:#f1bfd2;border-radius:6px}.__snapChk ::-webkit-scrollbar-thumb:hover{background:#e79ab8}.__snapChk ::-webkit-scrollbar-track{background:transparent}.__snapChk button:hover{background:#fde4ee !important;color:#6a2f48 !important}</style>'
      + '<div class="bar" style="display:flex;align-items:center;gap:6px;padding:9px 12px;border-bottom:1px solid #f1c4d5;background:#fde4ee;cursor:move;user-select:none">'
      + '<b class="t" style="flex:1;color:#7a3552;font-weight:600;font-size:13px"></b>'
      + '<button class="x" style="' + BT + '">✕</button></div>'
      + '<div class="b" style="overflow:auto;padding:8px 12px 12px"></div>';
    ['mousedown', 'wheel', 'contextmenu', 'keydown'].forEach(function (ev) { host.addEventListener(ev, function (e) { e.stopPropagation(); }); });
    document.body.appendChild(host);
    _chk = { host: host, title: host.querySelector('.t'), body: host.querySelector('.b') };
    if (CFG.chkAutoRefresh) {
      try { var c0 = ctx(); _chk.sig = c0 ? chkSig(c0) : ''; } catch (e) {}
      _chk.poll = setInterval(function () {
        if (!_chk || document.hidden) return;
        var c1 = ctx(); if (!c1) return; var sg = ''; try { sg = chkSig(c1); } catch (e) { return; }
        if (sg !== _chk.sig) { _chk.sig = sg; chkNotify(); }
      }, 1000);
    }
    host.querySelector('.x').onclick = toggleCheck;
    host.querySelector('.bar').addEventListener('mousedown', function (e) {
      if (e.button !== 0 || e.target.tagName === 'BUTTON') return;
      var r = host.getBoundingClientRect(), sx = e.clientX, sy = e.clientY;
      var mv = function (ev) { host.style.left = Math.max(0, r.left + ev.clientX - sx) + 'px'; host.style.top = Math.max(0, r.top + ev.clientY - sy) + 'px'; };
      var up = function () { window.removeEventListener('mousemove', mv, true); window.removeEventListener('mouseup', up, true); };
      window.addEventListener('mousemove', mv, true); window.addEventListener('mouseup', up, true);
    });
    try { chkRender(); } catch (e) { console.error('[snap] kiem tra', e); _chk.body.textContent = 'LỖI: ' + (e && e.message || e); }
  }
  window.__toggleCheck = toggleCheck; window.__chkScan = chkScan;

  /* ── BỘ LỌC BOX (phím 9): điều khiển bộ lọc CÓ SẴN của nền tảng (nút phễu -> hộp thoại Filter) ── */
  var _fp = null;

/* ============================================================
 * @MODULE[9]  BỘ LỌC BOX
 * Phím: 9 (keyFilterPanel)
 * fpRoots, fpFind, fpFunnel, fpFibers,
 * fpBuild, fpApply, toggleFilterPanel
 * ============================================================ */
  function fpRoots() {
    var out = [document];
    /* đi lên các trang cha cùng origin (tool có thể chạy trong iframe còn nút phễu ở trang ngoài) */
    try { var w = window, g = 0; while (w.parent && w.parent !== w && g++ < 6) { w = w.parent; if (w.document && out.indexOf(w.document) < 0) out.push(w.document); } } catch (e) {}
    out.slice().forEach(function (d) { (function walk(doc) {
      var els = doc.querySelectorAll('*');
      for (var k = 0; k < els.length; k++) {
        var el = els[k];
        if (el.shadowRoot) { out.push(el.shadowRoot); walk(el.shadowRoot); }
        if (el.tagName === 'IFRAME') { try { if (el.contentDocument) { out.push(el.contentDocument); walk(el.contentDocument); } } catch (e) {} }
      }
    })(d); });
    return out;
  }
  function fpFind(sel, test) {
    var rs = fpRoots();
    for (var a = 0; a < rs.length; a++) {
      var l = rs[a].querySelectorAll(sel);
      for (var b = 0; b < l.length; b++) if (!test || test(l[b])) return l[b];
    }
    return null;
  }
  /* nút phễu của nền tảng: button.lidar-annotation-filter (trong .filter-wrapper cạnh ô "Filter Classes") */
  function fpFunnel() {
    return fpFind('button.lidar-annotation-filter') || fpFind('.filter-wrapper button') || fpFind('.filter-wrapper');
  }
  /* Lấy onChange + filterResult hiện tại của bộ lọc nền tảng từ React fiber của nút phễu (không mở hộp thoại) */
  function fpFibers() {
    var b = fpFunnel(); if (!b) return null;
    var fk = Object.keys(b).filter(function (k) { return /^__reactFiber\$|^__reactInternalInstance\$/.test(k); })[0];
    var f0 = fk && b[fk], ar = null, par = null;
    [f0, f0 && f0.alternate].forEach(function (f) {
      var n = 0;
      while (f && n++ < 80) {
        var p = f.memoizedProps || {};
        if (!ar && ('defaultFilterResult' in p) && typeof p.onChange === 'function') ar = p;
        if (!par && 'filterResult' in p && 'searchResults' in p) par = p;
        f = f.return;
      }
    });
    return ar ? { ar: ar, par: par } : null;
  }
  /* khóa: name|S|type|S|valueType|S|label ; giá trị: khóa|S|value|S|label(option) — đúng định dạng nền tảng tự sinh */
  function fpBuild(C, sel, scope) {
    var fields = cfgFields(C.V.labelConfig).concat(cfgFields(C.V.instanceLabelConfig)), cube = {};
    Object.keys(sel).forEach(function (name) {
      var vals = sel[name]; if (!vals || !vals.length) return;
      var f = fields.filter(function (x) { return x.name === name; })[0];
      if (!f) throw new Error('không thấy trường ' + name);
      var key = [f.name, f.type, f.valueType, f.label].join('|S|');
      cube[key] = vals.map(function (v) {
        var o = (f.options || []).filter(function (op) { return String(op.value) === String(v); })[0];
        return [key, v, o ? o.label : v].join('|S|');
      });
    });
    return { filterScope: scope || 'current_frame', filterComponentType: 'three', filterAttrCast: {}, filterAttrCube: cube };
  }
  var FILTERS = [
    { label: 'CIPO 3',      field: 'CIPO',         val: 'CIPO3' },
    { label: 'CIPO 4',      field: 'CIPO',         val: 'CIPO4' },
    { label: '<30%',        field: 'occlusion',    val: 'slightly occluded' },
    { label: '30-70%',      field: 'occlusion',    val: 'occluded' },
    { label: 'Chuyển động', field: 'motion_state', val: 'moving' },
    { label: 'Đứng im',     field: 'motion_state', val: 'parked' }
  ];
  /* sel = { tên trường: [giá trị,...] } ; rỗng = bỏ lọc. Trả về chuỗi lỗi hoặc '' */
  function fpApply(sel) {
    var C = ctx(); if (!C) return 'Tool chưa sẵn sàng (ctx rỗng)';
    var btn = fpFunnel(); if (!btn) return 'Bước 1: không thấy nút phễu button.lidar-annotation-filter';
    var fb = fpFibers(); if (!fb) return 'Bước 2: thấy nút phễu nhưng không thấy onChange trong React fiber';
    var scope = fb.par && fb.par.filterResult && fb.par.filterResult.filterScope, fr = null;
    try { fr = fpBuild(C, sel, scope); console.log('[snap] filter ->', JSON.stringify(fr), '| parent:', !!fb.par); fb.ar.onChange(fr); }
    catch (e) { console.warn('[snap] filter', e); return 'Lỗi: ' + (e && e.message || e); }
    window.__fpLast = fr;
    return '';
  }

  function toggleFilterPanel() {
    if (_fp) { _fp.host.remove(); _fp = null; return; }
    var host = document.createElement('div');
    host.className = '__snapFP';
    host.style.cssText = 'position:fixed !important;z-index:2147483641 !important;left:0;bottom:0;background:#fff8fb;color:#4a2f3b;font:12px Segoe UI,Arial,sans-serif;border:1px solid #f1c4d5;border-top-right-radius:10px;box-shadow:0 -4px 18px rgba(120,60,90,.18);user-select:none;white-space:nowrap';
    var BT  = 'cursor:pointer;border:1px solid #efc3d3;border-radius:6px;padding:3px 9px;font:11px Segoe UI,Arial,sans-serif;background:#fff;color:#7a3552;transition:background .13s;white-space:nowrap';
    var BTA = 'cursor:pointer;border:1px solid #c05070;border-radius:6px;padding:3px 9px;font:11px Segoe UI,Arial,sans-serif;background:#f5b8cc;color:#5a1030;font-weight:700;box-shadow:0 0 0 2px #f090b0;transition:background .13s;white-space:nowrap';
    host.innerHTML =
      '<style>.__snapFP button:hover{background:#fde4ee !important}</style>'
      + '<div class="bar" style="display:flex;align-items:center;gap:5px;padding:5px 8px;flex-wrap:nowrap">'
      +   '<b style="color:#b0537c;font-size:11px;margin-right:2px">🔍</b>'
      +   '<div class="btns" style="display:flex;align-items:center;gap:5px;flex-wrap:nowrap"></div>'
      +   '<div class="status" style="font-size:10px;color:#b0879a;margin-left:4px;white-space:nowrap"></div>'
      +   '<button class="clr" style="' + BT + ';margin-left:4px">✕ lọc</button>'
      +   '<button class="x" style="' + BT + '">✕</button>'
      + '</div>';
    ['mousedown','wheel','contextmenu','keydown'].forEach(function (ev) {
      host.addEventListener(ev, function (e) { e.stopPropagation(); });
    });
    document.body.appendChild(host);

    /* sel: cùng trường -> "hoặc" (CIPO 3 + CIPO 4), khác trường -> "và" (CIPO 3 + Chuyển động) */
    var sel = {};
    var btns = host.querySelector('.btns'), status = host.querySelector('.status');
    function has(fil) { return (sel[fil.field] || []).indexOf(fil.val) >= 0; }
    function paint() { [].forEach.call(btns.children, function (b, k) { b.style.cssText = has(FILTERS[k]) ? BTA : BT; }); }
    function names() { return FILTERS.filter(has).map(function (x) { return x.label; }).join(' + '); }
    function run() {
      var e = '';
      console.log('[snap] filter click, sel =', JSON.stringify(sel));
      try { e = fpApply(sel); } catch (ex) { e = 'Lỗi: ' + (ex && ex.message || ex); console.warn('[snap] filter', ex); }
      status.textContent = e ? e : (names() ? 'Đã gửi lọc: ' + names() : 'Đã gửi bỏ lọc');
      status.style.color = e ? '#c0392b' : '#b0879a';
      paint();
    }
    FILTERS.forEach(function (fil) {
      var b = document.createElement('button');
      b.textContent = fil.label; b.style.cssText = BT;
      b.onclick = function () {
        var arr = sel[fil.field] || (sel[fil.field] = []), k = arr.indexOf(fil.val);
        if (k >= 0) arr.splice(k, 1); else arr.push(fil.val);
        if (!arr.length) delete sel[fil.field];
        run();
      };
      btns.appendChild(b);
    });
    _fp = { host: host };
    host.querySelector('.clr').onclick = function () { sel = {}; run(); };
    host.querySelector('.x').onclick = function () { _fp.host.remove(); _fp = null; };
    host.querySelector('.bar').addEventListener('mousedown', function (e) {
      if (e.button !== 0 || e.target.tagName === 'BUTTON') return;
      var r = host.getBoundingClientRect(), sx = e.clientX, sy = e.clientY;
      var mv = function (ev) {
        host.style.right = 'auto';
        host.style.left = Math.max(0, r.left + ev.clientX - sx) + 'px';
        host.style.top  = Math.max(0, r.top  + ev.clientY - sy) + 'px';
      };
      var up = function () { window.removeEventListener('mousemove', mv, true); window.removeEventListener('mouseup', up, true); };
      window.addEventListener('mousemove', mv, true); window.addEventListener('mouseup', up, true);
    });
  }
  window.__toggleFilterPanel = toggleFilterPanel; window.__fpApply = fpApply; window.__fpFibers = fpFibers; window.__fpFunnel = fpFunnel;

/* ============================================================
 * @MODULE[left/right]  CHUYỂN ID
 * Phím: arrowright (keyNextId) · arrowleft (keyPrevId)
 * boxPointCount, gotoBestFrame, afterSelect,
 * sidebarTiles, tileId, selectNeighbor
 * ============================================================ */
  function boxPointCount(C, id, f) {
    var cube = C.S.instancesTree[id] && C.S.instancesTree[id].cubes[f]; if (!cube) return null;
    var pc = cube.pointCount; if (pc && typeof pc.lidar === 'number' && pc.lidar > 0) return pc.lidar;
    var fp = framePoints(C, f);
    if (fp) {
      var P = fp.pts, R = eulerMat(cube.rotation), c = cube.position, h = [cube.dimension.x / 2, cube.dimension.y / 2, cube.dimension.z / 2];
      var rr = Math.sqrt(h[0] * h[0] + h[1] * h[1] + h[2] * h[2]), n = 0;
      for (var i = 0, m = P.length / 3; i < m; i++) {
        var dx = P[3 * i] - c.x, dy = P[3 * i + 1] - c.y, dz = P[3 * i + 2] - c.z;
        if (dx > rr || dx < -rr || dz > rr || dz < -rr || dy > rr || dy < -rr) continue;
        var l = mulTV(R, [dx, dy, dz]);
        if (Math.abs(l[0]) <= h[0] && Math.abs(l[1]) <= h[1] && Math.abs(l[2]) <= h[2]) n++;
      }
      return n;
    }
    return pc && typeof pc.lidar === 'number' ? pc.lidar : null;
  }
  function gotoBestFrame(C, id, force) {
    if (!C || id == null || !C.S.instancesTree[id]) return;
    var fr = trackFrames(C.S, id);
    if (!fr || !fr.length) return;
    var best = null, cur = curFrame(C);
    fr.forEach(function (f) {
      var n = boxPointCount(C, id, f);
      if (n != null && (!best || n > best.n || (n === best.n && f === cur))) best = { f: f, n: n };
    });
    if (!best) return toast('Không đếm được điểm lidar của id này (frame chưa tải?)', 2500);
    if (best.f !== cur || force) chkJump(C, id, best.f);
    toast('Frame nhiều điểm lidar nhất: ' + (best.f + 1) + ' (' + best.n + ' điểm, ' + fr.length + ' keyframe)', 2000);
  }
  window.__gotoBestFrame = function () { var C = ctx(); C && gotoBestFrame(C, selIdAny(C), true); };
  function afterSelect(want) {
    var tries = 0;
    (function poll() {
      var C = ctx(); if (!C) return;
      var id = selIdAny(C);
      if (id != null && (want == null || String(id) === String(want))) return gotoBestFrame(C, id, selectedId(C) == null);
      if (want != null && tries >= 10 && C.S.instancesTree[want]) return gotoBestFrame(C, want, true);
      if (++tries < 40) setTimeout(poll, 25);
    })();
  }
  function sidebarTiles() {
    var all = [].slice.call(document.querySelectorAll('.b-ShapeLabel'));
    var cubes = all.filter(function (el) { return /-cube$/.test(el.id || ''); });
    var list = cubes.length ? cubes : all;
    if (!list.length) list = [].slice.call(document.querySelectorAll('.b-Sidebar__category-group'));
    return list.filter(function (el) { return el.offsetParent !== null; });
  }
  function tileId(el) { var m = String(el.id || '').match(/^(.*)-(cube|cast)/); return m ? m[1] : null; }
  function selectNeighbor(dir) {
    var C = ctx(); if (!C) return toast('Tool chua san sang');
    var tiles = sidebarTiles(); if (!tiles.length) return toast('Không thấy danh sách đối tượng ở thanh bên', 3000);
    var sel = selectedId(C), cur = -1;
    for (var i = 0; i < tiles.length; i++) {
      if (/--selected/.test(tiles[i].className) || /category-group-selected/.test(tiles[i].className) || (sel != null && tileId(tiles[i]) === String(sel))) { cur = i; break; }
    }
    var n = tiles.length;
    for (var step = 1; step <= n; step++) {
      var j = cur < 0 ? (dir > 0 ? step - 1 : n - step) : (cur + dir * step + n * 2) % n;
      if (!CFG.nextWrap && cur >= 0 && (dir > 0 ? cur + step >= n : cur - step < 0)) break;
      var el = tiles[j];
      if (CFG.nextSkipHidden && /--hidden/.test(el.className)) continue;
      if (j === cur) break;
      el.scrollIntoView({ block: 'nearest' });
      el.click();
      if (CFG.nextBestFrame) afterSelect(tileId(el));
      return;
    }
    toast(dir > 0 ? 'Đã ở ô cuối danh sách' : 'Đã ở ô đầu danh sách', 1500);
  }
  window.__selectNeighbor = selectNeighbor;

/* ============================================================
 * @MODULE[v]  SÁT RÌA XE
 * Phím: v (keyEdge; mặc định trong CFG là ';', đổi trong alt+s) · shift+v (keyEdgeAll)
 * bodyEdges, estimateYaw, sideLineFit, sideLine,
 * edgeFit, doEdgeFit
 * ============================================================ */
  function bodyEdges(pts, D, axisLat) {
    var a = axisLat ? 0 : 2, v;
    if (axisLat) {
      var bins = {};
      pts.forEach(function (p) { var k = Math.floor(p[1] / CFG.edgeSlice); (bins[k] = bins[k] || []).push(p[0]); });
      var mins = [], maxs = [];
      Object.keys(bins).forEach(function (k) {
        var b = bins[k]; if (b.length < 3) return;
        b.sort(function (x, y) { return x - y; });
        mins.push(b[1]); maxs.push(b[b.length - 2]);
      });
      if (mins.length < 3) return null;
      mins.sort(function (x, y) { return x - y; });
      maxs.sort(function (x, y) { return y - x; });
      var cut = Math.min(mins.length - 1, Math.floor(mins.length * CFG.mirrorIgnore));
      var lo = mins[cut], hi = maxs[cut];
      v = pts.map(function (p) { return p[0]; });
      return finishEdges(v, lo, hi);
    }
    v = pts.map(function (p) { return p[2]; }).sort(function (x, y) { return x - y; });
    if (v.length < 5) return null;
    var k2 = Math.min(Math.floor((v.length - 1) / 2), CFG.edgeDrop);
    return finishEdges(v, v[k2], v[v.length - 1 - k2]);
  }
  function finishEdges(v, lo, hi) {
    var B = 0.3, nLo = 0, nHi = 0;
    v.forEach(function (x) { if (x <= lo + B && x >= lo - 0.05) nLo++; if (x >= hi - B && x <= hi + 0.05) nHi++; });
    return { lo: lo, hi: hi, nLo: nLo, nHi: nHi };
  }
  function estimateYaw(pts, h0) {
    if (pts.length < 30) return null;
    var step = Math.max(1, Math.floor(pts.length / 2500)), P = [];
    for (var i = 0; i < pts.length; i += step) P.push(pts[i]);
    var d0 = 0.02, maxR = CFG.edgeYawMax * Math.PI / 180;
    function score(th) {
      var cs = Math.cos(th), sn = Math.sin(th), a = [], b = [];
      for (var i = 0; i < P.length; i++) { a.push(P[i][0] * cs - P[i][1] * sn); b.push(P[i][0] * sn + P[i][1] * cs); }
      var as = a.slice().sort(function (x, y) { return x - y; }), bs = b.slice().sort(function (x, y) { return x - y; });
      var q = Math.min(2, Math.floor(P.length / 10)), a0 = as[q], a1 = as[as.length - 1 - q], b0 = bs[q], b1 = bs[bs.length - 1 - q], sc = 0;
      for (var j = 0; j < P.length; j++) {
        var da = Math.min(Math.abs(a1 - a[j]), Math.abs(a[j] - a0)), db = Math.min(Math.abs(b1 - b[j]), Math.abs(b[j] - b0));
        sc += 1 / Math.max(Math.min(da, db), d0);
      }
      return sc;
    }
    var best = null;
    for (var dg = -maxR; dg <= maxR + 1e-9; dg += Math.PI / 180) { var s1 = score(h0 + dg); if (!best || s1 > best.s) best = { d: dg, s: s1 }; }
    var lo = best.d - Math.PI / 180, hi = best.d + Math.PI / 180;
    for (var dd = lo; dd <= hi + 1e-9; dd += Math.PI / 1800) { var s2 = score(h0 + dd); if (s2 > best.s) best = { d: dd, s: s2 }; }
    return best.d;
  }
  function sideLineFit(E) {
    if (E.length < 4) return null;
    var xs = E.map(function (e) { return e[1]; }).sort(function (p, q) { return p - q; }), a = xs[xs.length >> 1], b = 0, tol = [0.3, 0.15, 0.08, 0.06, 0.06], inl = E;
    for (var t = 0; t < tol.length; t++) {
      var a0 = a, b0 = b;
      inl = E.filter(function (e) { return Math.abs(e[1] - (a0 + b0 * e[0])) <= tol[t]; });
      if (inl.length < 4) return null;
      var n = inl.length, sz = 0, sx = 0, szz = 0, szx = 0;
      inl.forEach(function (e) { sz += e[0]; sx += e[1]; szz += e[0] * e[0]; szx += e[0] * e[1]; });
      var den = n * szz - sz * sz; if (den < 1e-6) return null;
      b = (n * szx - sz * sx) / den; a = (sx - b * sz) / n;
    }
    var a1 = a, b1 = b;
    inl = E.filter(function (e) { return Math.abs(e[1] - (a1 + b1 * e[0])) <= 0.06; });
    return { a: a, b: b, inl: inl };
  }
  function sideLine(P, Fl, c, rot, d, W) {
    var R = eulerMat(rot), hx = d.x / 2, hy = d.y / 2, hz = d.z / 2, CZ = CFG.sideCell || 0.25, nz = Math.max(1, Math.ceil(2 * hz / CZ)), SD = { '-1': [], '1': [] }, k;
    for (k = 0; k < nz; k++) { SD['-1'].push([]); SD['1'].push([]); }
    for (var i = 0, n = P.length / 3; i < n; i++) {
      if (Fl && Fl[i]) continue;
      var l = mulTV(R, [P[3 * i] - c.x, P[3 * i + 1] - c.y, P[3 * i + 2] - c.z]), hb = l[1] + hy;
      if (hb < CFG.sideLowCut || hb > d.y + 0.05) continue;
      var ax = Math.abs(l[0]); if (ax < hx * 0.5 || ax > hx + W || Math.abs(l[2]) > hz) continue;
      SD[l[0] < 0 ? '-1' : '1'][Math.min(nz - 1, Math.floor((l[2] + hz) / CZ))].push(ax);
    }
    var best = null, need = Math.max(4, Math.ceil((CFG.sideMinCover || 0.3) * nz)), maxB = Math.tan(CFG.edgeYawMax * Math.PI / 180);
    [-1, 1].forEach(function (sg) {
      var E = [];
      SD[String(sg)].forEach(function (arr, kz) {
        if (arr.length < 3) return;
        arr.sort(function (p, q) { return q - p; });
        for (var j = 0; j + 2 < arr.length; j++) if (arr[j] - arr[j + 2] <= 0.08) {
          var cnt = 0; for (var q = j; q < arr.length && arr[j] - arr[q] <= 0.1; q++) cnt++;
          E.push([-hz + (kz + 0.5) * CZ, sg * arr[j], cnt]); return;
        }
      });
      var fit = sideLineFit(E); if (!fit || fit.inl.length < need || Math.abs(fit.b) > maxB) return;
      var score = fit.inl.reduce(function (sum, e) { return sum + e[2]; }, 0);
      var off = 0;
      var sp = 0, np = 0;
      fit.inl.forEach(function (e) { var r = sg * (e[1] - (fit.a + fit.b * e[0])); if (r > 0) { sp += r; np++; } });
      off = Math.min(np ? sp / np : 0, +CFG.sideOutMax || 0.04) + (+CFG.sideMargin || 0);
      if (!best || score > best.score) best = { s: sg, a: fit.a + sg * off, b: fit.b, score: score, cells: fit.inl.length };
    });
    return best;
  }
  window.__sideLine = sideLine;
  function edgeFit(C, id, f, parts) {
    parts = parts || { yaw: true, lat: true, lon: true };
    var S = C.S, cube = S.instancesTree[id] && S.instancesTree[id].cubes[f];
    if (!cube) return { why: 'không có keyframe' };
    var fp = framePoints(C, f); if (!fp) return { why: 'chưa tải điểm lidar' };
    var rot = cube.rotation, c = cube.position, d = cube.dimension, hx = d.x / 2, hy = d.y / 2, hz = d.z / 2, yawDeg = 0;
    var W = CFG.edgeMaxShift, P = fp.pts, Fl = fp.flags, lat = [], lon = [];
    var SL = null;
    if (parts.yaw || parts.lat) {
      SL = sideLine(P, Fl, c, rot, d, W + 0.1);
      if (SL && parts.yaw && (CFG.edgeAlignYaw || parts.force)) {
        var ph = Math.atan(SL.b);
        if (Math.abs(ph) >= CFG.edgeYawMin * Math.PI / 180) {
          rot = setHeading(rot, heading(rot) + ph); yawDeg = ph * 180 / Math.PI;
          SL = sideLine(P, Fl, c, rot, d, W + 0.1);
        }
      }
    }
    if (!SL && !yawDeg && parts.yaw && (CFG.edgeAlignYaw || parts.force)) {
      var R0 = eulerMat(rot), ext = W + 0.4, pts2 = [];
      for (var i0 = 0, n0 = P.length / 3; i0 < n0; i0++) {
        if (Fl && Fl[i0]) continue;
        var v0 = [P[3 * i0] - c.x, P[3 * i0 + 1] - c.y, P[3 * i0 + 2] - c.z], l0 = mulTV(R0, v0);
        if (l0[1] < -hy + CFG.snapGround || l0[1] > hy + 0.1) continue;
        if (Math.abs(l0[0]) > hx + ext || Math.abs(l0[2]) > hz + ext) continue;
        pts2.push([v0[0], v0[2], l0[1] + hy]);
      }
      var band = pts2.filter(function (q) { return q[2] >= CFG.edgeYawBand[0] && q[2] <= CFG.edgeYawBand[1]; });
      if (band.length >= 30) pts2 = band;
      var h0 = heading(rot), dy = estimateYaw(pts2, h0);
      if (dy != null && Math.abs(dy) >= CFG.edgeYawMin * Math.PI / 180) { rot = setHeading(rot, h0 + dy); yawDeg = dy * 180 / Math.PI; }
    }
    var R = eulerMat(rot);
    for (var i = 0, n = P.length / 3; i < n; i++) {
      if (Fl && Fl[i]) continue;
      var l = mulTV(R, [P[3 * i] - c.x, P[3 * i + 1] - c.y, P[3 * i + 2] - c.z]);
      if (l[1] < -hy + CFG.snapGround || l[1] > hy + 0.1) continue;
      if (!SL && Math.abs(l[0]) <= hx + W && Math.abs(l[2]) <= hz + 0.1) lat.push(l);
      var hb = l[1] + hy;
      if (Math.abs(l[2]) <= hz + W && Math.abs(l[0]) <= hx + W && hb >= CFG.edgeYawBand[0] && hb <= CFG.edgeYawBand[1]) lon.push(l);
    }
    var sh = [0, 0, 0], info = [];
    if (parts.lat && SL) {
      var sxl = SL.a - SL.s * hx;
      if (Math.abs(sxl) <= W) { sh[0] = sxl; info.push(['trái', 'phải'][SL.s > 0 ? 1 : 0] + ' ' + (sxl >= 0 ? '+' : '') + (sxl * 100).toFixed(0) + 'cm (sườn, bỏ gương)'); }
    }
    [[0, lat, ['trái', 'phải']], [2, lon, ['đuôi', 'đầu']]].forEach(function (A) {
      var a = A[0]; if (a === 0 ? (!parts.lat || SL) : !parts.lon) return; var e = bodyEdges(A[1], a === 0 ? d.x : d.z, a === 0); if (!e) return;
      var D = a === 0 ? d.x : d.z, useHi = e.nHi >= e.nLo;
      if (e.hi - e.lo < 0.5 * D) useHi = (e.lo + e.hi) / 2 > 0;
      var s = useHi ? e.hi - D / 2 : e.lo + D / 2;
      if (Math.abs(s) > W) return;
      sh[a] = s; info.push(A[2][useHi ? 1 : 0] + ' ' + (s >= 0 ? '+' : '') + (s * 100).toFixed(0) + 'cm');
    });
    if (!info.length && !yawDeg) return { why: 'không thấy rìa xe trong ±' + W + ' m' };
    var w = mulV(R, sh);
    S.updateCubeMatrix(id, f, { position: { x: c.x + w[0], y: c.y + w[1], z: c.z + w[2] }, rotation: rot, dimension: d });
    if(CFG.markHuman&&S.changeCubeInterpolation)S.changeCubeInterpolation(id,f,false,'human');
    _calc(S,id,f);
    return { info: (yawDeg ? 'xoay ' + (yawDeg > 0 ? '+' : '') + yawDeg.toFixed(1) + '°, ' : '') + info.join(', ') };
  }
  window.__edgeFit = edgeFit;
  function doEdgeFit(all) {
    try {
      var C = ctx(); if (!C) return toast('Tool chua san sang');
      var id = selectedId(C); if (id == null) return toast('Chưa chọn box', 2500);
      var cur = curFrame(C), frames = all ? trackFrames(C.S, id) : [cur], ok = 0, skip = 0, last = null;
      frames.forEach(function (f) { var r = edgeFit(C, id, f); if (r.info) { ok++; if (f === cur || !last) last = r; } else { skip++; if (!all) last = r; } });
      try { C.S.emitViewRefresh && C.S.emitViewRefresh(); } catch (e) {}
      console.log('[snap] sat ria xe', { ok: ok, total: frames.length, skip: skip, last: last });
    } catch (e) { console.error('[snap] sat ria xe', e); toast('LỖI sát rìa xe: ' + (e && e.message || e), 5000); }
  }
  window.__doEdgeFit = doEdgeFit;

/* ============================================================
 * @MODULE[,/.]  KHÍT ĐẦU / KHÍT ĐUÔI
 * Phím: , (keyFitHead) · . (keyFitTail) · shift+, (keyFitHeadAll) · shift+. (keyFitTailAll)
 * endTarget, tailFit, tailFitFrames, doTail, tailKey
 * ============================================================ */
  function endTarget(zs, h2) {
    if (zs.length < 8) return null;
    var k0 = -1;
    for (var j = 0; j < zs.length; j++) if (zs[j] >= -h2) { k0 = j; break; }
    if (k0 < 0 || zs.length - k0 < 5) k0 = zs.length - 1;
    while (k0 > 0 && zs[k0] - zs[k0 - 1] < CFG.tailGap) k0--;
    for (var k = k0; k < zs.length; k++) {
      var cnt = 0; for (var q = k; q < zs.length && zs[q] - zs[k] <= 0.15; q++) cnt++;
      if (cnt >= 4) {
        var sc = 0; for (q = k; q < zs.length && zs[q] - zs[k] <= CFG.tailBand; q++) sc++;
        return { tz: zs[k], score: sc };
      }
    }
    return null;
  }
  function tailFit(C, id, f, mode) {
    var S = C.S, cube = S.instancesTree[id] && S.instancesTree[id].cubes[f]; if (!cube) return { why: 'không có box ở frame này' };
    var fp = framePoints(C, f); if (!fp) return { why: 'frame chưa tải điểm lidar' };
    var R = eulerMat(cube.rotation), c = cube.position, h = [cube.dimension.x / 2, cube.dimension.y / 2, cube.dimension.z / 2];
    var W = CFG.tailWin, P = fp.pts, F = fp.flags, bot = F ? -h[1] : -h[1] + CFG.snapGround, rz = [], fz = [];
    for (var i = 0, n = P.length / 3; i < n; i++) {
      if (F && F[i]) continue;
      var l = mulTV(R, [P[3 * i] - c.x, P[3 * i + 1] - c.y, P[3 * i + 2] - c.z]);
      if (l[1] < bot || l[1] > h[1] || Math.abs(l[0]) > h[0]) continue;
      if (l[2] >= -h[2] - W && l[2] <= h[2]) rz.push(l[2]);
      if (l[2] <= h[2] + W && l[2] >= -h[2]) fz.push(-l[2]);
    }
    var asc = function (a, b) { return a - b; };
    rz.sort(asc); fz.sort(asc);
    var opp = mode === 'opposite';
    var pm = mode === 'head' ? 'front' : mode === 'rear' ? 'rear' : CFG.tailPick;
    var rear = (opp || pm !== 'front') ? endTarget(rz, h[2]) : null, front = (opp || pm !== 'rear') ? endTarget(fz, h[2]) : null;
    var cand = [];
    if (rear) cand.push({ end: 'đuôi', sh: rear.tz + h[2], score: rear.score });
    if (front) cand.push({ end: 'đầu', sh: -(front.tz + h[2]), score: front.score });
    cand = cand.filter(function (o) { return Math.abs(o.sh) <= W; });
    var nm = mode === 'head' ? 'đầu xe' : mode === 'rear' ? 'đuôi xe' : 'đầu/đuôi xe';
    if (!cand.length) return { why: rear || front ? nm + ' lệch quá ' + W + ' m' : 'không thấy ' + nm };
    cand.sort(function (a, b) { return b.score - a.score; });
    var pick = cand[0], other = cand[1];
    if (opp) {
      var baseEnd = pm === 'rear' ? 'đuôi' : pm === 'front' ? 'đầu' : cand[0].end;
      pick = cand.filter(function (o) { return o.end !== baseEnd; })[0];
      other = cand.filter(function (o) { return o.end === baseEnd; })[0];
      if (!pick) return { why: 'không thấy ' + (baseEnd === 'đuôi' ? 'đầu' : 'đuôi') + ' để khít (mặt ngược lại)' };
    }
    var sh = pick.sh;
    var why = (opp ? 'NGƯỢC: ' : '') + pick.end + (other ? ' (' + pick.score + ' điểm vs ' + other.end + ' ' + other.score + ')' : '');
    if (Math.abs(sh) < 0.005) return { info: 'đã khít ' + why, moved: 0, end: pick.end };
    var w = mulV(R, [0, 0, sh]);
    S.updateCubeMatrix(id, f, { position: { x: c.x + w[0], y: c.y + w[1], z: c.z + w[2] }, rotation: cube.rotation, dimension: cube.dimension });
    if(CFG.markHuman&&S.changeCubeInterpolation)S.changeCubeInterpolation(id,f,false,'human');
    _calc(S,id,f);
    return { info: 'khít ' + why + ' ' + (sh >= 0 ? '+' : '') + (sh * 100).toFixed(0) + 'cm', moved: sh, end: pick.end };
  }
  window.__tailFit = tailFit;
  var _frameRun = null;
  function rawPts(C, f) { var fp = framePoints(C, f); return fp ? fp.lidar.geometry.attributes.position.array : null; }
  function runOnFrames(id, frames, work, done, progress) {
    if (_frameRun) return toast('Đang chạy, đợi xong đã…', 2000);
    var C = ctx(), V = C.V, orig = curFrame(C), i = 0, out = [], moved = false, run = _frameRun = {};
    var selType = function () { var um = V.unitedMode || (V.props && V.props.unitedMode); return (um === 'UNITED_ADDING' || um === 'UNITED_MANUAL') ? 'cube' : 'combined'; };
    var reselect = function (soft) { try { if (soft && V.state && String(V.state.selectedShape) === String(id)) return; V.setSelectedShape(id, selType()); } catch (e) {} };
    var finish = function () {
      var end = function () {
        _frameRun = null; reselect(!moved);
        var fin = function () { try { var Cx = ctx(); Cx && Cx.S.emitViewRefresh && Cx.S.emitViewRefresh(); } catch (e) {} done(out); };
        if (moved) setTimeout(fin, 120); else fin();
      };
      if (!moved || curFrame(ctx()) === orig) return end();
      var p = null; try { p = V.loadFrame(orig, 'bar'); } catch (e) {}
      if (p && p.then) p.then(function () { setTimeout(end, 50); }, end); else setTimeout(end, 300);
    };
    var next = function () {
      if (_frameRun !== run) return;
      if (i >= frames.length) return finish();
      var f = frames[i++], C1 = ctx();
      if (progress) progress(i, frames.length, f);
      if (curFrame(C1) === f || (C1.L && C1.L.pointsObjectMap && C1.L.pointsObjectMap[f] && rawPts(C1, f))) {
        try { out.push({ f: f, r: work(C1, f) }); } catch (e) { out.push({ f: f, r: { why: 'lỗi ' + (e && e.message) } }); }
        return setTimeout(next, 0);
      }
      var prev = rawPts(C1, curFrame(C1)), t0 = Date.now(); moved = true;
      try { V.loadFrame(f, 'bar'); } catch (e) { console.warn('[snap] loadFrame', f, e); }
      (function wait() {
        if (_frameRun !== run) return;
        var C2 = ctx();
        if (curFrame(C2) === f) { reselect(); var pts = rawPts(C2, f);
          if (pts && (pts !== prev || Date.now() - t0 > 1500)) {
            return setTimeout(function () { var C3 = ctx(); try { out.push({ f: f, r: work(C3, f) }); } catch (e) { out.push({ f: f, r: { why: 'lỗi ' + (e && e.message) } }); } next(); }, 30);
          }
        }
        if (Date.now() - t0 > 5000) { out.push({ f: f, r: { why: 'không tải được điểm lidar' } }); return next(); }
        setTimeout(wait, 50);
      })();
    };
    next();
  }
  function tailFitFrames(C, id, frames, title, mode) {
    runOnFrames(id, frames, function (C1, f) { return tailFit(C1, id, f, mode); }, function (list) {
      var ok = 0, skip = [], last = null;
      var nf = 0, nr = 0;
      list.forEach(function (o) { if (o.r.info) { ok++; last = o.r; if (o.r.end === 'đầu') nf++; else nr++; } else skip.push((o.f + 1) + ': ' + o.r.why); });
      var _c=ctx();if(_c)_emit(_c.S);
      if (skip.length) console.log('[snap] keo duoi bo qua', skip);
      info(title + ': khít ' + ok + '/' + frames.length + ' frame (' + nr + ' theo đuôi, ' + nf + ' theo đầu)' + (skip.length ? ' (' + skip.length + ' bỏ qua: ' + skip[0] + (skip.length > 1 ? '…' : '') + ')' : '')
        + (frames.length === 1 && last ? ' – ' + last.info : ''), 4000);
    }, function (k, n, f) { if (n > 1 && (k === 1 || k % 5 === 0)) info(title + ': đang khít đầu/đuôi frame ' + (f + 1) + ' (' + k + '/' + n + ')…', 1200); });
  }
  function doTail(all, mode) {
    try {
      var C = ctx(); if (!C) return toast('Tool chưa sẵn sàng');
      var id = selectedId(C); if (id == null) return toast('Chưa chọn box', 2500);
      var cur = curFrame(C), fr = all ? trackFrames(C.S, id) : [cur];
      if (!fr.length) return toast('Không có keyframe nào', 2500);
      var tn = mode === 'head' ? 'khít đầu' : mode === 'rear' ? 'khít đuôi' : 'khít đầu/đuôi';
      var r = recBegin(all ? tn + ' mọi keyframe' : tn + ' frame ' + (cur + 1));
      tailFitFrames(C, id, fr, (all ? 'Mọi keyframe' : 'Frame ' + (cur + 1)) + ' – ' + tn, mode);
      recEnd(r);
    } catch (e) { console.error('[snap] keo duoi', e); toast('LỖI kéo đuôi: ' + (e && e.message || e), 5000); }
  }
  function tailKey(all, mode) { doTail(all, mode); }
  window.__doTail = doTail;

/* ============================================================
 * @MODULE[alt+a]  ĐỒNG NHẤT KÍCH THƯỚC (alt+u)
 * Phím: alt+u (keyUnifyTail, đồng nhất kích thước + khít đầu/đuôi)
 * anchorSigns, anchorPos, sizeFix, hookUnify,
 * doUnifyTail,
 * ============================================================ */
  function anchorSigns(C, id, f, p) {
    var sg = [0, -1, 0], fp = framePoints(C, f); if (!fp || !p) return sg;
    var R = eulerMat(p.rot), h = [p.dim.x / 2, p.dim.y / 2, p.dim.z / 2], P = fp.pts, F = fp.flags, B = 0.3, c = p.pos, cnt = [[0, 0], [0, 0], [0, 0]];
    for (var i = 0, n = P.length / 3; i < n; i++) {
      if (F && F[i]) continue;
      var l = mulTV(R, [P[3 * i] - c.x, P[3 * i + 1] - c.y, P[3 * i + 2] - c.z]);
      if (Math.abs(l[0]) > h[0] || Math.abs(l[1]) > h[1] || Math.abs(l[2]) > h[2]) continue;
      if (!F && l[1] < -h[1] + CFG.snapGround) continue;
      [0, 2].forEach(function (a) { if (l[a] >= h[a] - B) cnt[a][1]++; if (l[a] <= -h[a] + B) cnt[a][0]++; });
    }
    [0, 2].forEach(function (a) { sg[a] = cnt[a][1] > cnt[a][0] ? 1 : cnt[a][0] > cnt[a][1] ? -1 : 0; });
    return sg;
  }
  function anchorPos(p, nd, sg) {
    var R = eulerMat(p.rot), od = [p.dim.x, p.dim.y, p.dim.z], nn = [nd.x, nd.y, nd.z], off = [0, 0, 0];
    for (var a = 0; a < 3; a++) off[a] = (sg[a] || 0) * (od[a] / 2 - nn[a] / 2);
    var w = mulV(R, off);
    return { x: p.pos.x + w[0], y: p.pos.y + w[1], z: p.pos.z + w[2] };
  }
  window.__anchorSigns = anchorSigns;
  function sizeFix(id, before, opts, force, sg) {
    var C2 = ctx(), t = C2 && C2.S.instancesTree[id]; if (!t) return;
    var S = C2.S, ch = [], fixed = 0, doFix = CFG.keepAnchor || !!opts.lockW;
    Object.keys(before).map(Number).forEach(function (f) {
      var c = t.cubes[f], b = before[f]; if (!c) return;
      var tgt = opts.lockW ? { x: opts.lockW, y: b.dim.y, z: b.dim.z } : vec3(c.dimension);
      if (Math.abs(tgt.x - b.dim.x) > 1e-6 || Math.abs(tgt.y - b.dim.y) > 1e-6 || Math.abs(tgt.z - b.dim.z) > 1e-6) ch.push(f);
      if (!doFix) return;
      var np = anchorPos(b, tgt, sg), rotD = Math.abs(c.rotation.x - b.rot.x) + Math.abs(c.rotation.y - b.rot.y) + Math.abs(c.rotation.z - b.rot.z);
      var posD = Math.abs(c.position.x - np.x) + Math.abs(c.position.y - np.y) + Math.abs(c.position.z - np.z);
      if (sameDim(c.dimension, tgt) && posD < 1e-6 && rotD < 1e-6) return;
      S.updateCubeMatrix(id, f, { position: np, rotation: b.rot, dimension: tgt });
      if(CFG.markHuman&&S.changeCubeInterpolation)S.changeCubeInterpolation(id,f,false,'human');
      _calc(S,id,f);
      fixed++;
    });
    _emit(S);
    try { C2.V.gridView && C2.V.gridView.current && C2.V.gridView.current.updateAllFramesCube(); } catch (e) {}
    if (opts.after) opts.after(ch.length, Object.keys(before).length, sg);
    else if (CFG.keepAnchor && ch.length) info('Đồng nhất kích thước: ' + ch.length + ' keyframe, giữ nguyên mặt ' + anchorText(sg) + '.', 3000);
    if (!opts.noTail && ch.length && (force || CFG.tailAfterUnify)) tailFitFrames(C2, id, ch, 'Đồng nhất kích thước');
    else if (!opts.noTail && force && !ch.length) toast('Đồng nhất kích thước: không có frame nào đổi kích thước → không cần khít đầu/đuôi', 3000);
  }
  function anchorText(sg) {
    var p = [];
    if (sg[0]) p.push(sg[0] > 0 ? 'phải' : 'trái');
    if (sg[2]) p.push(sg[2] > 0 ? 'đầu' : 'đuôi');
    p.push('đáy');
    return p.join(', ');
  }
  function hookUnify() {
    var V = window.view;
    if (!V || typeof V.applyCubeSizeToOther !== 'function' || V.applyCubeSizeToOther.__tailHook) return;
    var orig = V.applyCubeSizeToOther;
    var run = function (self, args, force, opts) {
      opts = opts || {};
      var C = ctx(), id = C && selectedId(C), before = opts.before || {}, sg = opts.signs, r = null, res, err = null;
      if (id != null && C.S.instancesTree[id]) {
        if (!opts.before) trackFrames(C.S, id).forEach(function (f) { var c = C.S.instancesTree[id].cubes[f]; before[f] = { dim: vec3(c.dimension), pos: vec3(c.position), rot: vec3(c.rotation) }; });
        var cf = curFrame(C);
        if (!sg) sg = CFG.keepAnchor && before[cf] ? anchorSigns(C, id, cf, before[cf]) : [0, 0, 0];
        r = opts.rec || recBegin('đồng nhất kích thước');
      }
      try { res = orig.apply(self, args || []); } catch (e) { err = e; }
      if (id != null) {
        if (CFG.keepAnchor || force || CFG.tailAfterUnify || opts.lockW) setTimeout(function () {
          try { sizeFix(id, before, opts, force, sg); } catch (e) { console.error('[snap] sau dong nhat kich thuoc', e); } finally { recEnd(r); }
        }, 60);
        else recEnd(r);
      }
      if (err) throw err;
      return res;
    };
    var wrapped = function () { return run(this, arguments, false); };
    wrapped.__tailHook = true; wrapped.__run = function (opts) { return run(V, [], true, opts); };
    V.applyCubeSizeToOther = wrapped;
  }
  function doUnifyTail() {
    var C = ctx(); if (!C) return toast('Tool chưa sẵn sàng');
    if (selectedId(C) == null) return toast('Chưa chọn box', 2500);
    hookUnify();
    var f = C.V.applyCubeSizeToOther;
    if (!f || !f.__run) return toast('Tool không có chức năng đồng nhất kích thước', 3000);
    f.__run();
  }
  window.__doUnifyTail = doUnifyTail;
  // Tính bounding box điểm mây của box ở frame f, trong hệ tọa độ local của box.

/* ============================================================
 * @MODULE[delete/i/alt+f]  XOÁ ID / CHIỀU RỘNG / ĐỒNG BỘ CHIỀU
 * Phím: delete (keyDeleteAll) · i (keyWidth) · alt+f (keyDirAll)
 * allFrames, removeFrames, doDeleteSelected,
 * doWidthAll, doDirAll, rotWithHeading, rotLocalYaw
 * ============================================================ */
  function allFrames(C, id) {
    var S = C.S, V = C.V, n = S.dataLength || S.frameLength || V.frameLength || 0, fr = [];
    for (var f = 0; f < n; f++) fr.push(f);
    return fr.length ? fr : trackFrames(S, id);
  }
  function removeFrames(C, id, frames, done) {
    var S = C.S, V = C.V, tries = 0;
    if (typeof V.removeCubeFromFrames !== 'function' || typeof V.setSelectedShape !== 'function') return done({ err: 'tool không có chức năng xoá (removeCubeFromFrames)' });
    function go() {
      try { V.removeCubeFromFrames(frames); } catch (e) { console.warn('[snap] xoa id', id, e); return done({ err: (e && e.message) || String(e) }); }
      var t = S.instancesTree[id];
      done({ left: t && t.cubes ? Object.keys(t.cubes).length : 0 });
    }
    if (V.state && String(V.state.selectedShape) === String(id)) return go();
    var um = V.unitedMode || (V.props && V.props.unitedMode);
    try { V.setSelectedShape(id, (um === 'UNITED_ADDING' || um === 'UNITED_MANUAL') ? 'cube' : 'combined'); } catch (e) { console.warn('[snap] chon id', id, e); }
    (function w() { if ((V.state && String(V.state.selectedShape) === String(id)) || tries > 20) return go(); tries++; setTimeout(w, 10); })();
  }
  function doDeleteSelected() {
    try {
      var C = ctx(); if (!C) return toast('Tool chua san sang');
      var S = C.S, V = C.V, id = selectedId(C); if (id == null) return toast('Chưa chọn box cần xoá', 2500);
      var tree = S.instancesTree[id]; if (!tree) return toast('Không tìm thấy id ' + id, 3000);
      var cat = treeCategory(tree), num = tree.number, before = trackFrames(S, id).length;
      removeFrames(C, id, allFrames(C, id), function (r) {
        if (r.err) return toast('LỖI xoá id: ' + r.err, 5000);
        try { V.unsetSelectedCube && V.unsetSelectedCube(); V.detachCubeControl && V.detachCubeControl(); } catch (e) {}
        _emit(S);
        if (r.left < before) undoPushPlatform('xoá id ' + (num != null ? num : id) + ' ' + cat);
        toast(r.left ? 'Xoá chưa hết id ' + id + ': còn ' + r.left + ' keyframe' : 'Đã xoá toàn bộ ' + before + ' keyframe của ' + cat + ' ' + (num != null ? num : id) + '. Z để hoàn tác.', 4500);
      });
    } catch (e) { console.error('[snap] loi xoa id', e); toast('LỖI xoá id: ' + (e && e.message || e), 5000); }
  }
  function doWidthAll() {
    var r = null;
    try {
      var C = ctx(); if (!C) return toast('Tool chưa sẵn sàng');
      var S = C.S, V = C.V, id = selectedId(C); if (id == null) return toast('Chưa chọn box', 2500);
      var w = +CFG.widthValue; if (!(w > 0)) return toast('Giá trị chiều rộng không hợp lệ', 3000);
      var cur = curFrame(C);
      r = recBegin('chiều rộng ' + w + 'm');
      ensureBoxAt(C, id, cur);
      var before = {};
      trackFrames(S, id).forEach(function (f) { var c = S.instancesTree[id].cubes[f]; before[f] = { dim: vec3(c.dimension), pos: vec3(c.position), rot: vec3(c.rotation) }; });
      var b0 = before[cur]; if (!b0) { recEnd(r); return toast('Frame hiện tại không nằm trong track của id ' + id, 3000); }
      var sg = CFG.keepAnchor ? anchorSigns(C, id, cur, b0) : [0, 0, 0];
      var nd = { x: w, y: b0.dim.y, z: b0.dim.z };
      S.updateCubeMatrix(id, cur, { position: anchorPos(b0, nd, sg), rotation: b0.rot, dimension: nd });
      if (CFG.markHuman && S.changeCubeInterpolation) S.changeCubeInterpolation(id, cur, false, 'human');
      _emit(S);
      reselectBox(C, id);
      var opts = { before: before, rec: r, signs: sg, lockW: w, noTail: true, after: function (n, total) {
        info('Chiều rộng = ' + w + 'm: đổi ' + n + '/' + total + ' keyframe' + (CFG.keepAnchor ? ', giữ nguyên mặt ' + anchorText(sg) : '') + '. Z hoặc Alt+Z để hoàn tác.', 4000);
      } };
      var rr = r; r = null;
      hookUnify();
      setTimeout(function () {
        var f = window.view && window.view.applyCubeSizeToOther;
        if (f && f.__run) { f.__run(opts); return; }
        try { sizeFix(id, before, opts, false, sg); } catch (e) { console.error('[snap] chieu rong', e); } finally { recEnd(rr); }
      }, 50);
    } catch (e) { recEnd(r); console.error('[snap] chieu rong', e); toast('LỖI đặt chiều rộng: ' + (e && e.message || e), 5000); }
  }
  window.__doWidthAll = doWidthAll;
  window.__doDeleteSelected = doDeleteSelected;
  function rotWithHeading(rot, h) {
    var r = { x: rot.x, y: rot.y, z: rot.z };
    for (var k = 0; k < 4; k++) { var d = wrap(h - heading(r), 0); if (Math.abs(d) < 1e-7) return r; r.y += d; }
    return Math.abs(wrap(h - heading(r), 0)) < 1e-4 ? r : setHeading(rot, h);
  }
  function rotLocalYaw(rot, th) {
    var cs = Math.cos(th), sn = Math.sin(th), M = eulerMat(rot), Ry = [[cs, 0, sn], [0, 1, 0], [-sn, 0, cs]], N = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) N[i][j] = M[i][0] * Ry[0][j] + M[i][1] * Ry[1][j] + M[i][2] * Ry[2][j];
    return eulerFromMat(N, rot);
  }
  function rotYAdd(rot, th) { return { x: rot.x, y: wrap(rot.y + th, 0), z: rot.z }; }
  function sameDim(a,b){return Math.abs(a.x-b.x)<1e-6&&Math.abs(a.y-b.y)<1e-6&&Math.abs(a.z-b.z)<1e-6;}
  function doDirAll() {
    try {
      var C = ctx(); if (!C) return toast('Tool chua san sang');
      var S = C.S, id = selectedId(C); if (id == null) return toast('Chưa chọn box', 2500);
      var cur = curFrame(C), e = effCube(S, id, cur);
      if (!e || !e.cube || !e.cube.rotation) return toast('Frame hiện tại không có box của id ' + id + ' (ngoài phạm vi track)', 3500);
      var hRef = heading(e.cube.rotation), DEG = 180 / Math.PI, step = (CFG.dirStepDeg || 90) / DEG, n90 = 0, n180 = 0;
      var frames = trackFrames(S, id), n = 0, keep = 0, fail = 0, dimFix = 0, rows = [];
      frames.forEach(function (f) {
        var c = S.instancesTree[id].cubes[f]; if (!c) return;
        var d0 = { x: c.dimension.x, y: c.dimension.y, z: c.dimension.z }, p0 = { x: c.position.x, y: c.position.y, z: c.position.z };
        var before = heading(c.rotation), diff = wrap(hRef - before, 0), k = 0, newRot, odd = false;
        var rot0 = { x: +(c.rotation.x * DEG).toFixed(1), y: +(c.rotation.y * DEG).toFixed(1), z: +(c.rotation.z * DEG).toFixed(1) }, dim0 = d0.x + 'x' + d0.y + 'x' + d0.z;
        if (CFG.dirCopyYaw) { newRot = rotWithHeading(c.rotation, hRef); }
        else {
          k = Math.round(diff / step); if (!k) { keep++; return; }
          odd = Math.abs(Math.abs(k * step) % Math.PI - Math.PI / 2) < 0.3;
          newRot = rotWithHeading(c.rotation, before + k * step);
        }
        var h = heading(newRot);
        if (Math.abs(wrap(h - before, 0)) < 1e-6) { keep++; return; }
        if (odd || (CFG.dirCopyYaw && Math.abs(diff) > 0.3 && Math.abs(Math.abs(diff) - Math.PI) > 0.3)) n90++; else n180++;
        S.updateCubeMatrix(id, f, { position: p0, rotation: newRot, dimension: d0 });
        var c3 = S.instancesTree[id] && S.instancesTree[id].cubes[f];
        if (c3 && !sameDim(c3.dimension, d0)) {
          dimFix++; S.updateCubeMatrix(id, f, { position: p0, rotation: newRot, dimension: d0 });
          c3 = S.instancesTree[id].cubes[f];
        }
        var after = c3 ? heading(c3.rotation) : before;
        if (Math.abs(wrap(h - after, 0)) > 1e-3) fail++;
        if(CFG.markHuman&&S.changeCubeInterpolation)S.changeCubeInterpolation(id,f,false,'human');
        try { S.calcPointCount && S.calcPointCount(id, f); } catch (e2) {}
        rows.push({ frame: f, k: k, rotTruoc: JSON.stringify(rot0), rotSau: c3 ? JSON.stringify({ x: +(c3.rotation.x * DEG).toFixed(1), y: +(c3.rotation.y * DEG).toFixed(1), z: +(c3.rotation.z * DEG).toFixed(1) }) : '?', yawTruoc: +(before * DEG).toFixed(1), yawSau: +(after * DEG).toFixed(1), dimTruoc: dim0, dimSau: d0.x + 'x' + d0.y + 'x' + d0.z });
        n++;
      });
      try { console.table ? console.table(rows) : console.log(rows); } catch (e2) {}
      _emit(S);
      info('Đồng bộ chiều id ' + id + ' theo frame ' + (cur + 1) + ' (hướng ' + (hRef * DEG).toFixed(1) + '°): ' + (CFG.dirCopyYaw ? 'chép hướng ' : 'chỉnh ') + n + '/' + frames.length + ' keyframe' + (CFG.dirCopyYaw ? '' : ' (' + n180 + ' lật 180°, ' + n90 + ' xoay 90°)')
        + (keep ? ', ' + keep + ' đã cùng chiều (giữ nguyên)' : '') + (fail ? ' | ⚠ ' + fail + ' keyframe tool KHÔNG nhận' : '') + (dimFix ? ' | đã trả lại kích thước cho ' + dimFix + ' keyframe' : '')
        + '. Chỉ đổi hướng; kích thước, vị trí, độ nghiêng giữ nguyên.', fail ? 9000 : 5500);
    } catch (e) { console.error('[snap] loi doi huong', e); toast('LỖI đồng bộ chiều: ' + (e && e.message || e), 5000); }
  }
  window.__doDirAll = doDirAll;
  var _undo = [], _rec = null, _restoring = false, UNDO_MAX = 60, _recOK = null, _seq = 0, _platSeq = 0;

/* ============================================================
 * @MODULE[core:recolor]  ĐỔI MÀU ĐIỂM MÂY TRONG BOX NGAY (lõi, không có phím)
 * Khi kéo tay, TransformControls của nền tảng phát sự kiện nên điểm trong box đổi màu.
 * Chức năng của tool chỉ ghi dữ liệu (updateCubeMatrix) nên màu đứng yên -> ở đây
 * hook updateCubeMatrix, đợi mesh cập nhật rồi phát lại đúng sự kiện đó.
 * Tắt/bật: CFG.recolorBox (menu alt+s). Gỡ lỗi: window.__snapRecolorProbe()
 * ============================================================ */
  var _recolorLast = 0, _recolorFirst = 0, _ptrDownAt = 0, _wheelUntil = 0, _moveAt = 0;
  function uiBusy() { if (CFG.pauseWhileDragging === false) return false; var n = Date.now(); return (_ptrDown && n - _ptrDownAt < 60000) || n < _wheelUntil || n - _moveAt < 250; }   // đang kéo/zoom -> tool tạm dừng việc định kỳ để nhường CPU cho nền tảng
  var _ptrDown = false, _recolorT = 0, _recolorBusy = false, _recolorQuiet = 0, _recolorTry = 0, _ctl = null, _recolorWarn = false;
  ['pointerdown', 'mousedown'].forEach(function (n) { window.addEventListener(n, function () { _ptrDown = true; _ptrDownAt = Date.now(); }, true); });
  window.addEventListener('wheel', function () { _wheelUntil = Date.now() + 250; }, { capture: true, passive: true });
  window.addEventListener('pointermove', function () { _moveAt = Date.now(); }, { capture: true, passive: true });   // đang rê chuột -> các việc định kỳ của tool nhường CPU
  ['pointerup', 'pointercancel', 'mouseup', 'blur', 'dragend'].forEach(function (n) { window.addEventListener(n, function () { _ptrDown = false; }, true); });
  function findCubeCtl(V, sc) {
    if (_ctl && _ctl.object === sc && typeof _ctl.dispatchEvent === 'function') return _ctl;
    _ctl = null;
    var hit = null;
    try {
      var root = sc; while (root.parent) root = root.parent;
      root.traverse(function (o) { if (!hit && o !== sc && o.object === sc && typeof o.dispatchEvent === 'function') hit = o; });
    } catch (e) {}
    if (!hit) {
      var seen = new Set(), q = [[V, 0]], n = 0, SK = /^(instancesTree|instanceAttributes|cubes|relations|calibs|images|pointsObjectMap|parent|children|_reactInternals|_reactInternalFiber|props|state)$/;
      while (q.length && n++ < 3000 && !hit) {
        var it = q.shift(), o = it[0];
        if (!o || typeof o !== 'object' || seen.has(o)) continue; seen.add(o);
        if (o.nodeType || ArrayBuffer.isView(o) || o.isBufferGeometry || o.isMaterial || o.isTexture) continue;
        if (o !== V && o !== sc && o.object === sc && typeof o.dispatchEvent === 'function') { hit = o; break; }
        if (it[1] >= 3) continue;
        var ks; try { ks = Object.keys(o); } catch (e) { continue; }
        for (var i = 0; i < ks.length && i < 150; i++) { if (SK.test(ks[i])) continue; var v; try { v = o[ks[i]]; } catch (e) { continue; } if (v && typeof v === 'object') q.push([v, it[1] + 1]); }
      }
    }
    _ctl = hit; return hit;
  }
  function scheduleRecolor(id, f) {
    if (!CFG.recolorBox || _recolorBusy || _restoring || _ptrDown || Date.now() < _recolorQuiet) return;
    // debounce cuối: chỉ tô lại sau khi ngừng đổi box ~150ms (không quá 700ms kể từ lần đổi đầu) -> giữ phím lặp không bị khựng vì updateHighlightPoints (~28ms/lần)
    var nw = Date.now(); if (!_recolorFirst) _recolorFirst = nw;
    if (_recolorT) clearTimeout(_recolorT);
    _recolorTry = 0; _recolorT = setTimeout(recolorNow, Math.max(0, Math.min(150, _recolorFirst + 700 - nw)));
  }
  function recolorNow() {
    _recolorT = 0; _recolorLast = Date.now(); _recolorFirst = 0;
    try {
      if (!CFG.recolorBox || _ptrDown || _recolorBusy) return;
      var C = ctx(); if (!C) return;
      var sc = C.V.selectedCube; if (!sc || !sc.userData || sc.userData.id == null) return;
      var id = sc.userData.id, f = curFrame(C), tr = C.S.instancesTree[id], cube = tr && tr.cubes && tr.cubes[f];
      if (!cube) return;
      var p = sc.position, q = cube.position;
      if ((Math.abs(p.x - q.x) > 1e-3 || Math.abs(p.y - q.y) > 1e-3 || Math.abs(p.z - q.z) > 1e-3) && _recolorTry++ < 4) { _recolorT = setTimeout(recolorNow, 40); return; }
      var before = { position: vec3(cube.position), rotation: vec3(cube.rotation), dimension: vec3(cube.dimension) };
      var ctl = findCubeCtl(C.V, sc), wasR = _restoring;
      _recolorBusy = true; _restoring = true;
      try {
        var V = C.V, hl = typeof V.updateHighlightPointsDebounce === 'function' ? 'updateHighlightPointsDebounce' : (typeof V.updateHighlightPoints === 'function' ? 'updateHighlightPoints' : '');   // ưu tiên bản debounce của nền tảng (nhẹ hơn)
        if (hl) {
          var tried = [[sc], [], [id, f]], okc = false;
          for (var ti = 0; ti < tried.length && !okc; ti++) { try { V[hl].apply(V, tried[ti]); okc = true; } catch (e1) { if (ti === tried.length - 1) console.warn('[snap] recolor ' + hl, e1); } }
        }
        if (ctl) { ctl.dispatchEvent({ type: 'change' }); }
        else if (hl) { /* da goi ham to mau cua nen tang */ }
        else {
          if (!_recolorWarn) { _recolorWarn = true; console.warn('[snap] recolor: khong tim thay TransformControls, dung chon lai box. Chay __snapRecolorProbe() de gui lai ket qua.'); }
          reselectBox(C, id, true);
        }
        var c2 = C.S.instancesTree[id] && C.S.instancesTree[id].cubes[f];
        if (c2 && (Math.abs(c2.position.x - before.position.x) > 1e-5 || Math.abs(c2.position.y - before.position.y) > 1e-5 || Math.abs(c2.position.z - before.position.z) > 1e-5
          || Math.abs(c2.dimension.x - before.dimension.x) > 1e-5 || Math.abs(c2.dimension.y - before.dimension.y) > 1e-5 || Math.abs(c2.dimension.z - before.dimension.z) > 1e-5
          || Math.abs(c2.rotation.x - before.rotation.x) > 1e-5 || Math.abs(c2.rotation.y - before.rotation.y) > 1e-5 || Math.abs(c2.rotation.z - before.rotation.z) > 1e-5)) {
          C.S.updateCubeMatrix(id, f, before); _emit(C.S);
          console.warn('[snap] recolor: su kien lam doi box, da khoi phuc lai');
        }
      } finally { _restoring = wasR; _recolorBusy = false; _recolorQuiet = Date.now() + 30; }
    } catch (e) { _recolorBusy = false; console.warn('[snap] recolor', e); }
  }
  window.__snapRecolorNow = recolorNow;
  window.__snapRecolorProbe = function () {
    var C = ctx(); if (!C) return console.log('[snap] chua co ctx');
    var sc = C.V.selectedCube, ctl = sc && findCubeCtl(C.V, sc), RX = /point|color|colour|highlight|inside|incube|paint|cubechange|objectchange|refresh/i, out = {};
    out.selectedCube = !!sc; out.controls = ctl ? (ctl.constructor && ctl.constructor.name) : null;
    function names(o) { var r = [], seen = {}; for (var x = o; x && x !== Object.prototype; x = Object.getPrototypeOf(x)) { Object.getOwnPropertyNames(x).forEach(function (k) { var v; try { v = o[k]; } catch (e) { return; } if (typeof v === 'function' && RX.test(k) && !seen[k]) { seen[k] = 1; r.push(k); } }); } return r; }
    out.V = names(C.V); out.S = names(C.S); out.L = C.L ? names(C.L) : null;
    var fp = C.L && C.L.pointsObjectMap && C.L.pointsObjectMap[curFrame(C)];
    out.lidarAttrs = fp && fp.lidar ? Object.keys(fp.lidar.geometry.attributes) : null;
    out.lidarUniforms = fp && fp.lidar && fp.lidar.material.uniforms ? Object.keys(fp.lidar.material.uniforms) : null;
    out.src = {}; ['updateHighlightPoints', 'updateHighlightPointsDebounce', 'calcOneFrameCubesPointsCount'].forEach(function (k) { try { out.src[k] = String(C.V[k]).slice(0, 4000); } catch (e) {} });
    if (ctl && ctl._listeners && ctl._listeners.change) out.src.changeHandlers = ctl._listeners.change.map(function (h) { return String(h).slice(0, 3000); });
    out.ctlListeners = ctl && ctl._listeners ? Object.keys(ctl._listeners) : null;
    console.log('[snap] recolor probe', out); return out;
  };

/* ============================================================
 * @MODULE[shift+f]  MŨI TÊN HƯỚNG ĐỎ (ảnh 2D 7 cam + 3D)
 * Phím: shift+f (keyArrow) bật/tắt · CFG.showArrows, arrowExt, arrowFlip
 * Hướng box = trục +z cục bộ (đầu xe, cùng quy ước với khít đầu/đuôi), mũi tên đi từ tâm box ra ngoài mặt đầu.
 * 2D: bọc S.getProjectCast + cast.draw -> vẽ ngay trên canvas của nền tảng cùng phép chiếu/zoom,
 *     nên CHỈ box mà nền tảng đang vẽ (không bị ẩn) mới có mũi tên. Điểm 3D được chiếu bằng chính
 *     getProjectCast trên bản sao store (không sửa dữ liệu thật).
 * 3D: 1 LineSegments đỏ trong scene, chỉ cho mesh box đang hiện (visible); đi theo khi kéo box.
 * Gỡ lỗi: window.__snapArrowProbe()
 * ============================================================ */
  var _arr = { gpc: null, cache: new Map(), ok2d: null, st: { tag: 0, draw: 0, fail: 0, arrows3d: 0 }, T: null, S: null, meshes: null, rk: '', scanAt: 0, ver: 0, cfgKey: '', n: 0, objs: null, mat: null, msz: 0, geo: null, att: null, buf: null, why3: '', raf: 0, last: 0, warned: {} };
  var _cost = {};
  function costWrap(name, fn) { return function () { var t0 = performance.now(); try { return fn.apply(this, arguments); } finally { var d = performance.now() - t0, c = _cost[name] || (_cost[name] = { n: 0, ms: 0, max: 0 }); c.n++; c.ms += d; if (d > c.max) c.max = d; } }; }
  window.__snapCost = function (reset) { var o = {}; Object.keys(_cost).forEach(function (k) { var c = _cost[k]; o[k] = { calls: c.n, totalMs: +c.ms.toFixed(1), avgMs: +(c.ms / c.n).toFixed(3), maxMs: +c.max.toFixed(1) }; }); if (console.table) console.table(o); else console.log(o); if (reset) _cost = {}; return o; };
  var ARR_CAP = 400, ARR_VPA = 30;   // tối đa 400 mũi tên, mỗi mũi tên 30 đỉnh (3 đoạn x 5 lớp cho dày)
  function arrExt() { return CFG.arrowExt == null ? 1 : +CFG.arrowExt; }
  function arrHeadSize() { var k = +CFG.arrowHead || 1; return { hl: 0.8 * k, hw: 0.28 * k }; }   // dài / bán kính đáy của đầu nón (m)
  function arrLocal(c) {
    var sg = CFG.arrowFlip ? -1 : 1, L = (c.dimension.z || 0) / 2 + arrExt(), H = arrHeadSize(), b = L - H.hl;
    return [[0, 0, 0], [0, 0, sg * L], [-H.hw, 0, sg * b], [H.hw, 0, sg * b], [0, -H.hw, sg * b], [0, H.hw, sg * b]];   // tâm, đỉnh, 4 điểm đáy nón
  }
  function arrWorld(c, loc) {
    var R = eulerMat(c.rotation), p = c.position;
    return loc.map(function (l) { return { x: p.x + R[0][0] * l[0] + R[0][1] * l[1] + R[0][2] * l[2], y: p.y + R[1][0] * l[0] + R[1][1] * l[1] + R[1][2] * l[2], z: p.z + R[2][0] * l[0] + R[2][1] * l[1] + R[2][2] * l[2] }; });
  }
  function arrCenter(cast) {
    try { cast.computeBoundingBox && cast.computeBoundingBox(); } catch (e) {}
    if (!cast || !isFinite(cast.x) || !isFinite(cast.w) || !isFinite(cast.y) || !isFinite(cast.h)) return null;
    return [cast.x + cast.w / 2, cast.y + cast.h / 2, cast.w, cast.h];
  }
  /* Chiếu 1 điểm thế giới bằng getProjectCast gốc trên bản sao store (cube thật không bị đụng tới) */
  function arrFake(S, id, f, c, w, n, type) {
    var t = S.instancesTree[id], fk = Object.create(S), tr = Object.create(S.instancesTree), cubes = {}, tt = Object.create(t);
    cubes[f] = Object.assign({}, c, { position: { x: w.x, y: w.y, z: w.z }, dimension: { x: 0.02, y: 0.02, z: 0.02 }, frameNum: f });
    Object.defineProperty(tt, 'cubes', { value: cubes });
    tr[id] = tt;
    Object.defineProperty(fk, 'instancesTree', { value: tr });
    return _arr.gpc.call(fk, id, f, f, n, type);
  }
  function arrPts2D(S, id, f, n, type) {
    if (_arr.ok2d === false || !_arr.gpc) return null;
    var e = effCube(S, id, f); if (!e) return null;
    var c = e.cube, p = c.position, r = c.rotation, d = c.dimension;
    var key = id + '|' + f + '|' + n + '|' + [p.x, p.y, p.z, r.x, r.y, r.z, d.z].map(function (v) { return Math.round(v * 1e4); }).join(',') + '|' + arrExt() + '|' + (+CFG.arrowHead || 1) + (CFG.arrowFlip ? 'F' : '');
    var hit = _arr.cache.get(key); if (hit !== undefined) return hit;
    var out = null;
    try {
      var wp = arrWorld(c, arrLocal(c)), pts = [], ok = true;
      for (var i = 0; i < wp.length && ok; i++) {
        var cs = arrFake(S, id, f, c, wp[i], n, type), ct = cs && arrCenter(cs);
        if (!ct) ok = false; else pts.push(ct);
      }
      if (ok && _arr.ok2d === null) {   // kiểm chứng 1 lần: điểm chiếu phải nhỏ và nằm trong hộp chiếu thật
        var real = arrCenter(_arr.gpc.call(S, id, f, f, n, type)), t0 = pts[0];
        var good = !!(real && real[2] > 0 && t0[2] < real[2] * 0.7 && t0[3] < real[3] * 0.7 + 1 && Math.abs(t0[0] - real[0]) <= real[2] * 0.6 + 2 && Math.abs(t0[1] - real[1]) <= real[3] * 0.6 + 2);
        if (real) { _arr.ok2d = good; if (!good) console.warn('[snap] mui ten 2D: khong chieu duoc diem tuy y bang getProjectCast – tat mui ten 2D', { real: real, tail: t0 }); }
        if (!good) ok = false;
      }
      if (ok) out = pts;
    } catch (err) { _arr.st.fail++; }
    if (_arr.cache.size > 3000) _arr.cache.clear();
    _arr.cache.set(key, out);
    return out;
  }
  function arrDraw2D(g, m, ox, oy, pts) {
    var X = function (q) { return q[0] * m + ox; }, Y = function (q) { return q[1] * m + oy; };
    var len = Math.hypot(X(pts[1]) - X(pts[0]), Y(pts[1]) - Y(pts[0]));
    if (!isFinite(len) || len > 8000) return;
    _arr.st.draw++;
    var w = Math.max(0.5, +CFG.arrowWidth || 1);
    var tri = function (a, b, c) { g.beginPath(); g.moveTo(X(a), Y(a)); g.lineTo(X(b), Y(b)); g.lineTo(X(c), Y(c)); g.closePath(); };
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(X(pts[0]), Y(pts[0])); g.lineTo(X(pts[1]), Y(pts[1]));
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = w + 1.4; g.stroke();                       // viền đen mảnh cho dễ nhìn trên nền sáng
    g.fillStyle = '#ff1f1f'; g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1;
    tri(pts[1], pts[2], pts[3]); g.fill(); g.stroke();                                         // đầu nón: mặt ngang
    tri(pts[1], pts[4], pts[5]); g.fill(); g.stroke();                                         // đầu nón: mặt đứng (không bị dẹp khi camera nhìn ngang)
    g.beginPath(); g.moveTo(X(pts[0]), Y(pts[0])); g.lineTo(X(pts[1]), Y(pts[1]));
    g.strokeStyle = '#ff2a2a'; g.lineWidth = w; g.stroke();                                      // thân mảnh
    g.restore();
  }
  function arrWrapCast(cast, id, f, n, type) {
    if (typeof cast.draw !== 'function' || cast.draw.__arr) return;
    var od = cast.draw, pts, ver = -1; _arr.st.tag++;
    var d = function (g, m, ox, oy) {
      var r = od.apply(this, arguments);
      if (CFG.showArrows) {
        try {
          if (ver !== _arr.ver) { ver = _arr.ver; pts = undefined; }
          if (pts === undefined) pts = arrPts2D(_arr.S, id, f, n, type);   // chỉ tính 1 lần cho mỗi cast (zoom/pan vẽ lại hàng chục lần/giây không tốn thêm)
          if (pts) arrDraw2D(g, m, ox, oy, pts);
        } catch (e) { _arr.st.fail++; pts = null; }
      }
      return r;
    };
    d.__arr = true; cast.draw = d;
  }
  function arrInstall(S) {
    if (!S || typeof S.getProjectCast !== 'function' || S.getProjectCast.__arr) return;
    var orig = S.getProjectCast; _arr.gpc = orig; _arr.S = S;
    var w = function (id, f, f2, n, type) {
      var cast = orig.apply(this, arguments);
      try { if (cast && CFG.showArrows) arrWrapCast(cast, id, f, n, type); } catch (e) {}
      return cast;
    };
    w.__arr = true; S.getProjectCast = w;
  }
  /* ---- 3D: vẽ bằng chuỗi chấm (THREE.Points) – lớp Points/BufferGeometry/Material lấy từ chính point cloud của nền tảng ---- */
  var ARR_MAXPTS = 150000;
  function arrHas(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  /* lớp con trực tiếp của class gốc (gốc nhận biết bằng 1 method riêng) – tránh subclass tuỳ biến của nền tảng */
  function arrBaseOf(inst, rootMethod) {
    var chain = [], p = Object.getPrototypeOf(inst);
    while (p && !arrHas(p, rootMethod)) { chain.push(p); p = Object.getPrototypeOf(p); }
    return p && chain.length ? chain[chain.length - 1].constructor : null;
  }
  function arrRoots(C) {
    var V = C.V, out = [], add = function (o) { if (!o) return; var r = o; while (r.parent) r = r.parent; if (out.indexOf(r) < 0) out.push(r); };
    add(V.selectedCube);
    try { var L = C.L, e = L && L.pointsObjectMap && L.pointsObjectMap[curFrame(C)]; if (e && e.lidar) add(e.lidar); } catch (x) {}
    if (!out.length) {
      var seen = new Set(), q = [[V, 0]], n = 0;
      while (q.length && n++ < 2000) {
        var it = q.shift(), o = it[0];
        if (!o || typeof o !== 'object' || seen.has(o)) continue; seen.add(o);
        if (o.nodeType || ArrayBuffer.isView(o) || o.isBufferGeometry || o.isMaterial) continue;
        if (o.isScene) { add(o); continue; }
        if (it[1] >= 2) continue;
        var ks; try { ks = Object.keys(o); } catch (e2) { continue; }
        for (var i = 0; i < ks.length && i < 120; i++) { var v; try { v = o[ks[i]]; } catch (e3) { continue; } if (v && typeof v === 'object') q.push([v, it[1] + 1]); }
      }
    }
    return out;
  }
  function arrBuildT(roots) {
    if (_arr.T) return _arr.T;
    var TH = window.THREE;
    if (TH && TH.Points && TH.BufferGeometry && TH.BufferAttribute && TH.PointsMaterial) return (_arr.T = { mode: 'pm', P: TH.Points, BG: TH.BufferGeometry, Attr: TH.BufferAttribute, M: TH.PointsMaterial });
    var pt = null;
    roots.forEach(function (r) { r.traverse(function (o) { if (!pt && o.isPoints && o.geometry && o.geometry.isBufferGeometry && o.material && !Array.isArray(o.material) && o.geometry.attributes && o.geometry.attributes.position) pt = o; }); });
    if (!pt) { _arr.why3 = 'khong thay Points (point cloud) trong scene'; return null; }
    var P = arrBaseOf(pt, 'traverse'), BG;
    // BufferGeometry: lớp có method setAttribute riêng
    var gp = Object.getPrototypeOf(pt.geometry); while (gp && !arrHas(gp, 'setAttribute')) gp = Object.getPrototypeOf(gp); BG = gp && gp.constructor;
    var M = arrBaseOf(pt.material, 'setValues'), m = pt.material;
    var mode = m.isShaderMaterial ? (m.isRawShaderMaterial ? 'sm' : 'sm') : (m.isPointsMaterial ? 'pm' : '');
    if (!P || !BG || !M || !mode) { _arr.why3 = 'khong suy ra duoc lop THREE (P=' + !!P + ' BG=' + !!BG + ' M=' + !!M + ' mode=' + mode + ')'; return null; }
    return (_arr.T = { mode: mode, P: P, BG: BG, Attr: pt.geometry.attributes.position.constructor, M: M });
  }
  function arrMakeMat(T) {
    var sz = +CFG.arrow3dSize || 3, col = 0xff1f1f;
    if (T.mode === 'pm') return new T.M({ color: col, size: sz, sizeAttenuation: false, depthTest: false, depthWrite: false, transparent: true });
    return new T.M({ vertexShader: 'void main(){ gl_PointSize = ' + sz.toFixed(1) + '; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'void main(){ gl_FragColor = vec4(1.0, 0.12, 0.12, 1.0); }', depthTest: false, depthWrite: false, transparent: true });
  }
  function arrVisible(o) { for (var x = o; x; x = x.parent) if (x.visible === false) return false; return true; }
  function arr3dUpdate() {
    var C = ctx(); if (!C) return;
    var V = C.V, S = C.S; arrInstall(S);   // cài lại nếu lúc khởi động getProjectCast chưa sẵn sàng
    var roots = arrRoots(C); if (!roots.length) { _arr.why3 = 'khong tim thay scene'; return; }
    var T = arrBuildT(roots);
    if (!T) { if (!_arr.warned.three) { _arr.warned.three = 1; console.warn('[snap] mui ten 3D:', _arr.why3); } return; }
    var msz = +CFG.arrow3dSize || 3;
    if (!_arr.geo) {
      _arr.buf = new Float32Array(ARR_MAXPTS * 3);
      _arr.geo = new T.BG(); _arr.att = new T.Attr(_arr.buf, 3);
      _arr.buf = _arr.att.array;   // Float32BufferAttribute SAO CHÉP mảng đầu vào -> phải ghi vào att.array, không phải mảng gốc
      _arr.geo.setAttribute('position', _arr.att); _arr.geo.setDrawRange(0, 0);
      _arr.objs = [];
    }
    if (!_arr.mat || _arr.msz !== msz) { var old = _arr.mat; _arr.mat = arrMakeMat(T); _arr.msz = msz; (_arr.objs || []).forEach(function (r) { r.obj.material = _arr.mat; }); try { old && old.dispose && old.dispose(); } catch (e) {} }
    roots.forEach(function (root) {
      var r = (_arr.objs || []).filter(function (x) { return x.root === root; })[0];
      if (!r) {
        var obj = new T.P(_arr.geo, _arr.mat); obj.frustumCulled = false; obj.renderOrder = 9999; obj.userData = { __arrow: true }; obj.raycast = function () {};
        obj.onBeforeRender = function (rd, sc, cam) { try { this.geometry.setDrawRange(0, (cam && cam.isOrthographicCamera && !CFG.arrowOrtho) ? 0 : _arr.n); } catch (e) {} };   // view ortho (front/side/top): không vẽ -> không tốn GPU
        r = { root: root, obj: obj }; _arr.objs.push(r);
      }
      if (r.obj.parent !== root) root.add(r.obj);
      r.obj.visible = true;
    });
    _arr.why3 = '';
    var f = curFrame(C), sg = CFG.arrowFlip ? -1 : 1, ext = arrExt(), H = arrHeadSize(), cubes = [], hsh = 0, nowT = Date.now();
    // danh sách mesh box được cache: chỉ duyệt cả scene khi đổi frame / đổi số con của scene / quá 1 giây (trước đây duyệt mỗi lần -> ~1ms, tối đa 12ms)
    var rk = f + '|' + roots.map(function (r) { return r.children ? r.children.length : 0; }).join(',');
    if (!_arr.meshes || rk !== _arr.rk || nowT - _arr.scanAt > 1000) {
      _arr.meshes = []; _arr.rk = rk; _arr.scanAt = nowT; var seen = {};
      for (var ri = 0; ri < roots.length && !_arr.meshes.length; ri++) roots[ri].traverse(function (o) {
        if (_arr.meshes.length >= ARR_CAP || o.isPoints || !o.userData || o.userData.id == null || o.userData.__arrow) return;
        var id = o.userData.id; if (seen[id]) return;
        var t = S.instancesTree[id]; if (!t || !t.cubes || !o.matrixWorld) return;
        var ec0 = effCube(S, id, f); if (!ec0) return;
        seen[id] = 1; _arr.meshes.push({ o: o, id: id, dz: ec0.cube.dimension.z || 0 });
      });
    }
    var selId = (V.selectedCube && V.selectedCube.userData) ? V.selectedCube.userData.id : null;
    for (var mi = 0; mi < _arr.meshes.length; mi++) {
      var mr = _arr.meshes[mi], o2 = mr.o;
      if (!arrVisible(o2)) continue;
      if (_ptrDown && mr.id === selId) { var ec2 = effCube(S, mr.id, f); if (ec2) mr.dz = ec2.cube.dimension.z || 0; }   // đang kéo: cập nhật độ dài của box đang chọn
      var e = o2.matrixWorld.elements, fl = Math.hypot(e[8], e[9], e[10]), rl = Math.hypot(e[0], e[1], e[2]), ul = Math.hypot(e[4], e[5], e[6]);
      if (!fl || !rl || !ul) continue;
      var ee = [e[0] / rl, e[1] / rl, e[2] / rl, e[4] / ul, e[5] / ul, e[6] / ul, e[8] / fl * sg, e[9] / fl * sg, e[10] / fl * sg, e[12], e[13], e[14]], L0 = mr.dz / 2 + ext;
      for (var q = 0; q < 12; q++) hsh = (hsh * 31 + Math.round(ee[q] * 1000)) | 0;
      hsh = (hsh * 31 + Math.round(L0 * 1000)) | 0;
      cubes.push({ e: ee, L: L0, mask: o2.layers ? o2.layers.mask : 1 });
    }
    var sig = hsh + '|' + cubes.length + '|' + sg + '|' + ext + '|' + H.hl + '|' + H.hw + '|' + roots.length + '|' + msz;
    var attached = (_arr.objs || []).every(function (r) { return r.obj.parent === r.root; });
    if (sig === _arr.sig && attached) return;
    _arr.sig = sig;
    if (cubes.length) { try { (_arr.objs || []).forEach(function (r) { r.obj.layers.mask = r.obj.layers.mask | cubes[0].mask | 1; }); } catch (e2) {} }   // camera nhìn thấy layer của box thì cũng thấy mũi tên
    // lượt 2: dựng chấm
    var B = _arr.buf, n = 0, SS = 0.03, SH = 0.035, TP = Math.PI * 2;
    var pt3 = function (x, y, z) { if (n < ARR_MAXPTS) { B[n * 3] = x; B[n * 3 + 1] = y; B[n * 3 + 2] = z; n++; } };
    for (var ci = 0; ci < cubes.length && n < ARR_MAXPTS - 2500; ci++) {
      var cb = cubes[ci], e = cb.e, L = cb.L, rx = e[0], ry = e[1], rz = e[2], ux = e[3], uy = e[4], uz = e[5], fx = e[6], fy = e[7], fz = e[8], ox = e[9], oy = e[10], oz = e[11];
      var bl = Math.max(0, L - H.hl), i, j2, m = Math.max(1, Math.ceil(bl / SS));      // thân mảnh: từ tâm box tới đáy nón
      for (i = 0; i <= m; i++) { var q2 = bl * i / m; pt3(ox + fx * q2, oy + fy * q2, oz + fz * q2); }
      var nr = Math.max(4, Math.ceil(H.hl / SH));                                      // đầu nón đặc: các vòng chấm thu nhỏ dần về đỉnh
      for (i = 0; i <= nr; i++) {
        var tt = i / nr, d = bl + (L - bl) * tt, rad = H.hw * (1 - tt), cx = ox + fx * d, cy = oy + fy * d, cz = oz + fz * d;
        var cnt = Math.max(1, Math.ceil(TP * rad / SH));
        for (j2 = 0; j2 < cnt; j2++) { var an = TP * j2 / cnt, ca = Math.cos(an) * rad, sa = Math.sin(an) * rad; pt3(cx + rx * ca + ux * sa, cy + ry * ca + uy * sa, cz + rz * ca + uz * sa); }
      }
    }
    var k = cubes.length;
    _arr.n = n; _arr.geo.setDrawRange(0, n);
    if (n > 0) {   // chỉ đẩy phần buffer đã dùng xuống GPU (trước đây đẩy cả 1.8MB mỗi lần)
      var at = _arr.att;
      if (typeof at.addUpdateRange === 'function') { try { at.clearUpdateRanges(); at.addUpdateRange(0, n * 3); } catch (e3) {} }
      else if (at.updateRange) { at.updateRange.offset = 0; at.updateRange.count = n * 3; }
      at.needsUpdate = true;
    }
    _arr.st.arrows3d = k; _arr.st.pts3d = n;
  }
  function arrLoop() {
    _arr.raf = 0; if (!CFG.showArrows) return;
    var ck = arrExt() + '|' + (+CFG.arrowHead || 1) + '|' + (CFG.arrowFlip ? 1 : 0); if (ck !== _arr.cfgKey) { _arr.cfgKey = ck; _arr.ver++; _arr.cache.clear(); }
    var now = performance.now();
    var moving = !_ptrDown && (Date.now() - _moveAt < 250);   // đang rê chuột: bỏ qua nhịp này (mũi tên cập nhật ngay khi chuột dừng)
    if (!document.hidden && !moving && now - _arr.last >= (_ptrDown ? 33 : 150)) { _arr.last = now; try { arr3dUpdate(); } catch (e) { if (!_arr.warned.e3) { _arr.warned.e3 = 1; console.warn('[snap] mui ten 3D', e); } } }
    _arr.raf = requestAnimationFrame(arrLoop);
  }
  function arrHide3D() { try { (_arr.objs || []).forEach(function (r) { r.obj.visible = false; if (r.obj.parent) r.obj.parent.remove(r.obj); }); } catch (e) {} }
  function arrApply() {
    var C = ctx(); if (!C) return; _arr.ver++;
    if (CFG.showArrows) { arrInstall(C.S); if (!_arr.raf) _arr.raf = requestAnimationFrame(arrLoop); }
    else { arrHide3D(); }
    try { _emit(C.S); } catch (e) {}   // ép nền tảng vẽ lại ảnh 2D để mũi tên hiện/mất ngay
  }
  function toggleArrows() {
    CFG.showArrows = !CFG.showArrows; var sv = cfgSave(); arrApply();
    toast('Mũi tên hướng: ' + (CFG.showArrows ? 'BẬT' : 'TẮT') + (sv ? '' : ' (chưa lưu được)'), 1200);
  }
  arr3dUpdate = costWrap('arrow3dUpdate', arr3dUpdate); arrDraw2D = costWrap('arrow2dDraw', arrDraw2D); arrPts2D = costWrap('arrow2dProject', arrPts2D); recolorNow = costWrap('recolorNow', recolorNow);
  var _safeSaved = null;
  /* Kiểm tra A/B: __snapSafe() tắt mũi tên + tô màu điểm + tạm dừng định kỳ; __snapSafe(false) trả lại như cũ */
  window.__snapSafe = function (on) {
    if (on !== false) {
      if (_safeSaved) return console.log('[snap] safe-mode đang BẬT rồi');
      _safeSaved = { showArrows: CFG.showArrows, recolorBox: CFG.recolorBox, pauseWhileDragging: CFG.pauseWhileDragging };
      CFG.showArrows = false; CFG.recolorBox = false; CFG.pauseWhileDragging = false; arrApply();
      console.log('[snap] SAFE-MODE BAT: da tat mui ten, to mau diem, tam dung dinh ky. Thu lai thao tac; __snapSafe(false) de tra lai.');
    } else if (_safeSaved) {
      CFG.showArrows = _safeSaved.showArrows; CFG.recolorBox = _safeSaved.recolorBox; CFG.pauseWhileDragging = _safeSaved.pauseWhileDragging; _safeSaved = null; arrApply();
      console.log('[snap] SAFE-MODE TAT: da tra lai cau hinh');
    }
  };
  window.__toggleArrows = toggleArrows;
  window.__snapArrowProbe = function () {
    var C = ctx(), out = { on: !!CFG.showArrows, ok2d: _arr.ok2d, stats: _arr.st, wrapped: !!(C && C.S.getProjectCast && C.S.getProjectCast.__arr), three: !!_arr.T, mode3d: _arr.T && _arr.T.mode, why3: _arr.why3, scenes: (_arr.objs || []).length, inScene: (_arr.objs || []).filter(function (r) { return r.obj.parent; }).length };
    console.log('[snap] arrow probe', out); return out;
  };

/* ============================================================
 * @MODULE[core:profile]  ĐO HÀM NỀN TẢNG NÀO ĂN THỜI GIAN (lõi, chỉ chạy khi gọi)
 * Dùng: __snapProfile(10) rồi rê chuột nhanh giữa front/top/side trong 10 giây -> in bảng top hàm tốn thời gian,
 * số frame >50ms, số long task. Không chạy nếu không gọi; tự gỡ sau khi đo.
 * ============================================================ */
  window.__snapProfile = function (sec) {
    sec = Math.max(3, Math.min(60, +sec || 10));
    var C = ctx(); if (!C) return console.log('[snap] chua co ctx');
    var TRACE = /^(initView|setRefreshCounter|updateHighlightPoints|updateHighlightPointsDebounce|setSelectedShape|updateMultiview|emitViewRefresh|updateCubeMatrix|changePointCloudColor|setColorMode|calcPointCount|putCast|deleteCast|updateCast|projectCube|getProjectCast)$/;
    var stats = {}, undo = [], chain = [], origins = {}, skip = /^(constructor|render|setState|forceUpdate|componentDid|componentWill|getSnapshot|shouldComponentUpdate|UNSAFE_|isReactComponent|isPureReactComponent|toString|valueOf|hasOwnProperty)/;
    function frames(stack, n) {   // n khung gọi thật (bỏ wrapper của công cụ đo); [TOOL] = code của userscript này
      return String(stack).split('\n').slice(1).filter(function (l) { return l.indexOf('__snapProfW') < 0; }).slice(0, n).map(function (l) {
        var t = l.trim(), fn = t.replace(/^at\s+/, '').split(' ')[0] || '?'; return (/userscript|ConeChut/i.test(t) ? '[TOOL]' : '') + fn;
      }).join(' < ');
    }
    function wrapAll(obj, label) {
      if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) return;
      var seen = {};
      for (var o = obj; o && o !== Object.prototype && o !== Function.prototype; o = Object.getPrototypeOf(o)) {
        Object.getOwnPropertyNames(o).forEach(function (k) {
          if (seen[k] || skip.test(k)) return; seen[k] = 1;
          var d; try { d = Object.getOwnPropertyDescriptor(o, k); } catch (e) { return; }
          if (!d || typeof d.value !== 'function' || d.value.__prof) return;
          var orig = d.value, name = label + '.' + k, had = Object.prototype.hasOwnProperty.call(obj, k), prevOwn = had ? obj[k] : undefined, tr = TRACE.test(k);
          var w = function __snapProfW() {
            var t0 = performance.now(), who = '', outer = chain.length === 0;
            if (tr || outer) { try {
              var fr = outer ? '(goc) ' + frames(new Error().stack, 3) : chain.slice(-5).join(' > ');
              if (outer) { var ok = name + ' <- ' + fr; origins[ok] = (origins[ok] || 0) + 1; }
              if (tr) who = fr;
            } catch (e) {} }
            chain.push(name);
            try { return orig.apply(this, arguments); }
            finally { chain.pop(); var dt = performance.now() - t0, st = stats[name] || (stats[name] = { n: 0, ms: 0, max: 0, who: {} }); st.n++; st.ms += dt; if (dt > st.max) st.max = dt; if (who) st.who[who] = (st.who[who] || 0) + 1; }
          };
          w.__prof = true;
          try { obj[k] = w; undo.push(function () { if (had) obj[k] = prevOwn; else delete obj[k]; }); } catch (e) {}
        });
      }
    }
    wrapAll(C.V, 'V'); wrapAll(C.S, 'S'); if (C.L && typeof C.L === 'object') wrapAll(C.L, 'L');
    var frames_ = 0, slow = 0, worst = 0, last = performance.now(), run = true, longs = [], po = null;
    (function tick() { if (!run) return; var n = performance.now(), dt = n - last; last = n; frames_++; if (dt > 50) { slow++; if (dt > worst) worst = dt; } requestAnimationFrame(tick); })();
    try { po = new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { longs.push(e.duration); }); }); po.observe({ entryTypes: ['longtask'] }); } catch (e) {}
    console.log('[snap] DANG DO ' + sec + 's: hay re chuot NHANH giua front/top/side va bam A/W/S/D nhu luc bi khung...');
    setTimeout(function () {
      run = false; try { po && po.disconnect(); } catch (e) {} undo.forEach(function (f) { try { f(); } catch (e) {} });
      var rows = Object.keys(stats).map(function (k) { var s2 = stats[k]; return { ham: k, goi: s2.n, tongMs: +s2.ms.toFixed(1), tbMs: +(s2.ms / s2.n).toFixed(2), maxMs: +s2.max.toFixed(1) }; }).sort(function (a, b) { return b.tongMs - a.tongMs; }).slice(0, 15);
      console.log('[snap] KET QUA DO: ' + frames_ + ' frame, ' + slow + ' frame >50ms (te nhat ' + worst.toFixed(0) + 'ms), ' + longs.length + ' long-task (tong ' + longs.reduce(function (a, b) { return a + b; }, 0).toFixed(0) + 'ms)');
      if (console.table) console.table(rows); else console.log(rows);
      console.log('[snap] CHUOI GOI LONG NHAU cua ham nghi van (tu ngoai vao trong):');
      Object.keys(stats).filter(function (k) { return TRACE.test(k.split('.')[1] || ''); }).sort(function (a, b) { return stats[b].n - stats[a].n; }).slice(0, 8).forEach(function (k) {
        var w = stats[k].who, top = Object.keys(w).sort(function (a, b) { return w[b] - w[a]; }).slice(0, 2);
        if (top.length) console.log('   ' + k + ' (' + stats[k].n + ' lan) <- ' + top.map(function (x) { return w[x] + 'x [' + x + ']'; }).join('   |   '));
      });
      console.log('[snap] DIEM BAT DAU cac chuoi (ai goi ham do dau tien; [TOOL] = code cua script nay):');
      Object.keys(origins).sort(function (a, b) { return origins[b] - origins[a]; }).slice(0, 12).forEach(function (k) { console.log('   ' + origins[k] + 'x  ' + k); });
      console.log('[snap] hoc: __toiUu ' + (window.__toiUu ? 'CO' : 'KHONG') + ' | fpsMode=' + CFG.fpsMode + ' | showArrows=' + CFG.showArrows + ' | recolorBox=' + CFG.recolorBox + '');
    }, sec * 1000);
  };

/* ============================================================
 * @MODULE[alt+z]  HOÀN TÁC
 * Phím: alt+z (keyUndo) · z (onZKey, hoàn tác thao tác gần nhất của script)
 * vec3, _calc, _emit, _grid, cloneJ,
 * recBegin/End/Wrap, undoPushPlatform,
 * installRecorder, doUndo, onZKey
 * ============================================================ */
  function vec3(o){return o?{x:o.x,y:o.y,z:o.z}:o;}
  function _calc(S,id,f){try{S.calcPointCount&&S.calcPointCount(id,f);}catch(e){}}
  function _emit(S){try{S.emitViewRefresh&&S.emitViewRefresh();}catch(e){}}
  function _grid(V){try{V.gridView&&V.gridView.current&&V.gridView.current.updateAllFramesCube();}catch(e){}}

  function cloneJ(o) { try { return o == null ? o : JSON.parse(JSON.stringify(o)); } catch (e) { return o; } }
  function recBegin(label) { if (_rec || _restoring) return null; _rec = { label: label, snaps: {}, created: {}, platform: '' }; return _rec; }
  function recEnd(r) {
    if (!r || _rec !== r) return; _rec = null;
    if (!Object.keys(r.snaps).length && !Object.keys(r.created).length && !r.platform) return;
    r.seq = ++_seq; _undo.push(r); if (_undo.length > UNDO_MAX) _undo.shift();
  }
  function recWrap(label, fn) { return function () { var r = recBegin(label); try { return fn.apply(this, arguments); } finally { recEnd(r); } }; }
  function recPlatform(label) { if (_rec) _rec.platform = label; }
  function undoPushPlatform(label) { _undo.push({ label: label, snaps: {}, created: {}, platform: label }); if (_undo.length > UNDO_MAX) _undo.shift(); }
  function installRecorder(S) {
    if (S.__snapRec) return; S.__snapRec = true; _recOK = true;
    function touch(id, f) {
      if(!_rec||_restoring)return;
      var k = id + '|' + f; if (_rec.snaps[k] || _rec.created[k]) return;
      var t = S.instancesTree[id], c = t && t.cubes && t.cubes[f]; if (!c) return;
      _rec.snaps[k] = { id: id, f: Number(f), pos: vec3(c.position), rot: vec3(c.rotation), dim: vec3(c.dimension), labels: cloneJ(c.labels), interp: c.interpolated, by: c.annotatedBy };
    }
    function created(c) {
      if(!_rec||_restoring||!c)return;
      var id = c.id, f = c.frameNum, t = S.instancesTree[id];
      if (t && t.cubes && t.cubes[f]) return;
      _rec.created[id + '|' + f] = { id: id, f: Number(f) };
    }
    function wrapFn(name, fn, soft) {
      var o = S[name]; if (typeof o !== 'function') return;
      var w = function () { try { fn.apply(null, arguments); } catch (e) { console.warn('[snap] ghi lich su', name, e); } return o.apply(this, arguments); };
      try { S[name] = w; } catch (e) {}
      if (S[name] !== w) { console.warn('[snap] khong gan duoc ham:', name); if (!soft) _recOK = false; }
    }
    wrapFn('updateCubeMatrix', touch); wrapFn('updateCubeLabel', touch); wrapFn('changeCubeInterpolation', touch);
    wrapFn('putCube', created); wrapFn('addCube', created);
    wrapFn('updateCubeMatrix', scheduleRecolor, true);
    ['updateCubeMatrix', 'updateCubeLabel', 'updateInstanceLabel', 'changeCubeInterpolation', 'putCube', 'addCube'].forEach(function (n) { wrapFn(n, function () { if (!_rec && !_restoring && !_fineBusy) _platSeq = ++_seq; }, true); });
    ['updateCubeLabel', 'updateInstanceLabel', 'updateCubeMatrix', 'putCube', 'addCube'].forEach(function (n) { wrapFn(n, chkNotify, true); });
  }
  function doUndo() {
    try {
      var C = ctx(); if (!C) return toast('Tool chua san sang');
      if (_recOK === false) toast('Cảnh báo: không ghi được lịch sử cho một số hàm của tool', 3000);
      var r = _undo.pop(); if (!r) return toast('Không còn thao tác nào của script để hoàn tác', 2500);
      if (r.relRestore) { try { r.relRestore(); _emit(C.S); if (_ap) { _ap.sig = ''; apRender(true); } } catch (e) { console.error('[snap] hoan tac lien ket', e); return toast('LỖI hoàn tác liên kết: ' + (e && e.message || e), 4000); } return toast('Đã hoàn tác: ' + r.label + ' · còn ' + _undo.length + ' bước', 2500); }
      if (r.platform) return toast('"' + r.label + '" là thao tác của chính tool Appen – bấm Z (hoàn tác của tool) để hoàn tác. Còn ' + _undo.length + ' bước script.', 5000);
      var S = C.S, n = 0, miss = 0, parts = [];
      _restoring = true;
      try {
        Object.keys(r.snaps).forEach(function (k) {
          var s0 = r.snaps[k], t = S.instancesTree[s0.id], c = t && t.cubes && t.cubes[s0.f];
          if (!c) { miss++; return; }
          if (s0.pos && s0.rot && s0.dim) S.updateCubeMatrix(s0.id, s0.f, { position: s0.pos, rotation: s0.rot, dimension: s0.dim });
          if (s0.labels != null && JSON.stringify(c.labels) !== JSON.stringify(s0.labels)) S.updateCubeLabel(s0.id, s0.f, s0.labels);
          if (S.changeCubeInterpolation && s0.interp !== undefined && s0.by !== undefined) S.changeCubeInterpolation(s0.id, s0.f, s0.interp, s0.by);
          try { S.calcPointCount && S.calcPointCount(s0.id, s0.f); } catch (e) {}
          n++;
        });
      } finally { _restoring = false; }
      _emit(S);
      if (n || miss) parts.push('khôi phục ' + n + ' keyframe' + (miss ? ' (' + miss + ' không còn)' : ''));
      var cr = {}; Object.keys(r.created).forEach(function (k) { var c = r.created[k]; (cr[c.id] = cr[c.id] || []).push(c.f); });
      var ids = Object.keys(cr);
      if (ids.length) {
        parts.push('xoá keyframe mới tạo (' + ids.length + ' id)');
        (function nx(i) { if (i >= ids.length) return; removeFrames(C, ids[i], cr[ids[i]], function () { nx(i + 1); }); })(0);
      }
      toast('Hoàn tác "' + r.label + '": ' + parts.join(', ') + ' | còn ' + _undo.length + ' bước', 4000);
    } catch (e) { console.error('[snap] loi hoan tac', e); toast('LỖI hoàn tác: ' + (e && e.message || e), 5000); }
  }
  window.__doUndo = doUndo;
  function onZKey(e) {
    if (CFG.zUndo === false || e.type !== 'keydown' || e.__snapSynth || e.__fineSynth || e.code !== 'KeyZ') return;
    if (e.altKey || e.shiftKey || e.metaKey || _rec || _restoring || _fineBusy || _menu || _ly.ed) return;
    var t = e.composedPath ? e.composedPath()[0] : e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    var top = _undo[_undo.length - 1];
    if (!top || top.platform || !(top.seq > _platSeq) || /^(di chuyển mịn|Ctrl\+)/.test(top.label)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.repeat) return;
    doUndo();
  }
  var _fineBusy = false;

/* ============================================================
 * @MODULE[shift+wasdqe]  DI CHUYỂN MỊN (Shift+A/W/S/D/Q/E)
 * finePose, fineDiff, mMul, mT, axisAngle, rotAA,
 * fineRotStep/Apply, finePoseStep, fineRedispatch,
 * fineRun, onFineKey, viaTool
 * @MODULE[wasdqe]  KHOÁ TRỤC XOAY (A/W/S/D/Q/E không Shift)
 * axisLockStep, axisRun, onAxisKey
 * (hai module dùng chung hàm xoay nên nằm chung một khối; onFineKey nằm sau phần axis)
 * ============================================================ */
  function finePose(S, id, f) {
    var e = effCube(S, id, f); if (!e || !e.cube) return null;
    var c = e.cube; return { p: vec3(c.position), r: vec3(c.rotation), d: vec3(c.dimension), R: eulerMat(c.rotation) };
  }
  function fineDiff(a, b) {
    var m = 0;
    ['p', 'd'].forEach(function (g) { ['x', 'y', 'z'].forEach(function (k) { m = Math.max(m, Math.abs(b[g][k] - a[g][k])); }); });
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) m = Math.max(m, Math.abs(b.R[i][j] - a.R[i][j]));
    return m;
  }
  function mMul(A, B) { var N = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) N[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j]; return N; }
  function mT(A) { return [[A[0][0], A[1][0], A[2][0]], [A[0][1], A[1][1], A[2][1]], [A[0][2], A[1][2], A[2][2]]]; }
  function axisAngle(M) {
    var c = Math.max(-1, Math.min(1, (M[0][0] + M[1][1] + M[2][2] - 1) / 2)), t = Math.acos(c);
    if (t < 1e-7) return { a: [0, 1, 0], t: 0 };
    var ax;
    if (Math.PI - t < 1e-4) {
      var x = Math.sqrt(Math.max(0, (M[0][0] + 1) / 2)), y = Math.sqrt(Math.max(0, (M[1][1] + 1) / 2)), z = Math.sqrt(Math.max(0, (M[2][2] + 1) / 2));
      if (x >= y && x >= z) { ax = [x, (M[0][1] + M[1][0]) / (4 * x), (M[0][2] + M[2][0]) / (4 * x)]; }
      else if (y >= z) { ax = [(M[0][1] + M[1][0]) / (4 * y), y, (M[1][2] + M[2][1]) / (4 * y)]; }
      else { ax = [(M[0][2] + M[2][0]) / (4 * z), (M[1][2] + M[2][1]) / (4 * z), z]; }
    } else { var sn = 2 * Math.sin(t); ax = [(M[2][1] - M[1][2]) / sn, (M[0][2] - M[2][0]) / sn, (M[1][0] - M[0][1]) / sn]; }
    var l = Math.sqrt(ax[0] * ax[0] + ax[1] * ax[1] + ax[2] * ax[2]) || 1;
    return { a: [ax[0] / l, ax[1] / l, ax[2] / l], t: t };
  }
  function rotAA(a, t) {
    var c = Math.cos(t), s = Math.sin(t), v = 1 - c, x = a[0], y = a[1], z = a[2];
    return [[c + x * x * v, x * y * v - z * s, x * z * v + y * s], [y * x * v + z * s, c + y * y * v, y * z * v - x * s], [z * x * v - y * s, z * y * v + x * s, c + z * z * v]];
  }
  function fineRotStep(Rb, Ra) {
    var w = axisAngle(mMul(Ra, mT(Rb))), l = axisAngle(mMul(mT(Rb), Ra));
    if (w.t < 1e-6 && l.t < 1e-6) return null;
    var sw = Math.max(Math.abs(w.a[0]), Math.abs(w.a[1]), Math.abs(w.a[2])), sl = Math.max(Math.abs(l.a[0]), Math.abs(l.a[1]), Math.abs(l.a[2]));
    if (w.a[1] > 0.9 || w.a[1] < -0.9) sw = 2;
    return sw >= sl ? { m: 'w', a: w.a, t: w.t } : { m: 'l', a: l.a, t: l.t };
  }
  function fineRotApply(R, rs, k) {
    if (!rs) return R;
    var Q = rotAA(rs.a, rs.t * k);
    return rs.m === 'w' ? mMul(Q, R) : mMul(R, Q);
  }
  function fineBlock(e) { e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation(); }
  function fineRedispatch(e) {
    var k = String(e.key || ''), kk = k.length === 1 ? k.toUpperCase() : k, kc = e.keyCode || kk.toUpperCase().charCodeAt(0);
    var ev = new KeyboardEvent(e.type, { key: kk, code: e.code, keyCode: kc, which: kc, shiftKey: true, repeat: e.repeat,
      bubbles: true, cancelable: true, composed: true, view: window });
    try { Object.defineProperty(ev, 'keyCode', { get: function () { return kc; } }); Object.defineProperty(ev, 'which', { get: function () { return kc; } }); } catch (x) {}
    ev.__fineSynth = true;
    (e.target || document).dispatchEvent(ev);
  }
  function finePoseStep(c, st, k) {
    var R = eulerMat(c.rotation), w = mulV(R, [st.p[0] * k, st.p[1] * k, st.p[2] * k]);
    return { position: { x: c.position.x + w[0], y: c.position.y + w[1], z: c.position.z + w[2] },
      rotation: st.rot ? eulerFromMat(fineRotApply(R, st.rot, k), c.rotation) : { x: c.rotation.x, y: c.rotation.y, z: c.rotation.z },
      dimension: { x: Math.max(0.01, c.dimension.x + st.d[0] * k), y: Math.max(0.01, c.dimension.y + st.d[1] * k), z: Math.max(0.01, c.dimension.z + st.d[2] * k) } };
  }
  function fineRefresh(S) { _emit(S); }
  function fineAxis(v, eps) {
    var a = [Math.abs(v[0]), Math.abs(v[1]), Math.abs(v[2])], m = Math.max(a[0], a[1], a[2]), n = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
    if (m < eps) return [0, 0, 0];
    if (m < 0.9 * n) return v;
    var r = [0, 0, 0], i = a.indexOf(m); r[i] = v[i]; return r;
  }
  var _axisBusy = false, _axisFlush = null;
  function axisViewOf(el) {
    try {
      if (!el || !el.closest) return '';
      if (el.closest('#frontview')) return 'front';
      if (el.closest('#topview')) return 'top';
      if (el.closest('#sideview')) return 'side';
    } catch (x) {}
    return '';
  }
  /* Nếu có lớp phủ nằm trên view (phần tử dưới con trỏ không nằm trong #frontview/#topview/#sideview) thì dùng vị trí con trỏ so với khung của từng view */
  function axisViewAt(x, y, el) {
    var v = axisViewOf(el); if (v) return v;
    var L = [['front', '#frontview'], ['top', '#topview'], ['side', '#sideview']];
    for (var i = 0; i < L.length; i++) {
      try { var h = document.querySelector(L[i][1]); if (!h) continue; var r = h.getBoundingClientRect(); if (r.width > 2 && r.height > 2 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return L[i][0]; } catch (e) {}
    }
    return '';
  }
  function axisVState() {   // các thuộc tính trong window.view đang giữ giá trị front/top/side (nền tảng nhớ view nào)
    var vs = {};
    try { var VV = window.view; Object.keys(VV).forEach(function (k) { var q = VV[k]; if (typeof q === 'string' && /^(front|top|side)/i.test(q)) vs[k] = q; else if (q && typeof q === 'object' && !q.nodeType && !Array.isArray(q) && Object.keys(q).length < 40) Object.keys(q).forEach(function (k2) { var w; try { w = q[k2]; } catch (e5) { return; } if (typeof w === 'string' && /^(front|top|side)/i.test(w)) vs[k + '.' + k2] = w; }); }); } catch (e4) {}
    return vs;
  }
  window.__snapAxisDebug = function (on) { window.__axisDbg = on !== false; console.log('[snap] axis debug', window.__axisDbg ? 'BAT: bam phim trong 1 view roi xem Console' : 'TAT'); };
  function deepElAt(x, y) {
    var el = document.elementFromPoint(x, y);
    for (var n = 0; el && el.shadowRoot && n < 6; n++) { var e2 = el.shadowRoot.elementFromPoint(x, y); if (!e2 || e2 === el) break; el = e2; }
    return el;
  }
  /* Luôn tra phần tử dưới con trỏ NGAY LÚC BẤM PHÍM. Không tin _ly.mv (lưu từ mousemove cuối):
     sau Tab phóng to/thu nhỏ, bố cục đổi dưới con trỏ đứng yên, không có mousemove mới -> _ly.mv cũ -> sai trục A/W/S/D. */
  function axisHoverView() {
    try {
      var o = (typeof _ly !== 'undefined') ? _ly : null;
      if (!o) return '';
      if (o.mx == null) return o.mv || '';
      var el = deepElAt(o.mx, o.my), v = axisViewAt(o.mx, o.my, el);
      if (window.__axisDbg) {
        var chain = [], x = el; for (var k = 0; x && k < 6; k++, x = x.parentElement) chain.push((x.tagName || '').toLowerCase() + (x.id ? '#' + x.id : '') + (x.className && typeof x.className === 'string' ? '.' + x.className.trim().split(/\s+/).slice(0, 2).join('.') : ''));
        var rc = {}; [['front', '#frontview'], ['top', '#topview'], ['side', '#sideview']].forEach(function (a) { var h = document.querySelector(a[1]); if (h) { var r = h.getBoundingClientRect(); rc[a[0]] = [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; } });
        var vs = axisVState();
        console.log('[snap] axis view=' + (v || '(khong ro)'), 'V-nho-view=' + JSON.stringify(vs), 'axisLock=' + CFG.axisLock, 'map=' + JSON.stringify(CFG.axisLockViews), 'chuot=', o.mx, o.my, 'DOM=', chain.join(' < '), 'khung view=', JSON.stringify(rc));
      }
      o.mv = v; return v;
    } catch (x) {}
    return '';
  }
  /* (đã bỏ pointerRefresh: không gửi mousemove giả vào nền tảng nữa – dễ làm con trỏ nhảy / nhầm view; việc làm mới hover sau Tab do lyTab gốc đảm nhiệm) */
  function pointerRefresh() {}
  function pointerRefreshSoon() {}
  /* Đồng bộ hover của nền tảng với view THẬT dưới con trỏ, đúng lúc bấm phím A/W/S/D/Q/E.
     Lỗi gốc: chuyển nhanh front<->top<->side rồi bấm phím thì nền tảng còn nhớ view cũ (trạng thái hover cập nhật trễ);
     rê chuột sang view khác mới hết. Ở đây, nếu chuột đã nhúc nhích kể từ lần đồng bộ trước, gửi đúng chuỗi sự kiện
     out/over/move vào phần tử dưới con trỏ TRƯỚC khi phím tới nền tảng. Chỉ chạy 1 lần cho mỗi lần chuột di chuyển. */
  var _hv = { seq: 0, synced: -1, lastEl: null, moveAt: 0, settleT: 0, settledView: '', tgt: null, crossed: false };
  /* Chuột vừa chuyển nhanh qua view khác rồi DỪNG: sau ~90ms đồng bộ hover của nền tảng với view thật (không cần chờ bấm phím) */
  function hoverSettleArm() { _hv.moveAt = performance.now(); if (!_hv.settleT && CFG.hoverSyncKeys) _hv.settleT = setTimeout(hoverSettle, 90); }
  function hoverSettle() {
    _hv.settleT = 0;
    if (performance.now() - _hv.moveAt < 80) { _hv.settleT = setTimeout(hoverSettle, 90); return; }
    try {
      var o = (typeof _ly !== 'undefined') ? _ly : null; if (!o || o.mx == null || _ptrDown || o.ed) return;
      var el = deepElAt(o.mx, o.my), v = el ? axisViewAt(o.mx, o.my, el) : '';
      if (v && (v !== _hv.settledView || _hv.crossed)) { hoverSync(); if (window.__axisDbg) console.log('[snap] settle-sync -> view=' + v + (_hv.crossed ? ' (chuot da doi phan tu khi re)' : '')); }
      _hv.crossed = false; _hv.settledView = v;
    } catch (e) {}
  }
  function hoverFire(el, type, base, rel) {
    var Ev = (type.indexOf('pointer') === 0 && window.PointerEvent) ? PointerEvent : MouseEvent, o = {};
    for (var k in base) o[k] = base[k];
    o.relatedTarget = rel || null;
    if (Ev === PointerEvent) { o.pointerId = 1; o.pointerType = 'mouse'; o.isPrimary = true; }
    var ev = new Ev(type, o); ev.__snapSynth = true; el.dispatchEvent(ev);
  }
  /* Mô phỏng ĐẦY ĐỦ việc chuột rời các view cũ và vào view hiện tại. React chỉ đổi onMouseEnter/onMouseLeave khi nhận mouseout (có relatedTarget)
     trên phần tử CŨ; mouseover vào phần tử mới một mình không đủ -> khung xanh "view đang hoạt động" của nền tảng bị kẹt ở view cũ. */
  function hoverSync() {
    var o = (typeof _ly !== 'undefined') ? _ly : null;
    if (!o || o.mx == null || o.ed) return;
    var el = deepElAt(o.mx, o.my); if (!el) return;
    if (el.getRootNode && el.getRootNode() !== document) return;   // phần tử trong shadow DOM (bảng của tool) -> bỏ qua
    var base = { bubbles: true, cancelable: true, composed: true, clientX: o.mx, clientY: o.my, screenX: o.mx, screenY: o.my, view: window, buttons: 0 };
    var nb = {}; for (var k in base) nb[k] = base[k]; nb.bubbles = false; nb.cancelable = false;   // mouseenter/mouseleave không nổi bọt
    var view = axisViewAt(o.mx, o.my, el), cur = null, others = [];
    if (view) {
      try {
        cur = document.querySelector('#' + view + 'view');
        ['front', 'top', 'side'].forEach(function (v) { if (v !== view) { var h = document.querySelector('#' + v + 'view'); if (h) others.push(h); } });
      } catch (e) { cur = null; }
    }
    if (cur && others.length) {
      var rel = others[0].querySelector('canvas') || others[0];
      others.forEach(function (h) {   // RỜI các view khác (cả sự kiện nổi bọt cho React lẫn sự kiện gốc cho listener native)
        var from = h.querySelector('canvas') || h;
        hoverFire(from, 'pointerout', base, el); hoverFire(from, 'mouseout', base, el);
        hoverFire(h, 'pointerleave', nb, el); hoverFire(h, 'mouseleave', nb, el);
      });
      hoverFire(el, 'pointerover', base, rel); hoverFire(el, 'mouseover', base, rel);   // VÀO view hiện tại
      hoverFire(cur, 'pointerenter', nb, rel); hoverFire(cur, 'mouseenter', nb, rel);
      if (el !== cur) { hoverFire(el, 'pointerenter', nb, rel); hoverFire(el, 'mouseenter', nb, rel); }
    } else {
      var prev = _hv.lastEl && _hv.lastEl.isConnected ? _hv.lastEl : null;
      if (prev && prev !== el) { hoverFire(prev, 'pointerout', base, el); hoverFire(prev, 'mouseout', base, el); }
      if (prev !== el) { hoverFire(el, 'pointerover', base, prev); hoverFire(el, 'mouseover', base, prev); }
    }
    hoverFire(el, 'pointermove', base, null); hoverFire(el, 'mousemove', base, null);
    _hv.lastEl = el;
  }
  function onHoverKey(e) {
    if (e.type !== 'keydown' || !CFG.hoverSyncKeys || e.__fineSynth || e.__snapSynth || e.ctrlKey || e.altKey || e.metaKey) return;
    if ((CFG.fineMoveKeys || []).indexOf(String(e.code)) < 0) return;
    if (_hv.seq === _hv.synced) return;   // chuột chưa nhúc nhích từ lần đồng bộ trước -> nền tảng đã đúng
    var t = e.composedPath ? e.composedPath()[0] : e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    _hv.synced = _hv.seq;
    var vb = window.__axisDbg ? axisVState() : null; try { hoverSync(); if (window.__axisDbg) console.log('[snap] hover-sync key=' + e.code, 'view-that=' + axisViewAt(_ly.mx, _ly.my, _hv.lastEl), 'V-nho-view TRUOC sync=' + JSON.stringify(vb), 'SAU sync=' + JSON.stringify(axisVState()), 'target=' + (_hv.lastEl && _hv.lastEl.tagName)); } catch (x) { console.warn('[snap] hover-sync', x); }
  }
  function axisLearn(k, sg) { if (_axSign[k] === sg) return; _axSign[k] = sg; try { localStorage.setItem('__snapAxisSign', JSON.stringify(_axSign)); } catch (e) {} }
  function axisLockStep(Rb, Ra, view, code) {
    var aa = axisAngle(mMul(Ra, mT(Rb)));
    if (aa.t < 1e-4) return null;
    var cols = [[Rb[0][0], Rb[1][0], Rb[2][0]], [Rb[0][1], Rb[1][1], Rb[2][1]], [Rb[0][2], Rb[1][2], Rb[2][2]]];
    var d = cols.map(function (c) { return dot(aa.a, c); }), k = 0, i;
    for (i = 1; i < 3; i++) if (Math.abs(d[i]) > Math.abs(d[k])) k = i;
    var vm = (CFG.axisLockViews || {})[view], vk = vm === 'x' ? 0 : vm === 'y' ? 1 : vm === 'z' ? 2 : -1;
    var ang = d[k] >= 0 ? aa.t : -aa.t, sk = view + '|' + code;
    if (vk >= 0) {
      if (Math.abs(d[vk]) >= 0.3) {
        k = vk; ang = d[k] >= 0 ? aa.t : -aa.t;
        if (code && Math.abs(d[vk]) >= 0.7) axisLearn(sk, ang >= 0 ? 1 : -1);
      } else if (code) {
        /* nền tảng xoay sai trục (lệch > 72° so với trục của ô) -> ép về đúng trục, giữ độ lớn góc; chiều lấy theo lần xoay đúng đã học, chưa có thì theo chiều nền tảng */
        var sg = _axSign[sk] || (ang >= 0 ? 1 : -1);
        console.log('[snap] khoa truc ' + view + '/' + code + ': nen tang xoay truc ' + 'xyz'.charAt(k) + ' -> ep ve ' + vm + (_axSign[sk] ? '' : ' (chua hoc chieu, theo nen tang)'));
        k = vk; ang = sg * aa.t;
      }
    }
    return { k: k, w: cols[k], ang: ang };
  }
  function axisRun(C, id, f, code) {
    if (_axisFlush) _axisFlush();
    var b = finePose(C.S, id, f); if (!b) return;
    var view = axisHoverView(), done = false, tries = 0;
    _axisBusy = true;
    function end() { if (done) return; done = true; _axisBusy = false; if (_axisFlush === flush) _axisFlush = null; }
    function fix() {
      try {
        var C2 = ctx(); if (!C2 || curFrame(C2) !== f) return;
        var cur = finePose(C2.S, id, f); if (!cur) return;
        var lk = axisLockStep(b.R, cur.R, view, code); if (!lk) return;
        var Rn = mMul(rotAA(lk.w, lk.ang), b.R);
        if (axisAngle(mMul(Rn, mT(cur.R))).t < 1e-4) return;
        var nr = eulerFromMat(Rn, cur.r);
        _restoring = true;
        try { C2.S.updateCubeMatrix(id, f, { position: cur.p, rotation: nr, dimension: cur.d }); } finally { _restoring = false; }
        try { C2.S.calcPointCount && C2.S.calcPointCount(id, f); } catch (e2) {}
        fineRefresh(C2.S);
      } catch (err) { console.error('[snap] khoa truc xoay', err); }
    }
    function flush() {
      if (done) return;
      var C2 = ctx(), now = C2 && curFrame(C2) === f && finePose(C2.S, id, f);
      if (now && fineDiff(b, now) > 1e-9) fix();
      end();
    }
    _axisFlush = flush;
    (function poll() {
      if (done) return;
      var C2 = ctx(), now = C2 && curFrame(C2) === f && finePose(C2.S, id, f);
      if (!C2 || curFrame(C2) !== f) return end();
      if (now && fineDiff(b, now) > 1e-9) { fix(); return end(); }
      if (tries++ >= 30) return end();
      setTimeout(poll, tries === 1 ? 0 : 16);
    })();
  }
  function onAxisKey(e) {
    if (e.type !== 'keydown' || e.__fineSynth || e.__snapSynth || e.defaultPrevented || CFG.axisLock === false) return;
    if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey || _fineBusy) return;
    if ((CFG.fineMoveKeys || []).indexOf(String(e.code)) < 0) return;
    var t = e.composedPath ? e.composedPath()[0] : e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (toolBusy()) return;
    var C = ctx(); if (!C) return;
    var id = selectedId(C); if (id == null) return;
    axisRun(C, id, curFrame(C), String(e.code));
  }
  function fineRun(e, C, id, f) {
    var S = C.S, b = finePose(S, id, f);
    if (!b) return;
    var view = axisHoverView();
    _fineBusy = true;
    var r = e.repeat ? null : recBegin('di chuyển mịn');
    if (r && S.instancesTree[id].cubes[f]) r.snaps[id + '|' + f] = { id: id, f: Number(f), pos: b.p, rot: b.r, dim: b.d };
    var done = function () { _fineBusy = false; recEnd(r); };
    function finish(after) {
      try {
        var C2 = ctx(); if (!C2 || curFrame(C2) !== f) return done();
        var S2 = C2.S, cur = finePose(S2, id, f) || after;
        var dp = [cur.p.x - b.p.x, cur.p.y - b.p.y, cur.p.z - b.p.z];
        var rs, lk = CFG.axisLock !== false ? axisLockStep(b.R, cur.R, view, e.code) : null;
        if (lk) rs = { m: 'w', a: lk.w, t: lk.ang };
        else if (CFG.axisLock === false) {
          rs = fineRotStep(b.R, cur.R);
          if (rs && rs.t < 1e-4) rs = null;
          if (rs) { var q = fineAxis(rs.a, 0), n = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2]) || 1; rs.a = [q[0] / n, q[1] / n, q[2] / n]; }
        } else rs = null;
        var st = { p: fineAxis(mulTV(b.R, dp), 1e-5), rot: rs, d: fineAxis([cur.d.x - b.d.x, cur.d.y - b.d.y, cur.d.z - b.d.z], 1e-5) };
        var pose = finePoseStep({ position: b.p, rotation: b.r, dimension: b.d }, st, CFG.fineMoveScale);
        _restoring = true;
        try { S2.updateCubeMatrix(id, f, pose); } finally { _restoring = false; }
        try { S2.calcPointCount && S2.calcPointCount(id, f); } catch (e2) {}
        fineRefresh(S2);
      } catch (err) { console.error('[snap] di chuyển mịn', err); }
      done();
    }
    var tries = 0;
    function poll() {
      var C2 = ctx(), now = C2 && curFrame(C2) === f && finePose(C2.S, id, f);
      if (!C2 || curFrame(C2) !== f) return done();
      if (now && fineDiff(b, now) > 1e-9) return tries === 0 ? finish(now) : setTimeout(function () { finish(now); }, 30);
      if (tries++ >= 30) return done();
      if (tries === 1) Promise.resolve().then(poll); else setTimeout(poll, 16);
    }
    fineRedispatch(e);
    poll();
  }
  function onFineKey(e) {
    if (e.__fineSynth || !CFG.fineMove || !e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
    if ((CFG.fineMoveKeys || []).indexOf(String(e.code)) < 0) return;
    var t = e.composedPath ? e.composedPath()[0] : e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    var C = ctx(); if (!C) return;
    if (e.type === 'keyup') {
      if (selectedId(C) == null || toolBusy()) return;
      fineBlock(e);
      if (e.getModifierState && e.getModifierState('CapsLock')) fineRedispatch(e);
      return;
    }
    if (e.type !== 'keydown' || toolBusy()) return;
    var id = selectedId(C); if (id == null) return;
    fineBlock(e);
    if (!_fineBusy) fineRun(e, C, id, curFrame(C));
  }
  function viaTool(label, work) {
    var C = ctx(); if (!C) return;
    var r = recBegin(label), id = selectedId(C), f = curFrame(C), fin = function () { recEnd(r); };
    var direct = function () { try { work(); } catch (e) { console.error('[snap] ' + label, e); toast('LỖI ' + label + ': ' + (e && e.message || e), 5000); } fin(); };
    if (!CFG.platformUndo || id == null || _fineBusy || !CFG.histKey) return direct();
    var S = C.S, b = finePose(S, id, f); if (!b) return direct();
    if (r && S.instancesTree[id].cubes[f]) r.snaps[id + '|' + f] = { id: id, f: Number(f), pos: b.p, rot: b.r, dim: b.d };
    _fineBusy = true;
    synthKey(CFG.histKey, 'keydown'); synthKey(CFG.histKey, 'keyup');
    var tries = 0;
    (function poll() {
      var C2 = ctx(), now = C2 && curFrame(C2) === f && finePose(C2.S, id, f);
      if (!C2 || curFrame(C2) !== f) { _fineBusy = false; return fin(); }
      if (now && fineDiff(b, now) > 1e-9) {
        _fineBusy = false;
        try { C2.S.updateCubeMatrix(id, f, { position: b.p, rotation: b.r, dimension: b.d }); } catch (e) { console.warn('[snap] dat lai pose goc', e); }
        return direct();
      }
      if (tries++ >= 30) { _fineBusy = false; console.warn('[snap] tool khong doi box khi bam phim ' + CFG.histKey + ' -> khong co Z cua nen tang'); return direct(); }
      if (tries === 1) Promise.resolve().then(poll); else setTimeout(poll, 16);
    })();
  }
  window.__viaTool = viaTool;

/* ============================================================
 * @MODULE[alt+l]  BỐ CỤC CANVAS
 * Phím: alt+l (keyLayoutToggle, tạm tắt/bật bố cục tùy chỉnh)
 * lyGrid, lyRole, lyTag, lyRects, lyCss, lyApply,
 * lyCustomApply, lyEdit, lyEdDown, lyEdClose,
 * lyToggleSus, lyMaxToggle, lyInit
 * ============================================================ */
  var LY_ID = '__snapLayoutCss', LY_MIN = 4,
    LY_ROLES = ['cams', 'rgb', 'focus', 'front', 'top', 'side', 'left', '3d', 'attr'],
    LY_SHOW = { attr: { x: 70, y: 42, w: 30, h: 54 } },
    LY_NAME = { cams: '7 Camera', rgb: 'Cam chính', focus: 'FOCUS', front: 'FRONT', top: 'TOP', side: 'SIDE', left: 'Cuboids', '3d': '3D', attr: 'Bảng thuộc tính' },
    _ly = { t: 0, rz: 0, orig: null, ed: null, names: {}, cust: {}, sus: false, max: null, mouse: null };
  /* Cam chính và FOCUS 7 camera giữ bảng thuộc tính; FOCUS nền tảng thì không. */
  var LY_IMG = { rgb: 1, cams: 1 };
  function lyImgRole(r) { return !!LY_IMG[String(r || '')]; }
  function lySelf(r) { r = String(r || ''); return r === 'cams' || r === 'attr' || r.charAt(0) === 'u'; }
  function lyName(r) { var c = lyCustomList().filter(function (x) { return x.id === r; })[0]; return LY_NAME[r] || _ly.names[r] || (c && c.name) || r; }
  function lyRoles() {
    var g = lyGrid(), out = LY_ROLES.slice();
    lyCustomList().forEach(function (c) { if (out.indexOf(c.id) < 0) out.push(c.id); });
    if (g) [].forEach.call(g.querySelectorAll(':scope > .react-grid-item[data-cc^="x"]'), function (it) { var r = it.getAttribute('data-cc'); if (out.indexOf(r) < 0) out.push(r); });
    return out;
  }
  function lyGrid() { return document.querySelector('.react-grid-layout'); }
  function lyRole(it) {
    if (it.querySelector('#rgbview')) return 'rgb';
    if (it.querySelector('#frontview')) return 'front';
    if (it.querySelector('#topview')) return 'top';
    if (it.querySelector('#sideview')) return 'side';
    if (it.querySelector('#container')) return '3d';
    var lab = it.querySelector('.rectangle-contaniner .rectangle');
    if (lab && /^FOCUS$/i.test((lab.textContent || '').trim())) return 'focus';
    if (it.querySelector('.b-Sidebar,.collapse')) return 'left';
    return '';
  }
  function lySig(it) {
    var e = it.querySelector('[id]'), g = e && e.id ? 'id-' + e.id : '';
    if (!g) { var c = it.firstElementChild, cl = c && typeof c.className === 'string' ? c.className.trim().split(/\s+/)[0] : ''; g = cl ? 'c-' + cl : ''; }
    if (!g) g = 't-' + (it.textContent || '').replace(/\s+/g, '').slice(0, 10);
    return g.replace(/[^A-Za-z0-9_-]/g, '_') || 'item';
  }
  function lyTag(fast) {
    var g = lyGrid(), n = 0, used = {}; if (!g) return 0;
    if (fast && !g.querySelector(':scope > .react-grid-item:not([data-cc])')) return 0;
    [].forEach.call(g.querySelectorAll(':scope > .react-grid-item'), function (it) {
      if (fast && it.hasAttribute('data-cc')) { used[it.getAttribute('data-cc')] = 1; return; }
      var r = lyRole(it);
      if (!r) {
        var base = 'x_' + lySig(it), c = 1; r = base; while (used[r]) r = base + '_' + (++c); used[r] = 1;
        var tx = (it.textContent || '').replace(/\s+/g, ' ').trim();
        _ly.names[r] = 'Ô khác' + (tx ? ': ' + tx.slice(0, 18) : ' (' + base.slice(2, 16) + ')');
      }
      n++;
      if (it.getAttribute('data-cc') !== r) it.setAttribute('data-cc', r);
    });
    return n;
  }
  function lyClone(o) { return JSON.parse(JSON.stringify(o)); }
  function lyOff(t) { return !t || t.off || t.w <= 0.1 || t.h <= 0.1; }
  function lyDefaults() {
    var W = (CFG.layoutW || []).slice(0, 6).map(function (x) { x = +x; return x > 0 ? x : 0; });
    while (W.length < 6) W.push(0);
    var sum = W.reduce(function (a, b) { return a + b; }, 0), out = {}, x = 0,
      T = sum ? Math.min(90, Math.max(5, +CFG.layoutTopH || 0)) : 0, L = Math.min(60, Math.max(0, +CFG.layoutLeftW || 0));
    ['cams', 'rgb', 'focus', 'front', 'top', 'side'].forEach(function (r, i) {
      var w = sum ? W[i] * 100 / sum : 0;
      out[r] = (w > 0 && T > 0) ? { x: x, y: 0, w: w, h: T, off: false } : { x: 0, y: 0, w: 0, h: 0, off: true };
      x += w;
    });
    out.left = L > 0 ? { x: 0, y: T, w: L, h: 100 - T, off: false } : { x: 0, y: T, w: 0, h: 0, off: true };
    out['3d'] = { x: L, y: T, w: 100 - L, h: 100 - T, off: false };
    out.attr = { x: 0, y: 0, w: 0, h: 0, off: true };
    return out;
  }
  function lyOv() { var v = +CFG.layoutOverflow; return isFinite(v) ? Math.max(0, Math.min(200, v)) : 0; }
  function lyRects() {
    var D = lyDefaults(), U = CFG.layoutRects || {}, out = {};
    lyRoles().forEach(function (r) {
      var u = U[r];
      out[r] = (u && isFinite(+u.x) && isFinite(+u.y) && isFinite(+u.w) && isFinite(+u.h)) ? { x: +u.x, y: +u.y, w: +u.w, h: +u.h, off: !!u.off } : (D[r] || null);
    });
    return out;
  }
  function lyCurrent(noMax) {
    if (_ly.ed) return _ly.ed.R;
    var R = lyRects();
    if (_ly.max && !noMax) {
      if (lyRoles().indexOf(_ly.max) < 0) _ly.max = null;
      else R[_ly.max] = { x: 0, y: 0, w: 100, h: 100, off: false };
    }
    return R;
  }
  /* Vùng còn lại cho ô ảnh khi bảng thuộc tính đang hiện (đơn vị % của lưới) */
  function lyAttrCut() {
    if (CFG.attrKeepTab === false || !_ap || !_ap.host || !CFG.attrPanelOpen) return null;
    var g = lyGrid(); if (!g) return null;
    var gb, p;
    try { gb = g.getBoundingClientRect(); p = _ap.host.getBoundingClientRect(); } catch (e) { return null; }
    if (!gb.width || !gb.height || !p.width || !p.height) return null;
    if (p.right <= gb.left || p.left >= gb.right || p.bottom <= gb.top || p.top >= gb.bottom) return null;
    var x0 = (p.left - gb.left) / gb.width * 100, x1 = (p.right - gb.left) / gb.width * 100,
      y0 = (p.top - gb.top) / gb.height * 100, y1 = (p.bottom - gb.top) / gb.height * 100;
    x0 = Math.max(0, Math.min(100, x0)); x1 = Math.max(0, Math.min(100, x1));
    y0 = Math.max(0, Math.min(100, y0)); y1 = Math.max(0, Math.min(100, y1));
    if (x1 - x0 < 0.5 || y1 - y0 < 0.5) return null;
    var cl = function (v) { return Math.max(0, Math.min(100, v)); };
    var wR = cl(x0), wL = cl(100 - x1), hB = cl(y0), hT = cl(100 - y1);
    var cand = [
      { x: 0, y: 0, w: wR, h: 100 },            /* bảng ở bên phải */
      { x: 100 - wL, y: 0, w: wL, h: 100 },      /* bảng ở bên trái */
      { x: 0, y: 0, w: 100, h: hB },             /* bảng ở dưới */
      { x: 0, y: 100 - hT, w: 100, h: hT }       /* bảng ở trên */
    ];
    var best = cand[0];
    cand.forEach(function (c) { if (c.w * c.h > best.w * best.h) best = c; });
    /* quá nhỏ thì thôi, để ô ảnh phóng to bình thường */
    return (best.w >= 20 && best.h >= 20) ? best : null;
  }
  function lyCss(R) {
    var out = ['.react-grid-layout>.react-grid-item[data-cc]{transition:none!important}'].concat(lyOv() > 0 ? ['.react-grid-layout{overflow:visible!important}', '*:has(>.react-grid-layout){overflow:visible!important}'] : []), f = function (v) { return Math.round(v * 1000) / 1000; };
    var cut = lyAttrCut();
    lyRoles().forEach(function (r) {
      if (lySelf(r)) return;
      var t = R[r]; if (!t) return;
      var sel = '.react-grid-layout>.react-grid-item[data-cc="' + r + '"]';
      out.push(sel + (!lyOff(t)
        ? '{transform:none!important;left:' + f(t.x) + '%!important;top:' + f(t.y) + '%!important;width:' + f(t.w) + '%!important;height:' + f(t.h) + '%!important;display:block!important}'
        : '{display:none!important}'));
    });
    out.push('.react-grid-layout[data-ccmax]>.react-grid-item{visibility:hidden!important;pointer-events:none!important}');
    lyRoles().forEach(function (r) {
      if (lySelf(r)) return;
      var mr = String(r).replace(/[^A-Za-z0-9_-]/g, ''), b = (cut && lyImgRole(r)) ? cut : { x: 0, y: 0, w: 100, h: 100 };
      out.push('.react-grid-layout[data-ccmax="' + mr + '"]>.react-grid-item[data-cc="' + mr + '"]{visibility:visible!important;pointer-events:auto!important;transform:none!important;left:' + f(b.x) + '%!important;top:' + f(b.y) + '%!important;width:' + f(b.w) + '%!important;height:' + f(b.h) + '%!important;display:block!important;z-index:5!important}');
    });
    return out.join('\n');
  }
  function lyCssLive() { var st = document.getElementById(LY_ID); if (st) st.textContent = lyCss(lyCurrent(true)); lyCustomApply(); }
  function lyCssRefresh() {
    var st = document.getElementById(LY_ID); if (!st) return false;
    var css = lyCss(lyCurrent(true));
    if (st.textContent === css) return false;
    st.textContent = css;
    return true;
  }
  function lyCssRefreshSoon() {
    if (_ly.cssReq) return;
    _ly.cssReq = requestAnimationFrame(function () {
      _ly.cssReq = 0;
      try {
        if (lyCssRefresh()) { try { window.dispatchEvent(new Event('resize')); } catch (e) {} }
      } catch (e) { console.warn('[snap] cap nhat vung o anh', e); }
    });
  }
  function lyMaxAttr() {
    var g = lyGrid(); if (!g) return;
    var want = null;
    if (_ly.max && !_ly.ed && CFG.layoutOn && !_ly.sus) {
      var m = String(_ly.max);
      want = lySelf(m) ? '_' : m.replace(/[^A-Za-z0-9_-]/g, '');
    }
    var cur = g.getAttribute('data-ccmax');
    if (want == null) { if (cur != null) { g.removeAttribute('data-ccmax'); lyPauseSync(); } }
    else if (cur !== want) { g.setAttribute('data-ccmax', want); lyPauseSync(); }
  }
  function lyPauseSync() {
    var g = lyGrid(); if (!g) return;
    var on = CFG.tabPauseHidden !== false && !!_ly.max && !_ly.ed && CFG.layoutOn && !_ly.sus;
    [].forEach.call(g.querySelectorAll(':scope > .react-grid-item'), function (it) {
      var hide = on && it.getAttribute('data-cc') !== _ly.max;
      [].forEach.call(it.querySelectorAll('canvas'), function (cv) { if (hide) cv.__snapSkip = 1; else if (cv.__snapSkip) cv.__snapSkip = 0; });
    });
  }
  var LY_CPROPS = ['visibility', 'pointer-events', 'position', 'left', 'top', 'width', 'height', 'right', 'bottom', 'margin', 'transform', 'max-width', 'max-height', 'min-width', 'min-height'];
  function lyCustomList() { return Array.isArray(CFG.layoutCustom) ? CFG.layoutCustom.filter(function (c) { return c && c.id && c.sel; }) : []; }
  function lyCustomEl(c) { try { return document.querySelector(c.sel); } catch (e) { return null; } }
  function lyCustomElById(id) { var c = lyCustomList().filter(function (x) { return x.id === id; })[0]; return c ? lyCustomEl(c) : null; }
  function lyCustomRelease(el) {
    if (!el) return;
    LY_CPROPS.forEach(function (p) { el.style.removeProperty(p); });
    if (el.__lyHid) { el.style.removeProperty('display'); el.__lyHid = 0; }
    el.__lyKey = null; el.__lyVis = 0;
  }
  function lyCustomReleaseAll() { Object.keys(_ly.cust).forEach(function (k) { lyCustomRelease(_ly.cust[k]); }); _ly.cust = {}; }
  function lyCustomApply(R0) {
    var g = lyGrid(); if (!g || !CFG.layoutOn) return;
    if (!_ly.cust || (!lyCustomList().length && !Object.keys(_ly.cust).length)) return;
    var b = g.getBoundingClientRect(), R = R0 || lyCurrent(), ids = {};
    lyCustomList().forEach(function (c) {
      ids[c.id] = 1;
      var el = lyCustomEl(c), t = R[c.id];
      if (_ly.cust[c.id] && _ly.cust[c.id] !== el) _ly.cust[c.id] = null;
      if (!el) return;
      _ly.cust[c.id] = el;
      var hide = !!_ly.max && !_ly.ed && _ly.max !== c.id;
      if (hide) { if (!el.__lyVis) { el.style.setProperty('visibility', 'hidden', 'important'); el.style.setProperty('pointer-events', 'none', 'important'); el.__lyVis = 1; } }
      else if (el.__lyVis) { el.style.removeProperty('visibility'); el.style.removeProperty('pointer-events'); el.__lyVis = 0; }
      if (!t) return;
      if (lyOff(t)) { el.style.setProperty('display', 'none', 'important'); el.__lyHid = 1; return; }
      if (el.__lyHid) { el.style.removeProperty('display'); el.__lyHid = 0; }
      var w = { l: b.left + b.width * t.x / 100, t: b.top + b.height * t.y / 100, w: b.width * t.w / 100, h: b.height * t.h / 100 };
      var key = [w.l, w.t, w.w, w.h].map(Math.round).join(','), q = el.getBoundingClientRect();
      if (el.__lyKey === key && Math.abs(q.left - w.l) < 1.5 && Math.abs(q.top - w.t) < 1.5 && Math.abs(q.width - w.w) < 1.5 && Math.abs(q.height - w.h) < 1.5) return;
      var st = el.style, I = 'important';
      st.setProperty('position', 'fixed', I); st.setProperty('margin', '0', I); st.setProperty('right', 'auto', I); st.setProperty('bottom', 'auto', I);
      st.setProperty('transform', 'none', I); st.setProperty('max-width', 'none', I); st.setProperty('max-height', 'none', I); st.setProperty('min-width', '0', I); st.setProperty('min-height', '0', I);
      st.setProperty('width', w.w + 'px', I); st.setProperty('height', w.h + 'px', I); st.setProperty('left', w.l + 'px', I); st.setProperty('top', w.t + 'px', I);
      q = el.getBoundingClientRect();
      if (Math.abs(q.left - w.l) > 0.8) st.setProperty('left', (parseFloat(st.left) + w.l - q.left) + 'px', I);
      if (Math.abs(q.top - w.t) > 0.8) st.setProperty('top', (parseFloat(st.top) + w.t - q.top) + 'px', I);
      el.__lyKey = key;
    });
    Object.keys(_ly.cust).forEach(function (k) { if (!ids[k]) { lyCustomRelease(_ly.cust[k]); delete _ly.cust[k]; } });
  }
  function lySelector(el) {
    var esc = (window.CSS && CSS.escape) ? CSS.escape : function (x) { return String(x).replace(/[^\w-]/g, '\\$&'); }, parts = [], cur;
    for (cur = el; cur && cur.nodeType === 1 && cur !== document.body && cur !== document.documentElement; cur = cur.parentElement) {
      var seg = cur.tagName.toLowerCase();
      if (cur.id && !/\d{3,}/.test(cur.id)) seg = '#' + esc(cur.id);
      else {
        var cls = (typeof cur.className === 'string' ? cur.className.trim().split(/\s+/) : []).filter(function (c) { return c && !/\d{3,}|^(css|jss|sc)-|^_|^react-grid-item$/.test(c); }).slice(0, 2);
        cls.forEach(function (c) { seg += '.' + esc(c); });
        var sib = cur.parentElement ? [].filter.call(cur.parentElement.children, function (x) { return x.tagName === cur.tagName; }) : [];
        if (sib.length > 1 && !cls.length) seg += ':nth-of-type(' + (sib.indexOf(cur) + 1) + ')';
      }
      parts.unshift(seg);
      try { var q = document.querySelectorAll(parts.join(' > ')); if (q.length === 1 && q[0] === el) return parts.join(' > '); } catch (e) {}
    }
    var p = []; for (cur = el; cur && cur !== document.body && cur.parentElement; cur = cur.parentElement) p.unshift(cur.tagName.toLowerCase() + ':nth-child(' + ([].indexOf.call(cur.parentElement.children, cur) + 1) + ')');
    return 'body > ' + p.join(' > ');
  }
  function lyPick(cb) {
    var host = document.createElement('div'), root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    host.style.cssText = 'position:fixed !important;left:0;top:0;right:0;bottom:0;z-index:2147483650 !important;cursor:crosshair;';
    root.innerHTML = '<style>.b{position:fixed;border:2px solid #e27ba2;border-radius:6px;background:rgba(226,123,162,.2);pointer-events:none;display:none}.m{position:fixed;left:50%;top:10px;transform:translateX(-50%);background:#fff8fb;color:#5a2a40;border:1px solid #f1bdd2;border-radius:8px;padding:6px 12px;font:12px Segoe UI,Arial,sans-serif;pointer-events:none;white-space:nowrap}</style><div class="b"></div><div class="m"></div>';
    document.body.appendChild(host);
    var box = root.querySelector('.b'), msg = root.querySelector('.m'), chain = [], lvl = 0;
    msg.textContent = 'Rê chuột vào bảng cần chỉnh · lăn chuột = chọn khung cha / con · click = chọn · Esc = hủy';
    var show = function () {
      var el = chain[lvl]; if (!el) { box.style.display = 'none'; return; }
      var r = el.getBoundingClientRect();
      box.style.cssText = 'display:block;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
      msg.textContent = 'Click = chọn · lăn chuột = khung cha / con · Esc = hủy   [' + el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '  ' + Math.round(r.width) + '×' + Math.round(r.height) + ']';
    };
    var probe = function (x, y) {
      var hs = [host]; if (_ly.ed) hs.push(_ly.ed.host); if (_cam) hs.push(_cam.host); if (_ap) hs.push(_ap.host);
      var old = hs.map(function (h) { return h.style.display; }); hs.forEach(function (h) { h.style.display = 'none'; });
      var el = document.elementFromPoint(x, y); hs.forEach(function (h, i) { h.style.display = old[i]; });
      return el;
    };
    var kill = function (e) { e.preventDefault(); e.stopPropagation(); };
    var done = function () { window.removeEventListener('keydown', onKey, true); host.remove(); };
    var onKey = function (e) { if (e.key === 'Escape') { kill(e); done(); } };
    host.addEventListener('mousemove', function (e) {
      var el = probe(e.clientX, e.clientY);
      if (!el || el === document.body || el === document.documentElement) { chain = []; lvl = 0; show(); return; }
      if (chain[0] !== el) { chain = []; for (var c = el; c && c !== document.body && c !== document.documentElement; c = c.parentElement) chain.push(c); lvl = 0; }
      show();
    });
    host.addEventListener('wheel', function (e) { kill(e); if (!chain.length) return; lvl = Math.max(0, Math.min(chain.length - 1, lvl + (e.deltaY < 0 ? 1 : -1))); show(); }, { passive: false });
    host.addEventListener('click', function (e) { kill(e); var el = chain[lvl]; done(); if (el) cb(el); });
    ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'contextmenu'].forEach(function (ev) { host.addEventListener(ev, kill); });
    window.addEventListener('keydown', onKey, true);
  }
  function lyPickPanel() {
    var ed = _ly.ed; if (!ed) return;
    lyPick(function (el) {
      if (el.hasAttribute && el.hasAttribute('data-cc')) return toast('Phần này đã là ô "' + lyName(el.getAttribute('data-cc')) + '" – kéo thẳng ô đó trong bố cục', 4000);
      if (el.querySelector && el.querySelector('[data-cc]')) return toast('Khung này chứa cả bố cục – hãy chọn phần nhỏ hơn (lăn chuột xuống)', 4000);
      var list = lyCustomList().slice(), n = 1; while (list.some(function (c) { return c.id === 'u' + n; })) n++;
      var tx = (el.textContent || '').replace(/\s+/g, ' ').trim();
      list.push({ id: 'u' + n, sel: lySelector(el), name: 'Bảng' + (tx ? ': ' + tx.slice(0, 16) : ' ' + n) });
      CFG.layoutCustom = list;
      var carry = { snapshot: ed.snapshot, snapCustom: ed.snapCustom, wasOn: ed.wasOn };
      lyEdClose(true, true); lyEdit(true, carry);
      toast('Đã thêm bảng vào bố cục – kéo thả như các ô khác (bảng phải đang mở)', 3500);
    });
  }
  function lyFill(on) {
    try {
      var p = window.frameElement && window.frameElement.parentElement; if (!p) return;
      if (on) { if (_ly.orig == null) _ly.orig = p.style.height || ''; p.style.setProperty('height', 'calc(100vh - 40px)', 'important'); }
      else if (_ly.orig != null) { p.style.removeProperty('height'); p.style.height = _ly.orig; _ly.orig = null; }
    } catch (e) { console.warn('[snap] fill iframe', e); }
  }
  function lyDock(open) {
    if (!CFG.layoutOn || _ly.sus) return;
    var g = lyGrid(), t = lyCurrent().cams; if (!g || lyOff(t)) return;
    if (!_cam && open) toggleCams();
    if (!_cam) return;
    var b = g.getBoundingClientRect(), same = _cam.docked && !_cam.full, q = _cam.pos;
    _cam.full = false; _cam.docked = true;
    var p = { left: b.left + b.width * t.x / 100, top: b.top + b.height * t.y / 100, width: b.width * t.w / 100, height: b.height * t.h / 100 };
    if (same && q && Math.abs(q.left - p.left) < 0.5 && Math.abs(q.top - p.top) < 0.5 && Math.abs(q.width - p.width) < 0.5 && Math.abs(q.height - p.height) < 0.5) return;
    _cam.pos = p; camLayout(); camFitSoon();
  }
  function lyTrack() {
    if (!CFG.layoutOn || _ly.sus || document.hidden || uiBusy()) return;
    lyMaxAttr();
    lyTag(true);
    if (_ly.max) lyPauseSync();
    var apLy = CFG.layoutOn && !_ly.sus;
    if (!_cam && !_ap && !apLy && !lyCustomList().length) return;
    var R = lyCurrent();
    lyCustomApply(R);
    if (!_ap && apLy && CFG.attrPanelPin && !_ly.tabNat && apRect(R)) { try { toggleAttrPanel(); } catch (e) {} }
    try { apTrack(R); } catch (e) { console.warn('[snap] attr panel track', e); }
    if (!_cam || (_ly.ed && _ly.ed.drag)) return;
    if (!_cam.dockTried) { _cam.dockTried = true; lyDock(false); return; }
    if (!_cam.docked || _cam.full) return;
    var g = lyGrid(), t = R.cams; if (!g || lyOff(t)) return;
    var b = g.getBoundingClientRect(), p = { left: b.left + b.width * t.x / 100, top: b.top + b.height * t.y / 100, width: b.width * t.w / 100, height: b.height * t.h / 100 }, q = _cam.pos;
    if (q && Math.abs(q.left - p.left) < 0.5 && Math.abs(q.top - p.top) < 0.5 && Math.abs(q.width - p.width) < 0.5 && Math.abs(q.height - p.height) < 0.5) return;
    _cam.pos = p; camLayout(); camFitSoon();
  }
  function lyNotify(quick) {
    clearTimeout(_ly.t);
    var fire = function () { try { window.dispatchEvent(new Event('resize')); } catch (e) {} lyDock(!quick); try { apTrack(); } catch (e) {} pointerRefreshSoon(); };
    if (quick) { if (_ly.rzq) return; _ly.rzq = 1; try { fire(); } finally { requestAnimationFrame(function () { _ly.rzq = 0; }); } return; }
    requestAnimationFrame(fire); _ly.t = setTimeout(fire, 250);
  }
  function lyApply(quick) {
    quick = quick === true;
    var st = document.getElementById(LY_ID);
    if (!CFG.layoutOn || _ly.sus) {
      var had = !!st || _ly.orig != null;
      if (st) st.remove(); if (!_ly.tabNat) lyFill(false); lyCustomReleaseAll(); lyMaxAttr();
      if (_cam && _cam.docked) { _cam.docked = false; camLayout(); camFitSoon(); }
      if (_ap && _ap.docked) { _ap.docked = false; apLayout(); }
      if (had) lyNotify();
      return;
    }
    if (!lyGrid()) return;
    lyTag(quick);
    if (!st) { st = document.createElement('style'); st.id = LY_ID; document.head.appendChild(st); }
    var css = lyCss(lyCurrent(true));
    if (st.textContent !== css) st.textContent = css;
    lyMaxAttr();
    lyCustomApply();
    if (!quick) lyFill(true);
    lyNotify(quick);
  }
  function lyEdRoles() {
    var g = lyGrid(), out = [];
    lyRoles().forEach(function (r) {
      if (r === 'cams' || r === 'attr') { out.push(r); return; }
      if (r.charAt(0) === 'u') { if (lyCustomElById(r)) out.push(r); return; }
      if (g && g.querySelector(':scope > .react-grid-item[data-cc="' + r + '"]')) out.push(r);
    });
    return out;
  }
  function lyEdCommit() {
    var ed = _ly.ed; if (!ed) return;
    CFG.layoutRects = lyClone(ed.R); cfgSave();
    lyApply(); lyEdLayout();
  }
  function lyEdLayout() {
    var ed = _ly.ed, g = lyGrid(); if (!ed || !g) return;
    var b = g.getBoundingClientRect(), vis = [];
    ed.roles.forEach(function (r) { if (!lyOff(ed.R[r])) vis.push(r); });
    ed.roles.forEach(function (r) {
      var el = ed.els[r], t = ed.R[r];
      if (lyOff(t)) { el.style.display = 'none'; return; }
      var moving = ed.drag && ed.drag.role === r && ed.drag.ghost;
      if (moving) t = ed.drag.ghost;
      el.style.display = 'block';
      el.style.left = (b.left + b.width * t.x / 100) + 'px'; el.style.top = (b.top + b.height * t.y / 100) + 'px';
      el.style.width = (b.width * t.w / 100) + 'px'; el.style.height = (b.height * t.h / 100) + 'px';
      el.querySelector('.sz').textContent = Math.round(t.w) + '×' + Math.round(t.h) + '%';
      var ov = false;
      vis.forEach(function (o) {
        if (o === r) return; var u = ed.R[o];
        if (Math.min(t.x + t.w, u.x + u.w) - Math.max(t.x, u.x) > 0.6 && Math.min(t.y + t.h, u.y + u.h) - Math.max(t.y, u.y) > 0.6) ov = true;
      });
      el.classList.toggle('ov', ov); el.classList.toggle('mv', !!moving);
      el.classList.toggle('tg', !!(ed.drag && ed.drag.target === r));
    });
    var chips = ed.chips; chips.innerHTML = '';
    ed.roles.forEach(function (r) {
      if (!lyOff(ed.R[r])) return;
      var c = document.createElement('button'); c.textContent = '＋ ' + lyName(r); c.title = 'Hiện lại ô này';
      c.onclick = function () {
        var d = lyDefaults()[r], t = (d && !d.off) ? d : (LY_SHOW[r] || { x: 30, y: 30, w: 30, h: 30 });
        if (ed.R[r].w >= LY_MIN && ed.R[r].h >= LY_MIN) t = ed.R[r];
        ed.R[r] = { x: t.x, y: t.y, w: t.w, h: t.h, off: false }; lyEdCommit();
      };
      chips.appendChild(c);
    });
  }
  function lyEdDown(e, role, dir) {
    var ed = _ly.ed, g = lyGrid(); if (e.button !== 0 || !ed || !g) return;
    e.preventDefault(); e.stopPropagation();
    var b = g.getBoundingClientRect(), R0 = lyClone(ed.R), r0 = R0[role], sx = e.clientX, sy = e.clientY, moved = false, MIN = LY_MIN, OV = lyOv();
    var others = ed.roles.filter(function (r) { return r !== role && !lyOff(R0[r]); });
    var near = function (a, c) { return Math.abs(a - c) < 0.6; };
    var ovY = function (t) { return t.y < r0.y + r0.h - 0.01 && t.y + t.h > r0.y + 0.01; };
    var ovX = function (t) { return t.x < r0.x + r0.w - 0.01 && t.x + t.w > r0.x + 0.01; };
    var edges = function (skip, ax) {
      var c = [0, 100]; others.forEach(function (o) { if (skip.indexOf(o) >= 0) return; var t = R0[o]; c.push(ax === 'x' ? t.x : t.y, ax === 'x' ? t.x + t.w : t.y + t.h); }); return c;
    };
    var snapOn = function (ev) { return CFG.layoutSnap !== false && !ev.altKey; };
    var snapV = function (v, c, ev) {
      if (!snapOn(ev)) return v;
      var best = null, bd = 1.5; c.forEach(function (k) { var d = Math.abs(k - v); if (d < bd) { bd = d; best = k; } });
      return best != null ? best : Math.round(v);
    };
    var snapMove = function (x, w, c, ev) {
      if (!snapOn(ev)) return x;
      var bd = 1.5, bx = null;
      c.forEach(function (k) { var d1 = Math.abs(k - x), d2 = Math.abs(k - (x + w)); if (d1 < bd) { bd = d1; bx = k; } if (d2 < bd) { bd = d2; bx = k - w; } });
      return bx != null ? bx : Math.round(x);
    };
    var clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
    var onMove = function (ev) {
      if (!moved && Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 4) return;
      moved = true;
      var dx = (ev.clientX - sx) / b.width * 100, dy = (ev.clientY - sy) / b.height * 100;
      if (dir === 'move') {
        var x = clamp(snapMove(r0.x + dx, r0.w, edges([], 'x'), ev), -OV, 100 + OV - r0.w), y = clamp(snapMove(r0.y + dy, r0.h, edges([], 'y'), ev), -OV, 100 + OV - r0.h);
        var px = (ev.clientX - b.left) / b.width * 100, py = (ev.clientY - b.top) / b.height * 100, tg = null;
        others.forEach(function (o) { var t = R0[o]; if (!tg && px >= t.x && px <= t.x + t.w && py >= t.y && py <= t.y + t.h) tg = o; });
        ed.drag = { role: role, ghost: { x: x, y: y, w: r0.w, h: r0.h, off: false }, target: tg };
      } else {
        var share = !ev.shiftKey, R = lyClone(R0), r = R[role], pick = function (pred) { return share ? others.filter(function (o) { return pred(R0[o]); }) : []; };
        if (dir.indexOf('e') >= 0) {
          var ne = pick(function (t) { return near(t.x, r0.x + r0.w) && ovY(t); }), hi = 100 + OV;
          ne.forEach(function (o) { hi = Math.min(hi, R0[o].x + R0[o].w - MIN); });
          var ve = clamp(snapV(r0.x + r0.w + dx, edges(ne, 'x'), ev), r0.x + MIN, hi);
          r.w = ve - r0.x; ne.forEach(function (o) { R[o].x = ve; R[o].w = R0[o].x + R0[o].w - ve; });
        }
        if (dir.indexOf('w') >= 0) {
          var nw = pick(function (t) { return near(t.x + t.w, r0.x) && ovY(t); }), lo = -OV;
          nw.forEach(function (o) { lo = Math.max(lo, R0[o].x + MIN); });
          var vw = clamp(snapV(r0.x + dx, edges(nw, 'x'), ev), lo, r0.x + r0.w - MIN);
          r.x = vw; r.w = r0.x + r0.w - vw; nw.forEach(function (o) { R[o].w = vw - R0[o].x; });
        }
        if (dir.indexOf('s') >= 0) {
          var ns = pick(function (t) { return near(t.y, r0.y + r0.h) && ovX(t); }), hs = 100 + OV;
          ns.forEach(function (o) { hs = Math.min(hs, R0[o].y + R0[o].h - MIN); });
          var vs = clamp(snapV(r0.y + r0.h + dy, edges(ns, 'y'), ev), r0.y + MIN, hs);
          r.h = vs - r0.y; ns.forEach(function (o) { R[o].y = vs; R[o].h = R0[o].y + R0[o].h - vs; });
        }
        if (dir.indexOf('n') >= 0) {
          var nn = pick(function (t) { return near(t.y + t.h, r0.y) && ovX(t); }), ls = -OV;
          nn.forEach(function (o) { ls = Math.max(ls, R0[o].y + MIN); });
          var vn = clamp(snapV(r0.y + dy, edges(nn, 'y'), ev), ls, r0.y + r0.h - MIN);
          r.y = vn; r.h = r0.y + r0.h - vn; nn.forEach(function (o) { R[o].h = vn - R0[o].y; });
        }
        ed.R = R; lyCssLive();
      }
      lyEdLayout();
    };
    var onUp = function () {
      window.removeEventListener('mousemove', onMove, true); window.removeEventListener('mouseup', onUp, true);
      var d = ed.drag; ed.drag = null;
      if (moved && _ly.ed === ed) {
        if (dir === 'move' && d) {
          if (d.target) { var a = lyClone(R0[role]), t2 = lyClone(R0[d.target]); ed.R[role] = t2; ed.R[d.target] = a; }
          else ed.R[role] = d.ghost;
        }
        lyEdCommit();
      } else lyEdLayout();
    };
    window.addEventListener('mousemove', onMove, true); window.addEventListener('mouseup', onUp, true);
  }
  function lyEdClose(save, quiet) {
    var ed = _ly.ed; if (!ed) return;
    clearInterval(ed.timer); window.removeEventListener('resize', ed.onResize); window.removeEventListener('keydown', ed.onKey, true);
    ed.host.remove();
    if (save) { CFG.layoutRects = lyClone(ed.R); }
    else { CFG.layoutRects = ed.snapshot; CFG.layoutOn = ed.wasOn; CFG.layoutCustom = ed.snapCustom || []; }
    _ly.ed = null; cfgSave(); lyApply();
    if (!quiet) toast(save ? 'Đã lưu bố cục. Mở lại: Alt+S → Giao diện canvas → Chỉnh bố cục bằng kéo thả' : 'Đã hủy thay đổi bố cục', 2500);
  }
  function lyEdit(on, carry) {
    if (on === false) return lyEdClose(true);
    if (_ly.ed) return;
    if (!lyGrid()) return toast('Chưa thấy khung canvas của tool');
    if (_menu) toggleMenu();
    _ly.sus = false; _ly.max = null;
    var wasOn = carry ? carry.wasOn : CFG.layoutOn; CFG.layoutOn = true;
    lyApply();
    var host = document.createElement('div'), root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    host.style.cssText = 'position:fixed !important;left:0;top:0;width:0;height:0;z-index:2147483600 !important;';
    root.innerHTML = '<style>*{box-sizing:border-box;font:12px Segoe UI,Arial,sans-serif}'
      + '.t{position:fixed;border:2px dashed #e27ba2;border-radius:8px;background:rgba(226,123,162,.12);color:#fff;cursor:move;user-select:none;pointer-events:auto}'
      + '.t:hover{background:rgba(226,123,162,.24)}.t.ov{border-color:#ff3b3b;background:rgba(255,60,60,.22)}'
      + '.t.tg{border-color:#ffd166;background:rgba(255,209,102,.3)}.t.mv{opacity:.75;border-style:solid;z-index:2}'
      + '.nm{position:absolute;left:8px;top:6px;font-weight:bold;font-size:13px;text-shadow:0 0 4px #000,0 0 4px #000}'
      + '.sz{position:absolute;left:8px;bottom:6px;color:#ffc2e0;text-shadow:0 0 4px #000}'
      + '.hd,.rm{position:absolute;right:6px;top:6px;background:#fff3f8;color:#7a3552;border:1px solid #ec93b6;border-radius:6px;padding:0 7px;cursor:pointer;line-height:18px}.rm{right:36px}.hd:hover,.rm:hover{background:#fde4ee;color:#6a2f48}'
      + '.h{position:absolute;display:block}.h:hover{background:rgba(226,123,162,.55)}'
      + '.h.n{top:-4px;left:12px;right:12px;height:10px;cursor:ns-resize}.h.s{bottom:-4px;left:12px;right:12px;height:10px;cursor:ns-resize}'
      + '.h.e{right:-4px;top:12px;bottom:12px;width:10px;cursor:ew-resize}.h.w{left:-4px;top:12px;bottom:12px;width:10px;cursor:ew-resize}'
      + '.h.ne{right:-4px;top:-4px;width:16px;height:16px;cursor:nesw-resize}.h.sw{left:-4px;bottom:-4px;width:16px;height:16px;cursor:nesw-resize}'
      + '.h.nw{left:-4px;top:-4px;width:16px;height:16px;cursor:nwse-resize}.h.se{right:-4px;bottom:-4px;width:16px;height:16px;cursor:nwse-resize}'
      + '.bar{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);display:flex;gap:6px;align-items:center;flex-wrap:wrap;max-width:96vw;background:#fff8fb;border:1px solid #f1c4d5;border-radius:12px;padding:8px 12px;color:#4a2f3b;pointer-events:auto;z-index:5;box-shadow:0 8px 28px rgba(120,60,90,.3)}'
      + '.bar b{color:#8a3a5c}.bar .hint{color:#9b7686;font-size:11px}.bar button{background:#fff;color:#7a3552;border:1px solid #efc3d3;border-radius:7px;padding:4px 11px;cursor:pointer}.bar button:hover{background:#fde4ee;border-color:#e79ab8}'
      + '.bar button.ok{background:#f3a9c6;border-color:#ec93b6;color:#4a1a32;font-weight:600}</style>'
      + '<div class="bar"><b>Chỉnh bố cục</b><span class="hint">kéo ô = di chuyển · thả lên ô khác = đổi chỗ · kéo cạnh/góc = đổi cỡ (Shift: chỉ ô này · Alt: không hít)</span>'
      + '<button class="ad" title="Chọn thêm 1 bảng bất kỳ trên màn hình (vd info panel) để kéo thả">＋ Thêm bảng</button><span class="chips" style="display:flex;gap:4px"></span><button class="rs" title="Về bố cục theo sơ đồ">Mặc định</button><button class="og" title="Tắt bố cục tùy chỉnh, về bố cục gốc của tool">Bố cục gốc</button><button class="cc">Hủy</button><button class="ok">Xong (Esc)</button></div>';
    ['mousedown', 'wheel', 'contextmenu', 'keyup', 'click'].forEach(function (ev) { host.addEventListener(ev, function (e) { e.stopPropagation(); }); });
    document.body.appendChild(host);
    var ed = { host: host, root: root, R: lyRects(), snapshot: carry ? carry.snapshot : (CFG.layoutRects ? lyClone(CFG.layoutRects) : null), snapCustom: carry ? carry.snapCustom : lyClone(CFG.layoutCustom || []), wasOn: wasOn, roles: lyEdRoles(), els: {}, drag: null, chips: root.querySelector('.chips') };
    _ly.ed = ed;
    var gb = lyGrid().getBoundingClientRect();
    ed.roles.forEach(function (r) {
      if (ed.R[r]) return;
      var it = r.charAt(0) === 'u' ? lyCustomElById(r) : lyGrid().querySelector(':scope > .react-grid-item[data-cc="' + r + '"]'), q = it && it.getBoundingClientRect();
      if (!q || !q.width) { ed.R[r] = { x: 30, y: 30, w: 30, h: 30, off: false }; return; }
      var x = Math.max(0, (q.left - gb.left) / gb.width * 100), y = Math.max(0, (q.top - gb.top) / gb.height * 100);
      ed.R[r] = { x: x, y: y, w: Math.min(100 - x, q.width / gb.width * 100), h: Math.min(100 - y, q.height / gb.height * 100), off: false };
    });
    ed.roles.forEach(function (r) {
      var el = document.createElement('div'); el.className = 't';
      el.innerHTML = '<span class="nm">' + esc(lyName(r)) + '</span><span class="sz"></span><button class="hd" title="Ẩn ô này">✕</button>' + (r.charAt(0) === 'u' ? '<button class="rm" title="Bỏ bảng này khỏi bố cục">Gỡ</button>' : '')
        + ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(function (d) { return '<i class="h ' + d + '" data-d="' + d + '"></i>'; }).join('');
      el.addEventListener('mousedown', function (e) {
        if (e.target && e.target.closest && e.target.closest('button')) { e.stopPropagation(); return; }
        lyEdDown(e, r, (e.target && e.target.getAttribute && e.target.getAttribute('data-d')) || 'move');
      });
      el.querySelector('.hd').onclick = function (e) { e.stopPropagation(); ed.R[r].off = true; lyEdCommit(); };
      var rmb = el.querySelector('.rm');
      if (rmb) rmb.onclick = function (e) {
        e.stopPropagation();
        CFG.layoutCustom = lyCustomList().filter(function (c) { return c.id !== r; }); delete ed.R[r];
        var carry2 = { snapshot: ed.snapshot, snapCustom: ed.snapCustom, wasOn: ed.wasOn };
        lyEdClose(true, true); lyEdit(true, carry2);
      };
      root.appendChild(el); ed.els[r] = el;
    });
    root.querySelector('.ad').onclick = function () { lyPickPanel(); };
    root.querySelector('.ok').onclick = function () { lyEdClose(true); };
    root.querySelector('.cc').onclick = function () { lyEdClose(false); };
    root.querySelector('.rs').onclick = function () { ed.R = lyDefaults(); lyEdCommit(); };
    root.querySelector('.og').onclick = function () { ed.R = ed.R; CFG.layoutOn = false; ed.wasOn = false; lyEdClose(true); toast('Đã tắt bố cục tùy chỉnh (bố cục gốc của tool). Bật lại ở Alt+S → Giao diện canvas.', 3500); };
    ed.onKey = function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); lyEdClose(true); } };
    window.addEventListener('keydown', ed.onKey, true);
    ed.onResize = function () { lyEdLayout(); }; window.addEventListener('resize', ed.onResize);
    ed.timer = setInterval(lyEdLayout, 400);
    lyApply(); lyEdLayout();
    toast('Chế độ kéo thả: kéo ô để di chuyển / đổi chỗ, kéo cạnh để đổi kích thước', 3500);
  }
  function lyToggleSus(why) {
    if (!CFG.layoutOn || _ly.ed) return;
    if (_ly.tabNat) { _ly.tabNat = null; _ly.sus = true; } _ly.sus = !_ly.sus; _ly.max = null;
    if (_cam) { camLayout(); camFitSoon(); } if (_ap) apLayout();
    console.log('[snap] bo cuc tuy chinh:', _ly.sus ? 'TAM TAT' : 'BAT', '(' + (why || '') + ')');
    lyApply(); setTimeout(lyApply, 120); setTimeout(lyApply, 500);
    toast(_ly.sus ? 'Bố cục gốc của tool (bấm lại = về bố cục tùy chỉnh)' : 'Bố cục tùy chỉnh', 1800);
  }
  window.__lyToggleSus = lyToggleSus;
  function lyHoverRole() {
    if (_ly.mx == null) return '';
    var el = document.elementFromPoint(_ly.mx, _ly.my); if (!el) return '';
    if (_cam && _cam.host && (el === _cam.host || _cam.host.contains(el))) return 'cams';
    if (_ap && _ap.host && (el === _ap.host || _ap.host.contains(el))) return 'attr';
    var cl = lyCustomList(), i, ce;
    for (i = 0; i < cl.length; i++) { ce = lyCustomEl(cl[i]); if (ce && (ce === el || ce.contains(el))) return cl[i].id; }
    var it = el.closest ? el.closest('.react-grid-layout>.react-grid-item[data-cc]') : null;
    return it ? it.getAttribute('data-cc') : '';
  }
  function lyMaxToggle() {
    if (!CFG.layoutOn || _ly.sus || _ly.ed || !lyGrid()) return false;
    if (_ly.max) { _ly.max = null; }
    else {
      lyTag(true);
      var r = lyHoverRole(); if (!r) return false;
      _ly.max = r;
    }
    var st = document.getElementById(LY_ID), mr = _ly.max ? String(_ly.max).replace(/[^A-Za-z0-9_-]/g, '') : '';
    if (!st || (_ly.max && !lySelf(_ly.max) && st.textContent.indexOf('[data-ccmax="' + mr + '"]') < 0)) lyApply(true);
    else { lyCssRefresh(); lyMaxAttr(); lyCustomApply(); lyNotify(true); }
    if (_cam) { camLayout(); if (!camHidden()) camFitSoon(); }
    if (_ap) apLayout();
    /* apLayout() can move/resize the property panel when Tab changes the
       active cell. Rebuild the image bounds after that geometry is current,
       so the image ends at the panel edge instead of rendering underneath it. */
    if (lyImgRole(_ly.max) && lyCssRefresh()) lyNotify(true);
    pointerRefreshSoon(30); setTimeout(pointerRefresh, 320);
    return true;
  }
  function lyTabNative(role) {
    _ly.tabNat = role; _ly.sus = true; _ly.max = null;
    lyApply(); if (_cam) { camLayout(); camFitSoon(); } if (_ap) apLayout();
    try {
      var g = lyGrid(), it = g && g.querySelector(':scope > .react-grid-item[data-cc="' + role + '"]');
      if (it) {
        var q = it.getBoundingClientRect(), px = _ly.mx == null ? q.left + q.width / 2 : _ly.mx, py = _ly.my == null ? q.top + q.height / 2 : _ly.my;
        px = Math.max(q.left + 2, Math.min(q.right - 2, px)); py = Math.max(q.top + 2, Math.min(q.bottom - 2, py));
        var tg = document.elementFromPoint(px, py) || it;
        ['pointerover', 'mouseover', 'pointermove', 'mousemove'].forEach(function (n) {
          var Ev = n.indexOf('pointer') === 0 && window.PointerEvent ? PointerEvent : MouseEvent;
          tg.dispatchEvent(new Ev(n, { bubbles: true, cancelable: true, composed: true, clientX: px, clientY: py, view: window }));
        });
        _ly.mx = px; _ly.my = py;
      }
    } catch (e) { console.warn('[snap] tab native', e); }
  }
  function lyTabBack() {
    setTimeout(function () {
      if (!_ly.tabNat) return;
      _ly.tabNat = null; _ly.sus = false; _ly.max = null;
      lyApply(); setTimeout(lyApply, 120); setTimeout(lyApply, 500);
      if (_cam) { camLayout(); camFitSoon(); } if (_ap) apLayout();
    }, 120);
  }
  function lyReset() { CFG.layoutRects = null; cfgSave(); lyApply(); }
  function lyInit() {
    window.__snapLayout = lyApply;
    setInterval(function () {
      if (!CFG.layoutOn || _ly.sus || document.hidden || uiBusy() || !lyGrid()) return;
      lyTag(true); if (!document.getElementById(LY_ID)) lyApply();
    }, 1000);
    setInterval(function () { if (CFG.layoutOn && !_ly.sus && !document.hidden && !uiBusy() && lyGrid()) lyTag(); }, 5000);
    setInterval(lyTrack, 200);
    var scrRaf = 0;
    window.addEventListener('scroll', function () { if (scrRaf) return; scrRaf = requestAnimationFrame(function () { scrRaf = 0; lyTrack(); }); }, true);
    window.addEventListener('resize', function () {
      if (_ly.rz) return; _ly.rz = setTimeout(function () { _ly.rz = 0; lyDock(false); }, 120);
    });
    lyApply();
  }
  window.__snapLayout = lyApply;
  /* FPS controls and optional independent 3D redraw loop (ported from TriThucCamLite). */

/* ============================================================
 * @MODULE[alt+u:fps]  MỞ KHOÁ FPS VẼ 3D (luôn bật, không có phím/cài đặt)
 * Cố định: vẽ lại 3D + FPS tối đa theo màn hình + bỏ giới hạn FPS; chỉ còn tuỳ chọn hiện/ẩn đồng hồ (fpsShow)
 * fpsTick, fpsInstall, hookFpsRenderers,
 * fpsReplay, fps3dRun, applyFps,
 * install2dDragBoost
 * ============================================================ */
  var FPSM = { orig: null, origC: null, q: new Map(), seq: 0, timer: 0, last: 0, on: false, draws: 0, frames: 0, el: null, tu: null, rs: [], frameNo: 0, rec: { frame: -1, list: [] }, lastSeq: [], toolDrew: 0, replaying: false, loop3d: false, drag2d: false };
  var NAT_RAF = window.requestAnimationFrame.bind(window);
  (function fpsFrame() { FPSM.frames++; FPSM.frameNo++; NAT_RAF(fpsFrame); })();
  function fpsTick() {
    FPSM.timer = 0;
    var now = performance.now(), iv = 1000 / Math.max(30, parseFloat(CFG.fpsTarget) || 144);
    if (now - FPSM.last < iv - 0.5) { FPSM.timer = setTimeout(fpsTick, Math.max(0, iv - (now - FPSM.last) - 0.5)); return; }
    FPSM.last = now;
    var cbs = Array.from(FPSM.q.values()); FPSM.q.clear();
    for (var i = 0; i < cbs.length; i++) { try { cbs[i](now); } catch (e) { setTimeout(function (x) { throw x; }, 0, e); } }
  }
  function fpsInstall(on) {
    if (on && !FPSM.on) {
      FPSM.orig = window.requestAnimationFrame; FPSM.origC = window.cancelAnimationFrame; FPSM.on = true;
      window.requestAnimationFrame = function (cb) { var id = 'u' + (++FPSM.seq); FPSM.q.set(id, cb); if (!FPSM.timer) FPSM.timer = setTimeout(fpsTick, 0); return id; };
      window.cancelAnimationFrame = function (id) { if (typeof id === 'string' && id.charAt(0) === 'u') FPSM.q.delete(id); else FPSM.origC.call(window, id); };
    } else if (!on && FPSM.on) {
      window.requestAnimationFrame = FPSM.orig; window.cancelAnimationFrame = FPSM.origC; FPSM.on = false;
      var cbs = Array.from(FPSM.q.values()); FPSM.q.clear(); cbs.forEach(function (cb) { try { FPSM.orig.call(window, cb); } catch (e) {} });
    }
  }
  function fpsV4() { return { x: 0, y: 0, z: 0, w: 0, copy: function (v) { this.x = v.x; this.y = v.y; this.z = v.z; this.w = v.w; return this; } }; }
  function fpsFindRenderers() {
    var V = window.view, out = []; if (!V) return out;
    var add = function (r) { if (r && typeof r === 'object' && typeof r.render === 'function' && (r.domElement || typeof r.setPixelRatio === 'function') && out.indexOf(r) < 0) out.push(r); };
    add(V.mainRenderer);
    Object.keys(V).forEach(function (k) { try { var v = V[k]; if (!v || typeof v !== 'object') return; add(v); add(v.current); add(v.renderer); add(v.current && v.current.renderer); } catch (e) {} });
    return out;
  }
  function hookFpsRenderers() {
    fpsFindRenderers().forEach(function (r) {
      if (FPSM.rs.indexOf(r) >= 0) return; FPSM.rs.push(r);
      var o = r.render;
      r.render = function (scene, camera) {
        if (!FPSM.replaying && !CFG.fps3d) {   // đường nhẹ: chỉ đếm số lần vẽ cho đồng hồ FPS, không ghi lại tham số
          FPSM.toolDrew++;
          if (FPSM.rec.frame !== FPSM.frameNo) { FPSM.draws++; FPSM.rec.frame = FPSM.frameNo; FPSM.rec.list = []; }
        } else if (!FPSM.replaying) {
          FPSM.toolDrew++;
          if (FPSM.rec.frame !== FPSM.frameNo) {
            FPSM.draws++; if (FPSM.rec.list.length) FPSM.lastSeq = FPSM.rec.list; FPSM.rec = { frame: FPSM.frameNo, list: [] };
          }
          var cv = this.domElement, c = { r: this, args: Array.prototype.slice.call(arguments), w: cv ? cv.width : 0, h: cv ? cv.height : 0, cw: cv ? cv.clientWidth : 0, ch: cv ? cv.clientHeight : 0 };
          try { if (this.getViewport) { c.vp = this.getViewport(fpsV4()); c.sc = this.getScissor(fpsV4()); c.st = this.getScissorTest(); } } catch (e) { c.vp = null; }
          try { if (this.getRenderTarget) c.rt = this.getRenderTarget(); } catch (e) {}
          FPSM.rec.list.push(c);
        }
        return o.apply(this, arguments);
      };
    });
  }
  function fpsReplay() {
    var seq = FPSM.rec.list.length && FPSM.rec.frame < FPSM.frameNo ? FPSM.rec.list : FPSM.lastSeq;
    if (!seq.length) return;
    for (var i = 0; i < seq.length; i++) {
      var cv = seq[i].r.domElement;
      if (cv && (cv.width !== seq[i].w || cv.height !== seq[i].h || cv.clientWidth !== seq[i].cw || cv.clientHeight !== seq[i].ch)) { FPSM.lastSeq = []; FPSM.rec = { frame: -1, list: [] }; return; }
    }
    var saved = [];
    seq.forEach(function (c) {
      var r = c.r; if (saved.some(function (x) { return x.r === r; })) return;
      var st = { r: r };
      try { if (r.getViewport) { st.vp = r.getViewport(fpsV4()); st.sc = r.getScissor(fpsV4()); st.st = r.getScissorTest(); } } catch (e) {}
      try { if (r.getRenderTarget) st.rt = r.getRenderTarget(); } catch (e) {}
      saved.push(st);
    });
    FPSM.replaying = true; FPSM.draws++;
    try {
      seq.forEach(function (c) {
        var r = c.r;
        try { if (c.rt !== undefined && r.setRenderTarget) r.setRenderTarget(c.rt); } catch (e) {}
        if (c.vp && r.setViewport) { r.setViewport(c.vp.x, c.vp.y, c.vp.z, c.vp.w); r.setScissor(c.sc.x, c.sc.y, c.sc.z, c.sc.w); r.setScissorTest(c.st); }
        r.render.apply(r, c.args);
      });
    } catch (e) { console.warn('[snap] ve 3D', e); }
    saved.forEach(function (st) {
      var r = st.r;
      try { if (st.rt !== undefined && r.setRenderTarget) r.setRenderTarget(st.rt); } catch (e) {}
      try { if (st.vp) { r.setViewport(st.vp.x, st.vp.y, st.vp.z, st.vp.w); r.setScissor(st.sc.x, st.sc.y, st.sc.z, st.sc.w); r.setScissorTest(st.st); } } catch (e) {}
    });
    FPSM.replaying = false;
  }
  function fps3dRun(on) {
    if (!on) { FPSM.loop3d = false; return; }
    if (FPSM.loop3d) return; FPSM.loop3d = true;
    var last = 0, seen = FPSM.toolDrew;
    (function step() {
      if (!FPSM.loop3d || !CFG.fps3d) { FPSM.loop3d = false; return; }
      var tgt = CFG.fpsTarget === 'screen' ? 0 : parseFloat(CFG.fpsTarget) || 0, now = performance.now();
      if (!FPSM.drag2d && !document.hidden && (!tgt || now - last >= 1000 / tgt - 0.5)) { if (FPSM.toolDrew === seen) { last = now; fpsReplay(); } seen = FPSM.toolDrew; }
      if (tgt && tgt > 75) setTimeout(step, Math.max(0, 1000 / tgt - (performance.now() - now) - 0.5)); else NAT_RAF(step);
    })();
  }
  function applyFps() {
    CFG.fps3d = true; CFG.fpsTarget = 'screen'; CFG.fpsMode = 'screen';   /* cố định, đè cả giá trị đã lưu từ bản cũ */
    var mode = 'screen', effectiveMode = (FPSM.drag2d || FPSM.hover) ? 'screen' : mode, tu = window.__toiUu && window.__toiUu.opts;
    if (tu) {
      if (effectiveMode !== 'off') { if (!FPSM.tu) FPSM.tu = { fps: tu.fps, idleFps: tu.idleFps }; tu.fps = 0; tu.idleFps = 0; }
      else if (FPSM.tu) { tu.fps = FPSM.tu.fps; tu.idleFps = FPSM.tu.idleFps; FPSM.tu = null; }
    }
    fpsInstall(effectiveMode === 'unlock');
    try { hookFpsRenderers(); } catch (e) {}
    fps3dRun(true);
    var showOn = !!CFG.fpsShow;
    if (showOn && !FPSM.el && document.body) {
      var el = FPSM.el = document.createElement('div');
      el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:2147483000;display:flex;align-items:center;gap:9px;padding:4px 10px 4px 9px;'
        + 'background:rgba(20,20,24,.78);border:1px solid rgba(255,255,255,.12);border-radius:999px;box-shadow:0 2px 10px rgba(0,0,0,.35);'
        + 'font:11px/1 "Segoe UI",system-ui,Arial,sans-serif;color:#a8a8b0;pointer-events:none;user-select:none;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)';
      var mk = function (tag, css, txt) { var n = document.createElement(tag); n.style.cssText = css; if (txt != null) n.textContent = txt; return n; };
      var stat = function (label, unit) {
        var g = mk('span', 'display:flex;align-items:baseline;gap:4px'), v = mk('b', 'font:600 14px/1 Consolas,Menlo,monospace;font-variant-numeric:tabular-nums;min-width:3ch;text-align:right;color:#e8e8ec', '–');
        g.appendChild(mk('span', 'letter-spacing:.3px', label)); g.appendChild(v); g.appendChild(mk('span', 'font-size:10px;color:#8a8a92', unit));
        el.appendChild(g); return v;
      };
      var dot = FPSM.dot = mk('span', 'width:7px;height:7px;border-radius:50%;background:#6a6a72;flex:0 0 auto');
      el.appendChild(dot);
      FPSM.v3 = stat('3D', 'FPS');
      el.appendChild(mk('span', 'width:1px;height:12px;background:rgba(255,255,255,.18)'));
      FPSM.vh = stat('Màn hình', 'Hz');
      document.body.appendChild(el);
      FPSM.iv = setInterval(function () {
        var d = FPSM.draws, f = FPSM.frames; FPSM.draws = 0; FPSM.frames = 0;
        if (!FPSM.el) return;
        var r = f > 0 ? d / f : 0, col = r >= 0.9 ? '#4ade80' : r >= 0.6 ? '#facc15' : '#f87171';   /* xanh: 3D theo kịp màn hình · vàng: hụt nhẹ · đỏ: hụt nhiều */
        FPSM.v3.textContent = d; FPSM.vh.textContent = f; FPSM.v3.style.color = col; FPSM.dot.style.background = col;
      }, 1000);
    } else if (!showOn && FPSM.el) { FPSM.el.remove(); FPSM.el = null; clearInterval(FPSM.iv); }
  }
  /* Rê chuột trên view: tạm bỏ giới hạn FPS của __toiUu (nếu có) để nền tảng cập nhật hover kịp, trả lại sau 350ms đứng yên */
  function installHoverBoost() {
    if (FPSM.hoverInstalled) return; FPSM.hoverInstalled = true; FPSM.hover = false; FPSM.hoverAt = 0; var t = 0;
    var chk = function () { t = 0; if (performance.now() - FPSM.hoverAt < 350) { t = setTimeout(chk, 350); return; } FPSM.hover = false; try { applyFps(); } catch (e) {} };
    window.addEventListener('pointermove', function () {
      if (!window.__toiUu || CFG.fpsHoverBoost === false) return;
      FPSM.hoverAt = performance.now();
      if (!FPSM.hover) { FPSM.hover = true; try { applyFps(); } catch (e) {} t = setTimeout(chk, 350); }
    }, { capture: true, passive: true });
  }
  function install2dDragBoost() {
    var candidate = null, active = false;
    function in2d(e) {
      var path = e.composedPath ? e.composedPath() : [e.target];
      for (var i = 0; i < path.length; i++) {
        var n = path[i];
        if (n && n.nodeType === 1 && ((n.matches && n.matches('#rgbview,#frontview,#topview,#sideview')) || (n.closest && n.closest('#rgbview,#frontview,#topview,#sideview')))) return true;
      }
      return false;
    }
    function finish() {
      candidate = null;
      if (active) { active = false; FPSM.drag2d = false; applyFps(); }
    }
    window.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || !in2d(e)) return;
      candidate = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }, true);
    window.addEventListener('pointermove', function (e) {
      if (!candidate || candidate.id !== e.pointerId || active) return;
      if (Math.abs(e.clientX - candidate.x) + Math.abs(e.clientY - candidate.y) < 3) return;
      active = true; FPSM.drag2d = true; applyFps();
    }, true);
    window.addEventListener('pointerup', function (e) { if (candidate && candidate.id === e.pointerId) finish(); }, true);
    window.addEventListener('pointercancel', function (e) { if (candidate && candidate.id === e.pointerId) finish(); }, true);
    window.addEventListener('blur', finish, true);
  }
  window.__snapFps = { apply: applyFps, state: FPSM, replay: fpsReplay };

/* ============================================================
 * @MODULE[init]  KHỞI ĐỘNG (bảng ACTIONS: phím → hàm, key dispatch)
 * cfgInit, applyFps, install2dDragBoost,
 * ACTIONS, key dispatch, event listeners, lyInit
 * ============================================================ */
  (function wait(t) {
    if (ctx()) {
      cfgInit();
      try { arrApply(); } catch (e) { console.warn('[snap] mui ten', e); }
      try { applyFps(); installHoverBoost(); install2dDragBoost(); setInterval(function () { if (!uiBusy()) hookFpsRenderers(); }, 2000); } catch (e) { console.warn('[snap] FPS', e); }
      var busy = toolBusy;
      var ACTIONS = [
        ['keyMenu', toggleMenu, false, 'menu cài đặt'],
        ['keyArrow', toggleArrows, false, 'bật/tắt mũi tên hướng đỏ'],
        ['keyFitHead', function () { tailKey(false, 'head'); }, true, 'khít đầu'],
        ['keyFitTail', function () { tailKey(false, 'rear'); }, true, 'khít đuôi'],
        ['keyFitHeadAll', function () { tailKey(true, 'head'); }, true, 'khít đầu mọi keyframe'],
        ['keyFitTailAll', function () { tailKey(true, 'rear'); }, true, 'khít đuôi mọi keyframe'],
        ['keyUnifyTail', doUnifyTail, true, 'đồng nhất kích thước + khít đầu/đuôi'],
        ['keySnapAll', function () { doSnap(true); }, true, 'dán sát đất cả track'],
        ['keySnap', function () { viaTool('dán sát đất', function () { doSnap(false); }); }, true, 'dán sát đất'],
        ['keyRed', function () { CFG.redOnly = !CFG.redOnly; toast('Chi sat dat mau DO: ' + (CFG.redOnly ? 'BAT' : 'TAT (dung moi mau)')); }, false, 'bật/tắt đất đỏ'],
        ['keyHeadAll', function () { doHeadSnap(true); }, true, 'đầu xe mọi frame'],
        ['keyHead', function () { doHeadSnap(false); }, true, 'đầu xe'],
        ['keyChainAll', function () { doChainSnap(true); }, true, 'xe sau theo xe trước mọi frame'],
        ['keyChain', function () { doChainSnap(false); }, true, 'xe sau theo xe trước'],
        ['keyCams', toggleCams, false, 'FOCUS 7 camera'],
        ['keyAttrPanel', toggleAttrPanel, false, 'bảng thuộc tính'],
        ['keyClassPrev', function () { doClassCycle(-1); }, true, 'xe tải: đổi class trước (↑)', canCycle],
        ['keyClassNext', function () { doClassCycle(1); }, true, 'xe tải: đổi class sau (↓)', canCycle],
        ['keyConvert', doConvert, true, 'đổi ' + CFG.convertA + ' ⇄ ' + CFG.convertB + ' / cọc tiêu ⇄ người cưỡi động vật'],
        ['keyDirAll', doDirAll, true, 'đồng bộ chiều (đầu/đuôi) mọi frame theo frame hiện tại'],
        ['keyLayoutToggle', function () { lyToggleSus('phím'); }, false, 'tạm tắt/bật bố cục tùy chỉnh'],
        ['keyUndo', doUndo, false, 'hoàn tác thao tác của script'],
        ['keyWidth', doWidthAll, true, 'đặt chiều rộng cố định mọi frame'],
        ['keyDeleteAll', doDeleteSelected, true, 'xoá toàn bộ frame của id'],
        ['keyCheck', toggleCheck, false, 'danh sách kiểm tra nhãn'],
        ['keyFilterPanel', toggleFilterPanel, false, 'bộ lọc box (CIPO/che phủ/động tĩnh)'],
        ['keyNextId', function () { selectNeighbor(1); }, true, 'id kế tiếp'],
        ['keyPrevId', function () { selectNeighbor(-1); }, true, 'id trước đó'],
        ['keyEdgeAll', function () { doEdgeFit(true); }, true, 'sát rìa xe mọi keyframe'],
        ['keyEdge', function () { viaTool('sát rìa xe', function () { doEdgeFit(false); }); }, true, 'sát rìa xe (bỏ gương)']
      ];
      var UNDOZ = ["keyFitHead", "keyFitTail", "keyFitHeadAll", "keyFitTailAll", "keyUnifyTail", "keyHeadAll", "keyHead", "keyChainAll", "keyChain", "keyDirAll", "keyWidth", "keyEdgeAll"];
      ACTIONS.forEach(function (a) {
        if (UNDOZ.indexOf(a[0]) < 0) return;
        var fn = a[1], lb = a[3]; a[1] = function () { viaTool(lb, fn); };
      });
      var parseKey = function (k) {
        if (!k) return null;
        var p = String(k).toLowerCase().replace(/\s+/g, '').split('+'), key = p.pop();
        return { key: key, alt: p.indexOf('alt') >= 0, shift: p.indexOf('shift') >= 0, ctrl: p.indexOf('ctrl') >= 0 };
      };
      var matchKey = function (e, k) {
        if (!k) return false;
        var MK = { ctrl: 'control', alt: 'alt', shift: 'shift' };
        if (MK[k.key]) {
          if (String(e.key).toLowerCase() !== MK[k.key]) return false;
          /* FIX#1: modifier đơn (alt/ctrl/shift) chỉ fire khi nhả MÀ không có modifier nào khác đang giữ,
             và chỉ trên keyup – tránh kích hoạt 'alt' khi người dùng vừa bấm xong alt+q/alt+s */
          if (e.type === 'keyup') {
            if (k.key === 'alt' && (e.ctrlKey || e.shiftKey)) return false;
            if (k.key === 'ctrl' && (e.altKey || e.shiftKey)) return false;
            if (k.key === 'shift' && (e.ctrlKey || e.altKey)) return false;
          }
          return (k.key === 'ctrl' || !!e.ctrlKey === k.ctrl) && (k.key === 'alt' || !!e.altKey === k.alt) && (k.key === 'shift' || !!e.shiftKey === k.shift) && !e.metaKey;
        }
        var code = k.key.length === 1 ? (/[a-z]/.test(k.key) ? 'Key' + k.key.toUpperCase() : /[0-9]/.test(k.key) ? 'Digit' + k.key : '') : k.key;
        if (e.code !== code && String(e.key).toLowerCase() !== k.key && KEY_CODE_CHAR[e.code] !== k.key) return false;
        return !!e.altKey === k.alt && !!e.shiftKey === k.shift && !!e.ctrlKey === k.ctrl && !e.metaKey;
      };
      try { installRecorder(ctx().S); } catch (e) { console.warn('[snap] installRecorder', e); }
      var parsed = [], remaps = [], attrKs = [];
      window.__snapRebuildKeys = function () {
        parsed = ACTIONS.map(function (a) { return { k: parseKey(CFG[a[0]]), fn: a[1], idle: a[2], label: a[3], cond: a[4], rec: ['keyUndo', 'keyWidth', 'keyUnifyTail', 'keySnap', 'keySnapAll', 'keyEdge'].indexOf(a[0]) < 0 && UNDOZ.indexOf(a[0]) < 0 }; });
        attrKs = (CFG.attrKeys || []).filter(Boolean).map(normAttr).filter(function (x) { return x.k && (x.sets.length || x.scope === 'copyall'); }).map(function (x) { return { k: parseKey(x.k), spec: x }; });
        remaps = (CFG.toolKeyMap || []).filter(function (x) { return x && x[0] && x[1] && x[1].length; }).map(function (x) { return { k: parseKey(x[0]), to: [].concat(x[1]) }; });
        var mb = { mouseback: false, mouseforward: false };
        parsed.map(function (p) { return p.k; }).concat(attrKs.map(function (a) { return a.k; }), remaps.map(function (r) { return r.k; })).forEach(function (k) { if (k && mb.hasOwnProperty(k.key)) mb[k.key] = true; });
        window.__snapMouseBound = mb;
        if (mb.mouseback || mb.mouseforward) ensureNavGuard();
        if (window.__snapLayout) window.__snapLayout();
      };
      window.__snapRebuildKeys();
      var typing = function (e) { var t = e.composedPath ? e.composedPath()[0] : e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); };
      /* FIX#1 cont: theo dõi xem có combo-key (alt+x) nào vừa được xử lý không → ngăn modifier đơn 'alt' bắn theo */
      var _lastComboAt = 0;
      var onKey = function (e) {
        if (e.__snapSynth) return;
        if (!_menu) {
          for (var m = 0; m < remaps.length; m++) if (matchKey(e, remaps[m].k)) {
            if (typing(e)) return;
            e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            var to = remaps[m].to;
            if (to.length === 1) { if (e.type === 'keydown' || e.type === 'keyup') synthKey(to[0], e.type); }
            else if (e.type === 'keydown' && !e.repeat) runMacro(to);
            return;
          }
          for (var a2 = 0; a2 < attrKs.length; a2++) if (matchKey(e, attrKs[a2].k)) {
            if (typing(e)) return;
            e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            if (e.type === 'keydown' && !e.repeat && !busy()) doAttrKey(attrKs[a2].spec);
            return;
          }
        }
        var hit = null;
        for (var i = 0; i < parsed.length && !hit; i++) if (matchKey(e, parsed[i].k)) hit = parsed[i];
        if (!hit || typing(e)) return;
        if (hit.cond && !hit.cond()) return;
        /* FIX#1: nếu phím này là modifier đơn (alt/ctrl/shift) trên keyup, và vừa có combo được fire trong 300ms,
           bỏ qua để tránh alt bắn sau alt+q/alt+s */
        var isModifierAlone = hit.k && (hit.k.key === 'alt' || hit.k.key === 'ctrl' || hit.k.key === 'shift') &&
                              !hit.k.alt && !hit.k.ctrl && !hit.k.shift;
        if (isModifierAlone && e.type === 'keyup' && Date.now() - _lastComboAt < 300) return;
        e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        if (e.type !== 'keydown' || e.repeat || (hit.idle && busy())) return;
        /* Ghi nhận combo vừa được thực hiện (bất kỳ phím nào có modifier) */
        if (e.altKey || e.ctrlKey || e.shiftKey) _lastComboAt = Date.now();
        var rr = hit.rec ? recBegin(hit.label) : null;
        try { hit.fn(); } finally { recEnd(rr); }
      };
      ['keydown', 'keyup', 'keypress'].forEach(function (ev) { window.addEventListener(ev, onKey, true); });
      /* FIX#1: cũng cập nhật _lastComboAt khi attrKeys / remaps combo được fire */
      window.addEventListener('keydown', function (e) {
        if (e.__snapSynth || (!e.altKey && !e.ctrlKey && !e.shiftKey)) return;
        var t = e.composedPath ? e.composedPath()[0] : e.target;
        if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
        _lastComboAt = Date.now();
      }, true);
      var mouseHeld = {};
      var mkPseudo = function (e, type) {
        var p = { type: type, code: MOUSE_BTN[e.button], key: MOUSE_BTN[e.button], repeat: false, altKey: e.altKey, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey, target: e.target, hit: false,
          composedPath: function () { return e.composedPath ? e.composedPath() : [e.target]; },
          preventDefault: function () { p.hit = true; }, stopPropagation: function () {}, stopImmediatePropagation: function () {} };
        return p;
      };
      var lastPtr = {};
      var onMouseBtn = function (e) {
        if (e.button !== 3 && e.button !== 4) return;
        var nm = MOUSE_BTN[e.button], mb = window.__snapMouseBound || {};
        if (!_menu && !mb[nm]) return;
        e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        var isDown = e.type === 'pointerdown' || e.type === 'mousedown', isUp = e.type === 'pointerup' || e.type === 'mouseup', now = Date.now();
        if (e.type.indexOf('pointer') === 0) lastPtr[e.type + e.button] = now;
        else if (isDown || isUp) { var pk = (isDown ? 'pointerdown' : 'pointerup') + e.button; if (lastPtr[pk] && now - lastPtr[pk] < 500) return; }
        if (isDown) {
          if (_menu && _menu.rec) { var sp = mouseSpec(e); if (sp) _menu.rec.set(sp); return; }
          var pe = mkPseudo(e, 'keydown'); onKey(pe);
          if (pe.hit) mouseHeld[e.button] = mkPseudo(e, 'keyup');
        } else if (isUp && mouseHeld[e.button]) {
          var up = mouseHeld[e.button]; delete mouseHeld[e.button]; onKey(up);
        }
      };
      ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'auxclick'].forEach(function (ev) { window.addEventListener(ev, onMouseBtn, true); });
      window.addEventListener('keydown', onHoverKey, true);
      window.addEventListener('keydown', onFineKey, true);
      window.addEventListener('keyup', onFineKey, true);
      window.addEventListener('keydown', onZKey, true);
      window.addEventListener('keydown', onAxisKey, true);
      ['pointermove', 'mousedown'].forEach(function (ev) {
        window.addEventListener(ev, function (e) { _ly.mx = e.clientX; _ly.my = e.clientY; if (!e.__snapSynth) { _hv.seq++; _hv.lastEl = e.target; if (e.target !== _hv.tgt) { _hv.tgt = e.target; _hv.crossed = true; } hoverSettleArm(); } }, { capture: true, passive: true });
      });
      window.addEventListener('keydown', function (e) {
        if (e.key !== 'Tab' || e.ctrlKey || e.altKey || e.shiftKey || e.metaKey || e.__snapSynth) return;
        if (!CFG.layoutOn || _ly.ed || _menu) return;
        var t = e.composedPath ? e.composedPath()[0] : e.target;
        if (t && (t.isContentEditable || (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !(t.type === 'checkbox' || t.type === 'button')))) return;
        var kill = function () { e.preventDefault(); e.stopImmediatePropagation(); };
        if (_ly.sus) return;
        if (e.repeat) return kill();
        var nat = CFG.tabNative !== false, wasMax = _ly.max, role = wasMax;
        if (!wasMax) { lyTag(true); role = lyHoverRole(); }
        if (!role) return nat ? kill() : undefined;
        var toolCell = !lySelf(role);
        if (!lyMaxToggle()) return;
        if (nat && toolCell) { e.preventDefault(); return; }
        kill();
      }, true);
      window.addEventListener('pointerdown', onCtrlDown, true); window.addEventListener('pointerup', onCtrlUp, true);
      /* Nhấp đúp vào ảnh 2D chính: nền tảng tự phóng/thu ô (react-grid-item) và đánh nhau với bố cục tùy chỉnh
         (CSS !important của tool) làm ô bị kẹt ở kích thước nhỏ -> chặn nhấp đúp để ô giữ nguyên.
         Phóng to/thu nhỏ ô vẫn dùng Tab như bình thường. Tắt bằng CFG.dblClickGuard = false. */
      window.addEventListener('dblclick', function (e) {
        if (CFG.dblClickGuard === false || !CFG.layoutOn || _ly.sus || _ly.ed || _ly.tabNat) return;
        var path = e.composedPath ? e.composedPath() : [e.target], hit = false;
        for (var i = 0; i < path.length; i++) {
          var n = path[i];
          if (n && n.nodeType === 1 && n.closest && n.closest('#rgbview') && n.closest('.react-grid-layout>.react-grid-item')) { hit = true; break; }
        }
        if (!hit) return;
        e.stopImmediatePropagation(); e.preventDefault();
      }, true);
      try { knownCategories(ctx()); } catch (e) {}
      hookUnify(); setInterval(hookUnify, 2000);
      lyInit();
      if (CFG.attrPanelOpen) setTimeout(function () { if (!_ap) toggleAttrPanel(); }, 400);
      console.log('[snap] san sang: ' + ACTIONS.filter(function (a) { return CFG[a[0]]; }).map(function (a) { return CFG[a[0]].toUpperCase() + ' = ' + a[3]; }).join(' | '));
    } else if (t < 120) setTimeout(function () { wait(t + 1); }, 500);
  })(0);
})();
