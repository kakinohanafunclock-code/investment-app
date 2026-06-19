import type { DB } from '../db/database.js';
import { transactions as txRepo, dividends as divRepo } from '../db/repositories.js';
import {
  computeSummary,
  concentration,
  breakdownBy,
  dividendGrowth,
  monthlyDividends,
  assetTrend,
  cumulativePnl,
  type Summary,
  type Concentration,
  type BreakdownSlice,
} from '../lib/analytics.js';
import { sum } from '../lib/money.js';

export function currentMonth(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

export interface DashboardData {
  summary: Summary;
  trend: ReturnType<typeof assetTrend>;
  cumulativePnl: ReturnType<typeof cumulativePnl>;
  monthlyDividends: ReturnType<typeof monthlyDividends>;
  byCountry: BreakdownSlice[];
  byAssetClass: BreakdownSlice[];
  byAccount: BreakdownSlice[];
  bySymbol: BreakdownSlice[];
}

export function dashboardData(db: DB, userId: number, month = currentMonth()): DashboardData {
  const txs = txRepo.list(db, userId);
  const divs = divRepo.list(db, userId);
  return {
    summary: computeSummary(txs, divs, month),
    trend: assetTrend(txs),
    cumulativePnl: cumulativePnl(txs),
    monthlyDividends: monthlyDividends(divs),
    byCountry: breakdownBy(txs, 'country'),
    byAssetClass: breakdownBy(txs, 'assetClass'),
    byAccount: breakdownBy(txs, 'accountId'),
    bySymbol: breakdownBy(txs, 'symbol'),
  };
}

export interface SelfCheck {
  concentration: Concentration;
  byCountry: { key: string; value: number; share: number }[];
  byAssetClass: { key: string; value: number; share: number }[];
  total: number;
  /** 客観的な注意点（事実ベース・助言ではない） */
  notes: string[];
}

function withShare(slices: BreakdownSlice[], total: number) {
  return slices.map((s) => ({ ...s, share: total === 0 ? 0 : (s.value / total) * 100 }));
}

/** ②自己点検：偏り・集中リスクを客観的に算出（推奨はしない） */
export function selfCheck(db: DB, userId: number): SelfCheck {
  const txs = txRepo.list(db, userId);
  const conc = concentration(txs);
  const byCountry = breakdownBy(txs, 'country');
  const byAssetClass = breakdownBy(txs, 'assetClass');
  const total = sum(conc.bySymbol.map((s) => s.value));

  const notes: string[] = [];
  if (conc.topShare >= 30 && conc.topSymbol) {
    notes.push(
      `最大保有「${conc.topSymbol}」が全体の約${conc.topShare.toFixed(1)}%を占めます。` +
        `一般に単一銘柄比率が高いほど個別要因の影響を受けやすくなります（事実の指摘であり売買の示唆ではありません）。`,
    );
  }
  const cWithShare = withShare(byCountry, total);
  const jp = cWithShare.find((c) => c.key === 'JP');
  const us = cWithShare.find((c) => c.key === 'US');
  if (jp && jp.share >= 80) notes.push(`日本株比率が約${jp.share.toFixed(1)}%と高めです。為替・地域分散の観点は一般論として確認材料になります。`);
  if (us && us.share >= 80) notes.push(`米国株比率が約${us.share.toFixed(1)}%と高めです。為替（USD/JPY）変動の影響を受けやすい構成です。`);
  if (conc.hhi >= 0.25) notes.push(`集中度指標 HHI は ${conc.hhi.toFixed(2)}（1に近いほど集中）で、分散度は相対的に低めです。`);
  if (notes.length === 0) notes.push('現時点で突出した集中・偏りは検出されませんでした（登録データの範囲内での算出です）。');

  return {
    concentration: conc,
    byCountry: cWithShare,
    byAssetClass: withShare(byAssetClass, total),
    total,
    notes,
  };
}

export interface DataAnalysis {
  dividendGrowth: ReturnType<typeof dividendGrowth>;
  monthlyDividends: ReturnType<typeof monthlyDividends>;
  totalContribution: number;
  totalWithdrawal: number;
  totalDividends: number;
  realizedPnl: number;
  notes: string[];
}

/** ③データ分析：取引・配当実績から傾向・統計を読み解く */
export function dataAnalysis(db: DB, userId: number): DataAnalysis {
  const txs = txRepo.list(db, userId);
  const divs = divRepo.list(db, userId);
  const growth = dividendGrowth(divs);
  const totalContribution = sum(txs.map((t) => t.contribution));
  const totalWithdrawal = sum(txs.map((t) => t.withdrawal));
  const totalDividends = sum(divs.map((d) => d.amount));

  const notes: string[] = [];
  const lastGrowth = growth.filter((g) => g.growthPct !== null).at(-1);
  if (lastGrowth) {
    notes.push(`直近年の配当は前年比 ${lastGrowth.growthPct!.toFixed(1)}%。累計配当は ${totalDividends.toLocaleString()} 円です。`);
  }
  if (totalContribution > 0) {
    notes.push(`累計拠出 ${totalContribution.toLocaleString()} 円、累計引出 ${totalWithdrawal.toLocaleString()} 円。`);
  }
  if (notes.length === 0) notes.push('分析に十分な取引・配当データがまだありません。');

  return {
    dividendGrowth: growth,
    monthlyDividends: monthlyDividends(divs),
    totalContribution,
    totalWithdrawal,
    totalDividends,
    realizedPnl: totalDividends, // 実現損益の簡易指標（配当ベース）
    notes,
  };
}
