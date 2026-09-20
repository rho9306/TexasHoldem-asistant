import { TYPE_DEFAULTS } from './ranges.js';
// 未来回合预期投入系数（占底池比例）：跟注站敢跟→高隐含赔率
const FUTURE_FACTOR = { 'loose-passive': 1.0, 'LAG': 0.6, 'TAG': 0.5, 'tight-passive': 0.4 };
export function impliedOdds(call, pot, opponentType) {
  const future = pot * (FUTURE_FACTOR[opponentType] ?? 0.5);
  const required = call / (pot + call + future);
  return { future: +future.toFixed(1), required: +required.toFixed(3) };
}
