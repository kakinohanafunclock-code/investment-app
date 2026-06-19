import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { z } from 'zod';
import cron from 'node-cron';
import type { DB } from './db/database.js';
import type { AiClient } from './services/ai.js';
import type { Scheduler } from './services/scheduler.js';
import {
  users as usersRepo,
  accounts as accRepo,
  transactions as txRepo,
  dividends as divRepo,
  watchlist as watchRepo,
  articles as articlesRepo,
  reports as reportsRepo,
  settings as settingsRepo,
  resetUser,
} from './db/repositories.js';
import { dashboardData, selfCheck, dataAnalysis } from './services/insights.js';
import { collectNews } from './services/news.js';
import { generateBriefing } from './services/report.js';
import { chat } from './services/chat.js';
import { parseCsv, mapRows, type TransactionMapping, type DividendMapping } from './lib/csv.js';
import { seedSampleData } from './scripts/sampleData.js';
import { hashPassword, verifyPassword, signToken, verifyToken } from './lib/auth.js';
import type { PublicUser, User } from './types.js';

export interface ServerDeps {
  db: DB;
  ai: AiClient;
  scheduler: Scheduler | null;
  clientOrigins: string[];
  jwtSecret: string;
  tokenTtlSec: number;
  signupCode: string | null;
  meta: { anthropicKeyPresent: boolean; anthropicModel: string };
}

// req.userId を持たせる
interface AuthedRequest extends Request {
  userId?: number;
  user?: User;
}

const publicUser = (u: User): PublicUser => ({ id: u.id, email: u.email, name: u.name, role: u.role });

const asyncH =
  (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: Request, res: Response) => {
    fn(req as AuthedRequest, res).catch((e) => {
      console.error(e);
      res.status(500).json({ error: String(e?.message ?? e) });
    });
  };

export function createServer(deps: ServerDeps): Express {
  const { db, ai, scheduler, jwtSecret, tokenTtlSec } = deps;
  const app = express();

  // CORS：許可オリジンのみ（'*' は全許可）
  const allowAll = deps.clientOrigins.includes('*');
  app.use(
    cors({
      origin: allowAll ? true : deps.clientOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '10mb' }));

  // ---- 認証ミドルウェア ----
  const requireAuth = (req: AuthedRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const payload = token ? verifyToken(token, jwtSecret) : null;
    if (!payload) {
      res.status(401).json({ error: '認証が必要です' });
      return;
    }
    const user = usersRepo.getById(db, payload.sub);
    if (!user) {
      res.status(401).json({ error: 'ユーザーが見つかりません' });
      return;
    }
    req.userId = user.id;
    req.user = user;
    next();
  };
  const uid = (req: AuthedRequest) => req.userId!;

  // ===== health / meta（認証不要・監視/スリープ対策に利用）=====
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      time: new Date().toISOString(),
      ai: { enabled: ai.enabled, keyPresent: deps.meta.anthropicKeyPresent, model: deps.meta.anthropicModel },
      scheduler: scheduler ? { running: scheduler.isRunning(), cron: scheduler.cronExpr() } : null,
      users: usersRepo.count(db),
    });
  });

  // ===== 認証 =====
  const credSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, 'パスワードは8文字以上'),
    name: z.string().optional(),
    signupCode: z.string().optional(),
  });

  app.post('/api/auth/register', asyncH(async (req, res) => {
    const { email, password, name, signupCode } = credSchema.parse(req.body);
    if (deps.signupCode && signupCode !== deps.signupCode) {
      res.status(403).json({ error: '招待コードが正しくありません' });
      return;
    }
    if (usersRepo.getByEmail(db, email)) {
      res.status(409).json({ error: 'このメールアドレスは登録済みです' });
      return;
    }
    const isFirst = usersRepo.count(db) === 0;
    const user = usersRepo.create(db, {
      email,
      passwordHash: hashPassword(password),
      name: name || email.split('@')[0],
      role: isFirst ? 'admin' : 'user', // 最初の登録者を admin に
    });
    // 新規ユーザーには空画面回避のサンプルを投入
    seedSampleData(db, user.id);
    const token = signToken({ sub: user.id, email: user.email, name: user.name }, jwtSecret, tokenTtlSec);
    res.status(201).json({ token, user: publicUser(user) });
  }));

  app.post('/api/auth/login', asyncH(async (req, res) => {
    const { email, password } = z.object({ email: z.string(), password: z.string() }).parse(req.body);
    const user = usersRepo.getByEmail(db, email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'メールアドレスまたはパスワードが違います' });
      return;
    }
    const token = signToken({ sub: user.id, email: user.email, name: user.name }, jwtSecret, tokenTtlSec);
    res.json({ token, user: publicUser(user) });
  }));

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
    res.json({ user: publicUser(req.user!) });
  });

  // ===== ここから下はすべて認証必須・ユーザー単位スコープ =====
  app.use('/api', (req: AuthedRequest, res, next) => {
    // 認証不要パスは既に上で処理済み
    if (req.path.startsWith('/auth') || req.path === '/health') return next();
    requireAuth(req, res, next);
  });

  // ---- dashboard ----
  app.get('/api/dashboard', (req: AuthedRequest, res) => {
    const month = typeof req.query.month === 'string' ? req.query.month : undefined;
    res.json(dashboardData(db, uid(req), month));
  });
  app.get('/api/insights/self-check', (req: AuthedRequest, res) => res.json(selfCheck(db, uid(req))));
  app.get('/api/insights/data-analysis', (req: AuthedRequest, res) => res.json(dataAnalysis(db, uid(req))));

  // ---- accounts ----
  const accountSchema = z.object({
    name: z.string().min(1), kind: z.string().default(''), feeRate: z.number().default(0), note: z.string().default(''),
  });
  app.get('/api/accounts', (req: AuthedRequest, res) => res.json(accRepo.list(db, uid(req))));
  app.post('/api/accounts', (req: AuthedRequest, res) => res.status(201).json(accRepo.create(db, uid(req), accountSchema.parse(req.body))));
  app.put('/api/accounts/:id', (req: AuthedRequest, res) => {
    const u = accRepo.update(db, uid(req), Number(req.params.id), accountSchema.partial().parse(req.body));
    if (!u) return res.status(404).json({ error: 'not found' });
    res.json(u);
  });
  app.delete('/api/accounts/:id', (req: AuthedRequest, res) => { accRepo.remove(db, uid(req), Number(req.params.id)); res.status(204).end(); });

  // ---- transactions ----
  const txSchema = z.object({
    date: z.string().min(1), accountId: z.number().int(), symbol: z.string().min(1),
    valuation: z.number().int().default(0), contribution: z.number().int().default(0), withdrawal: z.number().int().default(0),
    country: z.enum(['JP', 'US']).default('JP'),
    assetClass: z.enum(['equity', 'fund', 'etf', 'bond', 'reit', 'cash', 'other']).default('equity'),
    note: z.string().default(''),
  });
  app.get('/api/transactions', (req: AuthedRequest, res) => res.json(txRepo.list(db, uid(req))));
  app.post('/api/transactions', (req: AuthedRequest, res) => res.status(201).json(txRepo.create(db, uid(req), txSchema.parse(req.body))));
  app.put('/api/transactions/:id', (req: AuthedRequest, res) => {
    const u = txRepo.update(db, uid(req), Number(req.params.id), txSchema.partial().parse(req.body));
    if (!u) return res.status(404).json({ error: 'not found' });
    res.json(u);
  });
  app.delete('/api/transactions/:id', (req: AuthedRequest, res) => { txRepo.remove(db, uid(req), Number(req.params.id)); res.status(204).end(); });

  // ---- dividends ----
  const divSchema = z.object({
    date: z.string().min(1), accountId: z.number().int().nullable().default(null), symbol: z.string().default(''),
    amount: z.number().int().default(0), kind: z.enum(['dividend', 'distribution', 'interest']).default('dividend'), note: z.string().default(''),
  });
  app.get('/api/dividends', (req: AuthedRequest, res) => res.json(divRepo.list(db, uid(req))));
  app.post('/api/dividends', (req: AuthedRequest, res) => res.status(201).json(divRepo.create(db, uid(req), divSchema.parse(req.body))));
  app.put('/api/dividends/:id', (req: AuthedRequest, res) => {
    const u = divRepo.update(db, uid(req), Number(req.params.id), divSchema.partial().parse(req.body));
    if (!u) return res.status(404).json({ error: 'not found' });
    res.json(u);
  });
  app.delete('/api/dividends/:id', (req: AuthedRequest, res) => { divRepo.remove(db, uid(req), Number(req.params.id)); res.status(204).end(); });

  // ---- CSV import ----
  const importSchema = z.object({
    csv: z.string(), type: z.enum(['transaction', 'dividend']), mapping: z.record(z.string()),
    defaults: z.object({ accountId: z.number().int().optional(), country: z.enum(['JP', 'US']).optional() }).optional(),
  });
  app.post('/api/import', (req: AuthedRequest, res) => {
    const { csv, type, mapping, defaults } = importSchema.parse(req.body);
    const { rows } = parseCsv(csv);
    const userId = uid(req);
    if (type === 'transaction') {
      const mapped = mapRows(rows, mapping as unknown as TransactionMapping, 'transaction');
      const created = mapped.map((m) => txRepo.create(db, userId, {
        date: m.date, accountId: defaults?.accountId ?? 1, symbol: m.symbol,
        valuation: m.valuation, contribution: m.contribution, withdrawal: m.withdrawal,
        country: (m.country as 'JP' | 'US') || defaults?.country || 'JP', assetClass: (m.assetClass as any) || 'equity', note: m.note,
      }));
      res.json({ inserted: created.length });
    } else {
      const mapped = mapRows(rows, mapping as unknown as DividendMapping, 'dividend');
      const created = mapped.map((m) => divRepo.create(db, userId, {
        date: m.date, accountId: defaults?.accountId ?? null, symbol: m.symbol, amount: m.amount, kind: (m.kind as any) || 'dividend', note: m.note,
      }));
      res.json({ inserted: created.length });
    }
  });

  // ---- watchlist ----
  const watchSchema = z.object({
    type: z.enum(['symbol', 'sector', 'macro']).default('symbol'), label: z.string().min(1),
    country: z.enum(['JP', 'US']).nullable().default(null), note: z.string().default(''),
  });
  app.get('/api/watchlist', (req: AuthedRequest, res) => res.json(watchRepo.list(db, uid(req))));
  app.post('/api/watchlist', (req: AuthedRequest, res) => res.status(201).json(watchRepo.create(db, uid(req), watchSchema.parse(req.body))));
  app.delete('/api/watchlist/:id', (req: AuthedRequest, res) => { watchRepo.remove(db, uid(req), Number(req.params.id)); res.status(204).end(); });

  // ---- articles & reports ----
  app.get('/api/articles', (req: AuthedRequest, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : 200;
    res.json(articlesRepo.list(db, uid(req), limit));
  });
  app.get('/api/reports', (req: AuthedRequest, res) => res.json(reportsRepo.list(db, uid(req))));
  app.get('/api/reports/:id', (req: AuthedRequest, res) => {
    const r = reportsRepo.get(db, uid(req), Number(req.params.id));
    if (!r) return res.status(404).json({ error: 'not found' });
    res.json(r);
  });

  // ---- agent actions（自分のデータに対して実行）----
  app.post('/api/agent/collect', asyncH(async (req, res) => {
    const r = await collectNews({ db, ai, userId: uid(req) });
    res.json({ fetched: r.fetched, fresh: r.fresh, inserted: r.inserted.length });
  }));
  app.post('/api/agent/report', asyncH(async (req, res) => {
    res.status(201).json(await generateBriefing({ db, ai, userId: uid(req) }));
  }));
  app.post('/api/agent/run-now', asyncH(async (req, res) => {
    const userId = uid(req);
    const collect = await collectNews({ db, ai, userId });
    const report = await generateBriefing({ db, ai, userId });
    res.json({ collected: collect.inserted.length, report });
  }));

  const chatSchema = z.object({
    messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).min(1),
  });
  app.post('/api/agent/chat', asyncH(async (req, res) => {
    const { messages } = chatSchema.parse(req.body);
    res.json({ answer: await chat({ db, ai, userId: uid(req) }, messages) });
  }));

  // ---- settings / scheduler（cron はグローバル設定。admin のみ変更可）----
  app.get('/api/settings', (req: AuthedRequest, res) => {
    res.json({
      cron: scheduler?.cronExpr() ?? settingsRepo.get(db, 'newsCron') ?? '',
      schedulerRunning: scheduler?.isRunning() ?? false,
      isAdmin: req.user?.role === 'admin',
    });
  });
  app.put('/api/settings/cron', (req: AuthedRequest, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'cron 設定の変更は管理者のみ可能です' });
    const { cron: expr } = z.object({ cron: z.string().min(1) }).parse(req.body);
    if (!cron.validate(expr)) return res.status(400).json({ error: '無効な cron 式です' });
    if (scheduler) scheduler.reschedule(expr);
    else settingsRepo.set(db, 'newsCron', expr);
    res.json({ cron: expr });
  });

  // ---- export / reset（自分のデータのみ）----
  app.get('/api/export', (req: AuthedRequest, res) => {
    const userId = uid(req);
    res.json({
      exportedAt: new Date().toISOString(),
      accounts: accRepo.list(db, userId),
      transactions: txRepo.list(db, userId),
      dividends: divRepo.list(db, userId),
      watchlist: watchRepo.list(db, userId),
    });
  });
  app.post('/api/reset', (req: AuthedRequest, res) => {
    const userId = uid(req);
    resetUser(db, userId);
    if (req.body?.seed) seedSampleData(db, userId);
    res.json({ ok: true, seeded: Boolean(req.body?.seed) });
  });
  app.post('/api/seed', (req: AuthedRequest, res) => { seedSampleData(db, uid(req)); res.json({ ok: true }); });

  // error handler（zod 等）
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    res.status(400).json({ error: String(err?.message ?? err) });
  });

  return app;
}
