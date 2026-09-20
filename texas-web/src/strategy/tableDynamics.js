import { TYPE_DEFAULTS } from './ranges.js';

export function tableProfile(opponents) {
  if (!opponents || opponents.length < 2) return null;
  const vpipOf = o => {
    const d = TYPE_DEFAULTS[o.type] ?? TYPE_DEFAULTS.TAG;
    return (o.handsSeen >= 20 && o.vpipObs > 0) ? o.vpipObs : d.vpip;
  };
  const aggrOf = o => (TYPE_DEFAULTS[o.type] ?? TYPE_DEFAULTS.TAG).aggression;
  const vpipAvg = opponents.reduce((a, o) => a + vpipOf(o), 0) / opponents.length;
  const aggrAvg = opponents.reduce((a, o) => a + aggrOf(o), 0) / opponents.length;
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
  return { label, vpipAvg: +vpipAvg.toFixed(0), aggrAvg: +aggrAvg.toFixed(0), adjustments };
}

export function adjustAdvice(adviceLevel, isBluffish, profile, enabled) {
  if (!enabled || !profile || !isBluffish) return '';
  if (profile.label === '松弱桌' && adviceLevel === 'fold') return '桌子画像：松弱桌砍掉该类诈唬';
  if (profile.label === '紧弱桌' && (adviceLevel === 'fold' || adviceLevel === 'neutral')) return '桌子画像：紧弱桌可放宽诈唬';
  if (profile.label === '松凶桌' && adviceLevel !== 'raise') return '桌子画像：松凶桌收紧跟注标准';
  if (profile.label === '紧凶桌' && adviceLevel === 'call') return '桌子画像：紧凶桌防守应收窄';
  return '';
}
