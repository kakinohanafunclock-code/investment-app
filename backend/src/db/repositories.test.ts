import { describe, it, expect, beforeEach } from 'vitest';
import { createDb, type DB } from './database.js';
import { users, accounts, transactions, dividends, articles, reports, settings, resetUser } from './repositories.js';
import { dedupeKey } from '../lib/dedupe.js';

let db: DB;
let uid: number;
let other: number;
beforeEach(() => {
  db = createDb(':memory:');
  uid = users.create(db, { email: 'a@x.com', passwordHash: 'h', name: 'A' }).id;
  other = users.create(db, { email: 'b@x.com', passwordHash: 'h', name: 'B' }).id;
});

describe('users repository', () => {
  it('email は小文字化・一意取得', () => {
    const u = users.create(db, { email: 'CAP@X.com', passwordHash: 'h', name: 'C' });
    expect(u.email).toBe('cap@x.com');
    expect(users.getByEmail(db, 'cap@x.com')?.id).toBe(u.id);
    expect(users.count(db)).toBe(3);
  });
});

describe('accounts repository（ユーザー分離）', () => {
  it('CRUD と所有者スコープ', () => {
    const a = accounts.create(db, uid, { name: 'IFA口座', kind: 'IFA', feeRate: 1.5, note: '' });
    expect(accounts.list(db, uid)).toHaveLength(1);
    expect(accounts.list(db, other)).toHaveLength(0); // 他人には見えない
    // 他ユーザーからは取得・更新・削除できない
    expect(accounts.get(db, other, a.id)).toBeUndefined();
    expect(accounts.update(db, other, a.id, { feeRate: 9 })).toBeUndefined();
    accounts.remove(db, other, a.id);
    expect(accounts.list(db, uid)).toHaveLength(1); // 削除されていない
    accounts.remove(db, uid, a.id);
    expect(accounts.list(db, uid)).toHaveLength(0);
  });
});

describe('transactions repository', () => {
  it('ユーザーごとに分離される', () => {
    transactions.create(db, uid, { date: '2025-01-01', accountId: 1, symbol: '7203', valuation: 100, contribution: 100, withdrawal: 0, country: 'JP', assetClass: 'equity', note: '' });
    transactions.create(db, other, { date: '2025-01-01', accountId: 1, symbol: 'AAPL', valuation: 200, contribution: 200, withdrawal: 0, country: 'US', assetClass: 'equity', note: '' });
    expect(transactions.list(db, uid)).toHaveLength(1);
    expect(transactions.list(db, uid)[0].symbol).toBe('7203');
    expect(transactions.list(db, other)[0].symbol).toBe('AAPL');
  });
});

describe('articles repository（ユーザー別の重複排除）', () => {
  it('同じ dedupeKey でもユーザーが違えば両方保存', () => {
    const key = dedupeKey({ title: 'A', url: 'https://x.com/a' });
    const base = {
      title: 'A', url: 'https://x.com/a', source: 'src', collectedAt: '2025-06-18T00:00:00Z',
      publishedAt: null, summary: 's', category: 'c', importance: 'high' as const, relatedLabels: '', dedupeKey: key,
    };
    expect(articles.insertMany(db, uid, [base])).toHaveLength(1);
    expect(articles.insertMany(db, uid, [base])).toHaveLength(0); // 同一ユーザー内は重複排除
    expect(articles.insertMany(db, other, [base])).toHaveLength(1); // 別ユーザーは別物
    expect(articles.list(db, uid)).toHaveLength(1);
    expect(articles.list(db, other)).toHaveLength(1);
  });
});

describe('reports repository', () => {
  it('ユーザー別の latest', () => {
    reports.create(db, uid, { date: '2025-06-17', title: 'r1', body: 'b', articleIds: '[]' });
    reports.create(db, uid, { date: '2025-06-18', title: 'r2', body: 'b', articleIds: '[]' });
    reports.create(db, other, { date: '2025-06-19', title: 'other', body: 'b', articleIds: '[]' });
    expect(reports.latest(db, uid)?.title).toBe('r2');
    expect(reports.list(db, uid)).toHaveLength(2);
  });
});

describe('settings repository（グローバル）', () => {
  it('upsert', () => {
    settings.set(db, 'newsCron', '30 7 * * 1-5');
    expect(settings.get(db, 'newsCron')).toBe('30 7 * * 1-5');
    settings.set(db, 'newsCron', '0 8 * * *');
    expect(settings.get(db, 'newsCron')).toBe('0 8 * * *');
  });
});

describe('resetUser', () => {
  it('指定ユーザーのデータのみ削除', () => {
    accounts.create(db, uid, { name: 'x', kind: '', feeRate: 0, note: '' });
    accounts.create(db, other, { name: 'y', kind: '', feeRate: 0, note: '' });
    resetUser(db, uid);
    expect(accounts.list(db, uid)).toHaveLength(0);
    expect(accounts.list(db, other)).toHaveLength(1); // 他人は無事
  });
});
