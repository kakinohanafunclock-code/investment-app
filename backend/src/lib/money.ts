// 金額は整数（円）で扱う。誤差の出る浮動小数点演算は最小限に留める。

/** 任意の数値表現を整数円に正規化する（カンマ・通貨記号・空白を許容） */
export function yen(input: string | number): number {
  if (typeof input === 'number') return Math.round(input);
  const cleaned = input.replace(/[¥,\s円]/g, '').trim();
  if (cleaned === '' || cleaned === '-') return 0;
  const n = Number(cleaned);
  if (Number.isNaN(n)) return 0;
  return Math.round(n);
}

/** 整数配列の合計（整数演算なので誤差なし） */
export function sum(values: number[]): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

/** カンマ区切り表記 */
export function formatYen(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** 符号付きカンマ区切り（プラスは + を付与、0 はそのまま） */
export function formatSigned(value: number): string {
  if (value > 0) return '+' + formatYen(value);
  return formatYen(value);
}

/** 損益率（%）。元本が 0 のときは 0 を返す */
export function pct(valuation: number, principal: number): number {
  if (principal === 0) return 0;
  return ((valuation - principal) / principal) * 100;
}

/** % 表記（小数2桁・符号付き） */
export function formatPct(value: number): string {
  const fixed = value.toFixed(2);
  if (value > 0) return '+' + fixed + '%';
  return fixed + '%';
}
