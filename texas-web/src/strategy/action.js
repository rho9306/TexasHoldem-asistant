// 行动建议（批次10，用户反馈：轮到我时该 check/跟/加/弃 + 加注金额）
// 分工原则：胜率/EV 数学在 WASM 引擎；此处只做查表与简单公式（纯函数、好改好测）。
// 口径为教学通识简化（2.5BB open、3×下注加注、胜率分档下注），非 GTO 求解。

// 风格偏置：激进放宽进攻阈值、保守收紧（与设置页「建议风格」联动）。
// 注：偏置 0.03 与引擎 evaluateDecision 的 0.02 数值不同属有意设计——本模块胜率分档更粗，
// 需要稍大偏置才能跨档；方向一致，勿当 bug「统一」。
const BIAS = { conservative: 0.03, standard: 0, aggressive: -0.03 };
// 大盲面额（用户单位/1BB）：项目口径盲注 5/10 → 1BB=10 单位（与 calc.js BIG_BLIND 一致）；
// calc.js 显式传入，独立使用本模块时可覆盖（如 1 单位=1BB 的口径传 1）
const DEFAULT_BB = 10;

export const ACTION_LABEL = { check: '过牌', bet: '下注', call: '跟注', raise: '加注', fold: '弃牌', allin: '全压' };

/**
 * @param {object} p
 *   call 需跟注金额（0=无人下注，轮到英雄先行动）  pot 当前底池（面对下注时含对方下注）
 *   effStack 有效筹码 min(my,opp)  winRate 引擎胜率（含平局×½）  adviceLevel 引擎决策档
 *   street 公共牌张数  heroPosition  limpers 平跟人数  adviceStyle 建议风格
 * @returns {{action, amount?, amountNote?, reason} | null} 金额单位与用户输入一致（教学口径 1 单位=1BB）
 */
export function actionAdvice(p) {
  const { call, pot, effStack, winRate } = p;
  if (!Number.isFinite(winRate) || !Number.isFinite(pot) || !Number.isFinite(call) || !Number.isFinite(effStack)) return null;
  return call > 0 ? facingBet(p) : noBet({ bb: DEFAULT_BB, ...p });
}

/** 面对下注：引擎已算胜率差与 EV 对比，此处转译为动作 + 加注金额 */
function facingBet({ call, pot, effStack, adviceLevel }) {
  if (adviceLevel === 'raise') {
    const raiseTo = Math.round(2 * call + pot); // = 3×下注 + 前池（pot 已含对方下注）
    if (raiseTo >= effStack) return { action: 'allin', amount: effStack, amountNote: '全压', reason: '加注将超过有效筹码，直接全压' };
    return { action: 'raise', amount: raiseTo, amountNote: '3×下注+底池', reason: '胜率显著高于所需，加注扩大底池' };
  }
  if (call >= effStack) {
    if (adviceLevel === 'fold') return { action: 'fold', reason: '胜率远低于所需，即使全压跟注也不利' };
    return { action: 'allin', amount: effStack, amountNote: '跟注全压', reason: '跟注即全压：底池赔率尚可，跟住全压' };
  }
  if (adviceLevel === 'fold') return { action: 'fold', reason: '胜率低于跟注所需，弃牌止损' };
  return { action: 'call', reason: adviceLevel === 'neutral'
    ? '胜率与底池赔率接近，倾向跟注看下一张'
    : '胜率高于底池赔率要求，跟注有利' };
}

/** 无人下注：翻前 open 口径 / 翻后胜率分档下注。金额统一为用户单位（bb=用户单位/1BB） */
function noBet({ pot, winRate, street, heroPosition, limpers = 0, adviceStyle = 'standard', bb }) {
  const bias = BIAS[adviceStyle] ?? 0;
  if (street === 0) {
    if (winRate >= 0.55 + bias) {
      const amount = Math.round((2.5 + limpers) * bb * 10) / 10; // 2.5BB + 每跛入者+1BB
      return { action: 'raise', amount, amountNote: '2.5BB+每跛入+1BB', reason: '翻前强牌：主动加注建立底池' };
    }
    if (winRate >= 0.40 + bias) {
      return inBlinds(heroPosition)
        ? { action: 'check', reason: '已投盲注：中等牌力免费看翻牌' }
        : { action: 'call', amount: bb, amountNote: '平跟1BB', reason: '边缘牌力：平跟看翻牌，低成本入池' };
    }
    return inBlinds(heroPosition)
      ? { action: 'check', reason: '已投盲注：免费看翻牌，不白弃' }
      : { action: 'fold', reason: '翻前弱牌：弃牌等待更好机会' };
  }
  if (pot <= 0) return { action: 'check', reason: '底池信息未填：先在⑤补填底池，才能给出下注尺寸建议' };
  if (winRate >= 0.65 + bias) return bet(pot, 0.66, '强牌：大注做价值，给听牌错误赔率');
  if (winRate >= 0.50 + bias) return bet(pot, 0.5, '中强牌：半池标准价值下注，薄价值+保护');
  if (winRate >= 0.33 + bias) return { action: 'check', reason: '中等牌力：过牌看免费牌，控制底池' };
  return street >= 5
    ? { action: 'check', reason: '河牌无摊位价值：过牌放弃，面对下注再评估' }
    : { action: 'check', reason: '牌力不足：过牌，寄望免费改进或对手让牌' };
}

function bet(pot, pct, reason) {
  const amount = Math.round(pot * pct * 10) / 10;
  return { action: 'bet', amount, amountNote: `${Math.round(pct * 100)}%池`, reason };
}

function inBlinds(p) { return p === 'SB' || p === 'BB'; }
