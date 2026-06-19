import { describe, it, expect } from 'vitest';
import {
  latestValuationBySymbol,
  computeSummary,
  assetTrend,
  monthlyDividends,
  breakdownBy,
  concentration,
  dividendGrowth,
} from './analytics.js';
import type { Transaction, Dividend, Account } from '../types.js';

function tx(p: Partial<Transaction>): Transaction {
  return {
    id: 0,
    date: '2025-01-01',
    accountId: 1,
    symbol: 'X',
    valuation: 0,
    contribution: 0,
    withdrawal: 0,
    country: 'JP',
    assetClass: 'equity',
    note: '',
    createdAt: '',
    ...p,
  };
}
function div(p: Partial<Dividend>): Dividend {
  return {
    id: 0,
    date: '2025-01-01',
    accountId: 1,
    symbol: 'X',
    amount: 0,
    kind: 'dividend',
    note: '',
    createdAt: '',
    ...p,
  };
}

describe('latestValuationBySymbol', () => {
  it('銘柄ごとに最新日付の評価額を採用する', () => {
    const txs = [
      tx({ symbol: 'A', date: '2025-01-01', valuation: 100 }),
      tx({ symbol: 'A', date: '2025-03-01', valuation: 150 }),
      tx({ symbol: 'B', date: '2025-02-01', valuation: 200 }),
    ];
    const map = latestValuationBySymbol(txs);
    expect(map.get('A')?.valuation).toBe(150);
    expect(map.get('B')?.valuation).toBe(200);
  });
});

describe('computeSummary', () => {
  it('評価額は銘柄最新値、元本は拠出-引出の累計、損益と率を算出', () => {
    const txs = [
      tx({ symbol: 'A', date: '2025-01-01', valuation: 1000, contribution: 1000 }),
      tx({ symbol: 'A', date: '2025-02-01', valuation: 1200, contribution: 0 }),
      tx({ symbol: 'B', date: '2025-01-15', valuation: 500, contribution: 600, withdrawal: 100 }),
    ];
    const divs = [div({ date: '2025-06-10', amount: 300 })];
    const s = computeSummary(txs, divs, '2025-06');
    // 最新評価額 A=1200, B=500 → 1700
    expect(s.totalValuation).toBe(1700);
    // 元本 = (1000+0) + (600-100) = 1500
    expect(s.totalPrincipal).toBe(1500);
    expect(s.totalPnl).toBe(200);
    expect(s.pnlPct).toBeCloseTo((200 / 1500) * 100);
    expect(s.currentMonthDividend).toBe(300);
  });

  it('当月配当は対象月のみ合計', () => {
    const divs = [
      div({ date: '2025-06-01', amount: 100 }),
      div({ date: '2025-05-30', amount: 999 }),
    ];
    const s = computeSummary([], divs, '2025-06');
    expect(s.currentMonthDividend).toBe(100);
  });
});

describe('assetTrend', () => {
  it('日付ごとに評価額と元本の推移を返す（評価額は各日時点の銘柄最新値の合計）', () => {
    const txs = [
      tx({ symbol: 'A', date: '2025-01-01', valuation: 1000, contribution: 1000 }),
      tx({ symbol: 'A', date: '2025-02-01', valuation: 1100, contribution: 0 }),
    ];
    const trend = assetTrend(txs);
    expect(trend).toHaveLength(2);
    expect(trend[0]).toMatchObject({ date: '2025-01-01', valuation: 1000, principal: 1000 });
    expect(trend[1]).toMatchObject({ date: '2025-02-01', valuation: 1100, principal: 1000 });
  });
});

describe('monthlyDividends', () => {
  it('月次合計を返す', () => {
    const divs = [
      div({ date: '2025-01-10', amount: 100 }),
      div({ date: '2025-01-20', amount: 50 }),
      div({ date: '2025-03-05', amount: 200 }),
    ];
    const m = monthlyDividends(divs);
    expect(m).toEqual([
      { month: '2025-01', amount: 150 },
      { month: '2025-03', amount: 200 },
    ]);
  });
});

describe('breakdownBy', () => {
  it('国別の内訳を最新評価額で集計', () => {
    const txs = [
      tx({ symbol: 'A', country: 'JP', valuation: 1000 }),
      tx({ symbol: 'B', country: 'US', valuation: 3000 }),
    ];
    const b = breakdownBy(txs, 'country');
    expect(b).toEqual([
      { key: 'US', value: 3000 },
      { key: 'JP', value: 1000 },
    ]);
  });
});

describe('concentration（自己点検：集中リスク）', () => {
  it('最大銘柄比率と HHI を算出', () => {
    const txs = [
      tx({ symbol: 'A', valuation: 8000 }),
      tx({ symbol: 'B', valuation: 1000 }),
      tx({ symbol: 'C', valuation: 1000 }),
    ];
    const c = concentration(txs);
    expect(c.topSymbol).toBe('A');
    expect(c.topShare).toBeCloseTo(80);
    // HHI = 0.8^2 + 0.1^2 + 0.1^2 = 0.66
    expect(c.hhi).toBeCloseTo(0.66, 2);
  });
});

describe('dividendGrowth（データ分析：配当成長率）', () => {
  it('年次合計から前年比成長率を算出', () => {
    const divs = [
      div({ date: '2023-05-01', amount: 1000 }),
      div({ date: '2024-05-01', amount: 1200 }),
      div({ date: '2025-05-01', amount: 1500 }),
    ];
    const g = dividendGrowth(divs);
    expect(g[0]).toMatchObject({ year: '2023', amount: 1000, growthPct: null });
    expect(g[1].growthPct).toBeCloseTo(20);
    expect(g[2].growthPct).toBeCloseTo(25);
  });
});
