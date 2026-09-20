import { describe, it, expect } from 'vitest';
import { positionsFor, renderPositionBar } from './positionBar.js';

describe('positionsFor', () => {
  it('人数映射', () => {
    expect(positionsFor(2)).toEqual(['BTN', 'SB']);
    expect(positionsFor(3)).toEqual(['BTN', 'SB', 'BB']);
    expect(positionsFor(4)).toEqual(['CO', 'BTN', 'SB', 'BB']);
    expect(positionsFor(5)).toEqual(['MP', 'CO', 'BTN', 'SB', 'BB']);
    expect(positionsFor(6)).toEqual(['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB']);
    expect(positionsFor(7)).toEqual(['UTG', 'UTG1', 'MP', 'CO', 'BTN', 'SB', 'BB']);
    expect(positionsFor(8)).toEqual(['UTG', 'UTG1', 'MP', 'MP1', 'CO', 'BTN', 'SB', 'BB']);
    expect(positionsFor(9).length).toBe(9);
  });
  it('越界钳制', () => {
    expect(positionsFor(1)).toEqual(['BTN', 'SB']);
    expect(positionsFor(99).length).toBe(9);
  });
});

describe('renderPositionBar', () => {
  it('点击位置 chip 触发 onChange', () => {
    document.body.innerHTML = '<div id="pb"></div>';
    const calls = [];
    const bar = renderPositionBar(document.getElementById('pb'), x => calls.push(x));
    bar.renderChips(positionsFor(6), 'BTN');
    const chips = [...document.querySelectorAll('#pb .pos-chips .chip')];
    expect(chips.length).toBe(6);
    chips[3].click();
    expect(calls).toEqual([{ heroPosition: 'BTN' }]);
  });
  it('stepper：无 getValues 按 0 起，clamp 边界', () => {
    document.body.innerHTML = '<div id="pb"></div>';
    const calls = [];
    renderPositionBar(document.getElementById('pb'), x => calls.push(x));
    const btn = k => document.querySelector(`.stp[data-k="${k}"][data-d="1"]`);
    btn('raisesBefore').click();
    expect(calls.at(-1)).toEqual({ raisesBefore: 1 });
    // limpers 下限：0 时点 − 不越界
    document.querySelector('.stp[data-k="limpers"][data-d="-1"]').click();
    expect(calls.at(-1)).toEqual({ limpers: 0 });
  });
  it('stepper：getValues 提供当前值 + renderValues 刷新', () => {
    document.body.innerHTML = '<div id="pb"></div>';
    const calls = [];
    const vals = { raisesBefore: 2, limpers: 1 };
    renderPositionBar(
      document.getElementById('pb'),
      x => calls.push(x),
      () => vals
    );
    document.querySelector('.stp[data-k="raisesBefore"][data-d="1"]').click();
    expect(calls.at(-1)).toEqual({ raisesBefore: 2 }); // clamp 到上限
    document.querySelector('.stp[data-k="limpers"][data-d="-1"]').click();
    expect(calls.at(-1)).toEqual({ limpers: 0 });
  });
});
