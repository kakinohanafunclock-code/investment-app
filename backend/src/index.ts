import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import express from 'express';
import { loadConfig } from './config.js';
import { createDb } from './db/database.js';
import { createAiClient } from './services/ai.js';
import { Scheduler } from './services/scheduler.js';
import { createServer } from './server.js';
import { settings as settingsRepo, users as usersRepo } from './db/repositories.js';

const cfg = loadConfig();
const db = createDb(cfg.dbPath);
const ai = createAiClient(process.env);

if (cfg.jwtSecret === 'INSECURE_DEV_SECRET_CHANGE_ME') {
  console.warn('⚠️  JWT_SECRET が未設定です。本番では必ず環境変数で強固な値を設定してください。');
}

// DB に cron 設定が無ければ環境変数を初期値として保存
if (!settingsRepo.get(db, 'newsCron')) {
  settingsRepo.set(db, 'newsCron', cfg.newsCron);
}

const scheduler = new Scheduler(db, ai, cfg.newsCron, cfg.cronTz);
if (cfg.enableScheduler) scheduler.start();

const app = createServer({
  db,
  ai,
  scheduler,
  clientOrigins: cfg.clientOrigins,
  jwtSecret: cfg.jwtSecret,
  tokenTtlSec: cfg.tokenTtlSec,
  signupCode: cfg.signupCode,
  meta: { anthropicKeyPresent: cfg.anthropicKeyPresent, anthropicModel: cfg.anthropicModel },
});

// 単一サービスデプロイ：frontend/dist を配信（SERVE_STATIC=true）
if (cfg.serveStatic) {
  const here = dirname(fileURLToPath(import.meta.url));
  // dist/index.js から見たフロントのビルド出力
  const candidates = [
    join(here, '../../frontend/dist'),
    join(here, '../../../frontend/dist'),
  ];
  const staticDir = candidates.find((p) => existsSync(join(p, 'index.html')));
  if (staticDir) {
    app.use(express.static(staticDir));
    // SPA フォールバック（API 以外は index.html）
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(join(staticDir, 'index.html')));
    console.log(`[static] フロントエンドを配信: ${staticDir}`);
  } else {
    console.warn('[static] SERVE_STATIC=true ですが frontend/dist が見つかりません。先に npm run build を実行してください。');
  }
}

app.listen(cfg.port, () => {
  console.log(`\n🚀 投資ダッシュボード API: http://localhost:${cfg.port}`);
  console.log(`   AI: ${ai.enabled ? `有効 (${cfg.anthropicModel})` : '無効（ANTHROPIC_API_KEY 未設定 → スタブ応答）'}`);
  console.log(`   スケジューラ: ${cfg.enableScheduler ? `有効 "${scheduler.cronExpr()}" (${cfg.cronTz})` : '無効'}`);
  console.log(`   登録ユーザー数: ${usersRepo.count(db)}`);
  console.log(`   DB: ${cfg.dbPath}\n`);
});
