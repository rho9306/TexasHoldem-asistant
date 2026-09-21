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

  // ---- 确认按钮（仅 slots=5 公共牌选牌器）：手机用户选部分牌后可提交 ----
  function findConfirmBtn() {
    return [...document.querySelectorAll('#cp .card > button')].pop() || null;
  }

  it('slots=5 选3张 → 确认按钮可见，点击后 onPick 收到恰好那3张', () => {
    document.body.innerHTML = '<div id="cp"></div>';
    let picked = null;
    renderCardPicker(document.getElementById('cp'), { slots: 5, onPick: c => (picked = c) });
    const btns = [...document.querySelectorAll('#cp button[data-card]')];
    const confirmBtn = findConfirmBtn();
    expect(confirmBtn).toBeTruthy();
    expect(confirmBtn.style.display).toBe('none'); // 0张 → 隐藏
    btns.find(b => b.dataset.card === 'Ah').click();
    btns.find(b => b.dataset.card === 'Kd').click();
    btns.find(b => b.dataset.card === '7c').click();
    expect(confirmBtn.style.display).toBe('');      // 3张 → 可见
    expect(confirmBtn.textContent).toContain('3张');
    confirmBtn.click();
    expect(picked).toEqual(['Ah', 'Kd', '7c']);     // 恰好那3张
  });

  it('slots=2 手牌选牌器无确认按钮；slots=5 选满5张自动提交后按钮隐藏', () => {
    document.body.innerHTML = '<div id="cp"></div>';
    let hole = null, board = null;
    renderCardPicker(document.getElementById('cp'), { slots: 2, onPick: c => (hole = c) });
    renderCardPicker(document.getElementById('cp'), { slots: 5, onPick: c => (board = c) });
    // 手牌选牌器（第一个）不应有确认按钮
    expect(document.querySelectorAll('#cp .card')[0].querySelectorAll('.card > button').length).toBe(0);
    const btns = [...document.querySelectorAll('#cp .card')[1].querySelectorAll('button[data-card]')]; // 公共牌实例
    const confirmBtn = findConfirmBtn();
    expect(confirmBtn.style.display).toBe('none');
    for (const card of ['2h', '4c', '6d', '8s', 'Th']) btns.find(b => b.dataset.card === card).click();
    expect(board).toEqual(['2h', '4c', '6d', '8s', 'Th']); // 选满自动提交，无需按钮
    expect(confirmBtn.style.display).toBe('none');         // 此时按钮隐藏
  });

  it('取消选中到0张 → 确认按钮隐藏；再选可重新确认', () => {
    document.body.innerHTML = '<div id="cp"></div>';
    const picks = [];
    renderCardPicker(document.getElementById('cp'), { slots: 5, onPick: c => picks.push(c) });
    const ks = [...document.querySelectorAll('#cp button[data-card]')].find(b => b.dataset.card === 'Ks');
    const confirmBtn = findConfirmBtn();
    ks.click();
    expect(confirmBtn.style.display).toBe('');
    ks.click(); // 取消到0张
    expect(confirmBtn.style.display).toBe('none');
    ks.click(); // 再选 → 按钮回来，可重新确认
    expect(confirmBtn.style.display).toBe('');
    confirmBtn.click();
    expect(picks).toEqual([['Ks']]);
  });
});
