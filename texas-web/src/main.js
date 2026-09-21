// 应用入口 + 计算页完整装配（Task 19）+ 桌面四栏工作台/键盘快捷键（Task 25）
// 手机（<1024px）：四标签页布局不变。桌面（≥1024px）：#workspace 四栏 ①牌面+局面 ②结果 ③策略 ④历史。
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
import { renderTabbar, switchPage as baseSwitchPage } from './ui/tabs.js';
import { renderChartPage } from './ui/chartViewer.js';
import { renderSettingsPage } from './ui/settingsPage.js';
import { renderSessionBar } from './ui/sessionBar.js';
import { buildHandRecord, loadAll, saveHands, saveSessions, saveOpponents, saveSettings, updateOpponentObservation } from './storage.js';
import { exportAll, importAll } from './exporter.js';
import { renderHistoryPage } from './ui/historyList.js';
import { renderReviewCard } from './ui/reviewCard.js';

document.getElementById('app').innerHTML = `
  <header id="topbar" class="card"><b>♠ 德扑助手</b> <span id="street-badge" class="num"></span> <span id="desktop-topbar" class="dim num"></span> <span id="session-bar"></span></header>
  <div id="workspace">
    <section id="ws-input"></section>
    <section id="ws-result"></section>
    <section id="ws-strategy"></section>
    <section id="ws-history"></section>
  </div>
  <main id="page-calc" class="page active"></main>
  <main id="page-gto" class="page"></main>
  <main id="page-history" class="page"></main>
  <main id="page-settings" class="page"></main>
  <nav id="tabbar"></nav>`;

const $ = id => document.getElementById(id);
const WS_IDS = ['ws-input', 'ws-result', 'ws-strategy', 'ws-history'];
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
  });
}

/** 桌面信息条：街 · 人数 · 对手数 · 画像 · 快捷键可用 */
function updateDesktopTopbar() {
  $('desktop-topbar').textContent = desktop
    ? `${streetOf(state.board)} · ${state.playerCount}人桌 · ${state.opponents.length}对手 · 🎯画像 · 快捷键可用` : '';
}

function switchPage(id) {
  currentPage = id;
  baseSwitchPage(id);
  if (id === 'gto') renderChartPage($('page-gto'), gtoScenario, s => { gtoScenario = s; switchPage('gto'); });
  if (id === 'history') renderHistoryPage($('page-history'), {
    filter: historyFilter,
    onFilter: f => { historyFilter = f; switchPage('history'); },
    onOpenHand: h => openReviewDialog(h),
  });
  if (id === 'settings') renderSettingsPage($('page-settings'), {
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
        refresh(); // 计算页/桌面信息条按导入后数据重建（须在 switchPage 之前，桌面模式 refresh 会清空 page-settings）
      }
      if (r.ok) switchPage('settings'); // 先重渲使控件反映导入后的 settings
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
      if (!desktop) { // 手机布局：按需重渲历史/设置页；桌面栏由下方 renderDesktopHistory 同步
        switchPage('history');
        switchPage('settings');
      }
      if (desktop) renderDesktopHistory(); // 桌面栏常驻历史，同步刷新
    },
  });
}
renderTabbar($('tabbar'), switchPage);
renderSessionBar($('session-bar'));

/** 记录本手：汇集 state → HandRecord 入库（FIFO），同步对手观察与会话计数，按钮短暂反馈"已记录" */
window.__recordHand = () => {
  const rec = buildHandRecord('未记录', { net: 0, ev: state.result?.evCall ?? 0 });
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
  // 按钮反馈：短暂变"已记录"后还原
  const btn = $('record-hand-btn');
  if (btn) {
    btn.textContent = '✓ 已记录';
    setTimeout(() => { btn.textContent = '✓ 记录本手到历史'; }, 1500);
  }
  if (desktop) renderDesktopHistory(); // 桌面栏常驻历史，同步刷新
};

let resultEl = null, strategyEl = null;

/**
 * 计算页装配（参数化目标容器）。split=false（手机）：9 块顺序写入 pageRoot。
 * split=true（桌面）：1-6 块 + 记录按钮 → inputRoot，result/strategy 容器 → resultRoot/strategyRoot。
 */
function buildCalc(pageRoot, inputRoot, resultRoot, strategyRoot, split) {
  const root = split ? inputRoot : pageRoot;
  const add = tag => { const d = document.createElement(tag); root.appendChild(d); return d; };
  // 1. 桌子画像横幅
  renderTableProfile(add('div'), state.opponents, state.settings.autoTableAdaptation);
  // 2/3. 手牌/公共牌选择器（已选牌互斥置灰）
  const used = [...state.hand, ...state.board];
  renderCardPicker(add('div'), {
    slots: 2, usedCards: used, initial: [...state.hand],
    title: '我的手牌',
    onPick: cards => { setPatch({ hand: cards }); refresh(); },
  });
  renderCardPicker(add('div'), {
    slots: 5, usedCards: used, initial: [...state.board],
    title: '公共牌（3/4/5张随街填写，翻前可不填）',
    onPick: cards => { setPatch({ board: cards }); refresh(); },
  });
  // 4. 位置条
  renderPositionBar(add('div'), patch => { setPatch(patch); refresh(); }, () => state);
  // 5. 对手卡
  renderOpponentCards(add('div'), {
    opponents: state.opponents,
    onAdd: () => { setPatch({ opponents: [...state.opponents, opponentDefaults('TAG')] }); saveOpponents(state.opponents); refresh(); },
    onPreset: () => {
      setPatch({ opponents: state.opponents.map(o => ({ ...o, type: 'TAG', looseness: TYPE_DEFAULTS.TAG.looseness, aggression: TYPE_DEFAULTS.TAG.aggression })) });
      saveOpponents(state.opponents);
      refresh();
    },
    onEdit: o => openOpponentDrawer(o),
  });
  // 6. 底池表单
  renderPotForm(add('div'), v => { setPatch(v); updateResultsOnly(); }); // 只刷结果/策略区，输入区不重建（保焦点）
  // 7. 结果 + 8. 策略卡组（保留容器引用，recalc 完成后就地刷新，不整页重建）
  resultEl = split ? document.createElement('div') : add('div');
  renderResult(resultEl, state.result);
  if (split) resultRoot.appendChild(resultEl);
  strategyEl = split ? document.createElement('div') : add('div');
  renderStrategyPanel(strategyEl, state.strategy, state.board.length);
  if (split) strategyRoot.appendChild(strategyEl);
  // 9. 记录本手（Task 22 接线 window.__recordHand）
  const rec = document.createElement('button');
  rec.id = 'record-hand-btn';
  rec.textContent = '✓ 记录本手到历史';
  rec.style.cssText = 'width:calc(100% - 16px);margin:8px;background:var(--accent);border:none;border-radius:10px;color:#000;font-weight:700;padding:12px;';
  rec.addEventListener('click', () => window.__recordHand?.());
  root.appendChild(rec);
}

/** 按当前模式装配：手机 → page-calc；桌面 → ws-input/result/strategy + 常驻 ws-history */
function renderCalc() {
  if (desktop) {
    for (const id of WS_IDS) $(id).innerHTML = '';
    for (const id of PAGE_IDS) $(id).innerHTML = '';
    buildCalc($('page-calc'), $('ws-input'), $('ws-result'), $('ws-strategy'), true);
    renderDesktopHistory();
  } else {
    for (const id of WS_IDS) $(id).innerHTML = ''; // 手机模式工作台清空，避免重复内容
    $('page-calc').innerHTML = '';
    buildCalc($('page-calc'), null, null, null, false);
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
window.__clearCards = () => { resetPending(); setPatch({ hand: [], board: [] }); refresh(); };
window.__recalc = () => { if (!confirmPartials()) refresh(); }; // 有半选时先确认（onPick 已驱动刷新），无半选才重算

document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return; // 修饰键组合（如 Ctrl+C 复制）不触发快捷键
  if (e.repeat) return; // 长按不连发
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
  if (document.querySelector('dialog[open]')) { resetPending(); return; } // 弹层打开时不抢按键，并清掉残留半选
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
  let editType = o.type ?? 'TAG';
  nameInput.value = o.name ?? '';
  loose.value = o.looseness ?? 35;
  aggr.value = o.aggression ?? 60;
  loose.addEventListener('input', () => { looseV.textContent = loose.value; });
  aggr.addEventListener('input', () => { aggrV.textContent = aggr.value; });
  looseV.textContent = loose.value;
  aggrV.textContent = aggr.value;

  // 4类型快选：点击把两滑条同步为 TYPE_DEFAULTS
  const typesBox = dlg.querySelector('#od-types');
  for (const t of Object.keys(TYPE_DEFAULTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = TYPE_LABEL[t] ?? t;
    b.addEventListener('click', () => {
      loose.value = TYPE_DEFAULTS[t].looseness;
      aggr.value = TYPE_DEFAULTS[t].aggression;
      looseV.textContent = loose.value;
      aggrV.textContent = aggr.value;
      editType = t;
    });
    typesBox.appendChild(b);
  }

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
const saved = loadAll();
if (saved.settings) setPatch({ settings: { ...state.settings, ...saved.settings } });
if (saved.opponents?.length) setPatch({ opponents: saved.opponents });
refresh();
