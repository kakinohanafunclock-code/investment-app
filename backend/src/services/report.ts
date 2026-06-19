import type { DB } from '../db/database.js';
import { articles as articlesRepo, watchlist as watchRepo, reports as reportsRepo } from '../db/repositories.js';
import { selfCheck } from './insights.js';
import type { AiClient } from './ai.js';
import { AGENT_SYSTEM_PROMPT, DISCLAIMER } from './prompts.js';
import type { Article, Report } from '../types.js';

export function todayStr(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export interface ReportContext {
  date: string;
  jpArticles: Article[];
  usArticles: Article[];
  highImportance: Article[];
  watchLabels: string[];
  selfCheck: ReturnType<typeof selfCheck>;
  articleIds: number[];
}

/** レポートの素材を DB から組み立てる（テスト可能な純データ生成） */
export function buildReportContext(db: DB, userId: number, date = todayStr()): ReportContext {
  const recent = articlesRepo.list(db, userId, 120);
  // 当日収集分を優先、無ければ直近をそのまま使う
  const today = recent.filter((a) => a.collectedAt.startsWith(date));
  const pool = today.length > 0 ? today : recent.slice(0, 40);

  const isUs = (a: Article) =>
    /US|米|nasdaq|s&p|dow|fed|cnbc|marketwatch|yahoo finance/i.test(`${a.source} ${a.title}`);
  const jpArticles = pool.filter((a) => !isUs(a));
  const usArticles = pool.filter((a) => isUs(a));
  const highImportance = pool.filter((a) => a.importance === 'high');

  return {
    date,
    jpArticles,
    usArticles,
    highImportance,
    watchLabels: watchRepo.list(db, userId).map((w) => w.label),
    selfCheck: selfCheck(db, userId),
    articleIds: pool.map((a) => a.id),
  };
}

function articleLines(list: Article[], limit = 8): string {
  if (list.length === 0) return '- 該当する新着記事はありませんでした。\n';
  return (
    list
      .slice(0, limit)
      .map((a) => {
        const imp = a.importance === 'high' ? '🔴' : a.importance === 'medium' ? '🟡' : '⚪';
        const src = a.url ? `[${a.source}](${a.url})` : a.source;
        return `- ${imp} **${a.title}**\n  - ${a.summary || a.title}\n  - 出典: ${src}`;
      })
      .join('\n') + '\n'
  );
}

/** AI 不在時の決定的なフォールバックレポート（データから構造化して生成） */
export function composeFallbackReport(ctx: ReportContext): string {
  const sc = ctx.selfCheck;
  return `# 朝のブリーフィング ${ctx.date}

## 🗾 日本マーケット関連
${articleLines(ctx.jpArticles)}

## 🇺🇸 米国マーケット関連
${articleLines(ctx.usArticles)}

## ⭐ ウォッチリスト関連の要点
${
  ctx.watchLabels.length
    ? ctx.watchLabels
        .map((l) => {
          const hits = [...ctx.jpArticles, ...ctx.usArticles].filter((a) => a.relatedLabels.includes(l));
          return `- **${l}**: ${hits.length ? `${hits.length}件の関連記事` : '本日の新着関連記事なし'}`;
        })
        .join('\n')
    : '- ウォッチリストが未登録です。設定から銘柄・セクター・指標を追加できます。'
}

## 📊 ポートフォリオへの関連・論点（事実の整理）
${sc.notes.map((n) => `- ${n}`).join('\n')}

## 🗓 注目イベント
- 決算・経済指標の発表予定は、収集記事の範囲で上記「高重要度」項目をご確認ください（自動収集の範囲内）。

---
${DISCLAIMER}
`;
}

export interface GenerateReportDeps {
  db: DB;
  ai: AiClient;
  userId: number;
  date?: string;
}

/** 毎朝のブリーフィングを生成して保存 */
export async function generateBriefing(deps: GenerateReportDeps): Promise<Report> {
  const { db, ai, userId } = deps;
  const date = deps.date ?? todayStr();
  const ctx = buildReportContext(db, userId, date);

  let body: string;
  if (ai.enabled) {
    body = await generateWithAi(ai, ctx);
  } else {
    body = composeFallbackReport(ctx);
  }
  // 免責が含まれていなければ必ず付与
  if (!body.includes('投資助言では')) {
    body += `\n\n---\n${DISCLAIMER}\n`;
  }

  return reportsRepo.create(db, userId, {
    date,
    title: `朝のブリーフィング ${date}`,
    body,
    articleIds: JSON.stringify(ctx.articleIds),
  });
}

async function generateWithAi(ai: AiClient, ctx: ReportContext): Promise<string> {
  const fmt = (list: Article[]) =>
    list
      .slice(0, 12)
      .map((a) => `- [${a.importance}] ${a.title}${a.url ? ` (${a.url})` : ''} / ${a.summary}`)
      .join('\n') || '(なし)';

  const prompt = `本日(${ctx.date})の朝のブリーフィングレポートを、詳しめのレポート形式（Markdown）で作成してください。

## 収集済み・日本関連ニュース
${fmt(ctx.jpArticles)}

## 収集済み・米国関連ニュース
${fmt(ctx.usArticles)}

## ユーザーのウォッチ対象
${ctx.watchLabels.join(', ') || '(未登録)'}

## ポートフォリオの客観的事実（自己点検の算出結果）
${ctx.selfCheck.notes.map((n) => `- ${n}`).join('\n')}

# 出力構成（この見出しで）
1. 日本マーケット概況
2. 米国マーケット概況
3. ウォッチリスト銘柄ごとの関連ニュースと要点
4. ユーザーのポートフォリオへの関連度・論点（保有の偏り等の事実指摘。推奨はしない）
5. 注目すべき今後のイベント（判明する範囲）
各ニュースには出典リンクを付けること。断定的な売買推奨は禁止。末尾に投資助言ではない旨の注記を必ず入れること。`;

  return ai.complete({
    system: AGENT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 6000,
  });
}
