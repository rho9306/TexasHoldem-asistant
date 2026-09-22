// 对手档案卡列表（设计§5.2/§7：每对手独立卡片，横滑，类型徽章+VPIP观察值）
import { TYPE_DEFAULTS } from '../strategy/ranges.js';

// type=null 表示「默认」对手：不预设四类型标签，数学层按 TAG 中性参数兜底（胜率不变）
export function opponentDefaults(type = null) {
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

/** 类型显示名：null → 「默认」（中性），未知类型原样回显 */
export function typeLabel(type) {
  if (type == null) return '默认';
  return TYPE_LABEL[type] ?? type;
}

export const TYPE_LABEL = {
  'TAG': '紧凶',
  'LAG': '松凶',
  'tight-passive': '紧弱',
  'loose-passive': '松弱',
};

/**
 * renderOpponentCards(container, { opponents, onEdit, onAdd, onPreset, compact })
 *   opponents — 档案数组（含 handsSeen / vpipObs）
 *   compact（批次12）— 手机端紧凑模式：不渲染「一键全员设为紧凶」与「＋」，
 *   加/减对手统一走「🪑 牌桌」页调人数（标题行只留 牌桌/下一轮，省宽度）
 *   VPIP 观察值仅当 handsSeen ≥ 20 且 vpipObs 存在时显示
 */
export function renderOpponentCards(container, { opponents, onEdit, onAdd, onPreset, compact }) {
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'card';
  const quick = compact ? '' : '<span><button id="opp-preset">一键全员设为紧凶</button> <button id="opp-add">＋</button></span>';
  wrap.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;">
      <b>对手档案</b>${quick}</div>
    <div class="opp-list" style="display:flex;overflow-x:auto;gap:8px;padding:8px 0;"></div>`;
  container.appendChild(wrap);

  const list = wrap.querySelector('.opp-list');
  for (const o of opponents) {
    const card = document.createElement('button');
    card.style.cssText = 'min-width:120px;border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text);padding:8px;text-align:left;';
    const vpipTxt = o.handsSeen >= 20 && o.vpipObs != null ? ` · VPIP ${o.vpipObs}%` : '';
    // 承接项(b)：名称为用户输入（抽屉命名后持久化），必须 textContent 构建，防存储型XSS
    const nameEl = document.createElement('b');
    nameEl.textContent = o.name || typeLabel(o.type);
    const subEl = document.createElement('small');
    subEl.textContent = `${typeLabel(o.type)}${vpipTxt}`;
    if (o.type == null) subEl.style.color = 'var(--text-dim)'; // 默认对手徽章用中性灰色，与4类型区分
    card.appendChild(nameEl);
    card.appendChild(document.createElement('br'));
    card.appendChild(subEl);
    card.addEventListener('click', () => onEdit(o));
    list.appendChild(card);
  }
  if (!compact) {
    wrap.querySelector('#opp-add').addEventListener('click', () => onAdd());
    wrap.querySelector('#opp-preset').addEventListener('click', () => onPreset());
  }
}
