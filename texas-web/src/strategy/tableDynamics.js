import { TYPE_DEFAULTS } from './ranges.js';

// 观察充分：看过 ≥20 手且记录过 VPIP（批次13）——观察到的真实 VPIP 优先于类型预设。
// 用 !=null 而非 >0（审查回环）：观察 N 手全部不入池的 VPIP=0 是最强紧手信号，不能当"没数据"
const observed = o => o.handsSeen >= 20 && o.vpipObs != null;

export function tableProfile(opponents) {
  if (!opponents || opponents.length < 2) return null;
  // 批次13（用户反馈）：未标定（type=null）且无充分观察的对手不参与画像——
  // 「默认」是"没数据"，不该据此得出「紧凶桌」等结论。胜率数学仍按 TAG 兜底
  // （ranges.maskForOpponent），只有这个展示层结论改为"无信号不判断"。
  const vpipBase = opponents.filter(o => o.type != null || observed(o));
  if (!vpipBase.length) return null;
  const aggrBase = opponents.filter(o => o.type != null); // 凶弱轴只有标注类型才有数据
  const vpipOf = o => observed(o) ? o.vpipObs : (TYPE_DEFAULTS[o.type] ?? TYPE_DEFAULTS.TAG).vpip;
  const aggrOf = o => (TYPE_DEFAULTS[o.type] ?? TYPE_DEFAULTS.TAG).aggression;
  const vpipAvg = vpipBase.reduce((a, o) => a + vpipOf(o), 0) / vpipBase.length;
  const aggrAvg = aggrBase.length ? aggrBase.reduce((a, o) => a + aggrOf(o), 0) / aggrBase.length : 0;
  const loose = vpipAvg > 35, tight = vpipAvg < 25, aggro = aggrAvg >= 50;
  let label = '均衡', adjustments = [];
  if (loose && !aggro) { label = '松弱桌';
    adjustments = ['紧凶化：诈唬类建议频率下调（×0.6）', '薄价值放宽：更多小价值下注', '大注榨取：对跟注站用大尺寸']; }
  else if (tight && !aggro) { label = '紧弱桌';
    adjustments = ['松凶化：偷盲与诈唬频率上调（×1.4）', '对手弃牌率上调：更频繁施压']; }
  else if (tight && aggro) { label = '紧凶桌';
    adjustments = ['尊重反击：3bet频率上调', '防守收窄：面对加注少跟注']; }
  else if (loose && aggro) { label = '松凶桌';
    adjustments = ['控池防守：对抗加注跟注标准收紧', '少诈唬：对手不轻易弃牌']; }
  return { label, vpipAvg: +vpipAvg.toFixed(0), aggrAvg: +aggrAvg.toFixed(0), adjustments, basedOn: vpipBase.length };
}

export function adjustAdvice(adviceLevel, isBluffish, profile, enabled) {
  if (!enabled || !profile || !isBluffish) return '';
  if (profile.label === '松弱桌' && adviceLevel === 'fold') return '桌子画像：松弱桌砍掉该类诈唬';
  if (profile.label === '紧弱桌' && (adviceLevel === 'fold' || adviceLevel === 'neutral')) return '桌子画像：紧弱桌可放宽诈唬';
  if (profile.label === '松凶桌' && adviceLevel !== 'raise') return '桌子画像：松凶桌收紧跟注标准';
  if (profile.label === '紧凶桌' && adviceLevel === 'call') return '桌子画像：紧凶桌防守应收窄';
  return '';
}
