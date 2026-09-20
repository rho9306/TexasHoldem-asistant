import { describe, it, expect } from 'vitest';
import { opponentDefaults, renderOpponentCards } from './opponentCards.js';

describe('opponentDefaults', () => {
  it('来自类型默认', () => {
    const d = opponentDefaults('LAG');
    expect(d.looseness).toBe(62);
    expect(d.aggression).toBe(75);
    expect(d.type).toBe('LAG');
    expect(d.handsSeen).toBe(0);
    expect(d.vpipObs).toBeNull();
    expect(d.id).toMatch(/^opp-/);
  });
  it('未知类型回退 TAG', () => {
    expect(opponentDefaults('???').looseness).toBe(35);
  });
});

describe('renderOpponentCards', () => {
  it('渲染卡片/徽章/VPIP观察值与按钮回调', () => {
    document.body.innerHTML = '<div id="oc"></div>';
    const log = [];
    const opps = [
      { ...opponentDefaults('TAG'), name: '张三', handsSeen: 25, vpipObs: 18 },
      { ...opponentDefaults('LAG'), handsSeen: 10, vpipObs: 50 }, // 手数不足不显示 VPIP
    ];
    renderOpponentCards(document.getElementById('oc'), {
      opponents: opps,
      onEdit: o => log.push(['edit', o.type]),
      onAdd: () => log.push(['add']),
      onPreset: () => log.push(['preset']),
    });
    const cards = [...document.querySelectorAll('.opp-list > *')];
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('张三');
    expect(cards[0].textContent).toContain('VPIP 18%');
    expect(cards[1].textContent).not.toContain('VPIP');
    cards[0].click();
    document.querySelector('#opp-add').click();
    document.querySelector('#opp-preset').click();
    expect(log).toEqual([['edit', 'TAG'], ['add'], ['preset']]);
  });
});
