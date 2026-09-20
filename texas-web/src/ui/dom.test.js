// esc 转义单测（Minor-5）
import { describe, it, expect } from 'vitest';
import { esc } from './dom.js';

describe('esc', () => {
  it('转义五个HTML危险字符', () => {
    expect(esc('<img src=x onerror="a&b\'c">'))
      .toBe('&lt;img src=x onerror=&quot;a&amp;b&#39;c&quot;&gt;');
  });
  it('中文与普通文本原样', () => {
    expect(esc('翻前 · UTG')).toBe('翻前 · UTG');
  });
  it('数字转字符串', () => {
    expect(esc(12.5)).toBe('12.5');
  });
});
