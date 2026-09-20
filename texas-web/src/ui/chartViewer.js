// GTO 图标签页：场景选择条 → 翻前图表 → 13×13 热力图（Task 20）
import { getPreflopChart } from '../strategy/charts.js';
import { renderMatrix } from './handMatrix.js';
import { state } from '../state.js';

const POS = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];

export function renderChartPage(container, scenario, onScenarioChange) {
  container.innerHTML = '';
  // 默认场景跟随计算页 state（用户选择后以 scenario 为准）
  const s = scenario ?? {
    position: state.heroPosition || 'BTN',
    role: state.raisesBefore > 0 ? 'defend' : 'open',
    effectiveStackBB: 100, raiserPosition: 'CO',
  };
  const bar = document.createElement('div');
  bar.className = 'card';
  bar.innerHTML = `<div style="display:flex;gap:6px;flex-wrap:wrap">
    ${['open', 'defend'].map(r => `<button data-role="${r}" class="chip">${r === 'open' ? '开牌' : '防守'}</button>`).join('')}
    ${POS.map(p => `<button data-pos="${p}" class="chip">${p}</button>`).join('')}
    <select id="eff" class="num"><option>100</option><option>15</option><option>10</option><option>6</option></select>BB
  </div>`;
  container.appendChild(bar);
  bar.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const next = { ...s };
    if (b.dataset.role) next.role = b.dataset.role;
    if (b.dataset.pos) next.position = b.dataset.pos;
    onScenarioChange(next);
  });
  bar.querySelector('#eff').addEventListener('change', e => onScenarioChange({ ...s, effectiveStackBB: +e.target.value }));
  const chart = getPreflopChart(s);
  const title = document.createElement('div');
  title.className = 'card';
  title.innerHTML = `<b>${chart.title}</b><div class="dim">${chart.note}</div>`;
  container.appendChild(title);
  const holder = document.createElement('div');
  holder.className = 'card';
  container.appendChild(holder);
  renderMatrix(holder, { grid: chart.grid });
}
