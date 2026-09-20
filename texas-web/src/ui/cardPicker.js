const RANKS = 'AKQJT98765432'.split('');
const SUITS = [['s','♠'],['h','♥'],['d','♦'],['c','♣']];
export function renderCardPicker(container, { slots, usedCards = [], onPick, title = '' }) {
  const picked = [];
  const wrap = document.createElement('div');
  wrap.innerHTML = `<div class="card"><div class="dim">${title}</div><div class="picked num"></div><div class="grid"></div></div>`;
  const grid = wrap.querySelector('.grid');
  const pickedEl = wrap.querySelector('.picked');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(13, 1fr)';
  grid.style.gap = '4px';
  for (const r of RANKS) for (const [s, sym] of SUITS) {
    const card = r + s;
    const b = document.createElement('button');
    b.dataset.card = card;
    b.innerHTML = `${r}<br>${sym}`;
    b.style.minWidth = '30px';
    if (usedCards.includes(card)) { b.disabled = true; b.style.opacity = 0.3; }
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
}
