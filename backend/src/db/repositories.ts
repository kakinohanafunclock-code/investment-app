import type { DB } from './database.js';
import type {
  User, Account, Transaction, Dividend, WatchItem, Article, Report,
} from '../types.js';

// ===========================================================================
// PostgreSQL 移行ポイント（3名超への拡張時）:
//   このモジュールは SQLite（node:sqlite, 同期 API）に依存している。
//   Postgres へ移すには、env の DATABASE_URL を見て接続を切り替え、
//   各メソッドの SQL を pg 用（$1, $2 プレースホルダ・非同期）に置き換える。
//   呼び出し側は (db, userId, ...) のシグネチャを維持すれば影響を局所化できる。
//   具体的には: ('?' → '$n')、同期 .get/.all/.run → await query、
//   INSERT ... RETURNING * で作成行を取得、AUTOINCREMENT → SERIAL/IDENTITY。
//   ユーザー単位スコープ（WHERE userId = ?）は全クエリで既に徹底済み。
// ===========================================================================

const now = () => new Date().toISOString();

// ===== Users（グローバル。ユーザー間分離の起点）=====
export const users = {
  count(db: DB): number {
    const r = db.prepare('SELECT COUNT(*) AS c FROM users').get() as unknown as { c: number };
    return r.c;
  },
  list(db: DB): User[] {
    return db.prepare('SELECT * FROM users ORDER BY id').all() as unknown as User[];
  },
  getById(db: DB, id: number): User | undefined {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as User | undefined;
  },
  getByEmail(db: DB, email: string): User | undefined {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as unknown as User | undefined;
  },
  create(db: DB, u: { email: string; passwordHash: string; name: string; role?: 'user' | 'admin' }): User {
    const info = db
      .prepare('INSERT INTO users (email, passwordHash, name, role, createdAt) VALUES (?,?,?,?,?)')
      .run(u.email.toLowerCase(), u.passwordHash, u.name, u.role ?? 'user', now());
    return this.getById(db, Number(info.lastInsertRowid))!;
  },
};

// ===== Accounts =====
export const accounts = {
  list(db: DB, userId: number): Account[] {
    return db.prepare('SELECT * FROM accounts WHERE userId = ? ORDER BY id').all(userId) as unknown as Account[];
  },
  get(db: DB, userId: number, id: number): Account | undefined {
    return db.prepare('SELECT * FROM accounts WHERE id = ? AND userId = ?').get(id, userId) as unknown as Account | undefined;
  },
  create(db: DB, userId: number, a: Omit<Account, 'id' | 'userId' | 'createdAt'>): Account {
    const info = db
      .prepare('INSERT INTO accounts (userId, name, kind, feeRate, note, createdAt) VALUES (?,?,?,?,?,?)')
      .run(userId, a.name, a.kind, a.feeRate, a.note, now());
    return this.get(db, userId, Number(info.lastInsertRowid))!;
  },
  update(db: DB, userId: number, id: number, a: Partial<Omit<Account, 'id' | 'userId' | 'createdAt'>>): Account | undefined {
    const cur = this.get(db, userId, id);
    if (!cur) return undefined;
    const m = { ...cur, ...a };
    db.prepare('UPDATE accounts SET name=?, kind=?, feeRate=?, note=? WHERE id=? AND userId=?').run(m.name, m.kind, m.feeRate, m.note, id, userId);
    return this.get(db, userId, id);
  },
  remove(db: DB, userId: number, id: number): void {
    db.prepare('DELETE FROM accounts WHERE id = ? AND userId = ?').run(id, userId);
  },
};

// ===== Transactions =====
export const transactions = {
  list(db: DB, userId: number): Transaction[] {
    return db.prepare('SELECT * FROM transactions WHERE userId = ? ORDER BY date, id').all(userId) as unknown as Transaction[];
  },
  get(db: DB, userId: number, id: number): Transaction | undefined {
    return db.prepare('SELECT * FROM transactions WHERE id = ? AND userId = ?').get(id, userId) as unknown as Transaction | undefined;
  },
  create(db: DB, userId: number, t: Omit<Transaction, 'id' | 'userId' | 'createdAt'>): Transaction {
    const info = db
      .prepare(`INSERT INTO transactions (userId, date, accountId, symbol, valuation, contribution, withdrawal, country, assetClass, note, createdAt)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(userId, t.date, t.accountId, t.symbol, t.valuation, t.contribution, t.withdrawal, t.country, t.assetClass, t.note, now());
    return this.get(db, userId, Number(info.lastInsertRowid))!;
  },
  update(db: DB, userId: number, id: number, t: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>>): Transaction | undefined {
    const cur = this.get(db, userId, id);
    if (!cur) return undefined;
    const m = { ...cur, ...t };
    db.prepare(`UPDATE transactions SET date=?, accountId=?, symbol=?, valuation=?, contribution=?, withdrawal=?, country=?, assetClass=?, note=? WHERE id=? AND userId=?`)
      .run(m.date, m.accountId, m.symbol, m.valuation, m.contribution, m.withdrawal, m.country, m.assetClass, m.note, id, userId);
    return this.get(db, userId, id);
  },
  remove(db: DB, userId: number, id: number): void {
    db.prepare('DELETE FROM transactions WHERE id = ? AND userId = ?').run(id, userId);
  },
};

// ===== Dividends =====
export const dividends = {
  list(db: DB, userId: number): Dividend[] {
    return db.prepare('SELECT * FROM dividends WHERE userId = ? ORDER BY date, id').all(userId) as unknown as Dividend[];
  },
  get(db: DB, userId: number, id: number): Dividend | undefined {
    return db.prepare('SELECT * FROM dividends WHERE id = ? AND userId = ?').get(id, userId) as unknown as Dividend | undefined;
  },
  create(db: DB, userId: number, d: Omit<Dividend, 'id' | 'userId' | 'createdAt'>): Dividend {
    const info = db
      .prepare('INSERT INTO dividends (userId, date, accountId, symbol, amount, kind, note, createdAt) VALUES (?,?,?,?,?,?,?,?)')
      .run(userId, d.date, d.accountId, d.symbol, d.amount, d.kind, d.note, now());
    return this.get(db, userId, Number(info.lastInsertRowid))!;
  },
  update(db: DB, userId: number, id: number, d: Partial<Omit<Dividend, 'id' | 'userId' | 'createdAt'>>): Dividend | undefined {
    const cur = this.get(db, userId, id);
    if (!cur) return undefined;
    const m = { ...cur, ...d };
    db.prepare('UPDATE dividends SET date=?, accountId=?, symbol=?, amount=?, kind=?, note=? WHERE id=? AND userId=?')
      .run(m.date, m.accountId, m.symbol, m.amount, m.kind, m.note, id, userId);
    return this.get(db, userId, id);
  },
  remove(db: DB, userId: number, id: number): void {
    db.prepare('DELETE FROM dividends WHERE id = ? AND userId = ?').run(id, userId);
  },
};

// ===== Watchlist =====
export const watchlist = {
  list(db: DB, userId: number): WatchItem[] {
    return db.prepare('SELECT * FROM watchlist WHERE userId = ? ORDER BY id').all(userId) as unknown as WatchItem[];
  },
  create(db: DB, userId: number, w: Omit<WatchItem, 'id' | 'userId' | 'createdAt'>): WatchItem {
    const info = db
      .prepare('INSERT INTO watchlist (userId, type, label, country, note, createdAt) VALUES (?,?,?,?,?,?)')
      .run(userId, w.type, w.label, w.country, w.note, now());
    return db.prepare('SELECT * FROM watchlist WHERE id = ?').get(Number(info.lastInsertRowid)) as unknown as WatchItem;
  },
  remove(db: DB, userId: number, id: number): void {
    db.prepare('DELETE FROM watchlist WHERE id = ? AND userId = ?').run(id, userId);
  },
};

// ===== Articles =====
export const articles = {
  list(db: DB, userId: number, limit = 200): Article[] {
    return db.prepare('SELECT * FROM articles WHERE userId = ? ORDER BY collectedAt DESC, id DESC LIMIT ?').all(userId, limit) as unknown as Article[];
  },
  existingKeys(db: DB, userId: number): Set<string> {
    const rows = db.prepare('SELECT dedupeKey FROM articles WHERE userId = ?').all(userId) as unknown as { dedupeKey: string }[];
    return new Set(rows.map((r) => r.dedupeKey));
  },
  /** 重複時は無視して挿入。挿入できた行を返す。 */
  insertMany(db: DB, userId: number, items: Omit<Article, 'id' | 'userId'>[]): Article[] {
    const stmt = db.prepare(
      `INSERT OR IGNORE INTO articles (userId, title, url, source, collectedAt, publishedAt, summary, category, importance, relatedLabels, dedupeKey)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    );
    const inserted: Article[] = [];
    for (const a of items) {
      const info = stmt.run(userId, a.title, a.url, a.source, a.collectedAt, a.publishedAt, a.summary, a.category, a.importance, a.relatedLabels, a.dedupeKey);
      if (info.changes > 0) {
        inserted.push(db.prepare('SELECT * FROM articles WHERE id = ?').get(Number(info.lastInsertRowid)) as unknown as Article);
      }
    }
    return inserted;
  },
};

// ===== Reports =====
export const reports = {
  list(db: DB, userId: number, limit = 60): Report[] {
    return db.prepare('SELECT * FROM reports WHERE userId = ? ORDER BY date DESC, id DESC LIMIT ?').all(userId, limit) as unknown as Report[];
  },
  get(db: DB, userId: number, id: number): Report | undefined {
    return db.prepare('SELECT * FROM reports WHERE id = ? AND userId = ?').get(id, userId) as unknown as Report | undefined;
  },
  latest(db: DB, userId: number): Report | undefined {
    return db.prepare('SELECT * FROM reports WHERE userId = ? ORDER BY date DESC, id DESC LIMIT 1').get(userId) as unknown as Report | undefined;
  },
  create(db: DB, userId: number, r: Omit<Report, 'id' | 'userId' | 'createdAt'>): Report {
    const info = db
      .prepare('INSERT INTO reports (userId, date, createdAt, title, body, articleIds) VALUES (?,?,?,?,?,?)')
      .run(userId, r.date, now(), r.title, r.body, r.articleIds);
    return this.get(db, userId, Number(info.lastInsertRowid))!;
  },
};

// ===== Settings（グローバル：スケジューラ時刻など）=====
export const settings = {
  get(db: DB, key: string): string | undefined {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as unknown as { value: string } | undefined;
    return row?.value;
  },
  set(db: DB, key: string, value: string): void {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
  },
  all(db: DB): Record<string, string> {
    const rows = db.prepare('SELECT key, value FROM settings').all() as unknown as { key: string; value: string }[];
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  },
};

/** あるユーザーの全データ削除（リセット用。他ユーザーには影響しない） */
export function resetUser(db: DB, userId: number): void {
  for (const t of ['transactions', 'dividends', 'articles', 'reports', 'watchlist', 'accounts']) {
    db.prepare(`DELETE FROM ${t} WHERE userId = ?`).run(userId);
  }
}
