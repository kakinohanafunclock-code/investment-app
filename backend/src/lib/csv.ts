import { yen } from './money.js';

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

/** RFC4180 風の最小 CSV パーサ（クォート・カンマ・改行対応） */
export function parseCsv(text: string): ParsedCsv {
  // BOM 除去
  const clean = text.replace(/^﻿/, '');
  const records: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\r') {
        // 次が \n の場合に処理するためスキップ
      } else if (ch === '\n') {
        row.push(field);
        records.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }
  // 末尾フィールド
  if (field !== '' || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  // 空行除去
  const nonEmpty = records.filter((r) => r.some((c) => c.trim() !== ''));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const headers = nonEmpty[0].map((h) => h.trim());
  const rows = nonEmpty.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? '').trim();
    });
    return obj;
  });
  return { headers, rows };
}

export type TransactionMapping = {
  date: string;
  symbol: string;
  valuation?: string;
  contribution?: string;
  withdrawal?: string;
  account?: string;
  country?: string;
  assetClass?: string;
  note?: string;
};

export type DividendMapping = {
  date: string;
  symbol: string;
  amount: string;
  kind?: string;
  account?: string;
  note?: string;
};

/** 日付区切りを正規化（YYYY/MM/DD・YYYY.MM.DD → YYYY-MM-DD） */
export function normalizeDate(value: string): string {
  const v = value.trim().replace(/[./]/g, '-');
  const m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return v;
}

export interface MappedTransaction {
  date: string;
  symbol: string;
  valuation: number;
  contribution: number;
  withdrawal: number;
  account: string;
  country: string;
  assetClass: string;
  note: string;
}

export interface MappedDividend {
  date: string;
  symbol: string;
  amount: number;
  kind: string;
  account: string;
  note: string;
}

export function mapRows(
  rows: Record<string, string>[],
  mapping: TransactionMapping | DividendMapping,
  kind: 'transaction',
): MappedTransaction[];
export function mapRows(
  rows: Record<string, string>[],
  mapping: TransactionMapping | DividendMapping,
  kind: 'dividend',
): MappedDividend[];
export function mapRows(
  rows: Record<string, string>[],
  mapping: any,
  kind: 'transaction' | 'dividend',
): any[] {
  return rows.map((r) => {
    const get = (key?: string) => (key && r[key] !== undefined ? r[key] : '');
    if (kind === 'transaction') {
      return {
        date: normalizeDate(get(mapping.date)),
        symbol: get(mapping.symbol),
        valuation: yen(get(mapping.valuation)),
        contribution: yen(get(mapping.contribution)),
        withdrawal: yen(get(mapping.withdrawal)),
        account: get(mapping.account),
        country: get(mapping.country),
        assetClass: get(mapping.assetClass),
        note: get(mapping.note),
      } as MappedTransaction;
    }
    return {
      date: normalizeDate(get(mapping.date)),
      symbol: get(mapping.symbol),
      amount: yen(get(mapping.amount)),
      kind: get(mapping.kind),
      account: get(mapping.account),
      note: get(mapping.note),
    } as MappedDividend;
  });
}
