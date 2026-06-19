import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createRequire } from 'node:module';
import { SCHEMA, migrate } from './schema.js';

// node:sqlite は新しい組み込みモジュール。バンドラ（Vite/vitest）が
// 静的解析で解決できないため、createRequire で実行時に読み込む。
const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite');

export type DB = DatabaseSyncType;

/** DB を開いてスキーマを適用する。':memory:' でテスト用インメモリ。 */
export function createDb(path: string): DB {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  migrate(db); // 旧スキーマ DB に userId 列を追加
  db.exec(SCHEMA);
  return db;
}
