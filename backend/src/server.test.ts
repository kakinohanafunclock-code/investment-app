import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'node:http';
import { createDb, type DB } from './db/database.js';
import { StubAiClient } from './services/ai.js';
import { createServer } from './server.js';

let server: Server;
let base: string;
let db: DB;
let tokenA = '';
let tokenB = '';

beforeAll(async () => {
  db = createDb(':memory:');
  const app = createServer({
    db,
    ai: new StubAiClient(),
    scheduler: null,
    clientOrigins: ['*'],
    jwtSecret: 'test-secret',
    tokenTtlSec: 3600,
    signupCode: null,
    meta: { anthropicKeyPresent: false, anthropicModel: 'stub' },
  });
  await new Promise<void>((resolve) => { server = app.listen(0, () => resolve()); });
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  base = `http://127.0.0.1:${port}`;
});

afterAll(() => server?.close());

const post = (p: string, body?: unknown, token?: string) =>
  fetch(base + p, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body ?? {}),
  });
const get = (p: string, token?: string) =>
  fetch(base + p, { headers: token ? { authorization: `Bearer ${token}` } : {} });

describe('認証', () => {
  it('登録でトークンとユーザーを返す（最初の登録は admin）', async () => {
    const r = await (await post('/api/auth/register', { email: 'a@x.com', password: 'password1' })).json();
    expect(r.token).toBeTruthy();
    expect(r.user.role).toBe('admin');
    tokenA = r.token;
    const r2 = await (await post('/api/auth/register', { email: 'b@x.com', password: 'password1' })).json();
    tokenB = r2.token;
    expect(r2.user.role).toBe('user');
  });

  it('重複メールは 409', async () => {
    const res = await post('/api/auth/register', { email: 'a@x.com', password: 'password1' });
    expect(res.status).toBe(409);
  });

  it('誤ったパスワードでログイン失敗', async () => {
    const res = await post('/api/auth/login', { email: 'a@x.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('未認証では保護APIが 401', async () => {
    expect((await get('/api/dashboard')).status).toBe(401);
  });

  it('/api/auth/me が現在のユーザーを返す', async () => {
    const me = await (await get('/api/auth/me', tokenA)).json();
    expect(me.user.email).toBe('a@x.com');
  });
});

describe('ユーザーデータ分離', () => {
  it('登録時にサンプルが投入され、ダッシュボードが返る', async () => {
    const d = await (await get('/api/dashboard', tokenA)).json();
    expect(d.summary.totalValuation).toBeGreaterThan(0);
  });

  it('Aの取引はBから見えない', async () => {
    const created = await (await post('/api/transactions', {
      date: '2025-06-10', accountId: 1, symbol: 'SECRET-A', valuation: 500000, contribution: 500000, withdrawal: 0, country: 'JP', assetClass: 'equity', note: '',
    }, tokenA)).json();
    expect(created.id).toBeGreaterThan(0);

    const aTxs = await (await get('/api/transactions', tokenA)).json();
    const bTxs = await (await get('/api/transactions', tokenB)).json();
    expect(aTxs.some((t: any) => t.symbol === 'SECRET-A')).toBe(true);
    expect(bTxs.some((t: any) => t.symbol === 'SECRET-A')).toBe(false);

    // BはAの取引を削除できない（404）
    const del = await fetch(`${base}/api/transactions/${created.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${tokenB}` } });
    expect(del.status).toBe(204); // 冪等だが
    const aStill = await (await get('/api/transactions', tokenA)).json();
    expect(aStill.some((t: any) => t.symbol === 'SECRET-A')).toBe(true); // 実際には消えていない
  });
});

describe('エージェント（スタブ）', () => {
  it('収集→レポート生成→対話、すべて免責付き', async () => {
    const collect = await (await post('/api/agent/collect', {}, tokenA)).json();
    expect(collect).toHaveProperty('inserted');
    const report = await (await post('/api/agent/report', {}, tokenA)).json();
    expect(report.body).toContain('投資助言では');
    const chat = await (await post('/api/agent/chat', { messages: [{ role: 'user', content: '資産状況は?' }] }, tokenA)).json();
    expect(chat.answer).toContain('投資助言では');
  });
});

describe('設定・cron 権限', () => {
  it('admin は cron 更新可、一般ユーザーは 403', async () => {
    expect((await fetch(base + '/api/settings/cron', { method: 'PUT', headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenA}` }, body: JSON.stringify({ cron: '0 8 * * *' }) })).status).toBe(200);
    expect((await fetch(base + '/api/settings/cron', { method: 'PUT', headers: { 'content-type': 'application/json', authorization: `Bearer ${tokenB}` }, body: JSON.stringify({ cron: '0 8 * * *' }) })).status).toBe(403);
  });
});

describe('ヘルスチェック（認証不要）', () => {
  it('GET /api/health', async () => {
    const h = await (await get('/api/health')).json();
    expect(h.ok).toBe(true);
    expect(h.users).toBeGreaterThanOrEqual(2);
  });
});
