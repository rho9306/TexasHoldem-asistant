import { describe, it, expect } from 'vitest';
import { impliedOdds } from './implied.js';

describe('implied', () => {
  it('松弱跟注站隐含赔率高', () => {
    const lp = impliedOdds(50, 100, 'loose-passive');
    const tp = impliedOdds(50, 100, 'tight-passive');
    expect(lp.future).toBeGreaterThan(tp.future);
    expect(lp.required).toBeLessThan(tp.required);
  });
});
