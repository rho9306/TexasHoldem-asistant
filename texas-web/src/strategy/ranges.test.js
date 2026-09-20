import { describe, it, expect } from 'vitest';
import { maskForOpponent, loosenessToVpip, TYPE_DEFAULTS } from './ranges.js';

describe('ranges', () => {
  it('loosenessToVpip', () => {
    expect(loosenessToVpip(0)).toBe(10);
    expect(loosenessToVpip(100)).toBe(60);
    expect(loosenessToVpip(50)).toBe(35);
  });

  it('紧弱对手范围显著窄于松弱（骨架表×类型系数）', () => {
    const tp = maskForOpponent({ type: 'tight-passive', looseness: 25 }, { position: 'MP', role: 'open' });
    const lp = maskForOpponent({ type: 'loose-passive', looseness: 72 }, { position: 'MP', role: 'open' });
    expect(tp.widthPct).toBeLessThan(20);
    expect(lp.widthPct).toBeGreaterThan(tp.widthPct * 1.5);
    expect(lp.widthPct).toBeLessThan(35);
    expect(tp.mask).toBeInstanceOf(Uint8Array);
    expect(tp.mask.length).toBe(169);
  });

  it('观察值优先（≥20手）', () => {
    const m = maskForOpponent({ type: 'LAG', looseness: 62, handsSeen: 30, vpipObs: 20 }, { position: 'MP', role: 'open' });
    expect(m.widthPct).toBeLessThan(25);   // 观察VPIP 20 覆盖类型默认38
  });

  it('观察不足20手：观察值不生效，同滑条下宽度偏宽', () => {
    // 用 CO 基础表（≈28%）：观察值20若生效会截到20；不生效则按类型系数填满基础表
    const weak = maskForOpponent({ type: 'LAG', looseness: 62, handsSeen: 5, vpipObs: 20 }, { position: 'CO', role: 'open' });
    const strong = maskForOpponent({ type: 'LAG', looseness: 62, handsSeen: 30, vpipObs: 20 }, { position: 'CO', role: 'open' });
    expect(weak.widthPct).toBeGreaterThan(strong.widthPct);   // 5手不足以采信观察值
  });

  it('防守场景比开牌窄', () => {
    const open = maskForOpponent({ type: 'TAG', looseness: 35 }, { position: 'BB', role: 'open' });
    const def = maskForOpponent({ type: 'TAG', looseness: 35 }, { position: 'BB', role: 'defend', raiserPosition: 'BTN' });
    expect(def.widthPct).toBeLessThan(open.widthPct);
  });

  it('TYPE_DEFAULTS 含 aggression/vpip 字段供复用', () => {
    expect(TYPE_DEFAULTS['TAG'].aggression).toBe(60);
    expect(TYPE_DEFAULTS['loose-passive'].vpip).toBe(42);
  });
});
