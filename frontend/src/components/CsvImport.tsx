import { useMemo, useState } from 'react';
import { FileUp, ArrowRight } from 'lucide-react';
import type { Account } from '../lib/types';
import { api } from '../lib/api';
import { useToast } from './Toast';

type ImportType = 'transaction' | 'dividend';

const TX_FIELDS = [
  { key: 'date', label: '日付', required: true },
  { key: 'symbol', label: '銘柄', required: true },
  { key: 'valuation', label: '評価額', required: false },
  { key: 'contribution', label: '拠出/入金', required: false },
  { key: 'withdrawal', label: '引出', required: false },
  { key: 'country', label: '国(JP/US)', required: false },
  { key: 'note', label: 'メモ', required: false },
];
const DIV_FIELDS = [
  { key: 'date', label: '日付', required: true },
  { key: 'symbol', label: '銘柄', required: false },
  { key: 'amount', label: '金額', required: true },
  { key: 'kind', label: '種別', required: false },
  { key: 'note', label: 'メモ', required: false },
];

function quickParseHeaders(csv: string): { headers: string[]; sample: string[] } {
  const line = csv.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())[0] ?? '';
  const sampleLine = csv.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())[1] ?? '';
  const split = (s: string) => s.split(',').map((x) => x.replace(/^"|"$/g, '').trim());
  return { headers: split(line), sample: split(sampleLine) };
}

export function CsvImport({ accounts, onDone }: { accounts: Account[]; onDone: () => void }) {
  const [type, setType] = useState<ImportType>('transaction');
  const [csv, setCsv] = useState('');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [accountId, setAccountId] = useState<number>(accounts[0]?.id ?? 1);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const fields = type === 'transaction' ? TX_FIELDS : DIV_FIELDS;
  const { headers, sample } = useMemo(() => quickParseHeaders(csv), [csv]);

  const onFile = async (f: File) => {
    const text = await f.text();
    setCsv(text);
    // 自動マッピング推定
    const { headers: hs } = quickParseHeaders(text);
    const guess: Record<string, string> = {};
    for (const fld of fields) {
      const hit = hs.find((h) => h.includes(fld.label) || h.toLowerCase().includes(fld.key));
      if (hit) guess[fld.key] = hit;
    }
    setMapping(guess);
  };

  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.importCsv({ csv, type, mapping, defaults: { accountId } });
      toast(`${r.inserted} 件を取り込みました`, 'success');
      onDone();
    } catch (e: any) {
      toast(e.message ?? '取込に失敗しました', 'error');
    } finally {
      setBusy(false);
    }
  };

  const ready = csv && fields.filter((f) => f.required).every((f) => mapping[f.key]);

  return (
    <div className="space-y-4">
      <div className="inline-flex p-1 rounded-xl bg-line-soft text-sm">
        {(['transaction', 'dividend'] as ImportType[]).map((t) => (
          <button key={t} onClick={() => { setType(t); setMapping({}); }}
            className={`btn px-3.5 py-1.5 ${type === t ? 'bg-white text-accent shadow-soft' : 'text-ink-muted'}`}>
            {t === 'transaction' ? '取引' : '配当'}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="label">CSV ファイル</span>
        <div className="rounded-xl border-2 border-dashed border-line hover:border-accent/40 transition px-4 py-6 text-center cursor-pointer bg-page/40">
          <FileUp size={22} className="mx-auto text-accent mb-2" />
          <span className="text-sm text-ink-soft">クリックしてファイルを選択（証券会社の明細など）</span>
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </div>
      </label>

      {csv && (
        <textarea className="input font-mono text-[11px] h-20" value={csv.slice(0, 600)} onChange={(e) => setCsv(e.target.value)} />
      )}

      {headers.length > 0 && (
        <div>
          <p className="label">カラムマッピング</p>
          <div className="space-y-2">
            {fields.map((f) => (
              <div key={f.key} className="flex items-center gap-2">
                <span className="text-xs w-28 text-ink-soft font-medium">
                  {f.label}{f.required && <span className="text-danger ml-0.5">*</span>}
                </span>
                <ArrowRight size={14} className="text-ink-faint shrink-0" />
                <select className="input py-2 text-xs" value={mapping[f.key] ?? ''} onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}>
                  <option value="">（なし）</option>
                  {headers.map((h, i) => <option key={i} value={h}>{h}{sample[i] ? ` (例: ${sample[i]})` : ''}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {type === 'transaction' && (
        <div>
          <span className="label">取込先口座（CSVに口座列がない場合）</span>
          <select className="input" value={accountId} onChange={(e) => setAccountId(Number(e.target.value))}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button className="btn-primary" disabled={!ready || busy} onClick={submit}>取り込む</button>
      </div>
    </div>
  );
}
