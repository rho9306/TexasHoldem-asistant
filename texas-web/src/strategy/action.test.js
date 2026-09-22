import { describe, it, expect } from 'vitest';
import { actionAdvice } from './action.js';

// 基准输入：面对下注 pot=30 call=10 有效筹码=100 胜率0.5 翻牌
const base = { call: 10, pot: 30, effStack: 100, winRate: 0.5, adviceLevel: 'call',
  street: 3, heroPosition: 'MP', raisesBefore: 0, limpers: 0, adviceStyle: 'standard' };

describe('actionAdvice 面对下注（call>0）', () => {
  it('引擎判 raise → 加注至 2×call+pot（=3×下注+前池）', () => {
    const a = actionAdvice({ ...base, adviceLevel: 'raise' });
    expect(a.action).toBe('raise');
    expect(a.amount).toBe(50); // 2×10+30
    expect(a.reason).toBeTruthy();
  });
  it('加注金额超出有效筹码 → 全压', () => {
    const a = actionAdvice({ ...base, adviceLevel: 'raise', call: 55, pot: 80, effStack: 120 });
    expect(a.action).toBe('allin');
    expect(a.amount).toBe(120);
  });
  it('引擎判 call → 跟注（不改金额）', () => {
    const a = actionAdvice(base);
    expect(a.action).toBe('call');
  });
  it('引擎判 fold → 弃牌', () => {
    const a = actionAdvice({ ...base, adviceLevel: 'fold' });
    expect(a.action).toBe('fold');
  });
  it('跟注额≥有效筹码且建议跟注 → 跟注全压', () => {
    const a = actionAdvice({ ...base, call: 100, pot: 100, effStack: 100, adviceLevel: 'call' });
    expect(a.action).toBe('allin');
    expect(a.reason).toContain('跟注');
  });
});

describe('actionAdvice 无人下注（call=0）', () => {
  it('翻前强牌 → open 加注 2.5BB+每跛入+1', () => {
    const a = actionAdvice({ ...base, call: 0, winRate: 0.6, street: 0, limpers: 2 });
    expect(a.action).toBe('raise');
    expect(a.amount).toBe(4.5); // 2.5+2
  });
  it('翻前弱牌非盲注位 → 弃牌', () => {
    const a = actionAdvice({ ...base, call: 0, winRate: 0.3, street: 0 });
    expect(a.action).toBe('fold');
  });
  it('翻前弱牌但盲注位（已投盲）→ 免费过牌', () => {
    const a = actionAdvice({ ...base, call: 0, winRate: 0.3, street: 0, heroPosition: 'BB' });
    expect(a.action).toBe('check');
  });
  it('翻牌强牌 → 下注 66% 池', () => {
    const a = actionAdvice({ ...base, call: 0, winRate: 0.7, street: 3 });
    expect(a.action).toBe('bet');
    expect(a.amount).toBeCloseTo(30 * 0.66, 5);
  });
  it('翻牌中等牌力 → 过牌看免费牌', () => {
    const a = actionAdvice({ ...base, call: 0, winRate: 0.45, street: 4 });
    expect(a.action).toBe('check');
  });
  it('河牌空气牌 → 过牌（无免费牌语义但弃牌无意义）', () => {
    const a = actionAdvice({ ...base, call: 0, winRate: 0.2, street: 5 });
    expect(a.action).toBe('check');
  });
});

describe('actionAdvice 风格与健壮性', () => {
  it('激进风格阈值放宽（中等牌力也下注），保守收紧', () => {
    const mid = { ...base, call: 0, winRate: 0.48, street: 3 };
    expect(actionAdvice(mid).action).toBe('check');                       // standard：0.48 < 0.50
    expect(actionAdvice({ ...mid, adviceStyle: 'aggressive' }).action).toBe('bet'); // -0.03 → 0.45 阈值过
    expect(actionAdvice({ ...mid, adviceStyle: 'conservative' }).action).toBe('check');
  });
  it('胜率缺失/非法 → null（UI 保留引导态）', () => {
    expect(actionAdvice({ ...base, winRate: NaN })).toBeNull();
    expect(actionAdvice({ ...base, winRate: undefined })).toBeNull();
  });
});
