import { describe, it, expect, vi, beforeEach } from 'vitest';

// mock WASM loader：让 getCore 抛错，覆盖 recalc 错误路径
vi.mock('./wasm/pokerCore.js', () => ({
  getCore: vi.fn(async () => { throw new Error('no wasm in test'); }),
}));

import { streetOf, effectiveStack, recalc } from './calc.js';
import { state, setPatch } from './state.js';

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

  it('WASM 加载失败 → result.error 含提示', async () => {
    await recalc();
    expect(state.result?.error).toContain('加载计算引擎失败');
  });
});
