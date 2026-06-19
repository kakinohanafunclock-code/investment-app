// ===== ドメイン型定義 =====
// 金額はすべて「最小単位の整数（円）」で保持し、浮動小数点誤差を避ける。
// 表示時にカンマ区切りへ整形する。

export interface User {
  id: number;
  email: string;
  passwordHash: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: string;
}

/** API 応答用（パスワードハッシュを除いた公開ユーザー情報） */
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

/** 口座 */
export interface Account {
  id: number;
  userId: number;
  name: string;
  /** 口座種別の自由記述（IFA/ラップ/特定 等） */
  kind: string;
  /** 年率手数料（%）。例 1.5 */
  feeRate: number;
  note: string;
  createdAt: string;
}

/** 取引（保有スナップショット行） */
export interface Transaction {
  id: number;
  userId: number;
  date: string; // YYYY-MM-DD
  accountId: number;
  symbol: string;
  /** 評価額（円・整数） */
  valuation: number;
  /** 拠出額・入金（円・整数） */
  contribution: number;
  /** 引出額（円・整数） */
  withdrawal: number;
  country: Country;
  assetClass: AssetClass;
  note: string;
  createdAt: string;
}

/** 配当・分配・利息 */
export interface Dividend {
  id: number;
  userId: number;
  date: string; // YYYY-MM-DD
  accountId: number | null;
  symbol: string;
  /** 金額（円・整数） */
  amount: number;
  kind: DividendKind;
  note: string;
  createdAt: string;
}

/** ウォッチリスト項目（銘柄・セクター・指標） */
export interface WatchItem {
  id: number;
  userId: number;
  /** 'symbol' | 'sector' | 'macro' */
  type: 'symbol' | 'sector' | 'macro';
  label: string; // 例: "7203 トヨタ", "半導体", "USD/JPY"
  country: Country | null;
  note: string;
  createdAt: string;
}

/** 収集記事 */
export interface Article {
  id: number;
  userId: number;
  title: string;
  url: string;
  source: string;
  /** 収集日時 ISO */
  collectedAt: string;
  /** 記事の公開日（判明すれば） */
  publishedAt: string | null;
  summary: string;
  category: string;
  importance: Importance;
  /** 関連するウォッチ項目ラベル（カンマ区切りで保存） */
  relatedLabels: string;
  /** 重複排除用ハッシュ */
  dedupeKey: string;
}

/** 毎朝のブリーフィングレポート */
export interface Report {
  id: number;
  userId: number;
  /** 対象日 YYYY-MM-DD */
  date: string;
  createdAt: string;
  title: string;
  /** Markdown 本文 */
  body: string;
  /** 参照した記事 id の JSON 配列 */
  articleIds: string;
}

export interface Settings {
  newsCron: string;
  cronTz: string;
  schedulerEnabled: boolean;
}
