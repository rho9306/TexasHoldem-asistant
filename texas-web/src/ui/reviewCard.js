// 复盘卡：牌面重绘 + 当时建议 + 实际行动 + 可编辑标签/笔记（Task 24）
// 安全约定：tags/notes/action 为用户可编辑字段（可经导入JSON注入），一律 DOM API 赋值，
// 不做 innerHTML 插值（存储型XSS防护，PLAN-FIX）；常量部分可保留 innerHTML。
import { renderMatrix } from './handMatrix.js';
import { loadAll, saveHands } from '../storage.js';

/** 由两手牌推 13×13 类名用于高亮，如 ['As','Kd'] → 'AKs'；异常返回 '' */
function handHighlight(hand) {
  if (!Array.isArray(hand) || hand.length !== 2) return '';
  const rank = c => c?.[0];
  const suited = hand[0]?.[1] === hand[1]?.[1];
  const [a, b] = [rank(hand[0]), rank(hand[1])];
  const order = 'AKQJT98765432';
  const hi = order.indexOf(a) <= order.indexOf(b) ? a : b;
  const lo = hi === a ? b : a;
  return hi === lo ? hi + lo : hi + lo + (suited ? 's' : 'o');
}

export function renderReviewCard(container, record /* , opponents —— 保留扩展位，当前卡内不直接渲染对手 */) {
  container.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'card';
  // 常量结构用 innerHTML；equity/advice/gtoAction/tableProfile/street 等均为系统生成字段
  el.innerHTML = `<div class="num" style="font-size:18px">${record.hand.join(' ')} + ${record.board.join(' ') || '（翻前）'}</div>
    <div class="dim">${record.street} · ${record.preflopScenario?.heroPosition ?? '?'} · ${record.tableProfile ?? ''}</div>
    <div>当时建议：<b>${record.advice ?? ''}</b>（胜率 ${((record.equity ?? 0) * 100).toFixed(1)}%）· GTO对照：${record.gtoAction ?? ''}</div>
    <div>盈亏 <span class="num">${record.result?.net ?? 0}</span>
      ${record.followedAdvice === false ? '<span style="color:var(--warn)">⚠偏离建议</span>' : ''}</div>
    <label>标签 <input id="rv-tags"/></label>
    <label>笔记 <input id="rv-notes"/></label>
    <div><label>实际行动 <input id="rv-action"/></label>
    <label>盈亏 <input id="rv-net" type="number"/></label>
    <label><input type="checkbox" id="rv-follow" ${record.followedAdvice !== false ? 'checked' : ''}/> 跟随了建议</label></div>`;
  // 用户可编辑字段：DOM API 赋值（XSS防护）
  el.querySelector('#rv-tags').value = (record.tags ?? []).join(',');
  el.querySelector('#rv-notes').value = record.notes ?? '';
  el.querySelector('#rv-action').value = record.action ?? '';
  el.querySelector('#rv-net').value = record.result?.net ?? 0;

  const save = document.createElement('button');
  save.textContent = '保存修改';
  save.addEventListener('click', () => {
    const { hands } = loadAll();
    const idx = hands.findIndex(h => h.id === record.id);
    if (idx >= 0) {
      hands[idx] = { ...hands[idx],
        action: el.querySelector('#rv-action').value,
        result: { net: +el.querySelector('#rv-net').value },
        followedAdvice: el.querySelector('#rv-follow').checked,
        tags: el.querySelector('#rv-tags').value.split(',').map(s => s.trim()).filter(Boolean),
        notes: el.querySelector('#rv-notes').value };
      saveHands(hands);
      save.textContent = '✓ 已保存';
      setTimeout(() => { save.textContent = '保存修改'; }, 1500);
    }
  });
  el.appendChild(save);
  container.appendChild(el);
  // 牌面重绘矩阵（对手范围无法复原，占位展示高亮本手位置）
  const holder = document.createElement('div');
  container.appendChild(holder);
  renderMatrix(holder, { mini: true, grid: null, mask: null, highlight: handHighlight(record.hand) });
}
