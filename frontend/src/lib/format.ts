export function yen(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function yenSigned(value: number): string {
  return (value > 0 ? '+' : '') + yen(value);
}

export function pct(value: number, signed = true): string {
  const fixed = value.toFixed(2);
  return (signed && value > 0 ? '+' : '') + fixed + '%';
}

/** 損益の色クラス（プラス緑・マイナス赤） */
export function pnlColor(value: number): string {
  if (value > 0) return 'text-success';
  if (value < 0) return 'text-danger';
  return 'text-ink-muted';
}

export function compactYen(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e8) return (value / 1e8).toFixed(2) + '億';
  if (abs >= 1e4) return (value / 1e4).toFixed(0) + '万';
  return yen(value);
}

export const COUNTRY_LABEL: Record<string, string> = { JP: '日本', US: '米国' };
export const ASSET_LABEL: Record<string, string> = {
  equity: '株式',
  fund: '投資信託',
  etf: 'ETF',
  bond: '債券',
  reit: 'REIT',
  cash: '現金',
  other: 'その他',
};
export const DIV_KIND_LABEL: Record<string, string> = {
  dividend: '配当',
  distribution: '分配',
  interest: '利息',
};

export const CHART_COLORS = ['#2F6BFF', '#1FA971', '#7C5CFC', '#F4A338', '#E5484D', '#13B4C4', '#EC6CB9', '#8B93A1'];
