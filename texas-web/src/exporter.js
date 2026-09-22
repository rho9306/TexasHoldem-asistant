// 导出/导入：全量 JSON 备份（Task 23）；oppDefaultsV2 迁移标记随备份走（批次7收尾）
import { loadAll, migrateOpponentDefaults, saveSessions, saveHands, saveOpponents, saveSettings } from './storage.js';
export function exportAll() {
  const data = { ...loadAll(), oppDefaultsV2: true }; // 本机数据已迁移，标记随备份走：再导入不重迁
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
  if (!d.oppDefaultsV2) migrateOpponentDefaults(true); // 批次7前旧备份：对手TAG是旧默认非主动标注，导入即迁移
  return { ok: true };
}
