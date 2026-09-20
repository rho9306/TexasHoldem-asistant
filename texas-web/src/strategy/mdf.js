// MDF/α 速查 + outs 检测 + 4-2法则（纯公式，无依赖）
// 口径：同花听与顺子听若共享出牌（如 A♠5♠ + T♠J♠, board 9♠2c → T/J♠ 既算同花也算顺子 outs），
// outs 会重复计 1-2 张——这是已知简化（设计§5.7口径），不做去重。

export function mdfAlpha(bet, pot) {
  const a = bet <= 0 ? 0 : bet / (pot + bet);
  return { mdf: 1 - a, alpha: a };
}

const RANKS = '23456789TJQKA';
const rankOf = (c) => RANKS.indexOf(c[0]);
const suitOf = (c) => c[1];

export function detectOuts(hand, board) {
  const all = [...hand, ...board];
  const draws = [];
  let outs = 0;
  // 同花听（恰4张同花色，含至少1张手牌）
  const bySuit = {};
  for (const c of all) (bySuit[suitOf(c)] ||= []).push(c);
  for (const [, cs] of Object.entries(bySuit)) {
    if (cs.length === 4 && cs.some((c) => hand.includes(c))) {
      outs += 9;
      draws.push('同花听(9 outs)');
    }
  }
  // 顺子听：在13个rank轴上数连续窗口（hi 从 idx4=5-high 到 idx12=A-high）
  const rset = new Set(all.map(rankOf));
  const straightOuts = new Set();
  for (let hi = 4; hi <= 12; hi++) {
    const need = [];
    for (let r = hi - 4; r <= hi; r++) if (!rset.has(r)) need.push(r);
    if (need.length === 1) {
      // 该窗口恰缺1张，其4个花色全为 outs；两头顺=两个窗口各缺1张（Set 去重后共8）
      for (let s = 0; s < 4; s++) straightOuts.add(need[0] * 4 + s);
    }
  }
  if (straightOuts.size >= 8) {
    outs += 8;
    draws.push('两头顺听(8 outs)');
  } else if (straightOuts.size >= 4) {
    outs += 4;
    draws.push('卡顺听(4 outs)');
  }
  // 口袋对追套装
  const [h1, h2] = hand;
  if (rankOf(h1) === rankOf(h2)) {
    const boardSame = board.filter((c) => rankOf(c) === rankOf(h1)).length;
    if (boardSame === 0) {
      outs += 2;
      draws.push('套装听(2 outs)');
    }
  }
  // 后门（仅翻牌3张时，只提示不计 outs）
  if (board.length === 3) {
    if (Object.values(bySuit).some((cs) => cs.length === 3 && cs.some((c) => hand.includes(c)))) {
      draws.push('后门同花(1-2 outs)');
    }
    if (!straightOuts.size && rset.size >= 4) draws.push('后门顺(1-2 outs)');
  }
  return { outs, draws };
}

export function outsToEquity(outs, streetsLeft) {
  return Math.min(1, (outs * (streetsLeft === 2 ? 4 : 2)) / 100);
}
