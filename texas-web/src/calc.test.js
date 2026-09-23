import { describe, it, expect, vi, beforeEach } from 'vitest';

// mock WASM loader：让 getCore 抛错，覆盖 recalc 错误路径
vi.mock('./wasm/pokerCore.js', () => ({
  getCore: vi.fn(async () => { throw new Error('no wasm in test'); }),
}));

import { streetOf, effectiveStack, recalc } from './calc.js';
import { getCore } from './wasm/pokerCore.js';
import { state, setPatch } from './state.js';

// 批次16：可编程假引擎（embind 向量桩 + 可注入计算/决策行为）
const vecClass = () => class { constructor() { this.a = []; } push_back(x) { this.a.push(x); } delete() {} };
function fakeCore({ calc, decide } = {}) {
  const V = vecClass();
  return {
    VectorString: V, VectorU8: vecClass(),
    VectorVectorU8: class { constructor() { this.a = []; } push_back(x) { this.a.push(x); } delete() {} },
    calculateEquityV2: calc || (() => ({ winRate: 0.6, tieRate: 0.05, lossRate: 0.35, simulations: 2000, rangeStats: {} })),
    evaluateDecision: decide || (() => ({ advice: '加注', adviceLevel: 'raise', evCall: 2, evRaise: 5, potOdds: 2, requiredEquity: 0.33 })),
  };
}

describe('calc helpers', () => {
  it('streetOf', () => {
    expect(streetOf([])).toBe('翻前');
    expect(streetOf(['As'])).toBe('翻前');
    expect(streetOf(['As', 'Kd'])).toBe('翻前');
    expect(streetOf(['As', 'Kd', '7h'])).toBe('翻牌');
    expect(streetOf(['As', 'Kd', '7h', '2c'])).toBe('转牌');
    expect(streetOf(['As', 'Kd', '7h', '2c', '9s'])).toBe('河牌');
  });
  it('有效筹码取小', () => { expect(effectiveStack(80, 120)).toBe(80); });
  it('有效筹码缺省读 state', () => {
    setPatch({ myStack: 60, oppStack: 90 });
    expect(effectiveStack()).toBe(60);
  });
});

describe('recalc 错误路径', () => {
  beforeEach(() => {
    setPatch({
      hand: ['As', 'Kd'], board: [], opponents: [{ type: 'TAG' }],
      pot: 30, call: 10, myStack: 100, oppStack: 100, result: null,
      raisesBefore: 0,
    });
  });

  it('手牌不足2张 → result 置 null', async () => {
    setPatch({ hand: ['As'] });
    await recalc();
    expect(state.result).toBeNull();
  });

  it('无对手 → result 置 null（不抛错，UI 引导由 Task 19 负责）', async () => {
    setPatch({ opponents: [] });
    await recalc();
    expect(state.result).toBeNull();
  });

  it('WASM 加载失败 → result.error 提示网络指引（批次16：不再笼统称引擎失败）', async () => {
    await recalc();
    expect(state.result?.error).toContain('计算引擎加载失败');
    expect(state.result?.error).toContain('网络');
  });

  // 批次16：计算环节异常如实展示真实原因，不再误报为「加载计算引擎失败」
  it('计算环节抛错 → result.error 为「计算出错：真实原因」', async () => {
    vi.mocked(getCore).mockResolvedValueOnce(fakeCore({
      calc: () => { throw new Error('embind 类型不匹配'); },
    }));
    await recalc();
    expect(state.result?.error).toBe('计算出错：embind 类型不匹配');
  });

  // 批次16：成功路径回归（此前 calc.test 无 happy-path 覆盖）
  it('计算成功 → result 含 eff 与行动建议（actionAdvice 联动）', async () => {
    vi.mocked(getCore).mockResolvedValueOnce(fakeCore());
    await recalc();
    expect(state.result?.error).toBeUndefined();
    expect(state.result?.eff).toBeCloseTo(0.625); // 0.6 + 0.05×0.5
    expect(state.result?.action?.action).toBe('raise'); // call=10, pot=30, adviceLevel=raise → 加注至50
  });
});
