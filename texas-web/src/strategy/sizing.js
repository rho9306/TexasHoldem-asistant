export function cBetSuggestion(textureLabel, adviceStyle = 'standard') {
  const bias = adviceStyle === 'aggressive' ? 0.08 : adviceStyle === 'conservative' ? -0.08 : 0;
  if (textureLabel === '干燥') return { pct: 0.33 + bias, freq: '高', reason: '干燥面小注高频率：让空气牌便宜弃权、差牌付钱' };
  if (textureLabel === '湿润') return { pct: 0.66 + bias, freq: '低', reason: '湿润面大注低频率：价值+半诈唬，给听牌错误赔率' };
  return { pct: 0.5 + bias * 0.5, freq: '中', reason: '中性面中等尺寸均衡下注' };
}

export function sprInfo(effectiveStack, pot) {
  const spr = pot > 0 ? effectiveStack / pot : Infinity;
  // 按 toFixed(2) 后的值分档（与返回值一致）；SPR 恰为 8 归入高SPR档（测试约定）
  const sprR = +spr.toFixed(2);
  const category = sprR <= 4 ? '≤4' : sprR < 8 ? '5-8' : '>8';
  const note = sprR <= 4 ? '低SPR：顶对以上可倾向打光' : sprR > 8 ? '高SPR：弱顶对注意控池' : '中SPR：正常尺度决策';
  return { spr: sprR, category, note };
}

export function riverValueBluffRatio(betPct) {
  if (betPct <= 0.4) return '3:1';
  if (betPct <= 0.8) return '2:1';
  return '1:1';
}

export function defendAdvice(faceBetPct, winRate) {
  if (faceBetPct <= 0.5) {
    return winRate >= 0.25 ? { action: '放宽跟注', reason: '面对小注，MDF要求防守大多数范围' }
                           : { action: '考虑弃牌', reason: '范围太弱，即使小注也难以继续' };
  }
  if (faceBetPct > 1.0) {
    return winRate >= 0.55 ? { action: '仅强牌继续', reason: '超池下注只跟强牌' }
                           : { action: '倾向弃牌', reason: '超池需极强范围才能防守' };
  }
  return winRate >= 0.35 ? { action: '标准防守', reason: '常规尺寸按底池赔率与MDF决策' }
                         : { action: '收紧跟注', reason: '胜率不足，选择性强防' };
}
