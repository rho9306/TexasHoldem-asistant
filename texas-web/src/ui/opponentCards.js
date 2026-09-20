// 对手档案卡列表（设计§5.2/§7：每对手独立卡片，横滑，类型徽章+VPIP观察值）
import { TYPE_DEFAULTS } from '../strategy/ranges.js';

export function opponentDefaults(type) {
  const d = TYPE_DEFAULTS[type] ?? TYPE_DEFAULTS.TAG;
  return {
    id: 'opp-' + Math.random().toString(36).slice(2, 8),
    name: '',
    type,
    looseness: d.looseness,
    aggression: d.aggression,
    handsSeen: 0,
    vpipObs: null,
  };
}

const TYPE_LABEL = {
  'TAG': '紧凶',
  'LAG': '松凶',
  'tight-passive': '紧弱',
  'loose-passive': '松弱',
};

/**
 * renderOpponentCards(container, { opponents, onEdit, onAdd, onPreset })
 *   opponents — 档案数组（含 handsSeen / vpipObs）
 *   VPIP 观察值仅当 handsSeen ≥ 20 且 vpipObs 存在时显示
 */
export function renderOpponentCards(container, { opponents, onEdit, onAdd, onPreset }) {
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'card';
  wrap.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;">
      <b>对手档案</b><span><button id="opp-preset">一键全员预设</button> <button id="opp-add">＋</button></span></div>
    <div class="opp-list" style="display:flex;overflow-x:auto;gap:8px;padding:8px 0;"></div>`;
  container.appendChild(wrap);

  const list = wrap.querySelector('.opp-list');
  for (const o of opponents) {
    const card = document.createElement('button');
    card.style.cssText = 'min-width:120px;border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text);padding:8px;text-align:left;';
    const vpipTxt = o.handsSeen >= 20 && o.vpipObs != null ? ` · VPIP ${o.vpipObs}%` : '';
    card.innerHTML = `<b>${o.name || TYPE_LABEL[o.type] || o.type}</b><br><small>${TYPE_LABEL[o.type] ?? o.type}${vpipTxt}</small>`;
    card.addEventListener('click', () => onEdit(o));
    list.appendChild(card);
  }
  wrap.querySelector('#opp-add').addEventListener('click', () => onAdd());
  wrap.querySelector('#opp-preset').addEventListener('click', () => onPreset());
}
