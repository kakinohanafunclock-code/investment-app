import type { Transaction } from './types';

/** 口座ごとに、各銘柄の最新評価額を合計する（口座別評価額） */
export function latestValuationByAccount(txs: Transaction[]): Map<number, number> {
  // 銘柄×口座ごとに最新行を取る
  const latest = new Map<string, Transaction>();
  for (const t of txs) {
    const k = `${t.accountId}::${t.symbol}`;
    const cur = latest.get(k);
    if (!cur || t.date > cur.date || (t.date === cur.date && t.id >= cur.id)) latest.set(k, t);
  }
  const byAccount = new Map<number, number>();
  for (const t of latest.values()) {
    byAccount.set(t.accountId, (byAccount.get(t.accountId) ?? 0) + t.valuation);
  }
  return byAccount;
}
