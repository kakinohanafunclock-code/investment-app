import { loadConfig } from '../config.js';
import { createDb } from '../db/database.js';
import { users as usersRepo, transactions } from '../db/repositories.js';
import { hashPassword } from '../lib/auth.js';
import { reseed } from './sampleData.js';

const cfg = loadConfig();
const db = createDb(cfg.dbPath);

const DEMO_EMAIL = process.env.SEED_EMAIL || 'demo@example.com';
const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'demo12345';

let user = usersRepo.getByEmail(db, DEMO_EMAIL);
if (!user) {
  user = usersRepo.create(db, {
    email: DEMO_EMAIL,
    passwordHash: hashPassword(DEMO_PASSWORD),
    name: 'デモユーザー',
    role: usersRepo.count(db) === 0 ? 'admin' : 'user',
  });
  console.log(`デモユーザーを作成: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

reseed(db, user.id);
console.log(`サンプルデータを投入しました（${cfg.dbPath}）。取引 ${transactions.list(db, user.id).length} 件。`);
console.log(`ログイン: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
