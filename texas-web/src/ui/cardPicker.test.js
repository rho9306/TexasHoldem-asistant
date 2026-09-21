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

  it('点击未提交的已选牌 → 本地取消选中，onPick 不调用', () => {
    document.body.innerHTML = '<div id="cp"></div>';
    let calls = 0;
    renderCardPicker(document.getElementById('cp'), { slots: 2, onPick: () => calls++ });
    const ks = [...document.querySelectorAll('#cp button[data-card]')].find(b => b.dataset.card === 'Ks');
    ks.click();          // 选中（未满 slots，不提交）
    expect(ks.style.opacity).toBe('0.3');
    ks.click();          // 再点 → 取消
    expect(ks.style.opacity).toBe('');
    expect(calls).toBe(0);
    ks.click();          // 取消后可重新选
    expect(ks.style.opacity).toBe('0.3');
  });

  it('点击已提交牌（initial 回显）→ onPick 收到缩减后的集合', () => {
    document.body.innerHTML = '<div id="cp"></div>';
    let picked = null;
    renderCardPicker(document.getElementById('cp'), {
      slots: 2, usedCards: ['As', 'Kd'], initial: ['As', 'Kd'], onPick: c => (picked = c),
    });
    const as = [...document.querySelectorAll('#cp button[data-card]')].find(b => b.dataset.card === 'As');
    expect(as.disabled).toBe(false);  // 已提交牌可点击取消（非他区占用置灰）
    as.click();
    expect(picked).toEqual(['Kd']);   // 立即提交缩减集合
    // 他区占用的牌保持置灰不可点
    renderCardPicker(document.getElementById('cp'), {
      slots: 2, usedCards: ['Ah'], initial: [], onPick: () => {},
    });
    const ah = [...document.querySelectorAll('#cp .card')][1].querySelector('[data-card="Ah"]');
    expect(ah.disabled).toBe(true);
    ah.click();
    expect(picked).toEqual(['Kd']);   // 不受影响
  });
});
