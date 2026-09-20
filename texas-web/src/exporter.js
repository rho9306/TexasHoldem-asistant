// 导出/导入：全量 JSON 备份（Task 23）
import { loadAll, saveSessions, saveHands, saveOpponents, saveSettings } from './storage.js';
export function exportAll() {
  const data = loadAll();
  return JSON.stringify({ app: 'texas-web', version: 1, exportedAt: new Date().toISOString(), data }, null, 1);
}
export function importAll(jsonString) {
  let obj;
  try { obj = JSON.parse(jsonString); } catch { return { ok: false, error: '不是有效的JSON' }; }
  if (obj?.app !== 'texas-web' || obj?.version !== 1) return { ok: false, error: '版本不兼容或文件类型不符' };
  const d = obj.data ?? {};
  if (!Array.isArray(d.hands)) return { ok: false, error: '数据结构不符（缺 hands）' };
  saveSessions(d.sessions ?? []); saveHands(d.hands);
  saveOpponents(d.opponents ?? []); if (d.settings) saveSettings(d.settings);
  return { ok: true };
}
