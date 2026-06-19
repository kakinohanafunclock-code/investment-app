import { describe, it, expect } from 'vitest';
import { yen, formatYen, formatSigned, pct, formatPct, sum } from './money.js';

describe('money utilities (整数管理で浮動小数点誤差を避ける)', () => {
  it('yen() は数値文字列を整数円に正規化する', () => {
    expect(yen('1,234,567')).toBe(1234567);
    expect(yen('¥1,000')).toBe(1000);
    expect(yen('1000.4')).toBe(1000); // 四捨五入
    expect(yen('1000.6')).toBe(1001);
    expect(yen('')).toBe(0);
    expect(yen('-500')).toBe(-500);
  });

  it('sum() は整数和で誤差が出ない', () => {
    // 0.1 + 0.2 問題が起きないことを保証（すでに整数だから）
    expect(sum([100, 200, 300])).toBe(600);
    expect(sum([])).toBe(0);
  });

  it('formatYen() はカンマ区切り', () => {
    expect(formatYen(1234567)).toBe('1,234,567');
    expect(formatYen(0)).toBe('0');
    expect(formatYen(-9000)).toBe('-9,000');
  });

  it('formatSigned() は符号付き', () => {
    expect(formatSigned(5000)).toBe('+5,000');
    expect(formatSigned(-5000)).toBe('-5,000');
    expect(formatSigned(0)).toBe('0');
  });

  it('pct() は損益率を計算（元本0なら0）', () => {
    expect(pct(120, 100)).toBeCloseTo(20);
    expect(pct(80, 100)).toBeCloseTo(-20);
    expect(pct(100, 0)).toBe(0);
  });

  it('formatPct() は%表記', () => {
    expect(formatPct(12.345)).toBe('+12.35%');
    expect(formatPct(-3.1)).toBe('-3.10%');
    expect(formatPct(0)).toBe('0.00%');
  });
});
