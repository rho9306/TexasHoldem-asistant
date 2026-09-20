import { describe, it, expect } from 'vitest';
import { handClassFor, gridCell, isShort, nashBand, getPreflopChart } from './charts.js';
describe('charts', () => {
  it('handClassFor 三类映射', () => {
    expect(handClassFor(['As','Ks'])).toBe('AKs');
    expect(handClassFor(['As','Kd'])).toBe('AKo');
    expect(handClassFor(['Ad','Ac'])).toBe('AA');
    expect(handClassFor(['2c','3d'])).toBe('32o');   // 高牌在前
  });
  it('关键格抽查（公开共识）', () => {
    const open = getPreflopChart({position:'BTN', role:'open', effectiveStackBB:100});
    expect(gridCell(open.grid, 'AA')).toBe('R');
    expect(gridCell(open.grid, '72o')).toBe('F');
    const utg = getPreflopChart({position:'UTG', role:'open', effectiveStackBB:100});
    expect(gridCell(utg.grid, '72o')).toBe('F');
    expect(gridCell(utg.grid, 'AA')).toBe('R');
    // BTN 开牌显著宽于 UTG：数 R 格
    const rCount = g => g.join('').split('').filter(c => c === 'R').length;
    expect(rCount(open.grid)).toBeGreaterThan(rCount(utg.grid));
    const bb = getPreflopChart({position:'BB', raiserPosition:'UTG', role:'defend', effectiveStackBB:100});
    expect(gridCell(bb.grid, 'AA')).toBe('R');       // AA 面对 UTG 开牌 = 3bet
  });
  it('短码分档', () => {
    expect(isShort(100)).toBe(false);
    expect(isShort(12)).toBe(true);
    expect(nashBand(6)).toBe('≤7');
    expect(nashBand(9)).toBe('8-10');
    expect(nashBand(14)).toBe('11-15');
    expect(nashBand(20)).toBe(null);
  });
  it('Nash 表', () => {
    const push = getPreflopChart({position:'BTN', role:'open', effectiveStackBB:6});
    expect(push.kind).toBe('nash-push');
    expect(gridCell(push.grid, 'AA')).toBe('R');
    const call = getPreflopChart({position:'BB', raiserPosition:'BTN', role:'defend', effectiveStackBB:6});
    expect(call.kind).toBe('nash-call');
  });
  it('防守表选择', () => {
    expect(getPreflopChart({position:'BB', raiserPosition:'BTN', role:'defend', effectiveStackBB:100}).title).toContain('BB');
  });
});
