import { describe, it, expect, beforeEach } from 'vitest';
import { exportAll, importAll } from './exporter.js';
import { saveHands, saveOpponents } from './storage.js';
describe('exporter', () => {
  beforeEach(() => localStorage.clear());
  it('导出→导入往返一致', () => {
    saveHands([{ id: 'h1', note: 'x' }]);
    const json = exportAll();
    localStorage.clear();
    expect(importAll(json).ok).toBe(true);
    expect(JSON.parse(localStorage.getItem('texas.hands'))[0].id).toBe('h1');
  });
  it('损坏/版本不符拒绝', () => {
    expect(importAll('not json').ok).toBe(false);
    expect(importAll(JSON.stringify({ app: 'other', version: 9 })).ok).toBe(false);
  });
  it('旧备份（无迁移标记）导入后存量 TAG 改「默认」', () => {
    const old = { app: 'texas-web', version: 1, exportedAt: 'x', data: { sessions: [], hands: [], opponents: [{ id: 'o1', type: 'TAG' }, { id: 'o2', type: 'LAG' }] } };
    expect(importAll(JSON.stringify(old)).ok).toBe(true);
    const ops = JSON.parse(localStorage.getItem('texas.opponents'));
    expect(ops.find(o => o.id === 'o1').type).toBeNull();
    expect(ops.find(o => o.id === 'o2').type).toBe('LAG');
  });
  it('新备份（带迁移标记）导入后主动标的 TAG 保留', () => {
    saveOpponents([{ id: 'o1', type: 'TAG' }]); // 迁移后主动标注
    const json = exportAll();
    localStorage.clear();
    expect(importAll(json).ok).toBe(true);
    expect(JSON.parse(localStorage.getItem('texas.opponents'))[0].type).toBe('TAG');
  });
});
