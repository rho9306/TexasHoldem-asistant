import { describe, it, expect } from 'vitest';
import { renderMatrix } from './handMatrix.js';
import { getPreflopChart } from '../strategy/charts.js';
import { renderChartPage } from './chartViewer.js';

describe('handMatrix', () => {
  it('13×13 格子，AA为绿、72o为灰', () => {
    document.body.innerHTML = '<div id="m"></div>';
    const chart = getPreflopChart({ position: 'BTN', role: 'open', effectiveStackBB: 100 });
    renderMatrix(document.getElementById('m'), { grid: chart.grid });
    const cells = [...document.querySelectorAll('#m [data-cell]')];
    expect(cells.length).toBe(169);
    expect(cells.find(c => c.dataset.cell === 'AA').style.background).toMatch(/34,\s*197,\s*94/);
    expect(cells.find(c => c.dataset.cell === '72o').style.background).toMatch(/107,\s*114,\s*128/);
  });
  it('legend 用 appendChild 追加，不重建容器', () => {
    document.body.innerHTML = '<div id="m2"></div>';
    const chart = getPreflopChart({ position: 'BTN', role: 'open', effectiveStackBoard: 100, effectiveStackBB: 100 });
    const container = document.getElementById('m2');
    renderMatrix(container, { grid: chart.grid, highlight: 'AKs' });
    const cell = container.querySelector('[data-cell="AKs"]');
    expect(cell.style.outline).toContain('2px');
    // 高亮引用保持有效且 legend 存在
    expect(container.querySelector('.legend')).toBeTruthy();
    expect(cell.isConnected).toBe(true);
  });
  it('mini 模式：无文字、无图例', () => {
    document.body.innerHTML = '<div id="m3"></div>';
    const chart = getPreflopChart({ position: 'BTN', role: 'open', effectiveStackBB: 100 });
    renderMatrix(document.getElementById('m3'), { grid: chart.grid, mini: true });
    const c = document.querySelector('#m3 [data-cell="AA"]');
    expect(c.textContent).toBe('');
    expect(document.querySelector('#m3 .legend')).toBeNull();
  });
});

describe('chartViewer', () => {
  it('renderChartPage 输出169格+标题卡', () => {
    document.body.innerHTML = '<div id="gto"></div>';
    const container = document.getElementById('gto');
    renderChartPage(container, null, () => {});
    expect(container.querySelectorAll('[data-cell]').length).toBe(169);
    expect(container.textContent).toContain('开牌');
    expect(container.textContent).toContain('BB');
  });
});
