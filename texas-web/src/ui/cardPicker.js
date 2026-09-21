const RANKS = 'AKQJT98765432'.split('');
const SUITS = [['s','♠'],['h','♥'],['d','♦'],['c','♣']];
const SUIT_KEYS = { '1': 's', '2': 'h', '3': 'd', '4': 'c' };

// ---- 键盘录入（Task 25）----
// 实例注册表：renderCardPicker 每次调用注册一个实例；handleKeyEntry 挑第一个有空位的实例落牌。
// 重渲后旧 wrapper 已脱离文档，prune 时剔除，避免注册表无限增长。
let instances = [];
let pendingRank = null, pendingSuit = null; // 半选状态：rank/suit 顺序不限，凑齐一张即提交

/** 公共牌自动提交判定：一条街=3/4/5张，选满任意一条街的长度即提交（slots=2 手牌仍只在满2张时提交） */
function shouldCommit(slots, len) {
  return slots === 2 ? len === 2 : len === 3 || len === 4 || len === 5;
}

function pruneInstances() {
  instances = instances.filter(i => document.body.contains(i.wrap));
}

/** 把一张牌填入该实例（与点击同逻辑：互斥置灰、按街长自动提交 onPick） */
function pushCard(inst, card) {
  if (inst.picked.includes(card) || inst.picked.length >= inst.slots) return false;
  if (inst.used.includes(card)) return false;
  inst.picked.push(card);
  const b = inst.wrap.querySelector(`[data-card="${card}"]`);
  if (b) b.disabled = true;
  inst.pickedEl.textContent = inst.picked.join(' ');
  if (shouldCommit(inst.slots, inst.picked.length)) inst.onPick([...inst.picked]);
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

/** 部分确认：把每个 0<picked<slots 的选牌器立即提交（键盘快捷键 Enter 入口；点击路径已按街长自动提交） */
export function confirmPartials() {
  pruneInstances();
  let any = false;
  for (const inst of instances) {
    if (inst.picked.length > 0 && inst.picked.length < inst.slots) {
      const cards = [...inst.picked];
      inst.picked.length = 0;
      inst.onPick(cards); // main.js 的 onPick 会 setPatch+refresh 重建选牌器
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
  const picked = [...initial]; // 回显已提交的牌（只展示/置灰，不触发 onPick）；picked 从 initial 起算，逐街补填自然衔接（3→4→5）
  const wrap = document.createElement('div');
  wrap.innerHTML = `<div class="card"><div class="dim"><span class="title"></span> <span class="kbd-hint" style="color:var(--accent)"></span></div><div class="picked num"></div><div class="grid"></div></div>`;
  wrap.querySelector('.title').textContent = title;
  const grid = wrap.querySelector('.grid');
  const pickedEl = wrap.querySelector('.picked');
  pickedEl.textContent = picked.join(' ');
  grid.style.display = 'grid';
  // auto-fill + minmax：按容器宽度自动决定每行列数（手机约8-9键/行），不再横向滚动
  grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(34px, 1fr))';
  grid.style.gap = '4px';
  for (const r of RANKS) for (const [s, sym] of SUITS) {
    const card = r + s;
    const b = document.createElement('button');
    b.dataset.card = card;
    b.innerHTML = `${r}<br>${sym}`;
    const committed = initial.includes(card); // 本选牌器已提交的牌（initial 回显）→ 可点击取消
    const occupied = usedCards.includes(card) && !committed; // 被其他区域占用 → 保持置灰不可点
    if (occupied || picked.includes(card)) b.style.opacity = 0.3;
    if (occupied) b.disabled = true;
    // 点击 = 切换选中：未选→选（达到街长 3/4/5 即自动提交）；已选→移除（若是已提交牌则立即提交缩减集合）
    b.addEventListener('click', () => {
      if (occupied) return;
      if (picked.includes(card)) {
        picked.splice(picked.indexOf(card), 1);
        b.style.opacity = picked.includes(card) ? 0.3 : '';
        pickedEl.textContent = picked.join(' ');
        if (committed) onPick([...picked]); // 取消的是已提交牌 → 立即提交缩减后的集合
        return;
      }
      if (picked.length >= slots) return;
      picked.push(card);
      b.style.opacity = 0.3;
      pickedEl.textContent = picked.join(' ');
      if (shouldCommit(slots, picked.length)) onPick([...picked]); // 选满一条街 → 自动提交
    });
    grid.appendChild(b);
  }
  container.appendChild(wrap);
  pruneInstances();
  instances.push({ wrap, pickedEl, picked, slots, used: usedCards, onPick, hintEl: wrap.querySelector('.kbd-hint') });
}
