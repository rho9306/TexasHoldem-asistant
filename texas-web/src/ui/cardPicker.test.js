import { describe, it, expect } from 'vitest';
import { renderCardPicker } from './cardPicker.js';
describe('cardPicker', () => {
  it('选满张数后回调，重复牌置灰', () => {
    document.body.innerHTML = '<div id="cp"></div>';
    let picked = null;
    renderCardPicker(document.getElementById('cp'), {
      slots: 2, usedCards: ['As'], onPick: c => (picked = c),
    });
    const btns = [...document.querySelectorAll('#cp button[data-card]')];
    expect(btns.find(b => b.dataset.card === 'As').disabled).toBe(true);
    btns.find(b => b.dataset.card === 'Ks').click();
    btns.find(b => b.dataset.card === 'Qd').click();
    expect(picked).toEqual(['Ks', 'Qd']);
  });
});
