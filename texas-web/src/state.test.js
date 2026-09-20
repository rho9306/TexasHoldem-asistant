import { describe, it, expect, vi } from 'vitest';
import { state, setPatch, subscribe } from './state.js';
describe('state', () => {
  it('patch 合并与广播', () => {
    const fn = vi.fn(); const off = subscribe(fn);
    setPatch({ pot: 100 });
    expect(state.pot).toBe(100); expect(fn).toHaveBeenCalled();
    off(); setPatch({ pot: 0 });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
