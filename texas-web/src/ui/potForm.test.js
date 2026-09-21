import { describe, it, expect } from 'vitest';
import { renderPotForm } from './potForm.js';
import { state, setPatch } from '../state.js';

function render() {
  setPatch({ pot: 0, call: 0, myStack: 100, oppStack: 100 }); // 隔离跨测试的 state 污染
  document.body.innerHTML = '<div id="pf"></div>';
  let v = null;
  renderPotForm(document.getElementById('pf'), x => { setPatch(x); v = x; }); // 走真实 setPatch 管线（守卫保留语义依赖 state）
  return {
    get: () => v,
    input: (name, val) => {
      const el = document.querySelector(`#pf input[name=${name}]`);
      el.value = val; el.dispatchEvent(new Event('input'));
    },
    clickPreset: label => {
      [...document.querySelectorAll('#pf button[data-call-preset]')].find(b => b.dataset.callPreset === label).click();
    },
  };
}

describe('potForm', () => {
  it('非法输入保留原state值并红框（不写NaN）', () => {
    const t = render();
    t.input('pot', '-5');
    const v = t.get();
    expect(v.pot).toBe(state.pot);
    expect(v.pot).not.toBeNaN();
    expect(document.querySelector('#pf input[name=pot]').classList.contains('invalid')).toBe(true);
  });
  it('输入框初始为空，placeholder 提示默认值；对手筹码框已删除', () => {
    document.body.innerHTML = '<div id="pf"></div>';
    setPatch({ pot: 120, call: 30, myStack: 500, oppStack: 480 });
    renderPotForm(document.getElementById('pf'), () => {});
    // 不再预填 state 值：显示空，placeholder 提示生效默认值
    expect(document.querySelector('#pf input[name=pot]').value).toBe('');
    expect(document.querySelector('#pf input[name=pot]').placeholder).toBe('默认 0');
    expect(document.querySelector('#pf input[name=call]').placeholder).toBe('默认 0');
    expect(document.querySelector('#pf input[name=myStack]').placeholder).toBe('默认 100');
    expect(document.querySelector('#pf input[name=oppStack]')).toBeNull(); // 对手筹码框已删除
  });
  it('清空输入框 → 回到默认值（pot=0/call=0/myStack=100）', () => {
    const t = render();
    t.input('pot', '50');
    expect(t.get().pot).toBe(50);
    t.input('pot', ''); // 清空 = 默认 0
    expect(t.get().pot).toBe(0);
    t.input('call', '20');
    t.input('call', '');
    expect(t.get().call).toBe(0);
    t.input('myStack', '250');
    t.input('myStack', '');
    expect(t.get().myStack).toBe(100);
    expect(t.get().oppStack).toBe(100); // 同步不变
  });
  it('对手筹码同步：改我的筹码 → onChange patch 携带 oppStack 同值', () => {
    const t = render();
    t.input('myStack', '250');
    const v = t.get();
    expect(v.myStack).toBe(250);
    expect(v.oppStack).toBe(250); // effectiveStack=min(my,opp) → 结果=我的后手
  });
  it('快捷档：½池（pot=10 → call=5）、⅓池取整到0.5、满池、全压=myStack', () => {
    const t = render();
    t.input('pot', '10');
    t.clickPreset('½池');
    expect(document.querySelector('#pf input[name=call]').value).toBe('5');
    expect(t.get().call).toBe(5);
    t.input('pot', '10');
    t.clickPreset('⅓池'); // 3.33 → 3.5
    expect(t.get().call).toBe(3.5);
    t.clickPreset('满池');
    expect(t.get().call).toBe(10);
    t.input('myStack', '80');
    t.clickPreset('全压');
    expect(t.get().call).toBe(80);
  });
  it('清空底池后快捷档按默认 pot=0 计算；非法底池守卫', () => {
    const t = render();
    t.input('pot', ''); // 清空底池 = 默认 0
    t.clickPreset('½池');
    expect(t.get().call).toBe(0); // ½ × 0 = 0
    t.input('pot', '10');
    t.input('pot', '-3'); // 非法 → state.pot 保留原值 10
    t.input('call', '7');
    t.clickPreset('满池');
    expect(t.get().call).toBe(10); // pot 非法守卫 → 快捷档仍基于旧 state 值
  });
});
