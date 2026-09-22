// 历史页：顶部统计 + EV双曲线 + 筛选条 + 会话分组折叠列表 + 弱点矩阵（Task 24）
import { loadAll } from '../storage.js';
import { cumulativeSeries, renderEvCurve } from './evCurve.js';
import { renderWeaknessMatrix } from './weaknessMatrix.js';
import { esc } from './dom.js';

export const isDeviated = h => h.followedAdvice === false;
export const isLoss = h => (h.result?.net ?? 0) < 0;

export function renderHistoryPage(container, { filter = 'all', onFilter, onOpenHand, onDeleteSession }) {
  const { hands, sessions } = loadAll();
  container.innerHTML = '';
  // 顶部统计：累计盈亏
  const total = hands.reduce((a, h) => a + (h.result?.net ?? 0), 0);
  const stat = document.createElement('div');
  stat.className = 'card';
  stat.innerHTML = `<b>累计盈亏</b> <span class="num" style="font-size:24px;color:${total >= 0 ? 'var(--accent)' : 'var(--danger)'}">${total > 0 ? '+' : ''}${total.toFixed(1)}</span>`;
  container.appendChild(stat);
  renderEvCurve(container, hands);
  // 筛选条（PLAN-FIX：简报对字符串数组解构会得到 k='a'，改为 split(':')）
  const bar = document.createElement('div');
  bar.className = 'card';
  bar.innerHTML = ['all:全部', 'dev:只看偏离手', 'loss:只看亏损手', 'preflop:翻前', 'flop:翻牌', 'turn:转牌', 'river:河牌']
    .map(s => { const [k, t] = s.split(':'); return `<button data-f="${k}" class="chip">${t}</button>`; }).join(' ');
  container.appendChild(bar);
  bar.addEventListener('click', e => { const b = e.target.closest('button'); if (b) onFilter(b.dataset.f); });
  const filtered = hands.filter(h => filter === 'all' || (filter === 'dev' && isDeviated(h)) ||
    (filter === 'loss' && isLoss(h)) || h.street === filter);
  // 会话分组（折叠；无会话的手归入"未分组"）
  const groups = [...sessions.map(s => ({ name: s.name, date: s.date, id: s.id })),
    ...(filtered.some(h => !sessions.some(s => s.id === h.sessionId)) ? [{ name: '未分组', date: '', id: '' }] : [])];
  for (const s of groups) {
    const group = filtered.filter(h => (h.sessionId ?? '') === s.id);
    if (!group.length) continue;
    const det = document.createElement('details');
    det.className = 'card';
    const summary = document.createElement('summary');
    summary.innerHTML = `<b></b> · ${esc(s.date)} · ${group.length}手`;
    summary.querySelector('b').textContent = s.name; // 会话名为用户输入，textContent 防注入
    if (s.id && onDeleteSession) { // 删除会话（批次11）；「未分组」是兜底桶不可删
      const del = document.createElement('button');
      del.textContent = '🗑 删除';
      del.style.cssText = 'float:right;margin-left:8px;min-height:36px;padding:2px 10px;';
      del.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation(); // 不展开/收起折叠组
        // 确认文案用未筛选总数（审查 M2）：筛选视图下 group.length 会少报实际删除规模
        const total = hands.filter(h => (h.sessionId ?? '') === s.id).length;
        if (confirm(`删除会话「${s.name}」及其全部 ${total} 手记录？`)) onDeleteSession(s.id);
      });
      summary.appendChild(del);
    }
    det.appendChild(summary);
    for (const h of group) {
      const item = document.createElement('button');
      item.style.cssText = 'display:block;width:100%;text-align:left;background:var(--bg);border:none;border-top:1px solid var(--border);color:var(--text);padding:8px;min-height:44px;';
      const net = h.result?.net ?? 0;
      // 手牌为系统生成的牌串，action 可能含用户输入——用 textContent 分段构建
      const handSpan = document.createElement('span');
      handSpan.className = 'num';
      handSpan.textContent = h.hand.join(' ');
      item.appendChild(handSpan);
      item.appendChild(document.createTextNode(` ${h.street ?? ''} ${isDeviated(h) ? '⚠偏离' : ''} `));
      const netSpan = document.createElement('span');
      netSpan.className = 'num';
      netSpan.style.cssText = `float:right;color:${net >= 0 ? 'var(--accent)' : 'var(--danger)'}`;
      netSpan.textContent = `${net > 0 ? '+' : ''}${net}`;
      item.appendChild(netSpan);
      item.addEventListener('click', () => onOpenHand(h));
      det.appendChild(item);
    }
    container.appendChild(det);
  }
  renderWeaknessMatrix(container, hands);
  return { total, series: cumulativeSeries(hands) }; // 便于测试/调用方取数
}
