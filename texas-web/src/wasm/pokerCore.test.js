import { describe, it, expect, vi } from 'vitest';

// mock 掉真实 emscripten 胶水：只验证包装器把 locateFile 传给了 createPokerCore
// （回归防护：部署站曾因胶水按 scriptDirectory 拼 wasm 路径 + vite 不发 .wasm 资产 → 引擎 404）
const createPokerCore = vi.fn(() => Promise.resolve({ engine: true }));
vi.mock('./poker_core.js', () => ({ default: { createPokerCore } }));

import { getCore } from './pokerCore.js';

describe('pokerCore 加载器', () => {
  it('向 createPokerCore 传 locateFile（指向 vite 发出的 wasm 资产），且并发调用只初始化一次', async () => {
    const [a, b] = await Promise.all([getCore(), getCore()]);
    expect(a).toBe(b); // 单例：同一份引擎实例
    expect(a).toEqual({ engine: true });
    expect(createPokerCore).toHaveBeenCalledTimes(1);
    const opts = createPokerCore.mock.calls[0][0];
    expect(typeof opts.locateFile).toBe('function');
    expect(opts.locateFile('poker_core.wasm')).toContain('poker_core.wasm');
  });
});
