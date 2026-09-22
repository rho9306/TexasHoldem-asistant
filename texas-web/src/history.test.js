import { describe, it, expect, beforeEach, vi } from 'vitest';
import { weaknessGroups } from './ui/weaknessMatrix.js';
import { cumulativeSeries } from './ui/evCurve.js';
import { isDeviated, isLoss, renderHistoryPage } from './ui/historyList.js';
import { saveSessions, saveHands } from './storage.js';
const H = o => ({ followedAdvice: true, result: { net: 0 }, heroPosition: 'BTN',
  hand: ['As', 'Kd'], street: 'preflop',
  opponents: [{ typeSnapshot: 'TAG' }], texture: '干燥', ...o });
describe('history logic', () => {
  it('筛选', () => {
    expect(isDeviated(H({ followedAdvice: false }))).toBe(true);
    expect(isLoss(H({ result: { net: -10 } }))).toBe(true);
  });
  it('弱点分组：位置×对手×纹理', () => {
    const g = weaknessGroups([H(), H({ followedAdvice: false }), H({ heroPosition: 'BB' })]);
    expect(g.length).toBe(2);
    const btn = g.find(x => x.position === 'BTN');
    expect(btn.count).toBe(2);
    expect(btn.hitRate).toBeCloseTo(0.5);
  });
  it('EV双曲线累计', () => {
    const s = cumulativeSeries([H({ result: { net: 10 } }), H({ result: { net: -4 } })]);
    expect(s.at(-1).actual).toBe(6);
    expect(s[0].theory).toBeTypeOf('number');
  });
});

describe('删除会话接线（批次11）', () => {
  beforeEach(() => { localStorage.clear(); document.body.innerHTML = '<div id="hp"></div>'; });
  const seed = () => {
    saveSessions([{ id: 's1', name: '会话甲', date: '2026-09-22' }, { id: 's2', name: '会话乙', date: '2026-09-22' }]);
    saveHands([H({ id: 'h1', sessionId: 's1' }), H({ id: 'h2', sessionId: 's2' })]);
  };
  it('点会话组删除按钮 → onDeleteSession(该会话id)；未分组无删除钮', async () => {
    seed();
    vi.stubGlobal('confirm', () => true); // happy-dom 无 window.confirm，stubGlobal 定义之
    const deleted = [];
    renderHistoryPage(document.getElementById('hp'), { onDeleteSession: id => deleted.push(id) });
    const dels = [...document.querySelectorAll('#hp details summary button')];
    expect(dels.length).toBe(2); // 只有真实会话有删除钮
    dels[0].click();
    expect(deleted).toEqual(['s1']);
    vi.unstubAllGlobals();
  });
  it('confirm 取消 → 不触发删除', () => {
    seed();
    vi.stubGlobal('confirm', () => false);
    let called = false;
    renderHistoryPage(document.getElementById('hp'), { onDeleteSession: () => { called = true; } });
    document.querySelector('#hp details summary button').click();
    expect(called).toBe(false);
    vi.unstubAllGlobals();
  });
});
