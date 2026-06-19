import { XMLParser } from 'fast-xml-parser';
import type { RawArticle } from '../lib/dedupe.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
});

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function textOf(v: any): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v).trim();
  if (typeof v === 'object' && '#text' in v) return String(v['#text']).trim();
  return '';
}

/** RSS2.0 / Atom の XML を RawArticle 配列にパースする */
export function parseRssXml(xml: string, source: string): RawArticle[] {
  if (!xml || xml.trim() === '') return [];
  let doc: any;
  try {
    doc = parser.parse(xml);
  } catch {
    return [];
  }
  const out: RawArticle[] = [];

  // RSS 2.0
  const items = asArray(doc?.rss?.channel?.item);
  for (const it of items) {
    const title = textOf(it.title);
    const url = textOf(it.link);
    if (!title) continue;
    out.push({
      title,
      url,
      source,
      publishedAt: textOf(it.pubDate) || null,
    });
  }

  // Atom
  const entries = asArray(doc?.feed?.entry);
  for (const e of entries) {
    const title = textOf(e.title);
    let url = '';
    const links = asArray(e.link);
    if (links.length > 0) {
      url = textOf(links[0]) || links[0]?.['@_href'] || '';
    }
    if (!title) continue;
    out.push({
      title,
      url,
      source,
      publishedAt: textOf(e.updated) || textOf(e.published) || null,
    });
  }

  return out;
}

export interface FeedSource {
  name: string;
  url: string;
  country: 'JP' | 'US' | 'GLOBAL';
}

/** 既定の無料フィード。追加ログイン不要のものを採用。 */
export const DEFAULT_FEEDS: FeedSource[] = [
  // 日本
  { name: '日本経済新聞 マーケット', url: 'https://www.nikkei.com/rss/markets.rdf', country: 'JP' },
  { name: 'ロイター日本 ビジネス', url: 'https://assets.wor.jp/rss/rdf/reuters/business.rdf', country: 'JP' },
  // 米国・グローバル
  { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex', country: 'US' },
  { name: 'CNBC Markets', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', country: 'US' },
  { name: 'MarketWatch Top Stories', url: 'http://feeds.marketwatch.com/marketwatch/topstories/', country: 'US' },
];

/** フィードを取得してパース。失敗してもスローせず空配列で続行。 */
export async function fetchFeed(src: FeedSource): Promise<RawArticle[]> {
  try {
    const res = await fetch(src.url, {
      headers: { 'User-Agent': 'InvestmentDashboard/1.0 (+local)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssXml(xml, src.name);
  } catch {
    return [];
  }
}
