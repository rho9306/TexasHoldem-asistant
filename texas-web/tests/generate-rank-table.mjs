// 用法：npm run gen:rank（先用 em++ 构建.node版 WASM 到 .engine-test/rankgen.cjs，再运行本脚本）
// 输出 src/strategy/rank-order.json：按引擎胜率降序的169个类名
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const { default: createPokerCore } = await import(pathToFileURL(join(here, '../.engine-test/rankgen.cjs')).href);
const core = await createPokerCore();

const ranks = 'AKQJT98765432'.split('');
const classes = [];
for (let hi = 0; hi < 13; hi++) for (let lo = hi; lo < 13; lo++) {
  if (hi === lo) { classes.push(ranks[hi] + ranks[lo]); continue; }
  // 命名与引擎 HandRange::className 一致：大 rank 在前（AKs/AKo）
  classes.push(ranks[hi] + ranks[lo] + 's');
  classes.push(ranks[hi] + ranks[lo] + 'o');
}
const card = (r, s) => ranks[r] + 'shdc'[s];
function sampleCards(cls) {
  const r1 = ranks.indexOf(cls[0]), r2 = ranks.indexOf(cls[1]);
  if (cls.length === 2) return [card(r1, 0), card(r1, 1)];   // pair
  if (cls[2] === 's') return [card(r1, 0), card(r2, 0)];     // suited
  return [card(r1, 0), card(r2, 1)];                          // offsuit
}

// 复用向量，只改 hand 内容，防泄漏
const hand = new core.VectorString();
const board = new core.VectorString();
const uniform = new core.VectorU8();
for (let i = 0; i < 169; i++) uniform.push_back(100);
const opps = new core.VectorVectorU8();
opps.push_back(uniform);

const fn = core.calculateEquityV2Js ?? core.calculateEquityV2;
const rows = [];
for (const cls of classes) {
  const [c1, c2] = sampleCards(cls);
  if (hand.size() === 0) { hand.push_back(c1); hand.push_back(c2); }
  else { hand.set(0, c1); hand.set(1, c2); }
  const r = fn(hand, board, opps, 3000);
  rows.push({ cls, eq: r.winRate + r.tieRate * 0.5 });
}
hand.delete(); board.delete(); uniform.delete(); opps.delete();

rows.sort((a, b) => b.eq - a.eq);
const outDir = join(here, '../src/strategy/');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'rank-order.json'),
  JSON.stringify({
    generatedAt: '2026-09-20',
    source: 'engine vs uniform 3000 sims (rankgen node build)',
    order: rows.map(r => r.cls),
  }, null, 1));
console.log('wrote rank-order.json,', rows.length, 'classes');
console.log('top12:', rows.slice(0, 12).map(r => r.cls).join(','));
console.log('bottom5:', rows.slice(-5).map(r => r.cls).join(','));
