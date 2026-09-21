import { describe, it, expect } from 'vitest';
import { tableProfile, adjustAdvice } from './tableDynamics.js';

describe('tableDynamics', () => {
  it('松弱桌判定与修正', () => {
    const opps = [
      { type: 'loose-passive' }, { type: 'loose-passive' },
    ];
    const p = tableProfile(opps);
    expect(p.label).toBe('松弱桌');
    expect(p.adjustments.length).toBeGreaterThan(0);
    expect(adjustAdvice('fold', true, p, true)).toContain('诈唬');   // 修正提示
  });
  it('对手不足2人 → 无画像', () => {
    expect(tableProfile([{ type: 'TAG' }])).toBe(null);
  });
  it('开关关闭不修正', () => {
    const p = tableProfile([{ type: 'loose-passive' }, { type: 'loose-passive' }]);
    expect(adjustAdvice('fold', true, p, false)).toBe('');
  });
});

describe('tableProfile null 类型兜底', () => {
  it('type=null 按 TAG 中性参数计入桌画像（与 TAG 一致）', async () => {
    const { tableProfile } = await import('./tableDynamics.js');
    const withNull = tableProfile([{ type: null }, { type: null }, { type: null }]);
    const withTag = tableProfile([{ type: 'TAG' }, { type: 'TAG' }, { type: 'TAG' }]);
    expect(withNull.vpipAvg).toBe(withTag.vpipAvg);
    expect(withNull.aggrAvg).toBe(withTag.aggrAvg);
    expect(withNull.label).toBe(withTag.label);
  });
});
