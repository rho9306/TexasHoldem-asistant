let corePromise = null;
export function getCore() {
  if (!corePromise) {
    corePromise = import('./poker_core.js').then(m => m.default.createPokerCore());
  }
  return corePromise;
}
