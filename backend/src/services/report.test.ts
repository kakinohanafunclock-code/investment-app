import { describe, it, expect, beforeEach } from 'vitest';
import { createDb, type DB } from '../db/database.js';
import { users, articles, reports } from '../db/repositories.js';
import { buildReportContext, composeFallbackReport, generateBriefing, todayStr } from './report.js';
import { dedupeKey } from '../lib/dedupe.js';
import { StubAiClient } from './ai.js';

function seedArticle(db: DB, userId: number, p: { title: string; source: string; importance?: 'high' | 'medium' | 'low'; date: string }) {
  articles.insertMany(db, userId, [{
    title: p.title, url: `https://x.com/${encodeURIComponent(p.title)}`, source: p.source,
    collectedAt: `${p.date}T07:30:00.000Z`, publishedAt: null, summary: `${p.title} の要約`,
    category: '一般', importance: p.importance ?? 'medium', relatedLabels: '',
    dedupeKey: dedupeKey({ title: p.title, url: `https://x.com/${encodeURIComponent(p.title)}` }),
  }]);
}

let db: DB;
let uid: number;
beforeEach(() => {
  db = createDb(':memory:');
  uid = users.create(db, { email: 'a@x.com', passwordHash: 'h', name: 'A' }).id;
});

describe('buildReportContext', () => {
  it('当日収集記事を日本/米国に振り分ける', () => {
    seedArticle(db, uid, { title: '日経平均が上昇', source: '日本経済新聞', date: '2025-06-18' });
    seedArticle(db, uid, { title: 'Fed holds rates', source: 'CNBC Markets', date: '2025-06-18', importance: 'high' });
    const ctx = buildReportContext(db, uid, '2025-06-18');
    expect(ctx.jpArticles.some((a) => a.title === '日経平均が上昇')).toBe(true);
    expect(ctx.usArticles.some((a) => a.title === 'Fed holds rates')).toBe(true);
    expect(ctx.highImportance).toHaveLength(1);
  });
});

describe('composeFallbackReport', () => {
  it('免責文を必ず含み、見出しがある', () => {
    seedArticle(db, uid, { title: 'ニュースA', source: '日経', date: '2025-06-18' });
    const ctx = buildReportContext(db, uid, '2025-06-18');
    const md = composeFallbackReport(ctx);
    expect(md).toContain('# 朝のブリーフィング 2025-06-18');
    expect(md).toContain('日本マーケット関連');
    expect(md).toContain('投資助言では');
  });
});

describe('generateBriefing', () => {
  it('スタブAIでもレポートを生成・保存し、免責を含む', async () => {
    seedArticle(db, uid, { title: 'ニュースA', source: '日経', date: todayStr() });
    const report = await generateBriefing({ db, ai: new StubAiClient(), userId: uid });
    expect(report.id).toBeGreaterThan(0);
    expect(report.body).toContain('投資助言では');
    expect(reports.latest(db, uid)?.id).toBe(report.id);
    expect(JSON.parse(report.articleIds).length).toBeGreaterThanOrEqual(1);
  });
});
