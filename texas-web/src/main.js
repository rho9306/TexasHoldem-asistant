// 应用入口 + 计算页完整装配（Task 19）
// 顺序：桌子画像横幅 → 手牌picker → 公共牌picker → 位置条 → 对手卡 → 底池表单 → 结果 → 策略卡组 → 记录按钮
import './style.css';
import { state, setPatch } from './state.js';
import { recalc, buildStrategy, streetOf } from './calc.js';
import { renderCardPicker } from './ui/cardPicker.js';
import { renderPotForm } from './ui/potForm.js';
import { renderPositionBar } from './ui/positionBar.js';
import { renderOpponentCards, opponentDefaults, TYPE_LABEL } from './ui/opponentCards.js';
import { renderResult } from './ui/resultPanel.js';
import { renderStrategyPanel } from './ui/strategyPanel.js';
import { renderTableProfile } from './ui/tableProfile.js';
import { TYPE_DEFAULTS } from './strategy/ranges.js';
import { renderTabbar, switchPage } from './ui/tabs.js';

document.getElementById('app').innerHTML = `
  <header id="topbar" class="card"><b>♠ 德扑助手</b> <span id="street-badge" class="num"></span></header>
  <main id="page-calc" class="page active"></main>
  <main id="page-gto" class="page"></main>
  <main id="page-history" class="page"></main>
  <main id="page-settings" class="page"></main>
  <nav id="tabbar"></nav>`;
renderTabbar(document.getElementById('tabbar'), switchPage);
switchPage('calc');

const calcPage = document.getElementById('page-calc');
let resultEl = null, strategyEl = null;

function renderCalc() {
  calcPage.innerHTML = '';
  // 1. 桌子画像横幅
  renderTableProfile(add('div'), state.opponents, state.settings.autoTableAdaptation);
  // 2/3. 手牌/公共牌选择器（已选牌互斥置灰）
  const used = [...state.hand, ...state.board];
  renderCardPicker(add('div'), {
    slots: 2, usedCards: used.filter(c => !state.hand.includes(c)),
    title: '我的手牌',
    onPick: cards => { setPatch({ hand: cards }); refresh(); },
  });
  renderCardPicker(add('div'), {
    slots: 5, usedCards: used.filter(c => !state.board.includes(c)),
    title: '公共牌（3/4/5张随街填写，翻前可不填）',
    onPick: cards => { setPatch({ board: cards }); refresh(); },
  });
  // 4. 位置条
  renderPositionBar(add('div'), patch => { setPatch(patch); refresh(); }, () => state);
  // 5. 对手卡
  renderOpponentCards(add('div'), {
    opponents: state.opponents,
    onAdd: () => { setPatch({ opponents: [...state.opponents, opponentDefaults('TAG')] }); refresh(); },
    onPreset: () => {
      setPatch({ opponents: state.opponents.map(o => ({ ...o, type: 'TAG', looseness: TYPE_DEFAULTS.TAG.looseness, aggression: TYPE_DEFAULTS.TAG.aggression })) });
      refresh();
    },
    onEdit: o => openOpponentDrawer(o),
  });
  // 6. 底池表单
  renderPotForm(add('div'), v => { setPatch(v); refresh(); });
  // 7. 结果 + 8. 策略卡组（保留容器引用，recalc 完成后就地刷新，不整页重建）
  resultEl = add('div');
  renderResult(resultEl, state.result);
  strategyEl = add('div');
  renderStrategyPanel(strategyEl, state.strategy, state.board.length);
  // 9. 记录本手（Task 22 接线 window.__recordHand）
  const rec = document.createElement('button');
  rec.textContent = '✓ 记录本手到历史';
  rec.style.cssText = 'width:calc(100% - 16px);margin:8px;background:var(--accent);border:none;border-radius:10px;color:#000;font-weight:700;padding:12px;';
  rec.addEventListener('click', () => window.__recordHand?.());
  calcPage.appendChild(rec);

  function add(tag) { const d = document.createElement(tag); calcPage.appendChild(d); return d; }
}

/** 交互入口：重绘计算页 → 引擎计算 → 策略组装 → 刷新结果/策略区（订阅不回调，避免死循环） */
export function refresh() {
  renderCalc();
  document.getElementById('street-badge').textContent = streetOf(state.board);
  recalc().then(() => {
    setPatch({ strategy: state.result?.error ? null : buildStrategy() });
    renderResult(resultEl, state.result);
    renderStrategyPanel(strategyEl, state.strategy, state.board.length);
  }).catch(() => { /* recalc 内部已兜底 error result */ });
}

// 订阅不做页面重绘——重绘一律由交互显式调 refresh()，防止 setPatch→render→setPatch 死循环
// subscribe(() => {});

/** 对手编辑抽屉：<dialog> 名称 + 4类型快选 + 松紧/凶弱双滑条 + 删除/保存 */
export function openOpponentDrawer(o) {
  document.getElementById('opp-drawer')?.remove();
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
    close();
    refresh();
  });
  dlg.querySelector('#od-save').addEventListener('click', () => {
    const form = { type: editType, name: nameInput.value.trim(), looseness: +loose.value, aggression: +aggr.value };
    setPatch({ opponents: state.opponents.map(x => x.id === o.id ? { ...x, ...form } : x) });
    close();
    refresh();
  });
  function close() { try { dlg.close?.(); } catch { /* ignore */ } dlg.remove(); }

  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
}

refresh();
