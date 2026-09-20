// 13×13 手牌矩阵复用组件：GTO页全尺寸 / 策略栏迷你 / 复盘卡（Task 20）
// grid: 'R|r|C|c|F' 13串×13 行；mask: Uint8Array(169) 权重；highlight: 'AKs' 白框高亮
// 类名规则与 charts.js 同约定：col>row 同花、col<row 异花、对角对子两字符
const RANKS = 'AKQJT98765432';
const COLOR = {
  R: 'rgba(34,197,94,1)', r: 'rgba(34,197,94,0.45)', C: 'rgba(234,179,8,1)',
  c: 'rgba(234,179,8,0.45)', F: 'rgba(107,114,128,0.25)',
};
export function renderMatrix(container, { grid, mask, mini = false, highlight = '' }) {
  const wrap = document.createElement('div');
  wrap.style.cssText = mini ? 'width:180px;' : 'width:100%;max-width:420px;margin:0 auto;';
  const g = document.createElement('div');
  g.style.cssText = `display:grid;grid-template-columns:repeat(13,1fr);gap:1px;aspect-ratio:1;font-size:${mini ? 6 : 10}px;`;
  const className = (row, col) => row === col ? RANKS[row] + RANKS[row]
    : col > row ? RANKS[row] + RANKS[col] + 's' : RANKS[col] + RANKS[row] + 'o';
  for (let row = 0; row < 13; row++) for (let col = 0; col < 13; col++) {
    const cls = className(row, col);
    const cell = document.createElement('div');
    cell.dataset.cell = cls;
    cell.style.cssText = 'display:flex;align-items:center;justify-content:center;border-radius:2px;color:#000;';
    if (grid) cell.style.background = COLOR[grid[row][col]] ?? COLOR.F;
    if (mask) {
      const w = mask[row * 13 + col];
      cell.style.background = w === 0 ? 'rgba(107,114,128,0.15)' : `rgba(34,197,94,${w / 100})`;
    }
    cell.textContent = mini ? '' : cls;
    if (cls === highlight) cell.style.outline = '2px solid #fff';
    g.appendChild(cell);
  }
  wrap.appendChild(g);
  if (!mini) {
    // 追加图例（不重建容器 DOM，保持 cell 引用有效）
    const legend = document.createElement('div');
    legend.className = 'legend dim';
    legend.style.cssText = 'text-align:center;font-size:11px;margin-top:4px';
    legend.innerHTML = `<span style="color:#22c55e">■</span>加注 <span style="color:#eab308">■</span>跟注 <span style="color:#6b7280">■</span>弃牌（上三角同花/下三角异花）`;
    wrap.appendChild(legend);
  }
  container.appendChild(wrap);
}
