const RANKS = 'AKQJT98765432'.split('');
const SUITS = [['s','♠'],['h','♥'],['d','♦'],['c','♣']];
const SUIT_KEYS = { '1': 's', '2': 'h', '3': 'd', '4': 'c' };

// ---- 键盘录入（Task 25）----
// 实例注册表：renderCardPicker 每次调用注册一个实例；handleKeyEntry 挑第一个有空位的实例落牌。
// 重渲后旧 wrapper 已脱离文档，prune 时剔除，避免注册表无限增长。
let instances = [];
let pendingRank = null, pendingSuit = null; // 半选状态：rank/suit 顺序不限，凑齐一张即提交

function pruneInstances() {
  instances = instances.filter(i => document.body.contains(i.wrap));
}

/** 把一张牌填入该实例（与点击同逻辑：互斥置灰、满 slots 提交 onPick） */
function pushCard(inst, card) {
  if (inst.picked.includes(card) || inst.picked.length >= inst.slots) return false;
  if (inst.used.includes(card)) return false;
  inst.picked.push(card);
  const b = inst.wrap.querySelector(`[data-card="${card}"]`);
  if (b) b.disabled = true;
  inst.pickedEl.textContent = inst.picked.join(' ');
  if (inst.picked.length === inst.slots) inst.onPick([...inst.picked]);
  return true;
}

/** 半选提示：只在第一个仍有空位的选牌器标题旁显示 */
function updateHints() {
  const label = (pendingRank || pendingSuit)
    ? `键盘: ${(pendingRank || '')}${pendingSuit === 's' ? '♠' : pendingSuit === 'h' ? '♥' : pendingSuit === 'd' ? '♦' : pendingSuit === 'c' ? '♣' : ''}`.trim()
    : '';
  for (const i of instances) { if (i.hintEl) i.hintEl.textContent = ''; }
  const target = instances.find(i => i.picked.length < i.slots);
  if (target && label && target.hintEl) target.hintEl.textContent = label;
}

/** 键盘入口：key 为 rank 字符（A-K…2）或花色数字（1-4）。凑成一张合法牌即填入第一个有空位的选牌器（先手牌后公共牌） */
export function handleKeyEntry(key) {
  pruneInstances();
  if (RANKS.includes(key)) { pendingRank = key; updateHints(); return true; }
  if (SUIT_KEYS[key]) { pendingSuit = SUIT_KEYS[key]; updateHints(); }
  if (!pendingRank || !pendingSuit) return false;
  const card = pendingRank + pendingSuit;
  pendingRank = pendingSuit = null;
  let ok = false;
  for (const inst of instances) {
    if (pushCard(inst, card)) { ok = true; break; }
  }
  updateHints();
  return ok;
}

/** 部分确认：把每个 0<picked<slots 的选牌器立即提交（修复翻牌只选3张无法落库的缺口） */
export function confirmPartials() {
  pruneInstances();
  let any = false;
  for (const inst of instances) {
    if (inst.picked.length > 0 && inst.picked.length < inst.slots) {
      const cards = [...inst.picked];
      inst.picked.length = 0;
      inst.onPick(cards);
      any = true;
    }
  }
  return any;
}

/** 全部重置（选牌器由调用方 refresh 重渲完成置灰恢复；此处仅清半选） */
export function resetPending() {
  pendingRank = pendingSuit = null;
  updateHints();
}

export function renderCardPicker(container, { slots, usedCards = [], initial = [], onPick, title = '' }) {
  const picked = [...initial]; // 回显已提交的牌（只展示/置灰，不触发 onPick）
  const wrap = document.createElement('div');
  wrap.innerHTML = `<div class="card"><div class="dim"><span class="title"></span> <span class="kbd-hint" style="color:var(--accent)"></span></div><div class="picked num"></div><div class="grid"></div></div>`;
  wrap.querySelector('.title').textContent = title;
  const grid = wrap.querySelector('.grid');
  const pickedEl = wrap.querySelector('.picked');
  pickedEl.textContent = picked.join(' ');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(13, 1fr)';
  grid.style.gap = '4px';
  for (const r of RANKS) for (const [s, sym] of SUITS) {
    const card = r + s;
    const b = document.createElement('button');
    b.dataset.card = card;
    b.innerHTML = `${r}<br>${sym}`;
    b.style.minWidth = '30px';
    if (usedCards.includes(card) || picked.includes(card)) { b.disabled = true; b.style.opacity = 0.3; }
    b.addEventListener('click', () => {
      if (picked.includes(card) || picked.length >= slots) return;
      picked.push(card);
      b.disabled = true;
      pickedEl.textContent = picked.join(' ');
      if (picked.length === slots) onPick([...picked]);
    });
    grid.appendChild(b);
  }
  container.appendChild(wrap);
  pruneInstances();
  instances.push({ wrap, pickedEl, picked, slots, used: usedCards, onPick, hintEl: wrap.querySelector('.kbd-hint') });
}
