import { describe, it, expect, beforeEach } from 'vitest';
import { createDb, type DB } from '../db/database.js';
import { users, watchlist, articles } from '../db/repositories.js';
import { collectNews, matchLabels, extractJson } from './news.js';
import { StubAiClient } from './ai.js';
import type { RawArticle } from '../lib/dedupe.js';

describe('matchLabels', () => {
  it('タイトル中のラベルトークンに一致', () => {
    expect(matchLabels('トヨタが最高益', ['7203 トヨタ', '半導体'])).toEqual(['7203 トヨタ']);
    expect(matchLabels('無関係なニュース', ['半導体'])).toEqual([]);
  });
});

describe('extractJson', () => {
  it('コードフェンス内の JSON を取り出す', () => {
    expect(extractJson('```json\n[{"a":1}]\n```')).toBe('[{"a":1}]');
  });
  it('地の文に埋もれた配列を取り出す', () => {
    expect(extractJson('結果は [1,2,3] です')).toBe('[1,2,3]');
  });
});

describe('collectNews（収集→重複排除→分類→保存）', () => {
  let db: DB;
  let uid: number;
  beforeEach(() => {
    db = createDb(':memory:');
    uid = users.create(db, { email: 'a@x.com', passwordHash: 'h', name: 'A' }).id;
    watchlist.create(db, uid, { type: 'symbol', label: '7203 トヨタ', country: 'JP', note: '' });
  });

  it('新着のみ保存し、重複排除する', async () => {
    const raw: RawArticle[] = [
      { title: 'トヨタが最高益', url: 'https://x.com/1', source: 'S', publishedAt: null },
      { title: '米CPI鈍化', url: 'https://x.com/2', source: 'S', publishedAt: null },
    ];
    const ai = new StubAiClient();
    const r1 = await collectNews({ db, ai, userId: uid, fetchRaw: async () => raw });
    expect(r1.fetched).toBe(2);
    expect(r1.fresh).toBe(2);
    expect(r1.inserted).toHaveLength(2);

    // 2回目：同じ記事 → 0件
    const r2 = await collectNews({ db, ai, userId: uid, fetchRaw: async () => raw });
    expect(r2.fresh).toBe(0);
    expect(r2.inserted).toHaveLength(0);
    expect(articles.list(db, uid)).toHaveLength(2);
  });

  it('スタブAIでもヒューリスティック分類で関連ラベルを付与', async () => {
    const raw: RawArticle[] = [
      { title: 'トヨタが新型車を発表', url: 'https://x.com/t', source: 'S', publishedAt: null },
    ];
    const r = await collectNews({ db, ai: new StubAiClient(), userId: uid, fetchRaw: async () => raw });
    expect(r.inserted[0].relatedLabels).toContain('7203 トヨタ');
    expect(r.inserted[0].importance).toBe('medium');
  });
});
