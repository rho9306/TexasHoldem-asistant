import { state, setPatch } from '../state.js';
import { saveSettings } from '../storage.js';
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
  mk('牌局结算', `<input type="checkbox" id="s-settle" ${state.settings.settlement !== false ? 'checked' : ''}/>
      <span class="dim">记录本手时弹窗结算盈亏（赢=+底池/输=−跟注/弃=0，可改），后手筹码随之增减并带入下一手；关闭则维持旧行为（每手后手重置默认）</span>`);
  mk('数据', `<button id="s-export">导出 JSON 备份</button> <button id="s-import">导入 JSON</button>
      <input type="file" id="s-file" accept=".json" style="display:none"/> <button id="s-clear" class="btn-danger">清空历史</button>`);
  mk('关于', `<p class="dim">德扑助手 v4.0（批次16 · 2026-09-23）— 面向学习与训练的工具，帮助你理解胜率、EV、底池赔率与GTO概念。
      不承诺盈利。图表为公开共识简化版。请理性游戏。</p>`);
  container.querySelector('#s-sim').addEventListener('change', e => { setPatch({ settings: { ...state.settings, simulations: +e.target.value } }); saveSettings(state.settings); });
  container.querySelector('#s-style').addEventListener('change', e => { setPatch({ settings: { ...state.settings, adviceStyle: e.target.value } }); saveSettings(state.settings); });
  container.querySelector('#s-adapt').addEventListener('change', e => { setPatch({ settings: { ...state.settings, autoTableAdaptation: e.target.checked } }); saveSettings(state.settings); });
  container.querySelector('#s-settle').addEventListener('change', e => { setPatch({ settings: { ...state.settings, settlement: e.target.checked } }); saveSettings(state.settings); });
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
