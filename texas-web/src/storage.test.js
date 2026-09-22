import { describe, it, expect, beforeEach } from 'vitest';
import { saveHands, loadAll, buildHandRecord, updateOpponentObservation, saveOpponents, saveSettings, migrateOpponentDefaults } from './storage.js';

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
  it('saveSettings+loadAll 往返（设置落盘）', () => {
    saveSettings({ simulations: 5000, adviceStyle: 'aggressive', autoTableAdaptation: false });
    const { settings } = loadAll();
    expect(settings.simulations).toBe(5000);
    expect(settings.adviceStyle).toBe('aggressive');
    expect(settings.autoTableAdaptation).toBe(false);
  });
  it('loadAll 在存储为空时返回兜底值', () => {
    const all = loadAll();
    expect(all.sessions).toEqual([]);
    expect(all.hands).toEqual([]);
    expect(all.opponents).toEqual([]);
    expect(all.settings).toBeNull();
  });
});

describe('migrateOpponentDefaults（批次7收尾：存量TAG改「默认」）', () => {
  beforeEach(() => localStorage.clear());
  it('存量 TAG 一次性迁移为 null，其它类型与键不动', () => {
    saveOpponents([
      { id: 'o1', type: 'TAG', handsSeen: 5 },
      { id: 'o2', type: 'LAG' },
      { id: 'o3', type: null },
    ]);
    migrateOpponentDefaults();
    const { opponents } = loadAll();
    expect(opponents.find(o => o.id === 'o1')).toMatchObject({ type: null, handsSeen: 5 }); // 只改 type
    expect(opponents.find(o => o.id === 'o2').type).toBe('LAG');
    expect(opponents.find(o => o.id === 'o3').type).toBeNull();
  });
  it('迁移标记防重复：之后主动标的 TAG 不再被抹', () => {
    saveOpponents([{ id: 'o1', type: 'TAG' }]);
    migrateOpponentDefaults();
    expect(loadAll().opponents[0].type).toBeNull();
    saveOpponents([{ id: 'o1', type: 'TAG' }]); // 用户事后在抽屉/一键预设主动标紧凶
    migrateOpponentDefaults();
    expect(loadAll().opponents[0].type).toBe('TAG'); // 有标记，不再抹
  });
  it('空对手列表也写标记（防止之后的一键预设TAG被误迁）', () => {
    migrateOpponentDefaults(); // 首次访问，无对手
    saveOpponents([{ id: 'o1', type: 'TAG' }]); // 之后主动预设
    migrateOpponentDefaults();
    expect(loadAll().opponents[0].type).toBe('TAG');
  });
});
