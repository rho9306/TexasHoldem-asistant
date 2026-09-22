// 数据层：localStorage 五键持久化（Task 22 四键 + texas.migrations 一次性迁移标记）
// 键：texas.sessions / texas.hands / texas.opponents / texas.settings / texas.migrations
// 降级：localStorage 不可用（隐私模式/已满）→ 仅内存 + console.warn，不抛错
import { state } from './state.js';

const K = { sessions: 'texas.sessions', hands: 'texas.hands', opponents: 'texas.opponents', settings: 'texas.settings', migrations: 'texas.migrations' };

function read(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { console.warn('存储不可用/已满，仅内存模式'); return false; }
}

export function saveSessions(list) { write(K.sessions, list); }
export function saveHands(hands) { write(K.hands, hands.slice(-1000)); } // FIFO：上限1000，超出从头丢弃
export function saveOpponents(list) { write(K.opponents, list); }
export function saveSettings(s) { write(K.settings, s); }

export function loadAll() {
  return {
    sessions: read(K.sessions, []),
    hands: read(K.hands, []),
    opponents: read(K.opponents, []),
    settings: read(K.settings, null),
  };
}

/** 一次性迁移（批次7收尾，2026-09-22）：da81b4b 之前的存量对手由旧默认写成 type:'TAG'（非用户主动标注），
 *  按「默认未标定」设计改写为 type:null「默认」——数学层 TYPE_DEFAULTS[null] ?? TAG 同对象兜底，胜率不变。
 *  texas.migrations 标记保证只跑一次：之后用户在抽屉/一键预设主动标的 TAG 不再被抹。空列表也写标记，
 *  防止新用户之后的一键预设被误迁。须在启动 loadAll 回填之前调用。
 *  force=true 供 importAll 使用：旧备份（无 oppDefaultsV2 标记）导入时无视本机标记强制迁移，
 *  标记随备份走（exportAll 写入 data.oppDefaultsV2），新备份再导入不会误抹主动标注。 */
export function migrateOpponentDefaults(force = false) {
  if (!force && read(K.migrations, null)?.oppDefaultsV2) return;
  const list = read(K.opponents, []);
  write(K.opponents, list.map(o => o.type === 'TAG' ? { ...o, type: null } : o));
  write(K.migrations, { oppDefaultsV2: true });
}

/** 新建会话并写入存储，返回 session 对象 */
export function newSession(name) {
  const s = {
    id: 's-' + Date.now().toString(36),
    name: name || '会话',
    date: new Date().toISOString().slice(0, 10),
    handsCount: 0, netResult: 0, evTotal: 0,
  };
  const list = loadAll().sessions;
  list.push(s);
  saveSessions(list);
  return s;
}

/** 汇集当前 state → HandRecord（设计§6结构），action 为本手动作字符串，result 为 {net, ev?} 结算 */
export function buildHandRecord(action, result) {
  const strategy = state.strategy ?? {};
  return {
    id: 'h-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    sessionId: state.sessionId,
    timestamp: Date.now(),
    hand: [...state.hand],
    board: [...state.board],
    street: streetName(state.board.length),
    preflopScenario: { heroPosition: state.heroPosition, raisesBefore: state.raisesBefore, limpers: state.limpers },
    inPosition: ['BTN', 'CO', 'MP'].includes(state.heroPosition),
    heroRole: state.raisesBefore > 0 ? 'defender' : 'aggressor',
    opponents: state.opponents.map(o => ({ profileId: o.id, typeSnapshot: o.type, vpipSnapshot: o.vpipObs ?? null })),
    tableProfile: strategy.profile?.label ?? '未标定', // 批次13：无画像桌不再虚构「均衡」结论
    pot: state.pot,
    call: state.call,
    myStack: state.myStack,
    oppStack: state.oppStack,
    effectiveStack: Math.min(state.myStack, state.oppStack),
    winRate: state.result?.winRate ?? 0,
    tieRate: state.result?.tieRate ?? 0,
    equity: state.result?.eff ?? 0,
    evCall: state.result?.evCall ?? 0,
    evRaise: state.result?.evRaise ?? 0,
    potOdds: state.result?.potOdds ?? 0,
    requiredEquity: state.result?.requiredEquity ?? 0,
    advice: state.result?.advice ?? '',
    adviceLevel: state.result?.adviceLevel ?? '',
    sizing: strategy.cBet?.pct ?? null,
    gtoAction: strategy.gtoTitle ?? '',
    texture: strategy.texture?.label ?? '',
    strategyTags: strategy.profile?.adjustments ?? [],
    action,
    result,
    followedAdvice: null,
    deviationType: null,
    tags: [],
    notes: '',
  };

  function streetName(n) { return n <= 2 ? 'preflop' : n === 3 ? 'flop' : n === 4 ? 'turn' : 'river'; }
}

/** 删除会话及其名下全部手数（批次11，历史页「删除会话」） */
export function deleteSession(sessionId) {
  const { sessions, hands } = loadAll();
  saveSessions(sessions.filter(s => s.id !== sessionId));
  saveHands(hands.filter(h => (h.sessionId ?? '') !== sessionId));
}

/** 对手观察值更新：handsSeen+1，滚动 VPIP = 累计入池次数 / 手数（百分比取整） */
export function updateOpponentObservation(oppId, sawVpip) {
  const list = loadAll().opponents.map(o => {
    if (o.id !== oppId) return o;
    const handsSeen = (o.handsSeen ?? 0) + 1;
    // 由旧 vpipObs 百分比反推累计入池次数，再叠加本次观察（粗粒度，复盘任务可一键修正）
    const vpipCount = Math.round((o.vpipObs ?? 0) * (o.handsSeen ?? 0) / 100) + (sawVpip ? 1 : 0);
    return { ...o, handsSeen, vpipObs: Math.round(vpipCount / handsSeen * 100), updatedAt: Date.now() };
  });
  saveOpponents(list);
}
