import Anthropic from '@anthropic-ai/sdk';

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiCompleteOptions {
  system: string;
  messages: AiMessage[];
  maxTokens?: number;
  /** web search ツールを使う（ニュース収集など） */
  useWebSearch?: boolean;
}

/** AI クライアント抽象。実装差し替え可能（テストはスタブを注入）。 */
export interface AiClient {
  readonly enabled: boolean;
  complete(opts: AiCompleteOptions): Promise<string>;
}

/** API キー未設定時に使うスタブ。アプリは止めず、説明的なダミーを返す。 */
export class StubAiClient implements AiClient {
  readonly enabled = false;
  async complete(opts: AiCompleteOptions): Promise<string> {
    const lastUser = [...opts.messages].reverse().find((m) => m.role === 'user');
    return (
      '【AI 未接続（スタブ応答）】\n' +
      'ANTHROPIC_API_KEY が設定されていないため、実際の AI 分析は行われていません。' +
      '.env に API キーを設定すると、ニュース要約・レポート生成・対話が有効になります。\n\n' +
      (lastUser ? `（受け取った入力の先頭: ${lastUser.content.slice(0, 120)} …）` : '')
    );
  }
}

/** Anthropic Claude 実装 */
export class ClaudeAiClient implements AiClient {
  readonly enabled = true;
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async complete(opts: AiCompleteOptions): Promise<string> {
    // web_search はサーバ側ツール。SDK の Tool 型に未収載のため any で渡す。
    const tools = opts.useWebSearch
      ? ([{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 }] as any)
      : undefined;

    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: opts.maxTokens ?? 4096,
      system: opts.system,
      messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
      ...(tools ? { tools } : {}),
    });

    // テキストブロックを連結
    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
  }
}

/** 環境変数から適切なクライアントを生成 */
export function createAiClient(env: NodeJS.ProcessEnv = process.env): AiClient {
  const key = env.ANTHROPIC_API_KEY?.trim();
  const model = env.ANTHROPIC_MODEL?.trim() || 'claude-opus-4-8';
  if (!key) return new StubAiClient();
  return new ClaudeAiClient(key, model);
}
