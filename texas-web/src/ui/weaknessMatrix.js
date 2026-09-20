// 个人弱点矩阵：位置 × 对手类型 × 纹理 分组命中率（Task 24）
// 样本 <20 手只显示计数不出结论（避免小样本误导）
import { esc } from './dom.js';
export function weaknessGroups(hands) {
  const map = new Map();
  for (const h of hands) {
    if (h.followedAdvice == null) continue;
    // 位置来源：HandRecord 在 preflopScenario 内；测试夹具为顶层字段——两者兼容
    const pos = h.preflopScenario?.heroPosition ?? h.heroPosition ?? '?';
    const oppType = h.opponents?.[0]?.typeSnapshot ?? '?';
    const tex = h.texture || '?';
    const key = `${pos}|${oppType}|${tex}`;
    const g = map.get(key) ?? { position: pos, oppType, textureLabel: tex, count: 0, hits: 0 };
    g.count++; if (h.followedAdvice !== false && (h.result?.net ?? 0) >= 0) g.hits++;
    map.set(key, g);
  }
  return [...map.values()].map(g => ({ ...g, hitRate: g.hits / g.count }));
}

export function renderWeaknessMatrix(container, hands) {
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = '<b>个人弱点矩阵（位置 × 对手类型 × 纹理）</b>';
  const groups = weaknessGroups(hands).sort((a, b) => a.hitRate - b.hitRate);
  for (const g of groups) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;border-top:1px solid var(--border);padding:4px 0;';
    const enough = g.count >= 20;
    row.innerHTML = `<span>${esc(g.position)} × ${esc(g.oppType)} × ${esc(g.textureLabel)}</span>
      <span class="num">${enough ? Math.round(g.hitRate * 100) + '% 命中' : ''} <span class="dim">（${g.count}手${enough ? '' : '，样本<20不出结论'}）</span></span>`;
    el.appendChild(row);
  }
  container.appendChild(el);
}
