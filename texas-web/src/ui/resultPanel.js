// 结果仪表盘：WIN RATE 大数字 + 优势进度条 + EV双卡 + 建议横幅（含错误态/未输入引导态）
// 批次10：横幅升级为结构化行动建议（动作+金额+理由，来自 strategy/action.js）
import { ACTION_LABEL } from '../strategy/action.js';
const fmt = (v, digits = 1) => (typeof v === 'number' && isFinite(v) ? v.toFixed(digits) : '--');

export function renderResult(container, result) {
  container.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'card';

  if (!result) {
    el.innerHTML = '<div class="dim">选好手牌后自动计算</div>';
    container.appendChild(el);
    return;
  }
  if (result.error) {
    el.innerHTML = `<div style="color:var(--danger)">${result.error}</div>`;
    container.appendChild(el);
    return;
  }

  const eff = typeof result.eff === 'number' && isFinite(result.eff) ? result.eff : NaN;
  const pct = isFinite(eff) ? (eff * 100).toFixed(1) : '--';
  el.innerHTML = `
    <div style="font-size:12px;color:var(--text-dim)">WIN RATE（含平局×½）</div>
    <div class="num" style="font-size:40px;color:${eff >= 0.5 ? 'var(--accent)' : 'var(--text)'}">${pct}%</div>
    <div style="height:8px;background:var(--bg);border-radius:4px;overflow:hidden">
      <div style="width:${isFinite(eff) ? pct : 0}%;height:100%;background:var(--accent)"></div></div>
    <div style="display:flex;gap:8px;margin-top:8px">
      <div class="card" style="flex:1">跟注EV<div class="num">${fmt(result.evCall)}</div></div>
      <div class="card" style="flex:1">加注EV<div class="num">${fmt(result.evRaise)}</div></div>
    </div>
    <div style="margin-top:8px;padding:10px;border-radius:8px;background:var(--bg);border:1px solid var(--border)">
      ${adviceLine(result)}
    </div>`;
  container.appendChild(el);
}

/** 建议行：批次10 结构化行动建议（动作+金额+理由）；无 action 数据时回退引擎短句 */
function adviceLine(result) {
  const eq = `<span class="num dim">需胜率 ${fmt(result.requiredEquity != null ? result.requiredEquity * 100 : NaN)}%</span>`;
  const a = result.action;
  if (!a) return `建议：<b>${result.advice ?? '--'}</b> ${eq}`;
  const label = ACTION_LABEL[a.action] ?? a.action;
  const amt = a.amount != null ? ` <span class="num" style="font-size:18px">≈${a.amount}</span>` : '';
  const note = a.amountNote ? ` <span class="dim">（${a.amountNote}）</span>` : '';
  return `建议：<b style="color:var(--accent)">${label}</b>${amt}${note} ${eq}<br><small class="dim">💡 ${a.reason}</small>`;
}
