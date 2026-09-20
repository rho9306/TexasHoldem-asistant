const RANKS = '23456789TJQKA';
const rankOf = (c) => RANKS.indexOf(c[0]); // 0..12

// 牌面纹理分析（设计§5.4A）：同花性 + 连线性 + 结构 → 干燥/中性/湿润
export function analyzeTexture(board) {
  const features = [];
  const ranks = board.map(rankOf).sort((a, b) => b - a);
  const suits = board.map((c) => c[1]);
  const suitCounts = {};
  for (const s of suits) suitCounts[s] = (suitCounts[s] || 0) + 1;
  const maxSuit = Math.max(0, ...Object.values(suitCounts));
  const suitCount = maxSuit >= 3 ? maxSuit : maxSuit === 2 ? 2 : 0; // 0=无/2=两同花/≥3=单调
  if (suitCount === 2) features.push('两同花');
  if (suitCount >= 3) features.push('单调' + maxSuit + '同花');

  const counts = {};
  for (const r of ranks) counts[r] = (counts[r] || 0) + 1;
  const isPaired = Object.values(counts).some((n) => n >= 2);
  if (isPaired) features.push('对子面');

  // 连线性：desc 排序 uniq 上的连续段计数
  const uniq = [...new Set(ranks)];
  const has = new Set(uniq);
  let maxRun = 0;
  for (let start = 0; start < uniq.length; start++) {
    let run = 1;
    for (let i = start + 1; i < uniq.length; i++) {
      if (uniq[i - 1] - uniq[i] === 1) run++;
      else break;
    }
    maxRun = Math.max(maxRun, run);
  }
  // A可作低牌（5432A）：存在性判断，混大牌也不漏检
  if (has.has(3) && has.has(2) && has.has(1) && has.has(0) && has.has(12)) maxRun = Math.max(maxRun, 4);
  const hasStraightDraw = maxRun >= 3;
  if (maxRun >= 4) features.push('顺子面');
  else if (maxRun === 3) features.push('半连子');

  const highCardRank = ranks[0]; // 12=A
  if (highCardRank >= 11) features.push('高牌面');

  let wet = 0;
  if (suitCount === 2) wet += 1;
  if (suitCount >= 3) wet += 2;
  if (maxRun >= 4) wet += 2;
  else if (maxRun === 3) wet += 1;
  if (isPaired) wet -= 1;
  const label = wet >= 3 ? '湿润' : wet >= 1 ? '中性' : '干燥';
  return { label, features, suitCount, isPaired, highCardRank, hasStraightDraw };
}
