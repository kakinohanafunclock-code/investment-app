import { describe, it, expect } from 'vitest';
import { parseCsv, mapRows } from './csv.js';

describe('parseCsv', () => {
  it('ヘッダ付き CSV を行オブジェクト配列に変換', () => {
    const csv = 'date,symbol,amount\n2025-01-01,7203,1000\n2025-02-01,AAPL,2000';
    const { headers, rows } = parseCsv(csv);
    expect(headers).toEqual(['date', 'symbol', 'amount']);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ date: '2025-01-01', symbol: '7203', amount: '1000' });
  });

  it('クォート内のカンマを正しく扱う', () => {
    const csv = 'name,note\n"Toyota, Inc.","big, company"';
    const { rows } = parseCsv(csv);
    expect(rows[0].name).toBe('Toyota, Inc.');
    expect(rows[0].note).toBe('big, company');
  });

  it('空行を無視し、CRLF を処理', () => {
    const csv = 'a,b\r\n1,2\r\n\r\n3,4\r\n';
    const { rows } = parseCsv(csv);
    expect(rows).toHaveLength(2);
  });

  it('BOM を除去', () => {
    const csv = '﻿a,b\n1,2';
    const { headers } = parseCsv(csv);
    expect(headers[0]).toBe('a');
  });
});

describe('mapRows（カラムマッピング）', () => {
  it('証券会社カラム名をアプリの取引フィールドに対応付け', () => {
    const csv = '約定日,銘柄コード,評価額,入金\n2025/01/01,7203,"1,000,000",500000';
    const { rows } = parseCsv(csv);
    const mapping = {
      date: '約定日',
      symbol: '銘柄コード',
      valuation: '評価額',
      contribution: '入金',
    };
    const mapped = mapRows(rows, mapping, 'transaction');
    expect(mapped[0].date).toBe('2025-01-01'); // 区切りを正規化
    expect(mapped[0].symbol).toBe('7203');
    expect(mapped[0].valuation).toBe(1000000); // 整数円
    expect(mapped[0].contribution).toBe(500000);
  });

  it('配当 CSV をマッピング', () => {
    const csv = '支払日,銘柄,金額\n2025-03-15,AAPL,"¥3,200"';
    const { rows } = parseCsv(csv);
    const mapped = mapRows(rows, { date: '支払日', symbol: '銘柄', amount: '金額' }, 'dividend');
    expect(mapped[0].amount).toBe(3200);
    expect(mapped[0].symbol).toBe('AAPL');
  });
});
