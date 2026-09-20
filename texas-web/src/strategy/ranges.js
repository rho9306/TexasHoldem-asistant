// 对手类型/滑条/观察值 → 169格范围掩码（策略层与引擎的桥梁，设计§5.2）
// 图表为骨架 + 类型系数定宽：沿 RANK_ORDER 只收基础表内的类，累计组合数到目标宽度
import { getPreflopChart, gridCell } from './charts.js';
import { RANK_ORDER } from './rankTable.js';

export const TYPE_DEFAULTS = {
  'TAG':           { looseness: 35, aggression: 60, vpip: 22, factor: 0.8 },
  'LAG':           { looseness: 62, aggression: 75, vpip: 38, factor: 1.3 },
  'tight-passive': { looseness: 25, aggression: 20, vpip: 15, factor: 0.6 },
  'loose-passive': { looseness: 72, aggression: 25, vpip: 42, factor: 1.5 },
};

const RANKS = 'AKQJT98765432';
const combos = c => c.endsWith('s') ? 4 : c.endsWith('o') ? 12 : 6;
const RANK_INDEX = new Map(RANK_ORDER.map((c, i) => [c, i]));

// 与 charts.js 同约定：类名高牌在前，对子两字符（如 AA）
function classOf(i) {
  const r = Math.floor(i / 13), c = i % 13;
  if (r === c) return RANKS[r] + RANKS[r];
  return c > r ? RANKS[r] + RANKS[c] + 's' : RANKS[c] + RANKS[r] + 'o';
}

/** 松紧滑条 0-100 → 目标 VPIP% 10-60 */
export function loosenessToVpip(looseness) { return Math.round(10 + looseness * 0.5); }

/** 基础表内视为"在范围内"的格值：open 只收 R/r；defend 收 R/r/C/c */
function inBase(action, role) {
  if (action === 'R' || action === 'r') return true;
  return role === 'defend' && (action === 'C' || action === 'c');
}

/**
 * opp: {type, looseness, handsSeen?, vpipObs?}
 * ctx: {position, role:'open'|'defend', raiserPosition?, effectiveStackBB?}
 * 返回 {mask: Uint8Array(169), widthPct}
 * 目标宽度三层（优先级从高到低）：
 *   1. 观察值（handsSeen≥20 且 vpipObs>0）：绝对截取 vpipObs%
 *   2. 滑条偏离类型默认：绝对截取 loosenessToVpip(looseness)%
 *   3. 仅类型：基础表组合数宽度 × factor，clamp 8-60%
 */
export function maskForOpponent(opp, ctx) {
  const def = TYPE_DEFAULTS[opp.type] ?? TYPE_DEFAULTS['TAG'];

  let targetWidth;
  if ((opp.handsSeen ?? 0) >= 20 && opp.vpipObs > 0) {
    targetWidth = opp.vpipObs;                                  // 观察值：绝对
  } else if (opp.looseness != null && opp.looseness !== def.looseness) {
    targetWidth = loosenessToVpip(opp.looseness);               // 滑条：绝对
  } else {
    targetWidth = def.vpip * def.factor;                        // 仅类型：系数
  }
  targetWidth = Math.min(60, Math.max(8, targetWidth));

  const chart = ctx.role === 'defend'
    ? getPreflopChart({ position: ctx.position, raiserPosition: ctx.raiserPosition, role: 'defend', effectiveStackBB: ctx.effectiveStackBB ?? 100 })
    : getPreflopChart({ position: ctx.position, role: 'open', effectiveStackBB: ctx.effectiveStackBB ?? 100 });

  const base = new Uint8Array(169);
  for (let i = 0; i < 169; i++) {
    if (inBase(gridCell(chart.grid, classOf(i)), ctx.role)) base[i] = 1;
  }

  const mask = new Uint8Array(169);
  let acc = 0;
  const target = 1326 * targetWidth / 100;
  for (const cls of RANK_ORDER) {
    if (acc >= target) break;
    const i = RANK_INDEX.get(cls);
    if (base[i]) { mask[i] = 100; acc += combos(cls); }
  }
  return { mask, widthPct: +(acc / 1326 * 100).toFixed(1) };
}
