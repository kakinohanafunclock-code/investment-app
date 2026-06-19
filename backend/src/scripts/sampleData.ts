import type { DB } from '../db/database.js';
import {
  accounts as accRepo,
  transactions as txRepo,
  dividends as divRepo,
  watchlist as watchRepo,
  resetUser,
} from '../db/repositories.js';

/** 空画面回避用のサンプルデータを指定ユーザーに投入 */
export function seedSampleData(db: DB, userId: number): void {
  const tokutei = accRepo.create(db, userId, { name: '特定口座（SBI）', kind: '特定口座', feeRate: 0, note: '通常の現物取引口座' });
  const wrap = accRepo.create(db, userId, { name: 'ラップ口座（A社）', kind: 'ラップ', feeRate: 1.5, note: '一任運用・年率1.5%' });
  const ifa = accRepo.create(db, userId, { name: 'IFA経由口座', kind: 'IFA', feeRate: 1.1, note: '担当アドバイザー経由' });

  // 月次の評価額スナップショット（整数円）
  const months = ['2025-01-06', '2025-02-03', '2025-03-03', '2025-04-07', '2025-05-07', '2025-06-02'];

  // 国内株（特定口座）
  const toyotaVals = [2_400_000, 2_460_000, 2_380_000, 2_520_000, 2_610_000, 2_680_000];
  const sonyVals = [1_500_000, 1_540_000, 1_590_000, 1_555_000, 1_620_000, 1_700_000];
  // 米国株（ラップ）
  const appleVals = [1_800_000, 1_870_000, 1_760_000, 1_900_000, 1_980_000, 2_050_000];
  const vooVals = [3_000_000, 3_120_000, 2_950_000, 3_200_000, 3_350_000, 3_420_000];
  // 投信（IFA）
  const fundVals = [1_200_000, 1_210_000, 1_205_000, 1_240_000, 1_265_000, 1_290_000];

  months.forEach((date, i) => {
    txRepo.create(db, userId, {
      date, accountId: tokutei.id, symbol: '7203 トヨタ自動車', valuation: toyotaVals[i],
      contribution: i === 0 ? 2_400_000 : 0, withdrawal: 0, country: 'JP', assetClass: 'equity', note: '',
    });
    txRepo.create(db, userId, {
      date, accountId: tokutei.id, symbol: '6758 ソニーグループ', valuation: sonyVals[i],
      contribution: i === 0 ? 1_500_000 : 0, withdrawal: 0, country: 'JP', assetClass: 'equity', note: '',
    });
    txRepo.create(db, userId, {
      date, accountId: wrap.id, symbol: 'AAPL', valuation: appleVals[i],
      contribution: i === 0 ? 1_800_000 : 0, withdrawal: 0, country: 'US', assetClass: 'equity', note: '',
    });
    txRepo.create(db, userId, {
      date, accountId: wrap.id, symbol: 'VOO (S&P500 ETF)', valuation: vooVals[i],
      contribution: i === 0 ? 3_000_000 : 0, withdrawal: 0, country: 'US', assetClass: 'etf', note: '',
    });
    txRepo.create(db, userId, {
      date, accountId: ifa.id, symbol: '全世界株式インデックス投信', valuation: fundVals[i],
      contribution: i === 0 ? 1_200_000 : 0, withdrawal: 0, country: 'US', assetClass: 'fund', note: '',
    });
  });

  // 配当・分配（複数年で成長率を見せる）
  const divs: { date: string; symbol: string; amount: number; accountId: number | null }[] = [
    { date: '2023-06-20', symbol: '7203 トヨタ自動車', amount: 28_000, accountId: tokutei.id },
    { date: '2023-12-20', symbol: '7203 トヨタ自動車', amount: 30_000, accountId: tokutei.id },
    { date: '2023-09-15', symbol: 'AAPL', amount: 4_200, accountId: wrap.id },
    { date: '2024-06-20', symbol: '7203 トヨタ自動車', amount: 33_000, accountId: tokutei.id },
    { date: '2024-12-20', symbol: '7203 トヨタ自動車', amount: 35_000, accountId: tokutei.id },
    { date: '2024-09-15', symbol: 'AAPL', amount: 4_600, accountId: wrap.id },
    { date: '2024-03-15', symbol: 'VOO (S&P500 ETF)', amount: 12_000, accountId: wrap.id },
    { date: '2025-03-15', symbol: 'VOO (S&P500 ETF)', amount: 13_500, accountId: wrap.id },
    { date: '2025-06-10', symbol: '6758 ソニーグループ', amount: 9_000, accountId: tokutei.id },
    { date: '2025-06-20', symbol: '7203 トヨタ自動車', amount: 38_000, accountId: tokutei.id },
  ];
  for (const d of divs) {
    divRepo.create(db, userId, { date: d.date, accountId: d.accountId, symbol: d.symbol, amount: d.amount, kind: 'dividend', note: '' });
  }

  // ウォッチリスト
  const watches: { type: 'symbol' | 'sector' | 'macro'; label: string; country: 'JP' | 'US' | null }[] = [
    { type: 'symbol', label: '7203 トヨタ自動車', country: 'JP' },
    { type: 'symbol', label: '6758 ソニーグループ', country: 'JP' },
    { type: 'symbol', label: 'AAPL アップル', country: 'US' },
    { type: 'symbol', label: 'NVDA エヌビディア', country: 'US' },
    { type: 'sector', label: '半導体', country: null },
    { type: 'macro', label: 'USD/JPY 為替', country: null },
    { type: 'macro', label: '日経平均', country: 'JP' },
    { type: 'macro', label: 'S&P500', country: 'US' },
  ];
  for (const w of watches) {
    watchRepo.create(db, userId, { type: w.type, label: w.label, country: w.country, note: '' });
  }
}

/** 指定ユーザーをリセットしてサンプルを入れ直す */
export function reseed(db: DB, userId: number): void {
  resetUser(db, userId);
  seedSampleData(db, userId);
}
