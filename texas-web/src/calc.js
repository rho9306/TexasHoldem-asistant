// recalc 计算主流程编排：state → 掩码 → WASM 蒙特卡洛 → 决策 → state.result
import { state, setPatch } from './state.js';
import { getCore } from './wasm/pokerCore.js';
import { maskForOpponent } from './strategy/ranges.js';

// 显示与短码判定统一用 10BB 口径（设计约定缺省盲注 5/10，effectiveStackBB = 筹码/大盲）
const BIG_BLIND = 10;

export function effectiveStack(my = state.myStack, opp = state.oppStack) {
  return Math.min(my, opp);
}

export function streetOf(board) {
  switch (board.length) {
    case 0: case 1: case 2: return '翻前';
    case 3: return '翻牌';
    case 4: return '转牌';
    case 5: return '河牌';
    default: return '翻前';
  }
}

/**
 * 主计算：读 state → 对手范围掩码 → WASM 范围化蒙特卡洛 → 决策 → 写 state.result
 * result 形状：{ winRate, tieRate, lossRate, eff, ...decision, rangeStats, error? }
 * 手牌不完整/无对手 → result 置 null（UI 引导由 Task 19 负责），此处不抛错
 */
export async function recalc() {
  try {
    if (state.hand.length !== 2 || state.opponents.length === 0) {
      setPatch({ result: null });
      return;
    }
    const core = await getCore();

    // 对手位置简化为 MP（设计§5.7 已声明第一版位置简化）
    const role = state.raisesBefore > 0 ? 'defend' : 'open';
    const masks = state.opponents.map(o =>
      maskForOpponent(o, { position: 'MP', role, effectiveStackBB: 100 }).mask);

    // embind：字符串/掩码数组需构造 embind 向量对象，用完 delete
    const handVec = new core.VectorString();
    for (const c of state.hand) handVec.push_back(c);
    const boardVec = new core.VectorString();
    for (const c of state.board) boardVec.push_back(c);
    const oppVec = new core.VectorVectorU8();
    for (const m of masks) {
      const v = new core.VectorU8();
      for (let i = 0; i < m.length; i++) v.push_back(m[i]);
      oppVec.push_back(v);
      v.delete();
    }
    let r, d;
    try {
      r = core.calculateEquityV2Js
        ? core.calculateEquityV2Js(handVec, boardVec, oppVec, state.settings.simulations)
        : core.calculateEquityV2(handVec, boardVec, oppVec, state.settings.simulations);
      const eff = r.winRate + r.tieRate * 0.5;
      d = core.evaluateDecision(eff, state.pot, state.call,
        state.pot * 0.5 + state.call, state.settings.adviceStyle);
      setPatch({ result: { ...r, eff, ...d } });
    } finally {
      handVec.delete(); boardVec.delete(); oppVec.delete();
    }
  } catch (e) {
    console.error('recalc failed:', e);
    setPatch({ result: { error: '加载计算引擎失败，请刷新' } });
  }
}
