import data from './rank-order.json';

// string[169]，强→弱（引擎 vs 均匀随机手 3000 次模拟胜率排序）
export const RANK_ORDER = data.order;

const pos = new Map(RANK_ORDER.map((c, i) => [c, i + 1]));

/** 1..169；未知类名兜底 169 */
export function percentile(handClass) { return pos.get(handClass) ?? 169; }

const combos = c => c.endsWith('s') ? 4 : c.endsWith('o') ? 12 : 6;

/** 按组合数累计达到 widthPct%（1326 基准）的前N个类 */
export function topClasses(widthPct) {
  const target = 1326 * widthPct / 100;
  const out = []; let acc = 0;
  for (const c of RANK_ORDER) {
    if (acc >= target) break;
    out.push(c); acc += combos(c);
  }
  return out;
}
