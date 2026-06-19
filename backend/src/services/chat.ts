import type { DB } from '../db/database.js';
import { articles as articlesRepo } from '../db/repositories.js';
import { dashboardData, selfCheck } from './insights.js';
import type { AiClient, AiMessage } from './ai.js';
import { AGENT_SYSTEM_PROMPT, DISCLAIMER } from './prompts.js';

/** 対話用に DB から事実コンテキストを構築 */
export function buildChatContext(db: DB, userId: number): string {
  const recent = articlesRepo.list(db, userId, 30);
  const dash = dashboardData(db, userId);
  const sc = selfCheck(db, userId);
  const newsLines = recent
    .slice(0, 20)
    .map((a) => `- [${a.importance}] ${a.title}${a.url ? ` (${a.url})` : ''} / ${a.summary}`)
    .join('\n');

  return `# 参照可能な事実データ（これ以外の数値を創作しないこと）
## ポートフォリオ・サマリー
- 総評価額: ${dash.summary.totalValuation.toLocaleString()} 円
- 元本合計: ${dash.summary.totalPrincipal.toLocaleString()} 円
- 累計損益: ${dash.summary.totalPnl.toLocaleString()} 円 (${dash.summary.pnlPct.toFixed(2)}%)
- 当月配当: ${dash.summary.currentMonthDividend.toLocaleString()} 円

## 保有内訳（国別）
${dash.byCountry.map((c) => `- ${c.key}: ${c.value.toLocaleString()} 円`).join('\n') || '- データなし'}

## 自己点検メモ
${sc.notes.map((n) => `- ${n}`).join('\n')}

## 直近の収集ニュース
${newsLines || '- 収集済みニュースなし'}`;
}

export interface ChatDeps {
  db: DB;
  ai: AiClient;
  userId: number;
}

/** 対話エージェント。履歴の末尾はユーザー発話である前提。 */
export async function chat(deps: ChatDeps, history: AiMessage[]): Promise<string> {
  const { db, ai, userId } = deps;
  const context = buildChatContext(db, userId);
  const system = `${AGENT_SYSTEM_PROMPT}\n\n${context}\n\n上記の事実データと一般知識のみに基づき、中立的に整理して回答してください。回答の末尾には必ず投資助言ではない旨の一文を添えること。`;

  if (!ai.enabled) {
    const last = [...history].reverse().find((m) => m.role === 'user');
    return (
      `【AI 未接続】ANTHROPIC_API_KEY を設定すると対話が有効になります。\n\n` +
      `参考までに現在の総評価額は ${dashboardData(db, userId).summary.totalValuation.toLocaleString()} 円です。\n\n` +
      (last ? `ご質問: 「${last.content}」\n\n` : '') +
      DISCLAIMER
    );
  }

  let answer = await ai.complete({ system, messages: history, maxTokens: 3000 });
  if (!answer.includes('投資助言では')) answer += `\n\n${DISCLAIMER}`;
  return answer;
}
