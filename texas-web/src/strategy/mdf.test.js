import { describe, it, expect } from 'vitest';
import { mdfAlpha, detectOuts, outsToEquity } from './mdf.js';

describe('mdf', () => {
  it('标准表值（设计§5.4C）', () => {
    expect(mdfAlpha(33, 100).alpha).toBeCloseTo(33 / 133, 3);
    expect(mdfAlpha(33, 100).mdf).toBeCloseTo(1 - 33 / 133, 3);
    expect(mdfAlpha(75, 100).alpha).toBeCloseTo(0.4286, 3);
  });

  it('outs 检测', () => {
    expect(detectOuts(['Ah', '2h'], ['4h', '9h', 'Kd']).outs).toBe(9); // 同花听（手2+面2=4红心）
    expect(detectOuts(['9h', '8s'], ['7d', '6c', '2h']).outs).toBe(8); // 两头顺
    expect(detectOuts(['9h', '8s'], ['7d', '5c', '2h']).outs).toBe(4); // 卡顺
    const d = detectOuts(['Ah', 'Kh'], ['2h', '9h', 'Kd']);
    expect(d.draws.some((x) => x.includes('同花'))).toBe(true);
  });

  it('后门只提示不计 outs', () => {
    const d = detectOuts(['Ah', '2h'], ['4h', '9s', 'Kd']); // 仅3张红心=后门
    expect(d.outs).toBe(0);
    expect(d.draws.some((x) => x.includes('后门'))).toBe(true);
  });

  it('4-2法则', () => {
    expect(outsToEquity(9, 2)).toBeCloseTo(0.36, 2);
    expect(outsToEquity(9, 1)).toBeCloseTo(0.18, 2);
  });
});
