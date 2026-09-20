// 桌子画像横幅（计算页顶部）：≥2对手显示全桌四象限画像；自动适配关闭时"仅显示不修正"
import { tableProfile } from '../strategy/tableDynamics.js';

export function renderTableProfile(container, opponents, autoOn) {
  const p = tableProfile(opponents);
  container.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'card';
  if (!p) {
    el.innerHTML = '<span class="dim">🎯 均衡（对手≥2人后显示全桌画像）</span>';
  } else {
    const color = p.label.includes('松') ? 'var(--orange)' : 'var(--blue)';
    const main = document.createElement('span');
    main.style.color = color;
    main.textContent = `🎯 ${p.label}（VPIP≈${p.vpipAvg}%）`;
    const sub = document.createElement('span');
    sub.className = 'dim';
    sub.textContent = autoOn ? `→ ${p.adjustments[0]}` : '（自动适配已关闭，仅显示不修正）';
    el.appendChild(main);
    el.appendChild(sub);
  }
  container.appendChild(el);
}
