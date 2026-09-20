import { describe, it, expect, beforeEach } from 'vitest';
import { saveHands, loadAll, buildHandRecord, updateOpponentObservation, saveOpponents } from './storage.js';

describe('storage', () => {
  beforeEach(() => localStorage.clear());
  it('1000手FIFO', () => {
    const hands = Array.from({ length: 1002 }, (_, i) => ({ id: 'h' + i }));
    saveHands(hands);
    const { hands: stored } = loadAll();
    expect(stored.length).toBe(1000);
    expect(stored[0].id).toBe('h2');
    expect(stored.at(-1).id).toBe('h1001');
  });
  it('buildHandRecord 字段完整', () => {
    const r = buildHandRecord('call', { net: 12.5 });
    expect(r).toHaveProperty('hand');
    expect(r).toHaveProperty('effectiveStack');
    expect(r.timestamp).toBeTypeOf('number');
  });
  it('updateOpponentObservation 滚动VPIP', () => {
    saveOpponents([{ id: 'o1', type: 'TAG', handsSeen: 2, vpipObs: 50 }]); // 1/2 观察到入池
    updateOpponentObservation('o1', true); // → 2/3 ≈ 67%
    const { opponents } = loadAll();
    expect(opponents[0].handsSeen).toBe(3);
    expect(opponents[0].vpipObs).toBe(67);
    updateOpponentObservation('o1', false); // → 2/4 = 50%
    expect(loadAll().opponents[0].vpipObs).toBe(50);
  });
  it('loadAll 在存储为空时返回兜底值', () => {
    const all = loadAll();
    expect(all.sessions).toEqual([]);
    expect(all.hands).toEqual([]);
    expect(all.opponents).toEqual([]);
    expect(all.settings).toBeNull();
  });
});
