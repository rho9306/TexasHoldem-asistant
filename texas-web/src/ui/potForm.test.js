import { describe, it, expect } from 'vitest';
import { renderPotForm } from './potForm.js';
import { state, setPatch } from '../state.js';

function render() {
  setPatch({ pot: 0, call: 0, myStack: 100, oppStack: 100 }); // 隔离跨测试的 state 污染
  document.body.innerHTML = '<div id="pf"></div>';
  let v = null;
  renderPotForm(document.getElementById('pf'), x => (v = x));
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
  it('从state预填输入框value（重启回填/重渲不丢已填金额）', () => {
    document.body.innerHTML = '<div id="pf"></div>';
    setPatch({ pot: 120, call: 30, myStack: 500, oppStack: 480 });
    renderPotForm(document.getElementById('pf'), () => {});
    expect(document.querySelector('#pf input[name=pot]').value).toBe('120');
    expect(document.querySelector('#pf input[name=call]').value).toBe('30');
    expect(document.querySelector('#pf input[name=myStack]').value).toBe('500');
    expect(document.querySelector('#pf input[name=oppStack]')).toBeNull(); // 对手筹码框已删除
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
  it('底池为空/非法时快捷档无效果（call 不变）', () => {
    const t = render();
    t.input('pot', ''); // 清空底池（空=非法）
    t.input('call', '7');
    t.clickPreset('½池');
    expect(t.get().call).toBe(7); // pot 为空 → 无效果
    t.input('pot', '-3');
    t.clickPreset('满池');
    expect(t.get().call).toBe(7); // pot 非法 → 无效果
  });
});
