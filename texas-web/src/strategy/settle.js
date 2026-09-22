// 结算净额（批次15，用户确认口径）：与复盘直接挂钩的盈亏计算。
// 赢=+底池 P（P 含对方本次下注）；输=−跟注额 C（加注/全压输的实际投入弹窗里可改）；
// 弃牌=本街 0（此前街的投入是沉没成本，工具不逐街跟踪）。复盘卡中始终可手改。
export function settleNet(outcome, { pot, call } = {}) {
  if (outcome === 'win') return pot > 0 ? pot : 0;
  if (outcome === 'lose') return call > 0 ? -call : 0;
  return 0; // 'fold' 与未知值一律 0 兜底
}
