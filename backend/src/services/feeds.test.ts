import { describe, it, expect } from 'vitest';
import { parseRssXml } from './feeds.js';

describe('parseRssXml', () => {
  it('RSS 2.0 の item を抽出', () => {
    const xml = `<?xml version="1.0"?>
    <rss version="2.0"><channel>
      <title>Sample Feed</title>
      <item>
        <title>日銀、政策金利を据え置き</title>
        <link>https://news.example.com/1</link>
        <pubDate>Wed, 18 Jun 2025 09:00:00 +0900</pubDate>
        <description>説明文</description>
      </item>
      <item>
        <title>米CPI 予想下回る</title>
        <link>https://news.example.com/2</link>
      </item>
    </channel></rss>`;
    const items = parseRssXml(xml, 'Sample');
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('日銀、政策金利を据え置き');
    expect(items[0].url).toBe('https://news.example.com/1');
    expect(items[0].source).toBe('Sample');
    expect(items[0].publishedAt).toBeTruthy();
  });

  it('Atom フィードの entry も抽出', () => {
    const xml = `<?xml version="1.0"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <title>Atom記事</title>
        <link href="https://atom.example.com/a"/>
        <updated>2025-06-18T00:00:00Z</updated>
      </entry>
    </feed>`;
    const items = parseRssXml(xml, 'AtomSrc');
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Atom記事');
    expect(items[0].url).toBe('https://atom.example.com/a');
  });

  it('空・不正な XML では空配列', () => {
    expect(parseRssXml('', 'x')).toEqual([]);
    expect(parseRssXml('<not-feed/>', 'x')).toEqual([]);
  });
});
