import { describe, it, expect } from 'vitest';
import { renderPotForm } from './potForm.js';
describe('potForm', () => {
  it('非法输入传NaN并红框', () => {
    document.body.innerHTML = '<div id="pf"></div>';
    let v = null;
    renderPotForm(document.getElementById('pf'), x => (v = x));
    const pot = document.querySelector('#pf input[name=pot]');
    pot.value = '-5'; pot.dispatchEvent(new Event('input'));
    expect(v.pot).toBeNaN();
    expect(pot.classList.contains('invalid')).toBe(true);
  });
});
