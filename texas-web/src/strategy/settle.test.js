import { describe, it, expect } from 'vitest';
import { settleNet } from './settle.js';

// 结算口径（批次15，与用户确认）：赢=+P 底池；输=−C 跟注额（加注输的由用户改金额）；弃牌=本街 0
describe('settleNet 结算', () => {
  it('赢 → +底池（含对方注）', () => {
    expect(settleNet('win', { pot: 30, call: 10 })).toBe(30);
  });
  it('输 → −跟注额', () => {
    expect(settleNet('lose', { pot: 30, call: 10 })).toBe(-10);
  });
  it('弃牌 → 本街 0（沉没成本不追）', () => {
    expect(settleNet('fold', { pot: 30, call: 10 })).toBe(0);
  });
  it('call=0 时点输 → 预填 0（用户自填实际投入）', () => {
    expect(settleNet('lose', { pot: 0, call: 0 })).toBe(0);
  });
  it('非法输入 → 0 兜底', () => {
    expect(settleNet('x', { pot: 30, call: 10 })).toBe(0);
  });
});
