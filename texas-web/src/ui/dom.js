// DOM 安全辅助：HTML 转义（导入JSON字段可伪造，innerHTML 插值前一律 esc）
export const esc = v => String(v).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
