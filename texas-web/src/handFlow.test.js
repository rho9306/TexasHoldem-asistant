// 回归测试（批次17 转正）：真实 nextRound + 真实 recalc 编排（仅引擎 mock）。
// 场景来自用户实测故障路径：第一手计算成功 → 「下一轮」清空 → 第二手选牌必须同样成功。
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

vi.mock('./wasm/pokerCore.js', () => {
  const vec = () => class { constructor() { this.a = []; } push_back(x) { this.a.push(x); } delete() {} };
  return {
    getCore: vi.fn(async () => ({
      VectorString: vec(),
      VectorU8: vec(),
      VectorVectorU8: vec(),
      calculateEquityV2Js: () => ({ winRate: 0.6, tieRate: 0.05, lossRate: 0.35, rangeStats: [] }),
      evaluateDecision: () => ({ advice: 'call', adviceLevel: 'call', evCall: 1.5, evRaise: 0.8, requiredEquity: 0.2 }),
    })),
    warmEngine: vi.fn(),
  };
});

import { state, setPatch } from './state.js';
import { refresh } from './main.js';
import { nextRound } from './ui/tablePage.js';
import { opponentDefaults } from './ui/opponentCards.js';

const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  localStorage.clear();
  setPatch({
    hand: [], board: [], playerCount: 6, heroPosition: 'BTN',
    raisesBefore: 0, limpers: 0,
    opponents: [opponentDefaults('TAG')],
    pot: 0, call: 0, myStack: 100, oppStack: 100,
    result: null, strategy: null, settled: false,
    settings: { simulations: 2000, adviceStyle: 'standard', autoTableAdaptation: true, theme: 'dark', settlement: true },
  });
});

describe('下一轮后再选牌（跨手流程回归）', () => {
  it('第一手成功 → 下一轮 → 第二手选牌 recalc 应同样成功', async () => {
    // 第一手
    setPatch({ hand: ['As', 'Kd'] });
    refresh();
    await flush();
    expect(state.result?.error).toBeUndefined();
    expect(state.result?.winRate).toBe(0.6);

    // 下一轮（真实 batch14/15 实现：清空 + 结算开时筹码连续）
    nextRound();
    await flush();

    // 第二手选牌
    setPatch({ hand: ['Ah', 'Kd'] });
    refresh();
    await flush();
    expect(state.result?.error).toBeUndefined();
    expect(state.result?.winRate).toBe(0.6);
    expect(state.myStack).toBe(100); // 未记录结算，筹码不变
  });
});
