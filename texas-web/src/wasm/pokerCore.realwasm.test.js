// 批次17 集成测试：不打任何 mock——真实 emscripten 胶水 + ?inline 内联的真实 wasm，
// 在测试环境里完整走一遍「base64 解码 → wasmBinary → 实例化 → 蒙特卡洛计算」链路。
// 守护批次17 的核心承诺：引擎随页面加载，零网络请求，页面能打开引擎就一定可用。
import { describe, it, expect } from 'vitest';
import { getCore, warmEngine } from './pokerCore.js';

describe('pokerCore 真实引擎（内联 wasm）', () => {
  it('warmEngine 后 getCore 实例化真实引擎并算出合理胜率（AKo 翻前 vs 全范围）', async () => {
    warmEngine();
    const core = await getCore();
    expect(typeof core.calculateEquityV2).toBe('function');
    expect(typeof core.evaluateDecision).toBe('function');

    const handVec = new core.VectorString();
    handVec.push_back('Ah'); handVec.push_back('Kh');
    const boardVec = new core.VectorString();
    const oppVec = new core.VectorVectorU8();
    const v = new core.VectorU8();
    for (let i = 0; i < 169; i++) v.push_back(255); // 全范围
    oppVec.push_back(v);
    try {
      const r = core.calculateEquityV2(handVec, boardVec, oppVec, 500);
      expect(r.winRate + r.tieRate + r.lossRate).toBeCloseTo(1, 5); // 守恒
      expect(r.winRate).toBeGreaterThan(0.55); // AKo vs 全范围应显著领先
      expect(r.winRate).toBeLessThan(0.75);
      const d = core.evaluateDecision(r.winRate + r.tieRate * 0.5, 20, 10, 15, 'standard');
      expect(['fold', 'call', 'raise']).toContain(d.adviceLevel);
    } finally {
      handVec.delete(); boardVec.delete(); oppVec.delete();
    }
  }, 30000);
});
