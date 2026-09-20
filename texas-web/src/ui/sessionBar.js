// 顶栏会话指示条（Task 22）：当前会话名 + "开始新会话"按钮
import { state, setPatch } from '../state.js';
import { newSession } from '../storage.js';

export function renderSessionBar(container) {
  container.innerHTML = state.sessionId
    ? `当前会话：<b>${state.sessionName ?? '进行中'}</b> <button id="new-session" style="margin-left:8px">开始新会话</button>`
    : `<button id="new-session">开始新会话</button> <span class="dim">记录前建议先开一个会话</span>`;
  container.querySelector('#new-session').addEventListener('click', () => {
    const s = newSession('会话 ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
    setPatch({ sessionId: s.id, sessionName: s.name });
    renderSessionBar(container);
  });
}
