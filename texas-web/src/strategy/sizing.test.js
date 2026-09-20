import { describe, it, expect } from 'vitest';
import { cBetSuggestion, sprInfo, riverValueBluffRatio, defendAdvice } from './sizing.js';
describe('sizing', () => {
  it('干燥面小注高频率，湿面大注低频率（§5.4B）', () => {
    expect(cBetSuggestion('干燥', 'standard').pct).toBeCloseTo(0.33);
    const wet = cBetSuggestion('湿润', 'standard');
    expect(wet.pct).toBeGreaterThanOrEqual(0.66);
    expect(cBetSuggestion('中性', 'standard').pct).toBeCloseTo(0.5);
  });
  it('风格微调', () => {
    expect(cBetSuggestion('干燥', 'aggressive').pct).toBeGreaterThanOrEqual(cBetSuggestion('干燥', 'conservative').pct);
  });
  it('SPR 分档', () => {
    expect(sprInfo(40, 100).spr).toBe(0.4);
    expect(sprInfo(40, 100).category).toBe('≤4');
    expect(sprInfo(800, 100).category).toBe('>8');
  });
  it('河牌价值诈唬比', () => {
    expect(riverValueBluffRatio(1/3)).toBe('3:1');
    expect(riverValueBluffRatio(2/3)).toBe('2:1');
    expect(riverValueBluffRatio(1.2)).toBe('1:1');
  });
  it('防守建议', () => {
    expect(defendAdvice(0.33, 0.30).action).toContain('跟注');   // 小注宽防
    expect(defendAdvice(1.5, 0.25).action).toContain('弃');     // 超池仅强牌
  });
});
