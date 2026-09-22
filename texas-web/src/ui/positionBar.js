// 位置条 + 翻前场景 stepper（设计§4.2：位置列表随人数2-9自动增减）
// 位置表：前排位置随人数增加，动作位 BTN/SB/BB 固定在后

const TABLE = {
  2: ['BTN', 'SB'],
  3: ['BTN', 'SB', 'BB'],
  4: ['CO', 'BTN', 'SB', 'BB'],
  5: ['MP', 'CO', 'BTN', 'SB', 'BB'],
  6: ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'],
  7: ['UTG', 'UTG1', 'MP', 'CO', 'BTN', 'SB', 'BB'],
  8: ['UTG', 'UTG1', 'MP', 'MP1', 'CO', 'BTN', 'SB', 'BB'],
  9: ['UTG', 'UTG1', 'UTG2', 'MP', 'MP1', 'CO', 'BTN', 'SB', 'BB'],
};

export function positionsFor(playerCount) {
  playerCount = Math.round(playerCount);   // 承接项(c)：外部来源可能传小数
  return TABLE[Math.min(9, Math.max(2, playerCount))];
}

/**
 * renderPositionBar(container, onChange, getValues?)
 *   onChange(patch)      — chip 点击 → {heroPosition}；stepper → {raisesBefore|limpers}
 *   getValues()          — 可选，返回当前 {raisesBefore, limpers}（缺省按 0 处理）
 * 返回 { renderChips(positions, current), renderValues(vals) } 供装配层刷新
 */
export function renderPositionBar(container, onChange, getValues) {
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'card';
  wrap.innerHTML = `<div class="pos-chips" style="display:flex;flex-wrap:wrap;gap:6px;"></div>
    <div class="scenarios" style="display:flex;gap:16px;margin-top:8px;">
      <label>行动前加注 <button class="stp" data-k="raisesBefore" data-d="-1">−</button><b class="num" id="rb-val"></b><button class="stp" data-k="raisesBefore" data-d="1">＋</button></label>
      <label>平跟人数 <button class="stp" data-k="limpers" data-d="-1">−</button><b class="num" id="lp-val"></b><button class="stp" data-k="limpers" data-d="1">＋</button></label>
    </div>`;
  container.appendChild(wrap);

  const chips = wrap.querySelector('.pos-chips');
  const renderChips = (positions, current) => {
    chips.innerHTML = '';
    for (const p of positions) {
      const b = document.createElement('button');
      b.textContent = p;
      b.className = p === current ? 'chip active' : 'chip';
      b.style.cssText = 'border:1px solid var(--border);border-radius:999px;padding:4px 12px;background:' +
        (p === current ? 'var(--accent)' : 'var(--bg)') + ';color:' + (p === current ? '#000' : 'var(--text-dim)');
      b.addEventListener('click', () => onChange({ heroPosition: p }));
      chips.appendChild(b);
    }
  };

  const cur = k => (getValues?.() ?? {})[k] ?? 0;
  // 上限跟随实际人数（批次11，用户反馈：2/3 封顶不合理）：除英雄外全员 = playerCount-1；
  // getValues 未带 playerCount 时按默认 6 人桌（min 2 max 9）
  const playerCount = () => {
    const n = +(getValues?.() ?? {}).playerCount;
    return Number.isFinite(n) ? Math.min(9, Math.max(2, Math.round(n))) : 6;
  };
  const hiFor = () => Math.max(1, playerCount() - 1);
  const renderValues = vals => {
    // 显示值也 clamp（审查 M1）：人数调小后存量超限值不再误导显示
    wrap.querySelector('#rb-val').textContent = Math.min(hiFor(), vals?.raisesBefore ?? cur('raisesBefore'));
    wrap.querySelector('#lp-val').textContent = Math.min(hiFor(), vals?.limpers ?? cur('limpers'));
  };
  renderValues();

  wrap.addEventListener('click', e => {
    const b = e.target.closest('.stp');
    if (!b) return;
    const k = b.dataset.k, d = +b.dataset.d;
    onChange({ [k]: Math.min(hiFor(), Math.max(0, cur(k) + d)) });
  });

  return { renderChips, renderValues };
}
