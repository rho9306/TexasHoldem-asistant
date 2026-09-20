import { describe, it, expect } from 'vitest';
import { weaknessGroups } from './ui/weaknessMatrix.js';
import { cumulativeSeries } from './ui/evCurve.js';
import { isDeviated, isLoss } from './ui/historyList.js';
const H = o => ({ followedAdvice: true, result: { net: 0 }, heroPosition: 'BTN',
  opponents: [{ typeSnapshot: 'TAG' }], texture: '干燥', ...o });
describe('history logic', () => {
  it('筛选', () => {
    expect(isDeviated(H({ followedAdvice: false }))).toBe(true);
    expect(isLoss(H({ result: { net: -10 } }))).toBe(true);
  });
  it('弱点分组：位置×对手×纹理', () => {
    const g = weaknessGroups([H(), H({ followedAdvice: false }), H({ heroPosition: 'BB' })]);
    expect(g.length).toBe(2);
    const btn = g.find(x => x.position === 'BTN');
    expect(btn.count).toBe(2);
    expect(btn.hitRate).toBeCloseTo(0.5);
  });
  it('EV双曲线累计', () => {
    const s = cumulativeSeries([H({ result: { net: 10 } }), H({ result: { net: -4 } })]);
    expect(s.at(-1).actual).toBe(6);
    expect(s[0].theory).toBeTypeOf('number');
  });
});
