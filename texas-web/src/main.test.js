import { describe, it, expect, vi, beforeEach } from 'vitest';

// main.js 在模块加载时即操作 DOM，需先准备挂载点（vi.hoisted 先于 import 执行）
vi.hoisted(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

// mock WASM loader：stub embind 向量与引擎函数（装配级测试，不依赖真 wasm）
vi.mock('./wasm/pokerCore.js', () => {
  const vec = () => class { constructor() { this.a = []; } push_back(x) { this.a.push(x); } delete() {} };
  return {
    getCore: vi.fn(async () => ({
      VectorString: vec(),
      VectorU8: vec(),
      VectorVectorU8: class { constructor() { this.a = []; } push_back(x) { this.a.push(x); } delete() {} },
      calculateEquityV2Js: () => ({ winRate: 0.6, tieRate: 0.05, lossRate: 0.35, rangeStats: [] }),
      evaluateDecision: () => ({ advice: 'call', adviceLevel: 'call', evCall: 1.5, evRaise: 0.8, requiredEquity: 0.2 }),
    })),
  };
});

import { state, setPatch } from './state.js';
import { refresh, openOpponentDrawer } from './main.js';
import { opponentDefaults } from './ui/opponentCards.js';
import { getCore } from './wasm/pokerCore.js';

const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  setPatch({
    hand: ['As', 'Kd'], board: [], playerCount: 6, heroPosition: 'BTN',
    raisesBefore: 0, limpers: 0,
    opponents: [opponentDefaults('TAG')],
    pot: 30, call: 10, myStack: 100, oppStack: 100,
    result: null, strategy: null,
  });
});

describe('计算页装配（Task 19）', () => {
  it('渲染计算页后 recalc 产出 state.result，策略包非空，street-badge 接通', async () => {
    refresh();
    expect(document.getElementById('street-badge').textContent).toBe('翻前');
    await flush();
    expect(state.result).not.toBeNull();
    expect(state.result.winRate).toBe(0.6);
    expect(state.result.advice).toBe('call');
    expect(state.strategy).not.toBeNull();
    expect(state.strategy.percentileText).toContain('AK');
    expect(state.strategy.gtoTitle).toContain('BTN');
  });

  it('承接项(a)：call 超过有效筹码 → result.error 提示且不调用引擎', async () => {
    await flush();
    vi.mocked(getCore).mockClear();
    setPatch({ call: 200 });           // 有效筹码 100
    refresh();
    await flush();
    expect(state.result?.error).toContain('跟注不能超过有效筹码');
    expect(getCore).not.toHaveBeenCalled();
    expect(state.strategy).toBeNull();
  });

  it('承接项(抽屉)：编辑对手名称保存后 state.opponents[0].name 更新', async () => {
    const o = state.opponents[0];
    openOpponentDrawer(o);
    const dlg = document.getElementById('opp-drawer');
    expect(dlg).not.toBeNull();
    dlg.querySelector('#od-name').value = '  老王  ';
    // 类型快选按钮：点击同步滑条为 TYPE_DEFAULTS
    const lagBtn = [...dlg.querySelectorAll('#od-types button')].find(b => b.textContent === '松凶');
    lagBtn.click();
    expect(dlg.querySelector('#od-loose').value).toBe('62');
    expect(dlg.querySelector('#od-aggr').value).toBe('75');
    dlg.querySelector('#od-save').click();
    await flush();
    expect(state.opponents[0].name).toBe('老王');
    expect(state.opponents[0].looseness).toBe(62);
    expect(state.opponents[0].aggression).toBe(75);
    expect(state.opponents[0].type).toBe('LAG');
    expect(document.getElementById('opp-drawer')).toBeNull();
  });

  it('抽屉：保存空名称回落类型标签；删除移除对手', async () => {
    const o = state.opponents[0];
    openOpponentDrawer(o);
    let dlg = document.getElementById('opp-drawer');
    dlg.querySelector('#od-name').value = '   ';
    dlg.querySelector('#od-save').click();
    await flush();
    expect(state.opponents[0].name).toBe('');
    // 删除
    openOpponentDrawer(state.opponents[0]);
    dlg = document.getElementById('opp-drawer');
    dlg.querySelector('#od-del').click();
    await flush();
    expect(state.opponents.length).toBe(0);
  });
});
