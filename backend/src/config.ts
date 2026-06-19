import 'dotenv/config';

export interface AppConfig {
  port: number;
  /** 許可するフロントオリジン（カンマ区切り可）。'*' で全許可。 */
  clientOrigins: string[];
  dbPath: string;
  /** 将来 PostgreSQL へ移行する際の接続文字列（あれば優先。未実装の切替ポイント） */
  databaseUrl: string | null;
  newsCron: string;
  cronTz: string;
  enableScheduler: boolean;
  anthropicKeyPresent: boolean;
  anthropicModel: string;
  /** トークン署名シークレット（必須。未設定なら起動時に警告して暫定値） */
  jwtSecret: string;
  tokenTtlSec: number;
  /** 設定時、登録に招待コードを要求（公開デプロイでの無差別登録防止） */
  signupCode: string | null;
  /** frontend/dist を Express から配信するか（単一サービスデプロイ用） */
  serveStatic: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const origins = (env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    port: Number(env.PORT ?? 4000),
    clientOrigins: origins,
    dbPath: env.DB_PATH ?? 'data/app.sqlite',
    databaseUrl: env.DATABASE_URL?.trim() || null,
    newsCron: env.NEWS_CRON ?? '30 7 * * 1-5',
    cronTz: env.CRON_TZ ?? 'Asia/Tokyo',
    enableScheduler: (env.ENABLE_SCHEDULER ?? 'true') !== 'false',
    anthropicKeyPresent: Boolean(env.ANTHROPIC_API_KEY?.trim()),
    anthropicModel: env.ANTHROPIC_MODEL?.trim() || 'claude-opus-4-8',
    jwtSecret: env.JWT_SECRET?.trim() || 'INSECURE_DEV_SECRET_CHANGE_ME',
    tokenTtlSec: Number(env.TOKEN_TTL_SEC ?? 60 * 60 * 24 * 7), // 既定 7 日
    signupCode: env.SIGNUP_CODE?.trim() || null,
    serveStatic: (env.SERVE_STATIC ?? 'false') === 'true',
  };
}
