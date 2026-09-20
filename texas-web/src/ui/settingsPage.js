import { state, setPatch } from '../state.js';
export function renderSettingsPage(container, { onExport, onImport, onClear }) {
  container.innerHTML = '';
  const mk = (title, inner) => { const d = document.createElement('div'); d.className = 'card';
    d.innerHTML = `<b>${title}</b><div style="margin-top:6px">${inner}</div>`; container.appendChild(d); return d; };
  mk('模拟精度', `<select id="s-sim">
      ${[500, 2000, 5000].map(n => `<option ${state.settings.simulations === n ? 'selected' : ''}>${n}</option>`).join('')}</select> 次`);
  mk('建议风格', `<select id="s-style">
      ${[['conservative', '保守'], ['standard', '标准'], ['aggressive', '激进']].map(([v, t]) =>
        `<option value="${v}" ${state.settings.adviceStyle === v ? 'selected' : ''}>${t}</option>`).join('')}</select>`);
  mk('自动桌子适配', `<input type="checkbox" id="s-adapt" ${state.settings.autoTableAdaptation ? 'checked' : ''}/>
      <span class="dim">根据全桌风格自动调整打法建议（不影响胜率数学）</span>`);
  mk('数据', `<button id="s-export">导出 JSON 备份</button> <button id="s-import">导入 JSON</button>
      <input type="file" id="s-file" accept=".json" style="display:none"/> <button id="s-clear" style="color:var(--danger)">清空历史</button>`);
  mk('关于', `<p class="dim">德扑助手 v4.0 — 面向学习与训练的工具，帮助你理解胜率、EV、底池赔率与GTO概念。
      不承诺盈利。图表为公开共识简化版。请理性游戏。</p>`);
  container.querySelector('#s-sim').addEventListener('change', e => setPatch({ settings: { ...state.settings, simulations: +e.target.value } }));
  container.querySelector('#s-style').addEventListener('change', e => setPatch({ settings: { ...state.settings, adviceStyle: e.target.value } }));
  container.querySelector('#s-adapt').addEventListener('change', e => setPatch({ settings: { ...state.settings, autoTableAdaptation: e.target.checked } }));
  container.querySelector('#s-export').addEventListener('click', onExport);
  container.querySelector('#s-import').addEventListener('click', () => container.querySelector('#s-file').click());
  // 读完重置 value（同一文件可二次选择）；读取失败走 onImport(null, err) 失败反馈
  container.querySelector('#s-file').addEventListener('change', e => {
    const file = e.target.files[0];
    e.target.value = '';
    file?.text().then(onImport).catch(err => onImport(null, err));
  });
  container.querySelector('#s-clear').addEventListener('click', onClear);
}
