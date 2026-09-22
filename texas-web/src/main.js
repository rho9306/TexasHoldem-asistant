// 应用入口 + 计算页完整装配（Task 19）+ 桌面三栏工作台/键盘快捷键（Task 25，UX 修正改三栏）
// 手机（<1024px）：四标签页布局不变。桌面（≥1024px）：#workspace 三栏 ①牌面+局面 ②结果+策略 ③历史。
// matchMedia 变化时整树重建。快捷键：rank+花色数字录入、Enter 确认部分选择、C 清空、Space 重算。
import './style.css';
import { state, setPatch } from './state.js';
import { recalc, buildStrategy, streetOf } from './calc.js';
import { renderCardPicker, handleKeyEntry, confirmPartials, resetPending } from './ui/cardPicker.js';
import { renderPotForm } from './ui/potForm.js';
import { renderPositionBar } from './ui/positionBar.js';
import { renderOpponentCards, opponentDefaults, TYPE_LABEL } from './ui/opponentCards.js';
import { renderResult } from './ui/resultPanel.js';
import { renderStrategyPanel } from './ui/strategyPanel.js';
import { renderTableProfile } from './ui/tableProfile.js';
import { TYPE_DEFAULTS } from './strategy/ranges.js';
import { settleNet } from './strategy/settle.js';
import { renderTabbar, switchPage as baseSwitchPage } from './ui/tabs.js';
import { renderChartPage } from './ui/chartViewer.js';
import { renderSettingsPage } from './ui/settingsPage.js';
import { renderSessionBar } from './ui/sessionBar.js';
import { buildHandRecord, deleteSession, loadAll, migrateOpponentDefaults, saveHands, saveSessions, saveOpponents, saveSettings, updateOpponentObservation } from './storage.js';
import { exportAll, importAll } from './exporter.js';
import { renderHistoryPage } from './ui/historyList.js';
import { renderReviewCard } from './ui/reviewCard.js';
import { openTablePage, openFullScreen, renderTableInto, nextRound } from './ui/tablePage.js';

document.getElementById('app').innerHTML = `
  <header id="topbar" class="card"><b>♠ 德扑助手</b> <span id="street-badge" class="num"></span> <span id="desktop-topbar" class="dim num"></span> <button id="dt-gto">GTO图</button> <button id="dt-settings">设置</button> <span id="session-bar"></span></header>
  <div id="workspace">
    <section id="ws-input"></section>
    <section id="ws-result"></section>
    <section id="ws-history"></section>
  </div>
  <main id="page-calc" class="page active"></main>
  <main id="page-gto" class="page"></main>
  <main id="page-history" class="page"></main>
  <main id="page-settings" class="page"></main>
  <nav id="tabbar"></nav>`;

const $ = id => document.getElementById(id);
const WS_IDS = ['ws-input', 'ws-result', 'ws-history'];
const PAGE_IDS = ['page-calc', 'page-gto', 'page-history', 'page-settings'];

// GTO 图页：每次切入重渲，跟随当前 state（用户点选场景后以所选为准）
let gtoScenario = null;
let historyFilter = 'all'; // 历史页当前筛选（跨重渲保持）
let importBtnTimer = null; // 导入按钮反馈还原 timer（防连点竞争）
let currentPage = 'calc'; // 当前标签（跨模式切换恢复用）
const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 1024px)') : null;
let desktop = !!(mq && mq.matches);

function renderDesktopHistory() {
  renderHistoryPage($('ws-history'), {
    filter: historyFilter,
    onFilter: f => { historyFilter = f; renderDesktopHistory(); },
    onOpenHand: h => openReviewDialog(h),
    onDeleteSession: id => onDeleteSessionWire(id),
  });
}

/** 删除会话（批次11）：删数据 → 当前会话引用清理 → 顶栏会话条与历史区重渲 */
function onDeleteSessionWire(id) {
  deleteSession(id);
  if (state.sessionId === id) setPatch({ sessionId: '', sessionName: '' });
  renderSessionBar($('session-bar'));
  if (desktop) renderDesktopHistory();
  else switchPage('history');
}

/** 桌面信息条：街 · 人数 · 对手数 · 画像 · 快捷键可用 */
function updateDesktopTopbar() {
  $('desktop-topbar').textContent = desktop
    ? `${streetOf(state.board)} · ${state.playerCount}人桌 · ${state.opponents.length}对手 · 🎯画像 · 快捷键可用` : '';
}

/**
 * 设置页 handlers（Batch B 抽取为模块级函数，供标签页与桌面端设置浮层两处复用）。
 * @param {() => void} [reopen] 浮层模式的重渲回调（导入成功/清空后重建浮层内容）；
 *   缺省 = 标签页模式（switchPage 重渲 page-settings）。
 */
function settingsHandlers(reopen) {
  const re = reopen ?? (() => switchPage('settings'));
  return {
    onExport() {
      const json = exportAll();
      const ts = new Date();
      const pad = n => String(n).padStart(2, '0');
      const name = `texas-backup-${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}.json`;
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url; a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 0); // 延迟回收，兼容旧Safari同步click丢失下载
    },
    onImport(text, readError) {
      const r = readError ? { ok: false, error: '文件读取失败' } : importAll(text);
      if (r.ok) {
        const d = loadAll();
        setPatch({ opponents: d.opponents, settings: d.settings ?? state.settings });
        refresh(); // 计算页/桌面信息条按导入后数据重建（须在重渲之前，桌面模式 refresh 会清空 page-settings）
      }
      if (r.ok) re(); // 先重渲使控件反映导入后的 settings（标签页 or 浮层）
      // 反馈写在重渲后的新 DOM 上，避免被立即重建冲掉；timer 防连点竞争
      const btn = $('s-import');
      if (btn) {
        clearTimeout(importBtnTimer);
        btn.textContent = r.ok ? '✓ 导入成功' : `✗ ${r.error}`;
        importBtnTimer = setTimeout(() => { btn.textContent = '导入 JSON'; }, 2000);
      }
    },
    onClear() {
      // Task 24 接线：清空历史（会话+手数），对手档案保留
      if (!confirm('确定清空所有历史记录与回合？对手档案保留')) return;
      saveHands([]);
      saveSessions([]);
      if (reopen) { re(); if (desktop) renderDesktopHistory(); return; } // 浮层模式：重渲浮层内容，桌面常驻历史栏同步
      if (!desktop) { // 手机布局：按需重渲历史/设置页；桌面栏由下方 renderDesktopHistory 同步
        switchPage('history');
        switchPage('settings');
      }
      if (desktop) renderDesktopHistory(); // 桌面栏常驻历史，同步刷新
    },
  };
}

/** 桌面端 GTO 图浮层：与手机 GTO 标签页共用同一模块级 gtoScenario，选场景后同步 */
function openGtoOverlay() {
  openFullScreen('GTO 图', body => {
    renderChartPage(body, gtoScenario, s => { gtoScenario = s; openGtoOverlay(); });
  });
}

/** 桌面端设置浮层：复用 settingsHandlers，重渲走浮层内容重建 */
function openSettingsOverlay() {
  openFullScreen('设置', body => {
    renderSettingsPage(body, settingsHandlers(() => openSettingsOverlay()));
  });
}

function switchPage(id) {
  currentPage = id;
  baseSwitchPage(id);
  if (id === 'gto') renderChartPage($('page-gto'), gtoScenario, s => { gtoScenario = s; switchPage('gto'); });
  if (id === 'history') renderHistoryPage($('page-history'), {
    filter: historyFilter,
    onFilter: f => { historyFilter = f; switchPage('history'); },
    onOpenHand: h => openReviewDialog(h),
    onDeleteSession: id => onDeleteSessionWire(id),
  });
  if (id === 'settings') renderSettingsPage($('page-settings'), settingsHandlers());
}
renderTabbar($('tabbar'), switchPage);
renderSessionBar($('session-bar'));
// Batch B：桌面端 GTO图/设置 入口（仅 ≥1024px 可见，CSS 控制；浮层手机/桌面均可用）
$('dt-gto').addEventListener('click', openGtoOverlay);
$('dt-settings').addEventListener('click', openSettingsOverlay);

/** 记录本手：结算开（默认）→ 弹窗选 赢/输/弃牌 自动算盈亏；关 → 净额 0 直接入库。
 *  无手牌不入库（批次14审查留档项闭环）。 */
window.__recordHand = () => {
  if (state.hand.length !== 2) {
    const btn = $('record-hand-btn');
    if (btn) {
      btn.textContent = '先选 2 张手牌';
      setTimeout(() => { btn.textContent = '✓ 记录本手到历史'; }, 1500);
    }
    return;
  }
  if (state.settled) { // 审查回环：同一手重复入库会双扣筹码
    const btn = $('record-hand-btn');
    if (btn) {
      btn.textContent = '本手已结算，点「下一轮」开新一手';
      setTimeout(() => { btn.textContent = '✓ 记录本手到历史'; }, 2000);
    }
    return;
  }
  if (state.settings.settlement !== false) openSettlementDialog();
  else recordWithNet(0);
};

/** 结算弹窗（批次15）：赢/输/弃牌 → 预填盈亏（可改）→ 确认入库并结算筹码 */
function openSettlementDialog() {
  $('settle-dlg')?.remove();
  const dlg = document.createElement('dialog');
  dlg.id = 'settle-dlg';
  dlg.innerHTML = `
    <div style="min-width:280px;display:flex;flex-direction:column;gap:12px;background:var(--bg);color:var(--text);">
      <b>牌局结算</b>
      <div id="sd-outcomes" style="display:flex;gap:8px;">
        <button type="button" data-o="win" style="flex:1;min-height:44px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:8px;">✅ 赢了</button>
        <button type="button" data-o="lose" style="flex:1;min-height:44px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:8px;">❌ 输了</button>
        <button type="button" data-o="fold" style="flex:1;min-height:44px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:8px;">🚪 弃牌</button>
      </div>
      <label style="display:flex;align-items:center;gap:8px;">盈亏 <input id="sd-net" type="number" step="any" style="flex:1;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:6px;" /><span class="dim">（可改，如加注输）</span></label>
      <div class="dim num" id="sd-hint">底池 ${state.pot} · 跟注 ${state.call}</div>
      <div style="display:flex;justify-content:space-between;">
        <button id="sd-cancel" type="button">取消</button>
        <button id="sd-ok" type="button" style="background:var(--accent);color:#000;font-weight:700;">确认记录</button>
      </div>
    </div>`;
  document.body.appendChild(dlg);
  const netInput = dlg.querySelector('#sd-net');
  const hint = dlg.querySelector('#sd-hint');
  const paint = sel => {
    for (const b of dlg.querySelectorAll('#sd-outcomes button')) {
      b.style.borderColor = b.dataset.o === sel ? 'var(--accent)' : 'var(--border)';
      b.style.background = b.dataset.o === sel ? 'var(--bg-hover)' : 'var(--bg)';
    }
  };
  let outcome = null;
  for (const b of dlg.querySelectorAll('#sd-outcomes button')) {
    b.addEventListener('click', () => {
      outcome = b.dataset.o;
      netInput.value = settleNet(outcome, state); // state.pot/state.call 同名字段直接可用
      paint(outcome);
    });
  }
  dlg.querySelector('#sd-cancel').addEventListener('click', () => close());
  dlg.querySelector('#sd-ok').addEventListener('click', () => {
    const net = +netInput.value;
    if (netInput.value.trim() === '' || !Number.isFinite(net)) return; // 空/非法金额不关弹窗（审查回环：+''===0 会静默记 0）
    close();
    recordWithNet(net);
  });
  dlg.addEventListener('close', () => dlg.remove()); // 审查回环：ESC 关闭也清理节点
  function close() { try { dlg.close?.(); } catch { /* ignore */ } dlg.remove(); }
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
}

/** 按净额入库：记录 → 对手观察 → 会话计数 → 筹码结算 → 刷新与按钮反馈 */
function recordWithNet(net) {
  const rec = buildHandRecord('未记录', { net, ev: state.result?.evCall ?? 0 });
  const { hands, sessions } = loadAll();
  hands.push(rec);
  saveHands(hands);
  // 对手观察：多路底池无法逐人区分，粗粒度推断 sawVpip（call>0 或有人加注/跛入）
  const sawVpip = state.call > 0 || state.raisesBefore > 0 || state.limpers > 0;
  for (const o of state.opponents) updateOpponentObservation(o.id, sawVpip);
  // 会话计数同步（无会话也照样记录，sessionId=''）
  if (state.sessionId) {
    const list = sessions.map(s => s.id === state.sessionId
      ? { ...s, handsCount: (s.handsCount ?? 0) + 1, netResult: (s.netResult ?? 0) + (rec.result?.net ?? 0), evTotal: (s.evTotal ?? 0) + (rec.result?.ev ?? 0) }
      : s);
    saveSessions(list);
  }
  // 筹码结算（批次15）：后手随盈亏增减（不小于0），oppStack 同步；下一轮带着新筹码开。
  // settled 置位防同一手重复入库双扣筹码（换牌/清牌/下一轮时清除）
  const stack = Math.max(0, state.myStack + net);
  setPatch({ myStack: stack, oppStack: stack, settled: true });
  refresh(); // 重渲后 potForm 显示新后手；桌面历史栏在 renderCalc 内同步
  // 按钮反馈：短暂变"已记录"后还原（写在重渲后的新 DOM 上）
  const btn = $('record-hand-btn');
  if (btn) {
    btn.textContent = '✓ 已记录';
    setTimeout(() => { btn.textContent = '✓ 记录本手到历史'; }, 1500);
  }
}

let resultEl = null, strategyEl = null;

/**
 * 计算页装配（参数化目标容器）。块顺序按真实牌局编号（手机与桌面输入列一致）：
 * ①手牌 ②位置 ③对手 ④公共牌 ⑤底池 → ⑥结果 ⑦画像+策略 → 记录本手。
 * split=false（手机）：全部顺序写入 pageRoot。
 * split=true（桌面）：①-⑤ → inputRoot；⑥⑦ + 记录按钮 → resultRoot（中栏，结果在上策略在下）。
 */
function buildCalc(pageRoot, inputRoot, resultRoot, split) {
  const root = split ? inputRoot : pageRoot;
  const out = split ? resultRoot : root; // 结果/策略/记录所在列
  const add = (parent = root) => { const d = document.createElement('div'); parent.appendChild(d); return d; };
  // 统一样式的编号步骤标题（常量字符串，textContent 安全）
  const step = (parent, text) => { const d = document.createElement('div'); d.className = 'step-title'; d.textContent = text; parent.appendChild(d); };
  // ① 我的手牌（已选牌互斥置灰；点击已选牌可取消）
  const used = [...state.hand, ...state.board];
  renderCardPicker(add(), {
    slots: 2, usedCards: used, initial: [...state.hand],
    title: '① 我的手牌',
    onPick: cards => { setPatch({ hand: cards, settled: false }); refresh(); }, // 换牌=新手（批次15 settled 语义）
  });
  // ② 我的位置与翻前场景
  step(root, '② 我的位置与翻前场景');
  renderPositionBar(add(), patch => { setPatch(patch); refresh(); }, () => state);
  // ③ 对手档案（标题行附按钮组：桌面 split 已有中栏内嵌表格则隐藏「🪑 牌桌」浮层入口，避免双入口；
  // 「⏭ 下一轮」两模式都保留——不开浮层直接轮转庄位，位置条即时反映新位置）
  const step3Row = document.createElement('div');
  step3Row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;';
  const step3Title = document.createElement('div');
  step3Title.className = 'step-title';
  step3Title.style.margin = '10px 2px 4px 0';
  step3Title.textContent = '③ 对手档案';
  const step3Btns = document.createElement('div');
  step3Btns.style.cssText = 'display:flex;gap:6px;align-items:center;';
  const tableBtn = document.createElement('button');
  tableBtn.textContent = '🪑 牌桌';
  tableBtn.style.cssText = 'background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:6px 14px;min-height:44px;';
  tableBtn.addEventListener('click', () => openTablePage({
    onEditOpponent: o => openOpponentDrawer(o), // 抽屉是 <dialog> 顶层弹出，不受浮层 z-index 影响
    onBack: () => refresh(), // 返回牌局：按牌桌页改动重绘计算页
    onAfterNext: () => refresh(), // 浮层内「开始下一轮」= 新手（已清空输入），立即重绘计算页
  }));
  if (split) tableBtn.style.display = 'none'; // 桌面模式：中栏已有内嵌表格，隐藏浮层入口
  const nextRoundBtn = document.createElement('button');
  nextRoundBtn.textContent = '⏭ 下一轮';
  nextRoundBtn.style.cssText = 'background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:6px 14px;min-height:44px;';
  nextRoundBtn.addEventListener('click', () => { nextRound(); refresh(); }); // nextRound 同步内嵌/浮层表格，refresh 刷位置条
  step3Btns.appendChild(tableBtn);
  step3Btns.appendChild(nextRoundBtn);
  step3Row.appendChild(step3Title);
  step3Row.appendChild(step3Btns);
  root.appendChild(step3Row);
  renderOpponentCards(add(), {
    opponents: state.opponents,
    compact: !split, // 手机紧凑模式：标题行只留 牌桌/下一轮，加对手走牌桌页调人数（批次12）
    onAdd: () => { setPatch({ opponents: [...state.opponents, opponentDefaults()] }); saveOpponents(state.opponents); refresh(); }, // 新对手 type=null：界面不预设标签
    onPreset: () => {
      setPatch({ opponents: state.opponents.map(o => ({ ...o, type: 'TAG', looseness: TYPE_DEFAULTS.TAG.looseness, aggression: TYPE_DEFAULTS.TAG.aggression })) });
      saveOpponents(state.opponents);
      refresh();
    },
    onEdit: o => openOpponentDrawer(o),
  });
  // ④ 公共牌（随街补填）
  renderCardPicker(add(), {
    slots: 5, usedCards: used, initial: [...state.board],
    title: '④ 公共牌（随街补填，翻前可不填）',
    onPick: cards => { setPatch({ board: cards, settled: false }); refresh(); },
  });
  // ⑤ 底池与筹码
  step(root, '⑤ 底池与筹码');
  renderPotForm(add(), v => { setPatch(v); updateResultsOnly(); }); // 只刷结果/策略区，输入区不重建（保焦点）
  // ⑥ 结果与建议（保留容器引用，recalc 完成后就地刷新，不整页重建）
  step(out, '⑥ 结果与建议');
  resultEl = document.createElement('div');
  out.appendChild(resultEl);
  renderResult(resultEl, state.result);
  // ⑦ 全桌画像 + 策略分析（画像横幅从页首移到这里，紧贴策略卡组）
  step(out, '⑦ 全桌画像与策略分析');
  renderTableProfile(add(out), state.opponents, state.settings.autoTableAdaptation);
  strategyEl = document.createElement('div');
  out.appendChild(strategyEl);
  renderStrategyPanel(strategyEl, state.strategy, state.board.length);
  // 🪑 牌桌实时视图（仅桌面 split）：内嵌到中栏策略卡之后，不开浮层；与手机浮层共享同一份庄位/轮次状态
  if (split) {
    step(out, '🪑 牌桌实时视图');
    const tableEl = document.createElement('div');
    tableEl.className = 'table-inline';
    out.appendChild(tableEl);
    renderTableInto(tableEl, { onEditOpponent: o => openOpponentDrawer(o), onAfterNext: () => refresh() }); // 内嵌下一轮=新手，同步刷新结果区
  }
  // 记录本手（Task 22 接线 window.__recordHand）——保持在最后（桌面也在中栏策略之后，与手机顺序一致）
  const rec = document.createElement('button');
  rec.id = 'record-hand-btn';
  rec.textContent = '✓ 记录本手到历史';
  rec.style.cssText = 'width:calc(100% - 16px);margin:8px;background:var(--accent);border:none;border-radius:10px;color:#000;font-weight:700;padding:12px;';
  rec.addEventListener('click', () => window.__recordHand?.());
  out.appendChild(rec);
}

/** 按当前模式装配：手机 → page-calc；桌面 → ws-input/result + 常驻 ws-history */
function renderCalc() {
  if (desktop) {
    for (const id of WS_IDS) $(id).innerHTML = '';
    for (const id of PAGE_IDS) $(id).innerHTML = '';
    buildCalc($('page-calc'), $('ws-input'), $('ws-result'), true);
    renderDesktopHistory();
  } else {
    for (const id of WS_IDS) $(id).innerHTML = ''; // 手机模式工作台清空，避免重复内容
    $('page-calc').innerHTML = '';
    buildCalc($('page-calc'), null, null, false);
  }
  updateDesktopTopbar();
}

/** 只刷结果/策略区（底池表单击键专用：不重建计算页，输入框焦点/半输状态保持） */
function updateResultsOnly() {
  recalc().then(() => {
    setPatch({ strategy: state.result?.error ? null : buildStrategy() });
    renderResult(resultEl, state.result);
    renderStrategyPanel(strategyEl, state.strategy, state.board.length);
  }).catch(() => { /* recalc 内部已兜底 error result */ });
}

/** 交互入口：重绘计算页 → 引擎计算 → 策略组装 → 刷新结果/策略区（订阅不回调，避免死循环） */
export function refresh() {
  renderCalc();
  $('street-badge').textContent = streetOf(state.board);
  recalc().then(() => {
    setPatch({ strategy: state.result?.error ? null : buildStrategy() });
    renderResult(resultEl, state.result);
    renderStrategyPanel(strategyEl, state.strategy, state.board.length);
  }).catch(() => { /* recalc 内部已兜底 error result */ });
}

// ---- Task 25 桌面/手机双模式切换：matchMedia 变化时整树重建 ----
function onModeChange(e) {
  desktop = e.matches;
  if (desktop) {
    refresh(); // renderCalc 桌面分支含 ws-history 常驻渲染
  } else {
    refresh();
    switchPage(currentPage); // 恢复手机标签页内容（gto/history/settings 按需重渲）
  }
}
if (mq) {
  if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onModeChange);
  else if (typeof mq.addListener === 'function') mq.addListener(onModeChange); // 旧 Safari
}

// ---- Task 25 键盘快捷键 ----
window.__confirmCards = () => { confirmPartials(); }; // 刷新由 onPick→setPatch→refresh 驱动，此处不再补刀
window.__clearCards = () => { resetPending(); setPatch({ hand: [], board: [], settled: false }); refresh(); };
window.__recalc = () => { if (!confirmPartials()) refresh(); }; // 有半选时先确认（onPick 已驱动刷新），无半选才重算

document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return; // 修饰键组合（如 Ctrl+C 复制）不触发快捷键
  if (e.repeat) return; // 长按不连发
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
  if (document.querySelector('dialog[open]')) { resetPending(); return; } // 弹层打开时不抢按键，并清掉残留半选
  if (document.querySelector('.fs-overlay')) return; // 全屏浮层（牌桌/GTO/设置）打开时快捷键不误触
  const RANK_CHARS = 'AKQJT98765432';
  if (RANK_CHARS.includes(e.key) || ['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); handleKeyEntry(e.key); return; }
  if (e.key === 'Enter') window.__confirmCards?.();
  if (e.key.toLowerCase() === 'c') window.__clearCards?.();
  if (e.key === ' ') { e.preventDefault(); window.__recalc?.(); }
});

/** 复盘卡弹层：<dialog> 承载 renderReviewCard，关闭即销毁（写法同 openOpponentDrawer） */
function openReviewDialog(record) {
  $('review-dlg')?.remove();
  const dlg = document.createElement('dialog');
  dlg.id = 'review-dlg';
  const inner = document.createElement('div');
  inner.style.cssText = 'min-width:280px;max-width:92vw;max-height:80vh;overflow:auto;background:var(--bg);color:var(--text);';
  dlg.appendChild(inner);
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '关闭';
  closeBtn.style.cssText = 'margin-top:8px;';
  closeBtn.addEventListener('click', () => { try { dlg.close?.(); } catch { /* ignore */ } dlg.remove(); });
  renderReviewCard(inner, record);
  inner.appendChild(closeBtn);
  document.body.appendChild(dlg);
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
}

/** 对手编辑抽屉：<dialog> 名称 + 4类型快选 + 松紧/凶弱双滑条 + 删除/保存 */
export function openOpponentDrawer(o) {
  $('opp-drawer')?.remove();
  const dlg = document.createElement('dialog');
  dlg.id = 'opp-drawer';
  dlg.innerHTML = `
    <div style="min-width:260px;display:flex;flex-direction:column;gap:12px;background:var(--bg);color:var(--text);">
      <b>编辑对手</b>
      <label style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <span>名称</span><input id="od-name" style="flex:1;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:6px;" />
      </label>
      <div id="od-types" style="display:flex;gap:6px;flex-wrap:wrap;"></div>
      <label style="display:flex;align-items:center;gap:8px;">松紧 <input id="od-loose" type="range" min="0" max="100" style="flex:1;" /><b class="num" id="od-loose-v"></b></label>
      <label style="display:flex;align-items:center;gap:8px;">凶弱 <input id="od-aggr" type="range" min="0" max="100" style="flex:1;" /><b class="num" id="od-aggr-v"></b></label>
      <div style="display:flex;justify-content:space-between;">
        <button id="od-del" type="button">删除</button>
        <button id="od-save" type="button" style="background:var(--accent);color:#000;font-weight:700;">保存</button>
      </div>
    </div>`;
  document.body.appendChild(dlg);

  const nameInput = dlg.querySelector('#od-name');
  const loose = dlg.querySelector('#od-loose');
  const aggr = dlg.querySelector('#od-aggr');
  const looseV = dlg.querySelector('#od-loose-v');
  const aggrV = dlg.querySelector('#od-aggr-v');
  let editType = o.type; // 保持 null：抽屉只有点了4类型快选才写 type，否则保存后仍是「默认」
  nameInput.value = o.name ?? '';
  loose.value = o.looseness ?? 35;
  aggr.value = o.aggression ?? 60;
  loose.addEventListener('input', () => { looseV.textContent = loose.value; });
  aggr.addEventListener('input', () => { aggrV.textContent = aggr.value; });
  looseV.textContent = loose.value;
  aggrV.textContent = aggr.value;

  // 4类型快选：点击把两滑条同步为 TYPE_DEFAULTS
  const typesBox = dlg.querySelector('#od-types');
  const typeBtns = [];
  for (const t of Object.keys(TYPE_DEFAULTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = TYPE_LABEL[t] ?? t;
    b.style.cssText = 'min-height:44px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);padding:4px 10px;';
    b.addEventListener('click', () => {
      loose.value = TYPE_DEFAULTS[t].looseness;
      aggr.value = TYPE_DEFAULTS[t].aggression;
      looseV.textContent = loose.value;
      aggrV.textContent = aggr.value;
      editType = t;
      paint();
    });
    typeBtns.push([b, t]);
    typesBox.appendChild(b);
  }
  const paint = () => {
    // 当前选中类型高亮；type 为 null（默认）时全部不高亮
    for (const [bt, tt] of typeBtns) bt.style.borderColor = tt === editType ? 'var(--accent)' : 'var(--border)';
  };
  paint();

  dlg.querySelector('#od-del').addEventListener('click', () => {
    setPatch({ opponents: state.opponents.filter(x => x.id !== o.id) });
    saveOpponents(state.opponents);
    close();
    refresh();
  });
  dlg.querySelector('#od-save').addEventListener('click', () => {
    const form = { type: editType, name: nameInput.value.trim(), looseness: +loose.value, aggression: +aggr.value };
    setPatch({ opponents: state.opponents.map(x => x.id === o.id ? { ...x, ...form } : x) });
    saveOpponents(state.opponents);
    close();
    refresh();
  });
  function close() { try { dlg.close?.(); } catch { /* ignore */ } dlg.remove(); }

  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
}

// 启动回填：localStorage 已存设置/对手 → 与默认值浅合并（防旧档缺新键），在首次 refresh 之前
migrateOpponentDefaults(); // 批次7收尾：存量 type:'TAG'（旧默认）一次性改「默认」，须在 loadAll 之前
const saved = loadAll();
if (saved.settings) setPatch({ settings: { ...state.settings, ...saved.settings } });
if (saved.opponents?.length) setPatch({ opponents: saved.opponents });
refresh();
