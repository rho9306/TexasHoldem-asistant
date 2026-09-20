import { describe, it, expect } from 'vitest';
import { RANK_ORDER, percentile, topClasses } from './rankTable.js';

describe('rankTable', () => {
  it('169个类不重不漏', () => {
    expect(RANK_ORDER.length).toBe(169);
    expect(new Set(RANK_ORDER).size).toBe(169);
    expect(RANK_ORDER[0]).toBe('AA');
    // 引擎真实最弱手不一定是 72o（72o 是"最不可玩"，低连牌/隔牌纯胜率更低）
    expect(['72o', '32o', '42o', '62o', '23o', '24o', '25o', '27o', '34o']).toContain(RANK_ORDER.at(-1));
  });
  it('排序单调性 sanity', () => {
    expect(RANK_ORDER.indexOf('AA')).toBeLessThan(RANK_ORDER.indexOf('KK'));
    expect(RANK_ORDER.indexOf('KK')).toBeLessThan(RANK_ORDER.indexOf('22'));
  });
  it('百分位查询', () => {
    expect(percentile('AA')).toBe(1);
    expect(percentile(RANK_ORDER.at(-1))).toBe(169);
    expect(percentile('unknown-class')).toBe(169); // 未知类兜底
  });
  it('topClasses 按组合数截取', () => {
    expect(topClasses(10).length).toBeGreaterThan(10);
    const combos = c => c.endsWith('s') ? 4 : c.endsWith('o') ? 12 : 6;
    let acc = 0;
    for (const c of topClasses(10)) acc += combos(c);
    expect(acc).toBeGreaterThanOrEqual(132.6);
    // 紧邻下一类不应仍在截取内（宽度不显著超出）
    expect(acc).toBeLessThan(132.6 * 1.5);
  });
});
