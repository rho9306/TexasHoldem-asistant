// 牌桌页（Batch B）：牌桌视图渲染（人数 chips / 椭圆桌+座位 / 座位菜单 / 下一轮）
// —— 两种挂载形态：① openTablePage 全屏浮层（手机主入口）② renderTableInto 内嵌任意容器（桌面中栏实时视图）
// 座位按顺时针编号 0..N-1，英雄固定座位 0（正下方）。庄家位/轮次为会话内存（模块级变量，
// 页面刷新即重置——v1 可接受，对手档案已走 localStorage 持久化）。
// 内嵌与浮层共享同一份 dealer/roundCount 模块状态：三处轮转（内嵌按钮/浮层按钮/手机「⏭ 下一轮」）
// 都走 nextRound()，天然一致。
import { state, setPatch } from '../state.js';
import { saveOpponents } from '../storage.js';
import { opponentDefaults, TYPE_LABEL, typeLabel } from './opponentCards.js';
import { positionsFor } from './positionBar.js';
import { resetPending } from './cardPicker.js';
import { FIELD_DEFAULTS } from './potForm.js';

/**
 * 英雄位置推算（纯函数，供单测）。
 * @param {number} off  英雄相对庄家的顺时针偏移：(0 - dealerSeat + N) % N
 * @param {number} n    人数 2-9
 * 口径：庄家下一位=SB（off1），再下一位=BB（off2）；off>=3 进入前排，取 positionsFor(n)[off-3]。
 * 单挑简化口径（n=2）：off0→BTN，off1→SB——德州单挑庄家即小盲，BTN/SB 实为同一人，
 * 这里按"庄=BTN、另一人=SB"的显示口径，与 positionsFor(2)=['BTN','SB'] 一致，不单列 'BB'。
 */
export function seatPositionName(off, n) {
  if (off === 0) return 'BTN';
  if (off === 1) return 'SB';
  if (off === 2) return 'BB';
  return positionsFor(n)[off - 3];
}

/** 由庄家座位算英雄偏移（纯函数）：顺时针座位编号，英雄=0 */
export function heroOffset(dealerSeat, n) {
  return ((0 - dealerSeat) % n + n) % n;
}

// ---- 会话内存：庄家座位 / 轮次（刷新重置，v1 可接受；内嵌/浮层/手机按钮三处共享）----
let dealerSeat = 0;
let roundCount = 1;

// 已挂载的表格实例登记表（内嵌+浮层）：nextRound 后统一重渲，保证所有可见视图同步
const mounted = [];

/** 当前人数（clamp 2-9，越界兜底） */
function clampN() {
  return Math.min(9, Math.max(2, state.playerCount || 6));
}

/**
 * 共享全屏浮层 helper：牌桌页 / 桌面端 GTO图 / 设置 三个入口复用同一套 overlay 模式。
 * 返回 { root, close }；close() 负责清理 DOM（键盘守卫依赖 .fs-overlay 存在性）。
 */
export function openFullScreen(title, buildFn) {
  document.querySelectorAll('.fs-overlay').forEach(el => el.remove()); // 防重复叠加
  const root = document.createElement('div');
  root.className = 'fs-overlay';
  const head = document.createElement('div');
  head.className = 'fs-head';
  const back = document.createElement('button');
  back.className = 'fs-back';
  back.textContent = '← 返回牌局';
  const ttl = document.createElement('b');
  ttl.textContent = title; // 静态标题，textContent 安全
  head.appendChild(back);
  head.appendChild(ttl);
  const body = document.createElement('div');
  body.className = 'fs-body';
  root.appendChild(head);
  root.appendChild(body);
  document.body.appendChild(root);
  const close = () => root.remove();
  back.addEventListener('click', close);
  buildFn(body, close);
  return { root, close };
}

/** 座位在椭圆上的百分比坐标：座位 i 的极角从正下方（英雄）起按 2π/N 递增 */
function seatCoords(i, n) {
  const a = Math.PI / 2 + (i * 2 * Math.PI) / n;
  return { left: 50 + 46 * Math.cos(a), top: 50 + 42 * Math.sin(a) };
}

/** 对手列表随人数自动增减到 N-1 个（新增用 TAG 默认，多余从尾部删） */
function syncOpponents(n) {
  const need = n - 1;
  const ops = [...state.opponents];
  while (ops.length < need) ops.push(opponentDefaults()); // 新对手不预设类型标签（type=null，数学按中性参数）
  if (ops.length > need) ops.length = need;
  return ops;
}

/** 人数/庄家等变化后统一落盘：setPatch + saveOpponents（对手列表已持久化） */
function commit(n) {
  const opponents = syncOpponents(n);
  const off = heroOffset(dealerSeat, n);
  setPatch({ playerCount: n, heroPosition: seatPositionName(off, n), opponents });
  saveOpponents(opponents);
}

/** 剪枝：出清已脱离文档的表格实例（防多次挂载累积死条目） */
function pruneMounted() {
  for (let i = mounted.length - 1; i >= 0; i--) {
    if (!mounted[i].container.isConnected) { mounted.splice(i, 1); continue; }
  }
}

/** 重渲所有仍挂在文档上的表格实例（脱离文档的旧容器顺带出清） */
function rerenderAll() {
  pruneMounted();
  for (const m of mounted) m.render();
}

/**
 * 「开始下一轮」唯一实现：庄家位顺时针轮转一位 → 英雄位置重算并落盘 → 轮次+1 →
 * **新手清空**（批次14，用户反馈：下一轮=新一手）→ 重渲所有已挂载的表格视图。
 * 导出供 main.js 手机端「⏭ 下一轮」按钮直调（不开浮层，调用点自行 refresh 计算页位置条）。
 */
export function nextRound() {
  const n = clampN();
  if (dealerSeat >= n) dealerSeat = 0; // 人数缩小后庄家位越界兜底
  dealerSeat = (dealerSeat + 1) % n;
  roundCount += 1;
  commit(n);
  // 新手清空：上一手的牌面与底池输入回到默认（对手档案/会话/设置跨手保留）。
  // oppStack 必须一并重置（审查回环）：potForm 输入时同步 oppStack=myStack，
  // 漏掉会让 effectiveStack=min(新myStack, 旧oppStack) 残留上一手的脏值
  resetPending();
  setPatch({ hand: [], board: [], ...FIELD_DEFAULTS, oppStack: FIELD_DEFAULTS.myStack, result: null, strategy: null });
  rerenderAll();
}

/**
 * 把牌桌视图渲染进任意容器（浮层 body 或桌面中栏内嵌容器均可）。
 * 内容：人数 chips + 轮次/庄家标签 + 「开始下一轮」按钮 + 椭圆桌座位 + 座位点击菜单。
 * 座位菜单为容器内 sticky 面板（浮层与内嵌中栏均可滚动到可见，无 top-layer 裁剪问题）。
 * @param {HTMLElement} container 挂载容器（内部 DOM 会被清空重建）
 * @param {{ onEditOpponent?: (o: object) => void }} [handlers]
 *   onEditOpponent — 「编辑详情」回调（main.js 传 openOpponentDrawer，抽屉是 <dialog> 顶层弹出）
 */
export function renderTableInto(container, handlers = {}) {
  pruneMounted();
  container.innerHTML = '';
  const n0 = clampN();
  if (dealerSeat >= n0) dealerSeat = 0; // 人数缩小后庄家位越界兜底
  // 顶行：人数 chips + 轮次 + 开始下一轮
  const bar = document.createElement('div');
  bar.className = 'card table-bar';
  const chips = document.createElement('div');
  chips.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
  const roundLbl = document.createElement('b');
  roundLbl.className = 'num';
  const nextBtn = document.createElement('button');
  nextBtn.textContent = '开始下一轮';
  nextBtn.style.cssText = 'background:var(--accent);color:#000;font-weight:700;border:none;border-radius:10px;padding:8px 16px;min-height:44px;';
  bar.appendChild(chips);
  bar.appendChild(roundLbl);
  bar.appendChild(nextBtn);
  container.appendChild(bar);
  // 椭圆桌 + 座位层
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  const oval = document.createElement('div');
  oval.className = 'table-oval';
  const seats = document.createElement('div');
  seats.className = 'table-seats';
  wrap.appendChild(oval);
  wrap.appendChild(seats);
  container.appendChild(wrap);
  // 座位点击菜单（容器内 sticky 面板，单例复用）
  const menu = document.createElement('div');
  menu.className = 'seat-menu';
  menu.style.display = 'none';
  container.appendChild(menu);

  const openSeatMenu = (seatIdx) => {
    const n = clampN();
    menu.innerHTML = '';
    menu.style.display = 'flex';
    const mkBtn = (text, fn, style) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      if (style) b.style.cssText = style;
      b.addEventListener('click', fn);
      menu.appendChild(b);
    };
    const done = () => { menu.style.display = 'none'; render(); };
    if (seatIdx !== dealerSeat) {
      mkBtn('设为庄家', () => { dealerSeat = seatIdx; commit(n); done(); });
    }
    if (seatIdx !== 0) {
      const o = state.opponents[seatIdx - 1];
      if (o) for (const t of Object.keys(TYPE_LABEL)) {
        mkBtn(TYPE_LABEL[t], () => {
          setPatch({ opponents: state.opponents.map(x => x.id === o.id ? { ...x, type: t } : x) });
          saveOpponents(state.opponents);
          done();
        });
      }
      if (o && handlers.onEditOpponent) mkBtn('编辑详情', () => handlers.onEditOpponent(o));
      if (o) mkBtn('移除该对手', () => {
        // 从对手列表删除后人数随之 -1（座位数=对手数+1）
        const ops = state.opponents.filter(x => x.id !== o.id);
        const m = Math.max(2, ops.length + 1);
        if (dealerSeat >= m) dealerSeat = 0;
        setPatch({ opponents: ops });
        commit(m);
        done();
      }, 'color:var(--danger);');
    }
    mkBtn('取消', () => { menu.style.display = 'none'; });
  };

  const render = () => {
    const n = clampN();
    // 人数 chips
    chips.innerHTML = '';
    for (let k = 2; k <= 9; k++) {
      const b = document.createElement('button');
      b.textContent = String(k);
      b.className = 'chip' + (k === n ? ' active' : '');
      b.style.cssText = 'border:1px solid var(--border);border-radius:999px;padding:4px 14px;background:' +
        (k === n ? 'var(--accent)' : 'var(--bg)') + ';color:' + (k === n ? '#000' : 'var(--text-dim)');
      b.addEventListener('click', () => { if (dealerSeat >= k) dealerSeat = 0; commit(k); render(); });
      chips.appendChild(b);
    }
    roundLbl.textContent = `第 ${roundCount} 轮 · 庄家座位 ${dealerSeat + 1}`;
    // 座位
    seats.innerHTML = '';
    const off = heroOffset(dealerSeat, n);
    for (let i = 0; i < n; i++) {
      const { left, top } = seatCoords(i, n);
      const s = document.createElement('button');
      s.className = 'table-seat' + (i === dealerSeat ? ' is-dealer' : '');
      s.style.left = left + '%';
      s.style.top = top + '%';
      if (i === 0) {
        // 英雄座：固定「我」+ 当前推算位置徽章
        const me = document.createElement('span');
        me.textContent = '我';
        const pos = document.createElement('span');
        pos.className = 'seat-pos num';
        pos.textContent = seatPositionName(off, n);
        s.appendChild(me);
        s.appendChild(pos);
      } else {
        const o = state.opponents[i - 1];
        const nm = document.createElement('span');
        nm.textContent = (o?.name || typeLabel(o?.type) || '对手'); // 用户输入走 textContent，防XSS
        const ty = document.createElement('span');
        ty.className = 'seat-type';
        ty.textContent = typeLabel(o?.type);
        if (o?.type == null) ty.style.color = 'var(--text-dim)'; // 默认对手徽章用中性灰
        s.appendChild(nm);
        if (ty.textContent) s.appendChild(ty);
      }
      if (i === dealerSeat) {
        const d = document.createElement('span');
        d.className = 'seat-btn-d num';
        d.textContent = 'D';
        s.appendChild(d);
      }
      s.addEventListener('click', () => openSeatMenu(i));
      seats.appendChild(s);
    }
  };

  // 开始下一轮：统一走 nextRound()（庄家轮转+新手清空+所有已挂载视图同步重渲）；
  // onAfterNext 供调用方刷新计算页（结果区需随清空重渲，内嵌/浮层自身不重渲计算页）
  nextBtn.addEventListener('click', () => { nextRound(); handlers.onAfterNext?.(); });

  render();
  mounted.push({ container, render });
}

/**
 * 打开牌桌页全屏浮层（手机主入口，行为不变）。
 * @param {{ onEditOpponent?: (o: object) => void, onBack?: () => void }} handlers
 *   onEditOpponent — 「编辑详情」回调（main.js 传 openOpponentDrawer，抽屉是 <dialog> 顶层弹出）
 *   onBack         — 关闭浮层回调（main.js 传 refresh() 重绘计算页）
 */
export function openTablePage(handlers = {}) {
  return openFullScreen('🪑 牌桌', (body) => {
    renderTableInto(body, { onEditOpponent: handlers.onEditOpponent, onAfterNext: handlers.onAfterNext });
    // 返回牌局：刷新计算页（期间 state 已被多次 setPatch）
    body.closest('.fs-overlay')?.querySelector('.fs-back')?.addEventListener('click', () => handlers.onBack?.());
  });
}
