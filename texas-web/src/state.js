const listeners = new Set();
export const state = {
  hand: [], board: [], playerCount: 6, heroPosition: '', raisesBefore: 0, limpers: 0,
  opponents: [], pot: 0, call: 0, myStack: 100, oppStack: 100,
  sessionId: '', settings: { simulations: 2000, adviceStyle: 'standard', autoTableAdaptation: true, theme: 'dark', settlement: true },
  result: null, strategy: null, settled: false, // 本手已结算标记（批次15：防同一手重复入库双扣筹码）
};
export function setPatch(patch) { Object.assign(state, patch); listeners.forEach(fn => fn(state)); }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
