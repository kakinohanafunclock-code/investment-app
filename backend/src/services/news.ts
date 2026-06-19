import type { DB } from '../db/database.js';
import { articles as articlesRepo, watchlist as watchRepo } from '../db/repositories.js';
import { filterNewArticles, dedupeKey, type RawArticle } from '../lib/dedupe.js';
import { DEFAULT_FEEDS, fetchFeed } from './feeds.js';
import type { AiClient } from './ai.js';
import { AGENT_SYSTEM_PROMPT } from './prompts.js';
import type { Article, Importance } from '../types.js';

export interface EnrichedArticle extends RawArticle {
  summary: string;
  category: string;
  importance: Importance;
  relatedLabels: string[];
}

/** ウォッチラベルに対する素朴な部分一致（AI 不在時のフォールバック兼補助） */
export function matchLabels(text: string, labels: string[]): string[] {
  const hay = text.toLowerCase();
  return labels.filter((l) => {
    // ラベルからコード/名称トークンを抽出して照合
    const tokens = l.split(/[\s/／・,，]+/).filter((t) => t.length >= 2);
    return tokens.some((t) => hay.includes(t.toLowerCase()));
  });
}

/** ヒューリスティック分類（AI 未接続時のフォールバック） */
function heuristicEnrich(a: RawArticle, labels: string[]): EnrichedArticle {
  const related = matchLabels(`${a.title}`, labels);
  return {
    ...a,
    summary: a.title,
    category: '一般',
    importance: related.length > 0 ? 'medium' : 'low',
    relatedLabels: related,
  };
}

interface AiClassification {
  index: number;
  summary: string;
  category: string;
  importance: Importance;
  relatedLabels: string[];
}

/** AI に新着記事をまとめて要約・分類・重要度付けさせる */
export async function classifyWithAi(
  ai: AiClient,
  raw: RawArticle[],
  labels: string[],
): Promise<EnrichedArticle[]> {
  if (!ai.enabled || raw.length === 0) {
    return raw.map((a) => heuristicEnrich(a, labels));
  }
  const list = raw
    .map((a, i) => `${i}. [${a.source}] ${a.title}${a.url ? ` (${a.url})` : ''}`)
    .join('\n');
  const watchLine = labels.length ? labels.join(', ') : '(ウォッチ登録なし)';
  const prompt = `次のニュース見出し一覧を、各記事ごとに日本語で要約・分類してください。
ユーザーのウォッチ対象: ${watchLine}

記事一覧:
${list}

各記事について JSON オブジェクトを作り、配列として **JSON のみ** を出力してください（前後に説明文を付けない）。
形式: [{"index": 0, "summary": "1〜2文の客観的要約", "category": "金利|為替|決算|マクロ|個別銘柄|地政学|商品|一般 のいずれか", "importance": "high|medium|low", "relatedLabels": ["関連するウォッチ対象ラベル"]}]
重要度はユーザーのウォッチ対象との関連やマーケットへの影響度で判断。売買推奨は一切しないこと。`;

  try {
    const text = await ai.complete({
      system: AGENT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 4096,
    });
    const json = extractJson(text);
    const parsed = JSON.parse(json) as AiClassification[];
    return raw.map((a, i) => {
      const c = parsed.find((p) => p.index === i);
      if (!c) return heuristicEnrich(a, labels);
      return {
        ...a,
        summary: c.summary || a.title,
        category: c.category || '一般',
        importance: (['high', 'medium', 'low'] as Importance[]).includes(c.importance) ? c.importance : 'medium',
        relatedLabels: Array.isArray(c.relatedLabels) ? c.relatedLabels : matchLabels(a.title, labels),
      };
    });
  } catch {
    // AI 応答が壊れた場合もアプリを止めず素朴分類でフォールバック
    return raw.map((a) => heuristicEnrich(a, labels));
  }
}

/** テキストから最初の JSON 配列/オブジェクトを抽出 */
export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.search(/[[{]/);
  if (start === -1) return text.trim();
  const end = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'));
  return text.slice(start, end + 1).trim();
}

export interface CollectDeps {
  db: DB;
  ai: AiClient;
  userId: number;
  /** 既定はフィード取得。テストでは差し替え可能。 */
  fetchRaw?: () => Promise<RawArticle[]>;
}

export interface CollectResult {
  fetched: number;
  fresh: number;
  inserted: Article[];
}

/** ニュース収集本体：取得 → 重複排除 → AI 分類 → 保存 */
export async function collectNews(deps: CollectDeps): Promise<CollectResult> {
  const { db, ai, userId } = deps;
  const fetchRaw = deps.fetchRaw ?? defaultFetchRaw;

  const raw = await fetchRaw();
  const existing = articlesRepo.existingKeys(db, userId);
  const fresh = filterNewArticles(raw, existing);

  const labels = watchRepo.list(db, userId).map((w) => w.label);
  const enriched = await classifyWithAi(ai, fresh, labels);

  const collectedAt = new Date().toISOString();
  const toInsert: Omit<Article, 'id' | 'userId'>[] = enriched.map((e) => ({
    title: e.title,
    url: e.url,
    source: e.source ?? '',
    collectedAt,
    publishedAt: e.publishedAt ?? null,
    summary: e.summary,
    category: e.category,
    importance: e.importance,
    relatedLabels: e.relatedLabels.join(', '),
    dedupeKey: dedupeKey({ title: e.title, url: e.url }),
  }));
  const inserted = articlesRepo.insertMany(db, userId, toInsert);

  return { fetched: raw.length, fresh: fresh.length, inserted };
}

/** 既定の取得：全フィードを並列取得 */
async function defaultFetchRaw(): Promise<RawArticle[]> {
  const results = await Promise.all(DEFAULT_FEEDS.map((f) => fetchFeed(f)));
  return results.flat();
}
