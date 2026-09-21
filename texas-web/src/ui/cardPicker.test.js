import { describe, it, expect } from 'vitest';
import { renderCardPicker, handleKeyEntry } from './cardPicker.js';
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

  // ---- 公共牌自动提交（一条街=3/4/5张，选满即提交，无确认按钮）----
  it('slots=5 选3张 → onPick 立即收到3张（自动提交）', () => {
    document.body.innerHTML = '<div id="cp"></div>';
    let picked = null;
    renderCardPicker(document.getElementById('cp'), { slots: 5, onPick: c => (picked = c) });
    const btns = [...document.querySelectorAll('#cp button[data-card]')];
    btns.find(b => b.dataset.card === 'Ah').click();
    expect(picked).toBeNull(); // 1张不提交
    btns.find(b => b.dataset.card === 'Kd').click();
    expect(picked).toBeNull(); // 2张不提交
    btns.find(b => b.dataset.card === '7c').click();
    expect(picked).toEqual(['Ah', 'Kd', '7c']); // 满3张立即提交
  });

  it('逐街补填：initial=3 再选1张提交4张；重建(initial=4)再选1张提交5张', () => {
    document.body.innerHTML = '<div id="cp"></div>';
    const picks = [];
    // 翻牌已提交3张 → 回显重建
    renderCardPicker(document.getElementById('cp'), { slots: 5, initial: ['Ah', 'Kd', '7c'], onPick: c => picks.push(c) });
    [...document.querySelectorAll('#cp button[data-card]')].find(b => b.dataset.card === '2h').click();
    expect(picks).toEqual([['Ah', 'Kd', '7c', '2h']]); // 转牌：第4张立即提交
    document.body.innerHTML = '<div id="cp"></div>';
    renderCardPicker(document.getElementById('cp'), { slots: 5, initial: ['Ah', 'Kd', '7c', '2h'], onPick: c => picks.push(c) });
    [...document.querySelectorAll('#cp button[data-card]')].find(b => b.dataset.card === '9s').click();
    expect(picks[1]).toEqual(['Ah', 'Kd', '7c', '2h', '9s']); // 河牌：第5张立即提交
  });

  it('键盘录入同样按街长自动提交（slots=5 第3张即提交）；slots=2 手牌不受影响', () => {
    document.body.innerHTML = '<div id="cp"></div>';
    let hole = null, board = null;
    renderCardPicker(document.getElementById('cp'), { slots: 2, onPick: c => (hole = c) });
    renderCardPicker(document.getElementById('cp'), { slots: 5, onPick: c => (board = c) });
    // 手牌：Q♠ + K♠ → 满2张提交（键盘先落手牌选牌器；花色数字键只有1不与rank冲突，故全用黑桃）
    handleKeyEntry('Q'); handleKeyEntry('1'); handleKeyEntry('K'); handleKeyEntry('1');
    expect(hole).toEqual(['Qs', 'Ks']);
    expect(board).toBeNull();
    // 公共牌：5♠ 6♠ 7♠ → 第3张立即提交
    handleKeyEntry('5'); handleKeyEntry('1'); handleKeyEntry('6'); handleKeyEntry('1'); handleKeyEntry('7'); handleKeyEntry('1');
    expect(board).toEqual(['5s', '6s', '7s']);
  });
});
