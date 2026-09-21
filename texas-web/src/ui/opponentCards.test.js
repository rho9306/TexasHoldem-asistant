import { describe, it, expect } from 'vitest';
import { opponentDefaults, renderOpponentCards, typeLabel } from './opponentCards.js';

describe('opponentDefaults', () => {
  it('新对手默认 type=null（不预设标签），滑条取 TAG 中性参数', () => {
    const d = opponentDefaults();
    expect(d.type).toBeNull();
    expect(d.looseness).toBe(35); // 与 TAG 默认一致 → 数学层结果不变
    expect(d.aggression).toBe(60);
    expect(d.handsSeen).toBe(0);
    expect(d.vpipObs).toBeNull();
    expect(d.id).toMatch(/^opp-/);
  });
  it('显式指定类型仍生效；未知类型回退 TAG 参数', () => {
    expect(opponentDefaults('LAG').type).toBe('LAG');
    expect(opponentDefaults('LAG').looseness).toBe(62);
    expect(opponentDefaults('???').looseness).toBe(35);
  });
  it('typeLabel：null → 「默认」，未知类型原样', () => {
    expect(typeLabel(null)).toBe('默认');
    expect(typeLabel('TAG')).toBe('紧凶');
    expect(typeLabel('???')).toBe('???');
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
    // 默认对手（type=null）：徽章显示「默认」而非类型标签
    const dflt = { ...opponentDefaults(), name: '' };
    renderOpponentCards(document.getElementById('oc'), { opponents: [dflt], onEdit: () => {}, onAdd: () => {}, onPreset: () => {} });
    const card = document.querySelector('.opp-list > *');
    expect(card.textContent).toContain('默认');
    expect(card.textContent).not.toContain('紧凶');
  });
});
