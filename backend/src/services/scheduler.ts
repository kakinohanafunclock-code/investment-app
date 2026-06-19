import cron, { type ScheduledTask } from 'node-cron';
import type { DB } from '../db/database.js';
import type { AiClient } from './ai.js';
import { settings as settingsRepo, users as usersRepo } from '../db/repositories.js';
import { collectNews } from './news.js';
import { generateBriefing } from './report.js';
import type { RawArticle } from '../lib/dedupe.js';

export interface UserJobResult {
  userId: number;
  email: string;
  collected: number;
  reportId: number;
  error?: string;
}

export interface DailyJobResult {
  ranAt: string;
  userResults: UserJobResult[];
  totalCollected: number;
}

/** 単一ユーザーのジョブ：ニュース収集 → ブリーフィング生成 */
export async function runUserJob(
  db: DB,
  ai: AiClient,
  userId: number,
  fetchRaw?: () => Promise<RawArticle[]>,
): Promise<{ collected: number; reportId: number }> {
  const collect = await collectNews({ db, ai, userId, fetchRaw });
  const report = await generateBriefing({ db, ai, userId });
  return { collected: collect.inserted.length, reportId: report.id };
}

/** 毎朝のジョブ本体：全ユーザーをループして収集＋レポート生成（1人失敗しても続行） */
export async function runDailyJob(
  db: DB,
  ai: AiClient,
  fetchRaw?: () => Promise<RawArticle[]>,
): Promise<DailyJobResult> {
  const ranAt = new Date().toISOString();
  const allUsers = usersRepo.list(db);
  const userResults: UserJobResult[] = [];
  console.log(`[cron] ${ranAt} 毎朝ジョブ開始（対象 ${allUsers.length} ユーザー）`);

  for (const u of allUsers) {
    try {
      const r = await runUserJob(db, ai, u.id, fetchRaw);
      userResults.push({ userId: u.id, email: u.email, collected: r.collected, reportId: r.reportId });
      console.log(`[cron]   user#${u.id} ${u.email}: 新規記事 ${r.collected} 件 / レポート #${r.reportId}`);
    } catch (e) {
      const error = String((e as Error)?.message ?? e);
      userResults.push({ userId: u.id, email: u.email, collected: 0, reportId: 0, error });
      console.error(`[cron]   user#${u.id} ${u.email}: 失敗 - ${error}`);
    }
  }

  const totalCollected = userResults.reduce((s, r) => s + r.collected, 0);
  console.log(`[cron] 毎朝ジョブ完了: 合計 ${totalCollected} 件収集 / 成功 ${userResults.filter((r) => !r.error).length}/${allUsers.length}`);
  return { ranAt, userResults, totalCollected };
}

/** スケジューラ管理。実行時刻は DB 設定（無ければ既定 cron）で動的に変更可能。 */
export class Scheduler {
  private task: ScheduledTask | null = null;
  private running = false;

  constructor(
    private db: DB,
    private ai: AiClient,
    private defaultCron: string,
    private tz: string,
  ) {}

  /** 現在有効な cron 式（DB 設定優先） */
  cronExpr(): string {
    return settingsRepo.get(this.db, 'newsCron') ?? this.defaultCron;
  }

  start(): void {
    const expr = this.cronExpr();
    if (!cron.validate(expr)) {
      console.warn(`[scheduler] 無効な cron 式: ${expr}. 起動をスキップします。`);
      return;
    }
    this.stop();
    this.task = cron.schedule(
      expr,
      () => {
        void this.trigger();
      },
      { timezone: this.tz },
    );
    this.running = true;
    console.log(`[scheduler] 毎朝ジョブを登録: "${expr}" (${this.tz})`);
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
    this.running = false;
  }

  /** 設定変更後に再スケジュール */
  reschedule(expr: string): void {
    settingsRepo.set(this.db, 'newsCron', expr);
    this.start();
  }

  isRunning(): boolean {
    return this.running;
  }

  /** 全ユーザー対象の定時実行 */
  async trigger(): Promise<DailyJobResult> {
    return runDailyJob(this.db, this.ai);
  }
}
