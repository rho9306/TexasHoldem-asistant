import { describe, it, expect, beforeEach, vi } from 'vitest';

// tablePage 依赖 state/storage，先备好挂载点（模块加载不碰 DOM，但保持与 main.test 同套路）
vi.hoisted(() => {
  document.body.innerHTML = '';
});

import { state, setPatch } from '../state.js';
import { seatPositionName, heroOffset, openTablePage, openFullScreen, renderTableInto, nextRound } from './tablePage.js';
import { opponentDefaults } from './opponentCards.js';

beforeEach(() => {
  document.body.innerHTML = '';
  setPatch({ playerCount: 6, opponents: [], heroPosition: '' });
});

describe('seatPositionName 位置映射（全分支）', () => {
  it('庄家=英雄（off=0）→ BTN', () => {
    expect(seatPositionName(0, 6)).toBe('BTN');
  });
  it('off=1 → SB；off=2 → BB（各人数一致）', () => {
    for (const n of [2, 3, 4, 6, 9]) {
      expect(seatPositionName(1, n)).toBe('SB');
      if (n >= 3) expect(seatPositionName(2, n)).toBe('BB');
    }
  });
  it('N=6 各庄家座位手算抽查（off>=3 → positionsFor[off-3]）', () => {
    // 6max 前排 = ['UTG','MP','CO',...]
    expect(seatPositionName(3, 6)).toBe('UTG');
    expect(seatPositionName(4, 6)).toBe('MP');
    expect(seatPositionName(5, 6)).toBe('CO'); // 简报案例：庄家=英雄下家（座位1，off=5）→CO
  });
  it('N=9 off=3..5 → UTG/UTG1/UTG2', () => {
    expect(seatPositionName(3, 9)).toBe('UTG');
    expect(seatPositionName(4, 9)).toBe('UTG1');
    expect(seatPositionName(5, 9)).toBe('UTG2');
    expect(seatPositionName(8, 9)).toBe('CO');
  });
  it('单挑简化口径：off0→BTN，off1→SB（无BB）', () => {
    expect(seatPositionName(0, 2)).toBe('BTN');
    expect(seatPositionName(1, 2)).toBe('SB');
  });
  it('heroOffset 负数归一化', () => {
    expect(heroOffset(0, 6)).toBe(0);
    expect(heroOffset(5, 6)).toBe(1);
    expect(heroOffset(1, 6)).toBe(5);
  });
});

describe('牌桌页渲染冒烟', () => {
  it('人数改 5 → 4 个对手座 + 1 个英雄座，state 同步', () => {
    const onBack = vi.fn();
    const { root } = openTablePage({ onBack });
    expect(root.classList.contains('fs-overlay')).toBe(true);
    const seatsBox = root.querySelector('.table-seats');
    // 默认 6 人 → 6 座
    expect(seatsBox.children.length).toBe(6);
    // 点人数 5
    const chip5 = [...root.querySelectorAll('.table-bar .chip')].find(b => b.textContent === '5');
    chip5.click();
    expect(state.playerCount).toBe(5);
    expect(state.opponents.length).toBe(4);
    expect(seatsBox.children.length).toBe(5);
    // 英雄座显示「我」+ 位置徽章
    const hero = seatsBox.children[0];
    expect(hero.textContent).toContain('我');
  });
  it('点人数 8 → 7 个对手（自动补 TAG 默认），8 座', () => {
    const { root } = openTablePage({});
    const chip8 = [...root.querySelectorAll('.table-bar .chip')].find(b => b.textContent === '8');
    chip8.click();
    expect(state.playerCount).toBe(8);
    expect(state.opponents.length).toBe(7);
    expect(root.querySelector('.table-seats').children.length).toBe(8);
  });
  it('开始下一轮 → 庄家牌移动 + 英雄位置重算 + 轮次 +1', () => {
    const { root } = openTablePage({});
    const next = [...root.querySelectorAll('button')].find(b => b.textContent === '开始下一轮');
    const dealerAt = () => [...root.querySelectorAll('.table-seat')].findIndex(s => s.classList.contains('is-dealer'));
    expect(dealerAt()).toBe(0); // 初始庄家=英雄座
    next.click();
    expect(dealerAt()).toBe(1);
    // 庄家=座位1（英雄下家）→ off=5 → CO（6人桌）
    expect(state.heroPosition).toBe('CO');
    expect(root.querySelector('.table-bar .num').textContent).toContain('第 2 轮');
  });
  it('座位菜单：设对手类型并落盘（持久化不抛错）', () => {
    setPatch({ opponents: [opponentDefaults('TAG'), opponentDefaults('LAG')] });
    const { root } = openTablePage({});
    root.querySelectorAll('.table-seat')[1].click(); // 对手1
    const menu = root.querySelector('.seat-menu');
    expect(menu.style.display).toBe('flex');
    const lag = [...menu.querySelectorAll('button')].find(b => b.textContent === '松凶');
    lag.click();
    expect(state.opponents[0].type).toBe('LAG');
    expect(menu.style.display).toBe('none');
  });
  it('返回按钮清理浮层并回调 onBack', () => {
    const onBack = vi.fn();
    const { root } = openTablePage({ onBack });
    root.querySelector('.fs-back').click();
    expect(document.querySelector('.fs-overlay')).toBeNull();
    expect(onBack).toHaveBeenCalled();
  });
  it('openFullScreen 重复打开时清理旧浮层', () => {
    openFullScreen('A', () => {});
    openFullScreen('B', () => {});
    expect(document.querySelectorAll('.fs-overlay').length).toBe(1);
  });
});

// 注意：dealer/轮次为模块级会话内存，跨用例累积——本组断言一律基于「渲染读出的当前值」动态推算
describe('renderTableInto 内嵌挂载 + nextRound 导出', () => {
  /** 在 body 上挂一个内嵌表格，返回 { box, dealerAt, roundNow } */
  function mount() {
    const box = document.createElement('div');
    document.body.appendChild(box);
    renderTableInto(box, {});
    const dealerAt = () => [...box.querySelectorAll('.table-seat')].findIndex(s => s.classList.contains('is-dealer'));
    const roundNow = () => parseInt(box.querySelector('.table-bar .num').textContent.match(/第 (\d+) 轮/)[1], 10);
    return { box, dealerAt, roundNow };
  }

  it('内嵌挂载冒烟：N 个座位 + 英雄座「我」 + 下一轮按钮 + 轮次标签', () => {
    setPatch({ playerCount: 6, opponents: [], heroPosition: '' });
    const { box, dealerAt } = mount();
    expect(box.querySelectorAll('.table-seat').length).toBe(6);
    expect(box.querySelector('.table-seat').textContent).toContain('我'); // 英雄固定座位 0
    expect([...box.querySelectorAll('button')].some(b => b.textContent === '开始下一轮')).toBe(true);
    expect(box.querySelector('.table-bar .num').textContent).toContain(`庄家座位 ${dealerAt() + 1}`);
    box.remove(); // 出清 mounted 登记
  });

  it('nextRound()：庄家前进一位、heroPosition 重算、轮次 +1', () => {
    setPatch({ playerCount: 6, opponents: [], heroPosition: '' });
    const { box, dealerAt, roundNow } = mount();
    const d0 = dealerAt(), r0 = roundNow();
    nextRound();
    expect(dealerAt()).toBe((d0 + 1) % 6);
    expect(roundNow()).toBe(r0 + 1);
    expect(state.heroPosition).toBe(seatPositionName(heroOffset((d0 + 1) % 6, 6), 6));
    box.remove();
  });

  it('内嵌表格点「开始下一轮」与调用 nextRound() 等价', () => {
    setPatch({ playerCount: 6, opponents: [], heroPosition: '' });
    const { box, dealerAt, roundNow } = mount();
    const d0 = dealerAt(), r0 = roundNow();
    [...box.querySelectorAll('button')].find(b => b.textContent === '开始下一轮').click();
    expect(dealerAt()).toBe((d0 + 1) % 6);   // 按钮与导出函数走同一份 dealer 状态
    expect(roundNow()).toBe(r0 + 1);
    expect(state.heroPosition).toBe(seatPositionName(heroOffset((d0 + 1) % 6, 6), 6));
    box.remove();
  });

  it('多个已挂载视图共享 dealer 状态：nextRound 后全部同步', () => {
    setPatch({ playerCount: 4, opponents: [], heroPosition: '' });
    const a = mount(), b = mount();
    const d0 = a.dealerAt();
    nextRound();
    expect(a.dealerAt()).toBe((d0 + 1) % 4);
    expect(b.dealerAt()).toBe((d0 + 1) % 4); // 内嵌与浮层两实例同一步
    a.box.remove(); b.box.remove();
  });
});

// 放在文件末尾：dealerSeat/roundCount 为模块级累积状态，新用例统一放这里（批次14审查建议）
describe('nextRound 新手清空（批次14，用户反馈）', () => {
  it('下一轮=新手：清空手牌/公共牌/底池三数字/结果/策略，位置换算照常', () => {
    setPatch({
      hand: ['As', 'Kd'], board: ['Qh', 'Jd', 'Ts'],
      pot: 30, call: 10, myStack: 80, oppStack: 80, result: { winRate: 0.6 }, strategy: { spr: {} },
      playerCount: 6, opponents: [opponentDefaults()], heroPosition: 'BTN',
    });
    nextRound();
    expect(state.hand).toEqual([]);
    expect(state.board).toEqual([]);
    expect(state.pot).toBe(0);
    expect(state.call).toBe(0);
    expect(state.myStack).toBe(100);
    expect(state.oppStack).toBe(100); // 审查回环：不重置会残留 effectiveStack 脏值
    expect(state.result).toBeNull();
    expect(state.strategy).toBeNull();
    // 轮转正确性由上方相对断言用例覆盖；此处只断言仍是 6max 合法位置
    expect(['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB']).toContain(state.heroPosition);
  });
  it('对手档案（含观察/标定）与会话跨手保留；对手数按人数补齐', () => {
    const ops = Array.from({ length: 5 }, (_, i) => i
      ? opponentDefaults()
      : { ...opponentDefaults('TAG'), name: '老王', handsSeen: 25, vpipObs: 40 });
    setPatch({ playerCount: 6, opponents: ops, heroPosition: 'BTN', sessionId: 's1' });
    nextRound();
    expect(state.opponents).toHaveLength(5); // commit 按 n-1 补齐
    expect(state.opponents[0].name).toBe('老王');
    expect(state.opponents[0].vpipObs).toBe(40);
    expect(state.sessionId).toBe('s1');
  });
});
