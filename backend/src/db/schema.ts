// SQLite スキーマ。金額列はすべて INTEGER（円）。
// マルチユーザー対応：各データ行は userId を持ち、ユーザー間で分離される。
// データアクセス層を分離しているため、将来 PostgreSQL へ移す際は
// この DDL と repositories の SQL を置き換えるだけで済む。

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  email        TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  name         TEXT NOT NULL DEFAULT '',
  role         TEXT NOT NULL DEFAULT 'user',
  createdAt    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  userId    INTEGER NOT NULL DEFAULT 0,
  name      TEXT NOT NULL,
  kind      TEXT NOT NULL DEFAULT '',
  feeRate   REAL NOT NULL DEFAULT 0,
  note      TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_acc_user ON accounts(userId);

CREATE TABLE IF NOT EXISTS transactions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  userId       INTEGER NOT NULL DEFAULT 0,
  date         TEXT NOT NULL,
  accountId    INTEGER NOT NULL,
  symbol       TEXT NOT NULL,
  valuation    INTEGER NOT NULL DEFAULT 0,
  contribution INTEGER NOT NULL DEFAULT 0,
  withdrawal   INTEGER NOT NULL DEFAULT 0,
  country      TEXT NOT NULL DEFAULT 'JP',
  assetClass   TEXT NOT NULL DEFAULT 'equity',
  note         TEXT NOT NULL DEFAULT '',
  createdAt    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tx_user_symbol_date ON transactions(userId, symbol, date);

CREATE TABLE IF NOT EXISTS dividends (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  userId    INTEGER NOT NULL DEFAULT 0,
  date      TEXT NOT NULL,
  accountId INTEGER,
  symbol    TEXT NOT NULL DEFAULT '',
  amount    INTEGER NOT NULL DEFAULT 0,
  kind      TEXT NOT NULL DEFAULT 'dividend',
  note      TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_div_user_date ON dividends(userId, date);

CREATE TABLE IF NOT EXISTS watchlist (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  userId    INTEGER NOT NULL DEFAULT 0,
  type      TEXT NOT NULL DEFAULT 'symbol',
  label     TEXT NOT NULL,
  country   TEXT,
  note      TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_watch_user ON watchlist(userId);

CREATE TABLE IF NOT EXISTS articles (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  userId        INTEGER NOT NULL DEFAULT 0,
  title         TEXT NOT NULL,
  url           TEXT NOT NULL DEFAULT '',
  source        TEXT NOT NULL DEFAULT '',
  collectedAt   TEXT NOT NULL,
  publishedAt   TEXT,
  summary       TEXT NOT NULL DEFAULT '',
  category      TEXT NOT NULL DEFAULT '',
  importance    TEXT NOT NULL DEFAULT 'medium',
  relatedLabels TEXT NOT NULL DEFAULT '',
  dedupeKey     TEXT NOT NULL
);
-- 重複排除はユーザー単位（同じ記事を別ユーザーが収集してもよい）
CREATE UNIQUE INDEX IF NOT EXISTS idx_article_user_dedupe ON articles(userId, dedupeKey);
CREATE INDEX IF NOT EXISTS idx_article_user_collected ON articles(userId, collectedAt);

CREATE TABLE IF NOT EXISTS reports (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  userId     INTEGER NOT NULL DEFAULT 0,
  date       TEXT NOT NULL,
  createdAt  TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  articleIds TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_report_user_date ON reports(userId, date);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

/**
 * 既存 DB（userId 列が無い旧スキーマ）への簡易マイグレーション。
 * 列が無ければ追加する。articles は UNIQUE 制約が変わるため作り直す（ニュースキャッシュなので破棄可）。
 */
export function migrate(db: { prepare: Function; exec: Function }): void {
  const hasColumn = (table: string, col: string): boolean => {
    try {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
      return cols.some((c) => c.name === col);
    } catch {
      return false;
    }
  };
  const tableExists = (table: string): boolean => {
    const row = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
    return Boolean(row);
  };

  for (const t of ['accounts', 'transactions', 'dividends', 'watchlist', 'reports']) {
    if (tableExists(t) && !hasColumn(t, 'userId')) {
      db.exec(`ALTER TABLE ${t} ADD COLUMN userId INTEGER NOT NULL DEFAULT 0`);
    }
  }
  // articles: 旧 UNIQUE(dedupeKey) → 複合 UNIQUE(userId, dedupeKey) へ。キャッシュなので破棄して再作成。
  if (tableExists('articles') && !hasColumn('articles', 'userId')) {
    db.exec('DROP TABLE articles');
    db.exec(`
      CREATE TABLE articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL DEFAULT 0,
        title TEXT NOT NULL, url TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT '',
        collectedAt TEXT NOT NULL, publishedAt TEXT, summary TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT '', importance TEXT NOT NULL DEFAULT 'medium',
        relatedLabels TEXT NOT NULL DEFAULT '', dedupeKey TEXT NOT NULL);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_article_user_dedupe ON articles(userId, dedupeKey);
      CREATE INDEX IF NOT EXISTS idx_article_user_collected ON articles(userId, collectedAt);
    `);
  }
}
