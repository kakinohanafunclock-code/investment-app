import { createHash } from 'node:crypto';

export interface RawArticle {
  title: string;
  url: string;
  source?: string;
  publishedAt?: string | null;
}

/** URL を正規化（スキーム・ホスト小文字化、クエリ/ハッシュ/末尾スラッシュ除去） */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.host.toLowerCase();
    let path = u.pathname.replace(/\/+$/, '');
    return `${host}${path}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

/** 重複排除キー。URL があれば正規化 URL、無ければタイトルのハッシュ。 */
export function dedupeKey(a: { title: string; url: string }): string {
  const basis = a.url && a.url.trim() !== '' ? normalizeUrl(a.url) : a.title.trim().toLowerCase();
  return createHash('sha1').update(basis).digest('hex');
}

/** 既知キー集合に無い新着のみ返す（入力内の重複も除去） */
export function filterNewArticles<T extends RawArticle>(
  incoming: T[],
  existingKeys: Set<string>,
): T[] {
  const seen = new Set(existingKeys);
  const fresh: T[] = [];
  for (const a of incoming) {
    const key = dedupeKey(a);
    if (seen.has(key)) continue;
    seen.add(key);
    fresh.push(a);
  }
  return fresh;
}
