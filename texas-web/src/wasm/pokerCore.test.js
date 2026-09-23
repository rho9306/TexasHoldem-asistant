import { describe, it, expect, vi } from 'vitest';

// mock 掉真实 emscripten 胶水：只验证包装器把 locateFile 传给了 createPokerCore
// （回归防护：部署站曾因胶水按 scriptDirectory 拼 wasm 路径 + vite 不发 .wasm 资产 → 引擎 404）
const createPokerCore = vi.fn(() => Promise.resolve({ engine: true }));
vi.mock('./poker_core.js', () => ({ default: { createPokerCore } }));

import { getCore, warmEngine } from './pokerCore.js';

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

  // 批次16：启动预热——与 getCore 共享单例，成功后 wasm/胶水经 SW 入缓存
  // （vitest 5 每用例清 mock 计数：resetModules 取全新模块实例，断言仅依赖本用例内状态）
  it('warmEngine：预热与 getCore 共享单例，不产生第二次初始化', async () => {
    vi.resetModules();
    const fresh = await import('./pokerCore.js');
    fresh.warmEngine();
    const [a, b] = await Promise.all([fresh.getCore(), fresh.getCore()]);
    expect(a).toBe(b);
    expect(a).toEqual({ engine: true });
    expect(createPokerCore).toHaveBeenCalledTimes(1);
  });

  // 批次16：预热失败必须静默（无未处理拒绝），且 corePromise 复位允许后续重试
  it('warmEngine：加载失败静默且单例复位可重试', async () => {
    vi.resetModules();
    createPokerCore.mockRejectedValueOnce(new Error('预热失败'));
    const fresh = await import('./pokerCore.js');
    expect(() => fresh.warmEngine()).not.toThrow();
    await new Promise(r => setTimeout(r, 0)); // 拒绝落地：若有未处理拒绝，vitest 会让本用例失败
    await expect(fresh.getCore()).resolves.toEqual({ engine: true }); // 复位后重试成功
  });
});
