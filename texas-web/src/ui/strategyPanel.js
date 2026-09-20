// 策略卡片组（设计§5.4）：全桌画像→动态修正→纹理→c-bet→SPR→MDF→outs→隐含→百分位→GTO对照
// 各卡仅在对应数据存在时渲染；正文均为策略层静态文案，不含用户输入
import { outsToEquity } from '../strategy/mdf.js';

export function renderStrategyPanel(container, s, boardLen = 0) {
  container.innerHTML = '';
  if (!s) return;
  const cards = [];
  if (s.profile) cards.push(['🎯 全桌画像：' + s.profile.label + '（VPIP≈' + s.profile.vpipAvg + '%）', s.profile.adjustments.join('；')]);
  if (s.adjust) cards.push(['桌子动态修正', s.adjust]);
  if (s.texture) cards.push(['牌面纹理：' + s.texture.label, s.texture.features.join(' · ') || '无特征']);
  if (s.cBet) cards.push(['c-bet 建议 ' + Math.round(s.cBet.pct * 100) + '%池（' + s.cBet.freq + '频率）', s.cBet.reason]);
  if (s.spr) cards.push(['SPR ' + s.spr.spr, s.spr.note]);
  if (s.mdf) cards.push(['MDF ' + Math.round(s.mdf.mdf * 100) + '% / α ' + Math.round(s.mdf.alpha * 100) + '%', '防守至少 MDF 比例才不被无成本诈唬击穿']);
  if (s.outs && s.outs.outs > 0) cards.push(['听牌 outs ' + s.outs.outs + '（' + Math.round(outsToEquity(s.outs.outs, boardLen === 3 ? 2 : 1) * 100) + '%）', s.outs.draws.join(' · ')]);
  if (s.implied) cards.push(['隐含赔率：需胜率 ' + Math.round(s.implied.required * 100) + '%', '考虑后手回合对手预期投入 ' + s.implied.future]);
  if (s.percentileText) cards.push(['起手牌百分位', s.percentileText]);
  if (s.gtoTitle) cards.push(['GTO 对照' + (String(s.gtoKind ?? '').startsWith('nash') ? '（短码 Nash 模式）' : ''), s.gtoTitle]);

  for (const [title, body] of cards) {
    const el = document.createElement('div');
    el.className = 'card';
    const b = document.createElement('b');
    b.textContent = title;
    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'dim';
    bodyDiv.style.marginTop = '4px';
    bodyDiv.textContent = body;
    el.appendChild(b);
    el.appendChild(bodyDiv);
    container.appendChild(el);
  }
}
