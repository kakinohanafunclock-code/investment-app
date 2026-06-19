export interface PublicUser {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

export type Country = 'JP' | 'US';
export type AssetClass = 'equity' | 'fund' | 'etf' | 'bond' | 'reit' | 'cash' | 'other';
export type DividendKind = 'dividend' | 'distribution' | 'interest';
export type Importance = 'high' | 'medium' | 'low';

export interface Account {
  id: number;
  name: string;
  kind: string;
  feeRate: number;
  note: string;
  createdAt: string;
}

export interface Transaction {
  id: number;
  date: string;
  accountId: number;
  symbol: string;
  valuation: number;
  contribution: number;
  withdrawal: number;
  country: Country;
  assetClass: AssetClass;
  note: string;
  createdAt: string;
}

export interface Dividend {
  id: number;
  date: string;
  accountId: number | null;
  symbol: string;
  amount: number;
  kind: DividendKind;
  note: string;
  createdAt: string;
}

export interface WatchItem {
  id: number;
  type: 'symbol' | 'sector' | 'macro';
  label: string;
  country: Country | null;
  note: string;
  createdAt: string;
}

export interface Article {
  id: number;
  title: string;
  url: string;
  source: string;
  collectedAt: string;
  publishedAt: string | null;
  summary: string;
  category: string;
  importance: Importance;
  relatedLabels: string;
  dedupeKey: string;
}

export interface Report {
  id: number;
  date: string;
  createdAt: string;
  title: string;
  body: string;
  articleIds: string;
}

export interface Summary {
  totalValuation: number;
  totalPrincipal: number;
  totalPnl: number;
  pnlPct: number;
  currentMonthDividend: number;
}

export interface BreakdownSlice {
  key: string;
  value: number;
}

export interface DashboardData {
  summary: Summary;
  trend: { date: string; valuation: number; principal: number }[];
  cumulativePnl: { date: string; pnl: number }[];
  monthlyDividends: { month: string; amount: number }[];
  byCountry: BreakdownSlice[];
  byAssetClass: BreakdownSlice[];
  byAccount: BreakdownSlice[];
  bySymbol: BreakdownSlice[];
}

export interface SelfCheck {
  concentration: { topSymbol: string | null; topShare: number; hhi: number; bySymbol: BreakdownSlice[] };
  byCountry: { key: string; value: number; share: number }[];
  byAssetClass: { key: string; value: number; share: number }[];
  total: number;
  notes: string[];
}

export interface DataAnalysis {
  dividendGrowth: { year: string; amount: number; growthPct: number | null }[];
  monthlyDividends: { month: string; amount: number }[];
  totalContribution: number;
  totalWithdrawal: number;
  totalDividends: number;
  realizedPnl: number;
  notes: string[];
}

export interface HealthInfo {
  ok: boolean;
  ai: { enabled: boolean; keyPresent: boolean; model: string };
  scheduler: { running: boolean; cron: string } | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
