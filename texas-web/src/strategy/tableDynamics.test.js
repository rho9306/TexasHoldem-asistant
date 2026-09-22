import { describe, it, expect } from 'vitest';
import { tableProfile, adjustAdvice } from './tableDynamics.js';

describe('tableDynamics', () => {
  it('松弱桌判定与修正', () => {
    const opps = [
      { type: 'loose-passive' }, { type: 'loose-passive' },
    ];
    const p = tableProfile(opps);
    expect(p.label).toBe('松弱桌');
    expect(p.adjustments.length).toBeGreaterThan(0);
    expect(adjustAdvice('fold', true, p, true)).toContain('诈唬');   // 修正提示
  });
  it('对手不足2人 → 无画像', () => {
    expect(tableProfile([{ type: 'TAG' }])).toBe(null);
  });
  it('开关关闭不修正', () => {
    const p = tableProfile([{ type: 'loose-passive' }, { type: 'loose-passive' }]);
    expect(adjustAdvice('fold', true, p, false)).toBe('');
  });
});

describe('tableProfile 未标定对手处理（批次13，用户反馈：默认对手不该得出紧凶桌结论）', () => {
  it('全部未标定且无观察 → null（不下桌风结论，UI 显示未标定提示）', () => {
    expect(tableProfile([{ type: null }, { type: null }, { type: null }])).toBeNull();
  });
  it('未标定但有充分观察（≥20手）→ 以观察 VPIP 计入；凶轴无标注数据不虚设', () => {
    const p = tableProfile([
      { type: null, handsSeen: 30, vpipObs: 55 },
      { type: null, handsSeen: 25, vpipObs: 61 },
    ]);
    expect(p.label).toBe('松弱桌'); // vpipAvg=58 >35，凶轴无数据按 0（非凶）
    expect(p.vpipAvg).toBe(58);
    expect(p.aggrAvg).toBe(0);
  });
  it('观察 VPIP=0 的真紧手不被错杀（审查回环：>0 → !=null）', () => {
    const p = tableProfile([
      { type: null, handsSeen: 30, vpipObs: 10 },
      { type: null, handsSeen: 25, vpipObs: 0 }, // 25手全弃=最强紧手信号
    ]);
    expect(p.vpipAvg).toBe(5);
    expect(p.label).toBe('紧弱桌'); // 紧轴生效
  });
  it('混合：已标定参与双轴，未标定无观察被排除（不被稀释成别的桌风）', () => {
    const p = tableProfile([
      { type: 'loose-passive' }, { type: 'loose-passive' },
      { type: null }, { type: null },
    ]);
    expect(p.label).toBe('松弱桌');
    expect(p.basedOn).toBe(2); // 供 UI 显示覆盖度「2/4」
  });
  it('已标定≥2 → basedOn=总数（不显示覆盖度提示）', () => {
    const p = tableProfile([{ type: 'TAG' }, { type: 'TAG' }]);
    expect(p.basedOn).toBe(2);
  });
});
