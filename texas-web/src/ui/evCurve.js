// EV 双曲线：实际盈亏累计 vs 理论EV累计（Task 24，简化口径=逐手跟注EV累加）
export function cumulativeSeries(hands) {
  let actual = 0, theory = 0;
  return hands.map((h, i) => {
    actual += h.result?.net ?? 0;
    theory += (h.evCall ?? 0); // 理论EV按跟注EV逐手累计（简化口径，页脚注明）
    return { i: i + 1, actual, theory };
  });
}

export function renderEvCurve(container, hands) {
  const el = document.createElement('div');
  el.className = 'card';
  const pts = cumulativeSeries(hands);
  const vals = pts.flatMap(p => [p.actual, p.theory]);
  const max = Math.max(1, ...vals.map(Math.abs));
  const W = 320, Hh = 90;
  const path = key => pts.map((p, i) => `${i ? 'L' : 'M'}${(i / Math.max(1, pts.length - 1)) * W},${Hh / 2 - (p[key] / max) * (Hh / 2 - 4)}`).join('');
  el.innerHTML = `<b>EV双曲线</b><div class="dim" style="font-size:11px">绿=实际盈亏累计 蓝虚线=理论EV累计（按跟注EV口径）</div>
    <svg viewBox="0 0 ${W} ${Hh}" style="width:100%">
      <path d="${path('actual')}" stroke="var(--accent)" fill="none" stroke-width="2"/>
      <path d="${path('theory')}" stroke="var(--blue)" fill="none" stroke-dasharray="4 3"/>
    </svg>`;
  container.appendChild(el);
}
