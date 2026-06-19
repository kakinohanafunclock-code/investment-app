import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDb, type DB } from '../db/database.js';
import { Scheduler, runDailyJob } from './scheduler.js';
import { StubAiClient } from './ai.js';
import { users, watchlist } from '../db/repositories.js';
import cron from 'node-cron';

describe('Scheduler', () => {
  let db: DB;
  let sched: Scheduler;
  beforeEach(() => {
    db = createDb(':memory:');
    sched = new Scheduler(db, new StubAiClient(), '30 7 * * 1-5', 'Asia/Tokyo');
  });
  afterEach(() => sched.stop());

  it('既定 cron 式を返す', () => {
    expect(sched.cronExpr()).toBe('30 7 * * 1-5');
  });

  it('reschedule で DB 設定を更新し、以後それを使う', () => {
    sched.reschedule('0 8 * * *');
    expect(sched.cronExpr()).toBe('0 8 * * *');
    expect(sched.isRunning()).toBe(true);
    sched.stop();
    expect(sched.isRunning()).toBe(false);
  });

  it('node-cron が式を検証できる', () => {
    expect(cron.validate('30 7 * * 1-5')).toBe(true);
    expect(cron.validate('not-a-cron')).toBe(false);
  });
});

describe('runDailyJob（全ユーザーをループ）', () => {
  it('各ユーザーごとに収集＋レポート生成し、結果を集約', async () => {
    const db = createDb(':memory:');
    const ai = new StubAiClient();
    const u1 = users.create(db, { email: 'a@x.com', passwordHash: 'h', name: 'A' });
    const u2 = users.create(db, { email: 'b@x.com', passwordHash: 'h', name: 'B' });
    watchlist.create(db, u1.id, { type: 'symbol', label: '7203 トヨタ', country: 'JP', note: '' });

    // ネットワークに出ないよう fetchRaw を注入（決定的・高速）
    const result = await runDailyJob(db, ai, async () => [
      { title: 'トヨタ関連ニュース', url: 'https://x.com/n1', source: 'S', publishedAt: null },
    ]);
    expect(result.userResults).toHaveLength(2);
    expect(result.userResults.map((r) => r.userId).sort()).toEqual([u1.id, u2.id].sort());
    // レポートはユーザーごとに生成される
    expect(result.userResults.every((r) => r.reportId > 0)).toBe(true);
  });
});
