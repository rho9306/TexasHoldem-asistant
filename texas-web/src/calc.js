// recalc 计算主流程编排：state → 掩码 → WASM 蒙特卡洛 → 决策 → state.result
import { state, setPatch } from './state.js';
import { getCore } from './wasm/pokerCore.js';
import { maskForOpponent } from './strategy/ranges.js';
import { analyzeTexture } from './strategy/texture.js';
import { mdfAlpha, detectOuts } from './strategy/mdf.js';
import { cBetSuggestion, sprInfo } from './strategy/sizing.js';
import { impliedOdds } from './strategy/implied.js';
import { tableProfile, adjustAdvice } from './strategy/tableDynamics.js';
import { actionAdvice } from './strategy/action.js';
import { percentile } from './strategy/rankTable.js';
import { handClassFor, getPreflopChart } from './strategy/charts.js';

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
    // 承接项(a)：输入合法性拦截——非法/跟注超有效筹码时不进引擎
    if (!Number.isFinite(state.pot) || !Number.isFinite(state.call) || state.pot < 0 || state.call < 0) {
      setPatch({ result: { error: '请输入合法的底池与跟注金额' } });
      return;
    }
    if (state.call > Math.min(state.myStack, state.oppStack)) {
      setPatch({ result: { error: '跟注不能超过有效筹码，请修正输入' } });
      return;
    }
    const core = await getCore();

    // 对手位置简化为 MP（设计§5.7 已声明第一版位置简化）
    const role = state.raisesBefore > 0 ? 'defend' : 'open';
    const masks = state.opponents.map(o =>
      maskForOpponent(o, { position: 'MP', role, effectiveStackBB: effectiveStack() / BIG_BLIND }).mask);

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
      // 批次10：行动建议（check/跟/加/弃 + 加注金额），数学同上、规则在 JS 策略层
      const action = actionAdvice({
        call: state.call, pot: state.pot, effStack: effectiveStack(), winRate: eff,
        adviceLevel: d.adviceLevel, street: state.board.length,
        heroPosition: state.heroPosition, limpers: state.limpers,
        adviceStyle: state.settings.adviceStyle,
      });
      setPatch({ result: { ...r, eff, ...d, action } });
    } finally {
      handVec.delete(); boardVec.delete(); oppVec.delete();
    }
  } catch (e) {
    console.error('recalc failed:', e);
    setPatch({ result: { error: '加载计算引擎失败，请刷新' } });
  }
}

/**
 * 策略组装：读 state + state.result → 策略卡片数据包（Task 19）
 * 返回形状：{ texture, cBet, spr, mdf, outs, implied, profile, adjust, percentileText, gtoTitle }
 */
export function buildStrategy() {
  const tex = state.board.length >= 3 ? analyzeTexture(state.board) : null;
  const effStack = effectiveStack();
  const spr = state.pot > 0 && Number.isFinite(state.pot) ? sprInfo(effStack, state.pot) : null;
  const mdf = state.call > 0 && Number.isFinite(state.call) ? mdfAlpha(state.call, state.pot) : null;
  const outs = (state.board.length === 3 || state.board.length === 4) && state.hand.length === 2
    ? detectOuts(state.hand, state.board) : null;
  const oppType = state.opponents[0]?.type ?? 'TAG';
  const implied = outs && outs.outs > 0 && Number.isFinite(state.call)
    ? impliedOdds(state.call, state.pot, oppType) : null;
  const profile = tableProfile(state.opponents);
  // 手牌满2张才做百分位卡（handClassFor 需要2张）
  const heroCls = state.hand.length === 2 ? handClassFor(state.hand) : null;
  const pct = heroCls ? percentile(heroCls) : null;
  const effBB = effStack / BIG_BLIND;   // bigBlind=10 约定
  const gto = getPreflopChart({
    position: state.heroPosition, raiserPosition: '',
    role: state.raisesBefore > 0 ? 'defend' : 'open',
    effectiveStackBB: effBB,
  });
  const isBluffish = state.result ? state.result.eff < 0.4 : false;
  const adjust = adjustAdvice(state.result?.adviceLevel, isBluffish, profile, state.settings.autoTableAdaptation);
  return {
    texture: tex,
    cBet: tex ? cBetSuggestion(tex.label, state.settings.adviceStyle) : null,
    spr, mdf, outs, implied, profile, adjust,
    percentileText: heroCls ? `${heroCls} 排名前 ${pct}/169` : null,
    gtoTitle: gto.title,
    gtoKind: gto.kind,
  };
}
