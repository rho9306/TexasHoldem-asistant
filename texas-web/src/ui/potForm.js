import { state } from '../state.js';

export function renderPotForm(container, onChange) {
  container.innerHTML = '';
  const fields = [
    ['pot', '底池'], ['call', '需跟注'], ['myStack', '我的筹码'], ['oppStack', '对手筹码'],
  ];
  const wrap = document.createElement('div');
  wrap.className = 'card';
  for (const [name, label] of fields) {
    const row = document.createElement('label');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:6px 0;';
    row.innerHTML = `<span>${label}</span><input name="${name}" type="number" inputmode="decimal"
      style="width:110px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:8px;" value="${state[name] ?? ''}" />`;
    wrap.appendChild(row);
  }
  container.appendChild(wrap);
  const read = () => {
    const v = {};
    for (const [name] of fields) {
      const el = wrap.querySelector(`input[name=${name}]`);
      const n = parseFloat(el.value);
      const ok = Number.isFinite(n) && n >= 0;
      el.classList.toggle('invalid', !ok);
      el.style.borderColor = ok ? 'var(--border)' : 'var(--danger)';
      // 非法输入不写 NaN 进 state（保留原值），避免一次击键污染全部字段
      v[name] = ok ? n : state[name];
    }
    onChange(v);
  };
  // 逐个input挂监听：jsdom中 new Event('input') 不冒泡，挂在wrap上收不到
  for (const el of wrap.querySelectorAll('input')) el.addEventListener('input', read);
}
