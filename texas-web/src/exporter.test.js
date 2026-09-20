import { describe, it, expect, beforeEach } from 'vitest';
import { exportAll, importAll } from './exporter.js';
import { saveHands } from './storage.js';
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
});
