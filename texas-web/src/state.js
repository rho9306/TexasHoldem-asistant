const listeners = new Set();
export const state = {
  hand: [], board: [], playerCount: 6, heroPosition: '', raisesBefore: 0, limpers: 0,
  opponents: [], pot: 0, call: 0, myStack: 100, oppStack: 100,
  sessionId: '', settings: { simulations: 2000, adviceStyle: 'standard', autoTableAdaptation: true, theme: 'dark' },
  result: null, strategy: null,
};
export function setPatch(patch) { Object.assign(state, patch); listeners.forEach(fn => fn(state)); }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
