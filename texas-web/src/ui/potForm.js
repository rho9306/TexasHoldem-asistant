import { state } from '../state.js';

// 跟注额快捷档：面对下注场景的最高频输入（比例 × 当前底池；全压 = 我的后手）
const CALL_PRESETS = [
  ['⅓池', p => p / 3],
  ['½池', p => p / 2],
  ['⅔池', p => (p * 2) / 3],
  ['满池', p => p],
  ['全压', (p, my) => my],
];

// 空 = 使用默认值（用户清空输入框即回到默认，免去删除预填数字的步骤）
// 导出供 tablePage.nextRound 新手清空复用（单一默认值来源，批次14）
export const FIELD_DEFAULTS = { pot: 0, call: 0, myStack: 100 };
const FIELD_PLACEHOLDER = { pot: '默认 0', call: '默认 0', myStack: '默认 100' };

export function renderPotForm(container, onChange) {
  container.innerHTML = '';
  // 对手筹码输入框已删：对手视为筹码充足，myStack 变化时在 onChange patch 里同步 oppStack=myStack
  // （calc.js effectiveStack=min(my,opp) 语义不变，结果即"我的后手"）
  const fields = [
    ['pot', '底池'], ['call', '需跟注'], ['myStack', '我的筹码'],
  ];
  const wrap = document.createElement('div');
  wrap.className = 'card';
  for (const [name, label] of fields) {
    const row = document.createElement('label');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:6px 0;';
    // 初始显示空，placeholder 提示生效默认值；state 值不回填显示（清空即默认）
    row.innerHTML = `<span>${label}</span><input name="${name}" type="number" inputmode="decimal"
      placeholder="${FIELD_PLACEHOLDER[name]}"
      style="width:110px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:8px;" />`;
    wrap.appendChild(row);
  }
  // 快捷档 chip 排：跟注输入框下方，点击把跟注额设为对应值
  const presetRow = document.createElement('div');
  presetRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;padding:4px 0;';
  for (const [label, fn] of CALL_PRESETS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.callPreset = label; // 测试与样式定位钩子
    b.textContent = label;
    b.style.cssText = 'padding:6px 10px;border:1px solid var(--border);border-radius:14px;background:var(--bg);color:var(--text);min-height:44px;';
    b.addEventListener('click', () => {
      // 快捷档基于最近生效值计算（空输入=默认值已落入 cur）；底池非法 → 无效果；比例结果取整到 0.5
      const p = cur.pot;
      const my = cur.myStack;
      if (!(Number.isFinite(p) && p >= 0)) return;
      const callInput = wrap.querySelector('input[name=call]');
      callInput.value = String(Math.round(fn(p, my) * 2) / 2);
      callInput.dispatchEvent(new Event('input')); // 复用既有 read→onChange 管线（只刷结果区，不重建表单）
    });
    presetRow.appendChild(b);
  }
  wrap.appendChild(presetRow);
  container.appendChild(wrap);
  // 最近一次生效值闭包（初始化自 state）：快捷档从这取值，不依赖显示框也不依赖外部 onChange 时序
  const cur = { pot: state.pot, call: state.call, myStack: state.myStack };
  const read = () => {
    const v = {};
    for (const [name] of fields) {
      const el = wrap.querySelector(`input[name=${name}]`);
      // 空 = 使用默认值（清空即回默认）；非数字/负数守卫保留原 state 值（不写 NaN）
      if (el.value.trim() === '') {
        el.classList.remove('invalid');
        el.style.borderColor = 'var(--border)';
        v[name] = FIELD_DEFAULTS[name];
        continue;
      }
      const n = parseFloat(el.value);
      const ok = Number.isFinite(n) && n >= 0;
      el.classList.toggle('invalid', !ok);
      el.style.borderColor = ok ? 'var(--border)' : 'var(--danger)';
      // 非法输入不写 NaN 进 state（保留原值），避免一次击键污染全部字段
      v[name] = ok ? n : state[name];
    }
    v.oppStack = v.myStack; // 对手筹码充足：始终与我的筹码同步（含启动回填后的首次输入）
    Object.assign(cur, v);
    onChange(v);
  };
  // 逐个input挂监听：jsdom中 new Event('input') 不冒泡，挂在wrap上收不到
  for (const el of wrap.querySelectorAll('input')) el.addEventListener('input', read);
}
