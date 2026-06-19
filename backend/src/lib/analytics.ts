import type { Transaction, Dividend } from '../types.js';
import { sum, pct } from './money.js';

/** 銘柄ごとに最新日付の取引行（=評価額スナップショット）を抽出 */
export function latestValuationBySymbol(txs: Transaction[]): Map<string, Transaction> {
  const map = new Map<string, Transaction>();
  for (const t of txs) {
    const cur = map.get(t.symbol);
    if (!cur || t.date > cur.date || (t.date === cur.date && t.id >= cur.id)) {
      map.set(t.symbol, t);
    }
  }
  return map;
}

export interface Summary {
  totalValuation: number;
  totalPrincipal: number;
  totalPnl: number;
  pnlPct: number;
  currentMonthDividend: number;
}

/**
 * サマリー集計。
 * - 評価額：銘柄ごとの最新評価額の合計
 * - 元本：全取引の (拠出 - 引出) の累計
 * - 当月配当：targetMonth(YYYY-MM) の配当合計
 */
export function computeSummary(
  txs: Transaction[],
  divs: Dividend[],
  targetMonth: string,
): Summary {
  const latest = latestValuationBySymbol(txs);
  const totalValuation = sum([...latest.values()].map((t) => t.valuation));
  const totalPrincipal = sum(txs.map((t) => t.contribution - t.withdrawal));
  const totalPnl = totalValuation - totalPrincipal;
  const currentMonthDividend = sum(
    divs.filter((d) => d.date.startsWith(targetMonth)).map((d) => d.amount),
  );
  return {
    totalValuation,
    totalPrincipal,
    totalPnl,
    pnlPct: pct(totalValuation, totalPrincipal),
    currentMonthDividend,
  };
}

export interface TrendPoint {
  date: string;
  valuation: number;
  principal: number;
}

/**
 * 資産推移。各取引日時点で、
 * - 評価額 = その日までの各銘柄の最新評価額の合計
 * - 元本 = その日までの累計 (拠出 - 引出)
 */
export function assetTrend(txs: Transaction[]): TrendPoint[] {
  const sorted = [...txs].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id,
  );
  const dates = [...new Set(sorted.map((t) => t.date))].sort();
  const points: TrendPoint[] = [];
  for (const date of dates) {
    const upto = sorted.filter((t) => t.date <= date);
    const latest = latestValuationBySymbol(upto);
    const valuation = sum([...latest.values()].map((t) => t.valuation));
    const principal = sum(upto.map((t) => t.contribution - t.withdrawal));
    points.push({ date, valuation, principal });
  }
  return points;
}

export interface CumulativePnlPoint {
  date: string;
  pnl: number;
}

/** 累計損益推移（評価額 - 元本） */
export function cumulativePnl(txs: Transaction[]): CumulativePnlPoint[] {
  return assetTrend(txs).map((p) => ({ date: p.date, pnl: p.valuation - p.principal }));
}

export interface MonthlyDividend {
  month: string;
  amount: number;
}

export function monthlyDividends(divs: Dividend[]): MonthlyDividend[] {
  const byMonth = new Map<string, number>();
  for (const d of divs) {
    const month = d.date.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + d.amount);
  }
  return [...byMonth.entries()]
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => (a.month < b.month ? -1 : 1));
}

export interface BreakdownSlice {
  key: string;
  value: number;
}

/** 最新評価額ベースで指定キー別に内訳集計（降順） */
export function breakdownBy(
  txs: Transaction[],
  field: 'country' | 'assetClass' | 'accountId' | 'symbol',
): BreakdownSlice[] {
  const latest = latestValuationBySymbol(txs);
  const byKey = new Map<string, number>();
  for (const t of latest.values()) {
    const key = String(t[field]);
    byKey.set(key, (byKey.get(key) ?? 0) + t.valuation);
  }
  return [...byKey.entries()]
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value);
}

export interface Concentration {
  topSymbol: string | null;
  topShare: number; // %
  hhi: number; // Herfindahl-Hirschman Index (0〜1)
  bySymbol: BreakdownSlice[];
}

/** 集中リスク：最大銘柄比率と HHI（自己点検） */
export function concentration(txs: Transaction[]): Concentration {
  const bySymbol = breakdownBy(txs, 'symbol');
  const total = sum(bySymbol.map((s) => s.value));
  if (total === 0) return { topSymbol: null, topShare: 0, hhi: 0, bySymbol };
  const shares = bySymbol.map((s) => s.value / total);
  const hhiVal = shares.reduce((acc, s) => acc + s * s, 0);
  return {
    topSymbol: bySymbol[0]?.key ?? null,
    topShare: (bySymbol[0]?.value ?? 0) / total * 100,
    hhi: hhiVal,
    bySymbol,
  };
}

export interface DividendGrowthPoint {
  year: string;
  amount: number;
  growthPct: number | null;
}

/** 配当成長率（年次・前年比）。データ分析機能。 */
export function dividendGrowth(divs: Dividend[]): DividendGrowthPoint[] {
  const byYear = new Map<string, number>();
  for (const d of divs) {
    const year = d.date.slice(0, 4);
    byYear.set(year, (byYear.get(year) ?? 0) + d.amount);
  }
  const years = [...byYear.keys()].sort();
  return years.map((year, i) => {
    const amount = byYear.get(year)!;
    const prev = i > 0 ? byYear.get(years[i - 1])! : null;
    const growthPct = prev && prev !== 0 ? ((amount - prev) / prev) * 100 : null;
    return { year, amount, growthPct };
  });
}
