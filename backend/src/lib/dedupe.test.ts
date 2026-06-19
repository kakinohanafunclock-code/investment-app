import { describe, it, expect } from 'vitest';
import { dedupeKey, filterNewArticles } from './dedupe.js';

describe('dedupeKey', () => {
  it('URL を正規化してキー化（クエリ・末尾スラッシュ・大文字小文字を吸収）', () => {
    const a = dedupeKey({ title: 'X', url: 'https://Example.com/news/1/?utm_source=x' });
    const b = dedupeKey({ title: 'X', url: 'http://example.com/news/1' });
    expect(a).toBe(b);
  });

  it('URL が無い場合はタイトルでキー化', () => {
    const a = dedupeKey({ title: '日銀が利上げ', url: '' });
    const b = dedupeKey({ title: ' 日銀が利上げ ', url: '' });
    expect(a).toBe(b);
  });
});

describe('filterNewArticles', () => {
  it('既知キーを除外し、入力内の重複も1件に', () => {
    const existing = new Set([dedupeKey({ title: 'A', url: 'https://x.com/a' })]);
    const incoming = [
      { title: 'A', url: 'https://x.com/a' }, // 既知
      { title: 'B', url: 'https://x.com/b' },
      { title: 'B2', url: 'https://x.com/b' }, // 入力内重複（同URL）
    ];
    const fresh = filterNewArticles(incoming, existing);
    expect(fresh).toHaveLength(1);
    expect(fresh[0].url).toBe('https://x.com/b');
  });
});
