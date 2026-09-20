import { describe, it, expect } from 'vitest';
import { analyzeTexture } from './texture.js';

describe('texture', () => {
  it('彩虹高牌面 = 干燥', () => {
    const t = analyzeTexture(['As', 'Kd', '7h']);
    expect(t.label).toBe('干燥');
    expect(t.suitCount).toBe(0);
  });
  it('单调连牌 = 湿润', () => {
    const t = analyzeTexture(['9h', '8h', '7h']);
    expect(t.label).toBe('湿润');
    expect(t.features.some((f) => f.includes('同花'))).toBe(true);
    expect(t.features.some((f) => f.includes('连'))).toBe(true);
  });
  it('对子面降湿', () => {
    const t = analyzeTexture(['8s', '8d', '2h']);
    expect(t.isPaired).toBe(true);
    expect(t.label).not.toBe('湿润');
  });
  it('5张河牌双同花', () => {
    const t = analyzeTexture(['As', 'Ks', '7s', '2d', '9c']);
    expect(t.suitCount).toBe(3);
  });
  it('A低顺4张参与牌面检出', () => {
    const t = analyzeTexture(['As', '5d', '4c', '3s']);
    expect(t.hasStraightDraw).toBe(true);
    expect(t.features.some((f) => f.includes('顺') || f.includes('连'))).toBe(true);
  });
  it('A低顺混大牌仍检出5-high顺', () => {
    const t = analyzeTexture(['Ah', 'Ks', '5d', '4c', '3s']);
    expect(t.hasStraightDraw).toBe(true);
  });
});
