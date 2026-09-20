// GTO/Nash 图表：公开求解器共识的简化范围，手工整理（学习用途，设计§5.3）
// 网格：13串×13字符；行=高牌(A..2)，列=低牌；上三角同花/下三角异花/对角对子
// R=加注(推) r=混合偏加注 C=跟注 c=混合偏跟注 F=弃牌
const RANKS = 'AKQJT98765432';

export function handClassFor(cards) {
  const order = c => RANKS.indexOf(c[0]);
  const [a, b] = [...cards].sort((x, y) => order(x) - order(y));
  const hi = a[0], lo = b[0];
  if (hi === lo) return hi + lo;
  return a[1] === b[1] ? hi + lo + 's' : hi + lo + 'o';
}

export function gridCell(grid, handClass) {
  let row = RANKS.indexOf(handClass[0]);
  let col = RANKS.indexOf(handClass[1]);
  // 异花类名高牌在前（如 72o）：映射到下三角（行=低牌，列=高牌）
  if (row < col) [row, col] = [col, row];
  return grid[row][col];
}

const C = (i, j) => RANKS[i] === RANKS[j] ? RANKS[i] + RANKS[i] : (j > i ? RANKS[i] + RANKS[j] + 's' : RANKS[j] + RANKS[i] + 'o');
// 便捷：由 (row,col) 求类名（渲染热力图用）

// 宽度：R格10.7%，R+r 20.1%
const OPEN = {
  UTG: [
    'RRRRRFFFFrrrF', 'RRRRrFFFFFFFF', 'RrRRrFFFFFFFF', 'rFFRRrFFFFFFF',
    'FFFFRRrFFFFFF', 'FFFFFRrFFFFFF', 'FFFFFFFrFFFFF', 'FFFFFFFRrFFFF',
    'FFFFFFFFrrFFF', 'FFFFFFFFFrrFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF'],
  // 宽度：R格11.2%，R+r 24.3%（Q行修正后最终串已内联）
  MP: [
    'RRRRRrFFFrrrF', 'RRRRrrFFFFFFF', 'RrRRrrFFFFFFF',
    'rrrRRrFFFFFFF', 'rFFFRRrFFFFFF', 'FFFFFRrFFFFFF', 'FFFFFFFRrFFFF',
    'FFFFFFFRrFFFF', // 原 brief 此表仅12行（缺失一行，按UTG同行保守补齐，见task-9报告）
    'FFFFFFFFRrFFF', 'FFFFFFFFFrrFF', 'FFFFFFFFFFrFF', 'FFFFFFFFFFFrF', 'FFFFFFFFFFFFF'],
  // 宽度：R格18.9%，R+r 36.7%
  CO: [
    'RRRRRrrrrRrrr', 'RRRRRrFFFFFFF', 'RRRRRRrFFFFFF', 'RrrRRRrFFFFFF',
    'rrrrRRRrFFFFF', 'rrFFFRrFFFFFF', 'FFFFFFRRrFFFF', 'FFFFFFFRRrFFF',
    'FFFFFFFFRRrFF', 'FFFFFFFFFrRrF', 'FFFFFFFFFFrrF', 'FFFFFFFFFFFrr', 'FFFFFFFFFFFFr'],
  // 宽度：R格56.8%，R+r 71.0%
  BTN: [
    'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR', 'rRrRRRRRRRRRR',
    'rrrrRRRRRRRRR', 'rrrrrRRRRRRRR', 'rFFFrrRRRRRRR', 'rFFFFFrRRRRRR',
    'rFFFFFrrRRRRR', 'rFFFFFFFrRRRR', 'rFFFFFFFFRRRR', 'rFFFFFFFFFFRR', 'rFFFFFFFFFFFR'],
  // 宽度：R格55.0%，R+r 66.3%
  SB: [
    'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR', 'rrrRRRRRRRRRR',
    'rrrFRRRRRRRRR', 'rFFFrRRRRRRRR', 'rFFFFFrRRRRRR', 'rFFFFFrRRRRRR',
    'rFFFFFFrRRRRR', 'rFFFFFFFrRRRR', 'rFFFFFFFFFRRR', 'rFFFFFFFFFFRR', 'rFFFFFFFFFFFR'],
};

const DEFEND = {
  // 宽度：R(3bet)格2.4%，C(跟注)格31.3%
  'BB:UTG': [
    'RrCCCFFccrrcc', 'RrCCccFFFFFFF', 'ccRCccFFFFFFF', 'cccRCcFFFFFFF',
    'ccccCCcFFFFFF', 'FFFFcCCcFFFFF', 'FFFFFFCCcFFFF', 'FFFFFFFCCcFFF',
    'FFFFFFFFCCcFF', 'FFFFFFFFFCCcF', 'FFFFFFFFFFCcF', 'FFFFFFFFFFFCc', 'FFFFFFFFFFFFC'],
  // 宽度：R(3bet)格2.4%，C(跟注)格31.9%
  'BB:MP': [
    'RrCCCcFccrrcc', 'RrCcccFFFFFFF', 'crRCcCFFFFFFF', 'cccRCCFFFFFFF',
    'ccccCCcFFFFFF', 'FFFFcCCcFFFFF', 'FFFFFFCCcFFFF', 'FFFFFFFCCcFFF',
    'FFFFFFFFCCcFF', 'FFFFFFFFFCCcF', 'FFFFFFFFFFCcF', 'FFFFFFFFFFFCc', 'FFFFFFFFFFFFC'],
  // 宽度：R(3bet)格13.6%，C(跟注)格38.5%
  'BB:CO': [
    'RRCCCCcccRRRR', 'RRRCCCccFFFFF', 'rrRRCCccFFFFF', 'CccRRCCcFFFFF',
    'CcccRRCccFFFF', 'ccccCRRCcFFFF', 'cFFFFccRRCcFF', 'cFFFFFcRRCcFF',
    'cFFFFFFcRRCcF', 'cFFFFFFFcCCcF', 'cFFFFFFFFcCcF', 'cFFFFFFFFFFCc', 'cFFFFFFFFFFFC'],
  // 宽度：R(3bet)格17.8%，C(跟注)格34.3%
  'BB:BTN': [
    'RRRCCCcccRRRR', 'RRRCCCccFFFFF', 'RrRRCCccFFFFF', 'RrcRRCccFFFFF',
    'RcccRRCccFFFF', 'CCccCRRCcFFFF', 'cFFFFccRRCcFF', 'cFFFFFcRRCcFF',
    'cFFFFFFcRRCcF', 'cFFFFFFFcCCcF', 'cFFFFFFFFcRcF', 'cFFFFFFFFFFRc', 'cFFFFFFFFFFFR'],
  // 宽度：R(3bet)格20.1%，C(跟注)格34.9%
  'BB:SB': [
    'RRRRCCCccRRRR', 'RRRRCCccFFFFF', 'RRRRCCccFFFFF', 'RRcRRCcCFFFFF',
    'CCccRRCcCFFFF', 'CcccCRRCCcFFF', 'cFFFFcRRCCcFF', 'cFFFFFcRRCCcF',
    'cFFFFFFcRRCCc', 'cFFFFFFFcRCCc', 'cFFFFFFFFcRCc', 'cFFFFFFFFFFRC', 'cFFFFFFFFFFFR'],
  // 宽度：R格12.4%，R+r 18.3%
  'SB:MP': [
    'RRRRrFFFFrRRR', 'RRRRFFFFFFFFF', 'RRRRFFFFFFFFF', 'RrFRFFFFFFFFF',
    'rFFFRFFFFFFFF', 'FFFFFRrFFFFFF', 'FFFFFFRrFFFFF', 'FFFFFFFRrFFFF',
    'FFFFFFFFrrFFF', 'FFFFFFFFFrFFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF'],
  // 宽度：R格13.0%，R+r 21.9%
  'SB:CO': [
    'RRRRrFFFFRRRR', 'RRRRrFFFFFFFF', 'RRRRrFFFFFFFF', 'RrFRrFFFFFFFF',
    'rFFFRrFFFFFFF', 'FFFFFRrFFFFFF', 'FFFFFFRrFFFFF', 'FFFFFFFRrFFFF',
    'FFFFFFFFrrFFF', 'FFFFFFFFFrrFF', 'FFFFFFFFFFrFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF'],
  // 宽度：R格16.6%，R+r 25.4%（T9s行修正后最终串已内联）
  'SB:BTN': [
    'RRRRrFFFFRRRR', 'RRRRrFFFFFFFF', 'RRRRrFFFFFFFF', 'RrrRrFFFFFFFF',
    'rFFFRrFFFFFFF', 'FFFFFRRRFFFFF',
    'FFFFFFRRrFFFF', 'FFFFFFFRRrFFF', 'FFFFFFFFRRFFF', 'FFFFFFFFFrrFF',
    'FFFFFFFFFFrFF', 'FFFFFFFFFFFrF', 'FFFFFFFFFFFFr'],
};

const NASH = {
  // 推：R格78.7%；跟：C格28.4%（Cc 40.2%）
  '≤7': {
    push: [
      'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR',
      'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR',
      'RRRRRFRRRRRRR', 'RRFFFFFFRRRRR', 'RFFFFFFFFRRRR', 'RFFFFFFFFFFRR', 'RFFFFFFFFFFFR'],
    call: [
      'CCCCCCCCCCCCC', 'CCCCCCccFFFFF', 'CCCCCCccFFFFF', 'CCCCCCccFFFFF',
      'CCCCCCcFFFFFF', 'CccccCCFFFFFF', 'CFFFFFCcFFFFF', 'cFFFFFFCcFFFF',
      'cFFFFFFFCcFFF', 'cFFFFFFFFCFFF', 'cFFFFFFFFFCFF', 'cFFFFFFFFFFCF', 'cFFFFFFFFFFFC'],
  },
  // 推：R格58.6%；跟：C格11.8%（Cc 16.6%）
  '8-10': {
    push: [
      'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR', 'RRRRRRRRRRRRR',
      'RRRRRRRRRRRRR', 'RRRRRRRRFFFFF', 'RRRRRRRRrFFFF', 'RRRFFFRRRrFFF',
      'RFFFFFrrRRrFF', 'RFFFFFFFrRRrF', 'RFFFFFFFFrRrF', 'RFFFFFFFFFFRr', 'RFFFFFFFFFFFR'],
    call: [
      'CCCCCcFFFFFFF', 'CCCCcFFFFFFFF', 'CcCCcFFFFFFFF', 'CFFCCcFFFFFFF',
      'FFFFCCcFFFFFF', 'FFFFFCcFFFFFF', 'FFFFFFCFFFFFF', 'FFFFFFFCFFFFF',
      'FFFFFFFFcFFFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF'],
  },
  // 推：R格10.7%；跟：C格5.3%（Cc 6.5%）
  '11-15': {
    push: [
      'RRRRRrFFFFFFF', 'RRRRrFFFFFFFF', 'RrRRFFFFFFFFF', 'RFFRRrFFFFFFF',
      'FFFFRrFFFFFFF', 'FFFFFRFFFFFFF', 'FFFFFFRFFFFFF', 'FFFFFFFrFFFFF',
      'FFFFFFFFrFFFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF'],
    call: [
      'CCCFFFFFFFFFF', 'CCFFFFFFFFFFF', 'cCFFFFFFFFFFF', 'FFFCFFFFFFFFF',
      'FFFFCFFFFFFFF', 'FFFFFcFFFFFFF', 'FFFFFFCFFFFFF', 'FFFFFFFFFFFFF',
      'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF', 'FFFFFFFFFFFFF'],
  },
};

const OPEN_TITLES = { UTG:'枪口位(UTG)开牌', MP:'中位(MP)开牌', CO:'关煞位(CO)开牌', BTN:'按钮位(BTN)开牌', SB:'小盲位(SB)开牌' };
const DEF_TITLES = { BB:'大盲位(BB)防守', SB:'小盲位(SB)防守' };

export const CHART_POSITION = { UTG1:'UTG', UTG2:'UTG', MP1:'MP', LJ:'MP', HJ:'MP' };
export function isShort(effBB) { return effBB > 0 && effBB <= 15; }
export function nashBand(effBB) {
  if (effBB <= 7) return '≤7';
  if (effBB <= 10) return '8-10';
  if (effBB <= 15) return '11-15';
  return null;
}

export function getPreflopChart({ position, raiserPosition = '', role = 'open', effectiveStackBB = 100 }) {
  const band = nashBand(effectiveStackBB);
  if (band) {
    if (role === 'open' && ['CO','BTN','SB'].includes(position)) {
      return { kind:'nash-push', title:`Nash推弃 · ${band}BB · ${position}推注`,
        note:'短码简化版：以BTN/SB为基准，CO应略收紧。仅含推/弃两个动作。', grid: NASH[band].push };
    }
    if (role === 'defend' && position === 'BB') {
      return { kind:'nash-call', title:`Nash推弃 · ${band}BB · BB跟注`,
        note:'以BTN推注为基准的保守跟注范围。', grid: NASH[band].call };
    }
    // 短码但场景不在推/弃模式：继续用常规表
  }
  if (role === 'open') {
    const p = CHART_POSITION[position] ?? position;
    return { kind:'open', title: OPEN_TITLES[p] ?? `${position}开牌`, note:'100BB 单次加注场景（简化共识）', grid: OPEN[p] ?? OPEN.MP };
  }
  // defend
  const p = CHART_POSITION[position] ?? position;
  const r = CHART_POSITION[raiserPosition] ?? raiserPosition;
  if (p === 'BB') {
    const key = `BB:${['UTG','MP','CO','BTN','SB'].includes(r) ? r : 'CO'}`;
    return { kind:'defend', title:`大盲位(BB)防守 vs ${r}开牌`, note:'R=3bet C=跟注 F=弃牌（简化共识）', grid: DEFEND[key] };
  }
  if (p === 'SB') {
    const key = `SB:${['MP','CO','BTN'].includes(r) ? r : 'CO'}`;
    return { kind:'defend', title:`小盲位(SB)防守 vs ${r}开牌`, note:'3bet或弃牌策略为主（简化共识）', grid: DEFEND[key] };
  }
  // 其他位置防守：以BB表为参考
  const key = `BB:${['UTG','MP','CO','BTN','SB'].includes(r) ? r : 'CO'}`;
  return { kind:'defend', title:`${position}防守 vs ${r}开牌（以BB表为参考）`, note:'非盲注位防守简化处理', grid: DEFEND[key] };
}
