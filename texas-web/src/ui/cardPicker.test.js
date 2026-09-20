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

  it('双实例互不串扰', () => {
    document.body.innerHTML = '<div id="cp"></div>';
    let hole = null;
    let board = null;
    renderCardPicker(document.getElementById('cp'), { slots: 2, onPick: c => (hole = c) });
    renderCardPicker(document.getElementById('cp'), { slots: 3, onPick: c => (board = c) });
    const wraps = [...document.querySelectorAll('#cp .card')];
    const click = (wrapIdx, card) =>
      [...wraps[wrapIdx].querySelectorAll('button[data-card]')].find(b => b.dataset.card === card).click();
    click(0, 'As'); click(1, '2h'); click(0, '3d'); click(1, '4c'); click(1, '5s');
    expect(hole).toEqual(['As', '3d']);
    expect(board).toEqual(['2h', '4c', '5s']);
  });
});
