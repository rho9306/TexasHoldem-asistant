import { describe, it, expect } from 'vitest';
import { renderPotForm } from './potForm.js';
import { state, setPatch } from '../state.js';
describe('potForm', () => {
  it('非法输入保留原state值并红框（不写NaN）', () => {
    document.body.innerHTML = '<div id="pf"></div>';
    let v = null;
    renderPotForm(document.getElementById('pf'), x => (v = x));
    const pot = document.querySelector('#pf input[name=pot]');
    pot.value = '-5'; pot.dispatchEvent(new Event('input'));
    expect(v.pot).toBe(state.pot);
    expect(v.pot).not.toBeNaN();
    expect(pot.classList.contains('invalid')).toBe(true);
  });
  it('从state预填输入框value（重启回填/重渲不丢已填金额）', () => {
    document.body.innerHTML = '<div id="pf"></div>';
    setPatch({ pot: 120, call: 30, myStack: 500, oppStack: 480 });
    renderPotForm(document.getElementById('pf'), () => {});
    expect(document.querySelector('#pf input[name=pot]').value).toBe('120');
    expect(document.querySelector('#pf input[name=call]').value).toBe('30');
    expect(document.querySelector('#pf input[name=myStack]').value).toBe('500');
    expect(document.querySelector('#pf input[name=oppStack]').value).toBe('480');
  });
});
