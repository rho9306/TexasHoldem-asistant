import { describe, it, expect, beforeEach, vi } from 'vitest';

// tablePage 依赖 state/storage，先备好挂载点（模块加载不碰 DOM，但保持与 main.test 同套路）
vi.hoisted(() => {
  document.body.innerHTML = '';
});

import { state, setPatch } from '../state.js';
import { seatPositionName, heroOffset, openTablePage, openFullScreen } from './tablePage.js';
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
