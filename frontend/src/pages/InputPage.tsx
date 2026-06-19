import { useState } from 'react';
import { Plus, Pencil, Trash2, Upload, ArrowLeftRight, Coins } from 'lucide-react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { yen, COUNTRY_LABEL, ASSET_LABEL, DIV_KIND_LABEL } from '../lib/format';
import type { Account, Transaction, Dividend, AssetClass, Country, DividendKind } from '../lib/types';
import { Card, SectionTitle, Modal, EmptyState, Badge } from '../components/ui';
import { useToast } from '../components/Toast';
import { CsvImport } from '../components/CsvImport';

type Tab = 'tx' | 'div';

export default function InputPage() {
  const [tab, setTab] = useState<Tab>('tx');
  const accounts = useAsync(() => api.accounts(), []);
  const txs = useAsync(() => api.transactions(), []);
  const divs = useAsync(() => api.dividends(), []);
  const [showImport, setShowImport] = useState(false);

  const accMap = new Map((accounts.data ?? []).map((a) => [a.id, a.name]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tightish">データ入力</h1>
          <p className="text-sm text-ink-muted mt-1">取引・配当を手入力、または CSV で取り込みます</p>
        </div>
        <button className="btn-ghost" onClick={() => setShowImport(true)}>
          <Upload size={16} strokeWidth={2.2} /> CSV 取込
        </button>
      </div>

      <div className="inline-flex p-1 rounded-xl bg-line-soft">
        <TabButton active={tab === 'tx'} onClick={() => setTab('tx')} icon={ArrowLeftRight}>取引 / 評価額</TabButton>
        <TabButton active={tab === 'div'} onClick={() => setTab('div')} icon={Coins}>配当 / 分配</TabButton>
      </div>

      {tab === 'tx' ? (
        <TransactionsTab txs={txs} accounts={accounts.data ?? []} accMap={accMap} />
      ) : (
        <DividendsTab divs={divs} accounts={accounts.data ?? []} accMap={accMap} />
      )}

      <Modal open={showImport} onClose={() => setShowImport(false)} title="CSV 取込（カラムマッピング）">
        <CsvImport
          accounts={accounts.data ?? []}
          onDone={() => {
            setShowImport(false);
            txs.reload();
            divs.reload();
          }}
        />
      </Modal>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`btn px-4 py-2 text-sm ${active ? 'bg-white text-accent shadow-soft' : 'text-ink-muted hover:text-ink-soft'}`}
    >
      <Icon size={15} /> {children}
    </button>
  );
}

// ===== 取引タブ =====
function TransactionsTab({ txs, accounts, accMap }: { txs: ReturnType<typeof useAsync<Transaction[]>>; accounts: Account[]; accMap: Map<number, string> }) {
  const toast = useToast();
  const [edit, setEdit] = useState<Partial<Transaction> | null>(null);

  const blank = (): Partial<Transaction> => ({
    date: new Date().toISOString().slice(0, 10), accountId: accounts[0]?.id ?? 1, symbol: '',
    valuation: 0, contribution: 0, withdrawal: 0, country: 'JP', assetClass: 'equity', note: '',
  });

  const save = async (t: Partial<Transaction>) => {
    try {
      if (t.id) await api.updateTransaction(t.id, t);
      else await api.createTransaction(t);
      toast('取引を保存しました');
      setEdit(null);
      txs.reload();
    } catch (e: any) { toast(e.message, 'error'); }
  };
  const del = async (id: number) => {
    if (!confirm('この取引を削除しますか？')) return;
    await api.deleteTransaction(id);
    toast('削除しました');
    txs.reload();
  };

  return (
    <Card className="p-5 lg:p-6">
      <SectionTitle icon={ArrowLeftRight} action={<button className="btn-primary" onClick={() => setEdit(blank())}><Plus size={16} /> 取引を追加</button>}>
        取引 / 評価額スナップショット
      </SectionTitle>

      {(txs.data?.length ?? 0) === 0 ? (
        <EmptyState icon={ArrowLeftRight} title="取引データがありません" desc="「取引を追加」で評価額や拠出額を記録できます。" />
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-xs text-ink-muted border-b border-line">
                <th className="px-3 py-2.5 font-semibold">日付</th>
                <th className="px-3 py-2.5 font-semibold">口座</th>
                <th className="px-3 py-2.5 font-semibold">銘柄</th>
                <th className="px-3 py-2.5 font-semibold">国/種別</th>
                <th className="px-3 py-2.5 font-semibold text-right">評価額</th>
                <th className="px-3 py-2.5 font-semibold text-right">拠出</th>
                <th className="px-3 py-2.5 font-semibold text-right">引出</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {txs.data!.map((t) => (
                <tr key={t.id} className="border-b border-line-soft hover:bg-page/60 transition">
                  <td className="px-3 py-2.5 text-ink-soft tnum">{t.date}</td>
                  <td className="px-3 py-2.5 text-ink-soft">{accMap.get(t.accountId) ?? `#${t.accountId}`}</td>
                  <td className="px-3 py-2.5 font-medium text-ink">{t.symbol}</td>
                  <td className="px-3 py-2.5"><Badge tone={t.country === 'US' ? 'accent' : 'neutral'}>{COUNTRY_LABEL[t.country]}・{ASSET_LABEL[t.assetClass]}</Badge></td>
                  <td className="px-3 py-2.5 text-right tnum font-semibold text-ink">{yen(t.valuation)}</td>
                  <td className="px-3 py-2.5 text-right tnum text-ink-muted">{yen(t.contribution)}</td>
                  <td className="px-3 py-2.5 text-right tnum text-ink-muted">{yen(t.withdrawal)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <button className="p-1.5 rounded-lg hover:bg-accent-soft text-ink-muted hover:text-accent" onClick={() => setEdit(t)}><Pencil size={15} /></button>
                      <button className="p-1.5 rounded-lg hover:bg-danger-soft text-ink-muted hover:text-danger" onClick={() => del(t.id)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? '取引を編集' : '取引を追加'}>
        {edit && <TxForm value={edit} accounts={accounts} onChange={setEdit} onSave={() => save(edit)} />}
      </Modal>
    </Card>
  );
}

function TxForm({ value, accounts, onChange, onSave }: { value: Partial<Transaction>; accounts: Account[]; onChange: (v: Partial<Transaction>) => void; onSave: () => void }) {
  const set = (p: Partial<Transaction>) => onChange({ ...value, ...p });
  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">日付</label><input type="date" className="input" value={value.date} onChange={(e) => set({ date: e.target.value })} /></div>
        <div><label className="label">口座</label>
          <select className="input" value={value.accountId} onChange={(e) => set({ accountId: Number(e.target.value) })}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
      <div><label className="label">銘柄</label><input className="input" placeholder="例: 7203 トヨタ自動車 / AAPL" value={value.symbol} onChange={(e) => set({ symbol: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">国</label>
          <select className="input" value={value.country} onChange={(e) => set({ country: e.target.value as Country })}><option value="JP">日本</option><option value="US">米国</option></select>
        </div>
        <div><label className="label">資産クラス</label>
          <select className="input" value={value.assetClass} onChange={(e) => set({ assetClass: e.target.value as AssetClass })}>
            {Object.entries(ASSET_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="label">評価額(円)</label><input type="number" className="input tnum" value={value.valuation} onChange={(e) => set({ valuation: Math.round(+e.target.value) })} /></div>
        <div><label className="label">拠出(円)</label><input type="number" className="input tnum" value={value.contribution} onChange={(e) => set({ contribution: Math.round(+e.target.value) })} /></div>
        <div><label className="label">引出(円)</label><input type="number" className="input tnum" value={value.withdrawal} onChange={(e) => set({ withdrawal: Math.round(+e.target.value) })} /></div>
      </div>
      <div><label className="label">メモ</label><input className="input" value={value.note} onChange={(e) => set({ note: e.target.value })} /></div>
      <div className="flex justify-end gap-2 pt-1">
        <button className="btn-primary" onClick={onSave} disabled={!value.symbol}>保存</button>
      </div>
    </div>
  );
}

// ===== 配当タブ =====
function DividendsTab({ divs, accounts, accMap }: { divs: ReturnType<typeof useAsync<Dividend[]>>; accounts: Account[]; accMap: Map<number, string> }) {
  const toast = useToast();
  const [edit, setEdit] = useState<Partial<Dividend> | null>(null);
  const blank = (): Partial<Dividend> => ({ date: new Date().toISOString().slice(0, 10), accountId: accounts[0]?.id ?? null, symbol: '', amount: 0, kind: 'dividend', note: '' });

  const save = async (d: Partial<Dividend>) => {
    try {
      if (d.id) await api.updateDividend(d.id, d); else await api.createDividend(d);
      toast('配当を保存しました'); setEdit(null); divs.reload();
    } catch (e: any) { toast(e.message, 'error'); }
  };
  const del = async (id: number) => { if (!confirm('削除しますか？')) return; await api.deleteDividend(id); toast('削除しました'); divs.reload(); };

  return (
    <Card className="p-5 lg:p-6">
      <SectionTitle icon={Coins} action={<button className="btn-primary" onClick={() => setEdit(blank())}><Plus size={16} /> 配当を追加</button>}>
        配当 / 分配 / 利息
      </SectionTitle>
      {(divs.data?.length ?? 0) === 0 ? (
        <EmptyState icon={Coins} title="配当データがありません" desc="受け取った配当・分配・利息を記録すると、月次推移や成長率が見られます。" />
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[620px]">
            <thead><tr className="text-left text-xs text-ink-muted border-b border-line">
              <th className="px-3 py-2.5 font-semibold">日付</th><th className="px-3 py-2.5 font-semibold">銘柄</th>
              <th className="px-3 py-2.5 font-semibold">口座</th><th className="px-3 py-2.5 font-semibold">種別</th>
              <th className="px-3 py-2.5 font-semibold text-right">金額</th><th></th>
            </tr></thead>
            <tbody>
              {divs.data!.map((d) => (
                <tr key={d.id} className="border-b border-line-soft hover:bg-page/60 transition">
                  <td className="px-3 py-2.5 text-ink-soft tnum">{d.date}</td>
                  <td className="px-3 py-2.5 font-medium text-ink">{d.symbol || '—'}</td>
                  <td className="px-3 py-2.5 text-ink-soft">{d.accountId ? accMap.get(d.accountId) ?? `#${d.accountId}` : '—'}</td>
                  <td className="px-3 py-2.5"><Badge tone="success">{DIV_KIND_LABEL[d.kind]}</Badge></td>
                  <td className="px-3 py-2.5 text-right tnum font-semibold text-success">+{yen(d.amount)}</td>
                  <td className="px-3 py-2.5"><div className="flex gap-1 justify-end">
                    <button className="p-1.5 rounded-lg hover:bg-accent-soft text-ink-muted hover:text-accent" onClick={() => setEdit(d)}><Pencil size={15} /></button>
                    <button className="p-1.5 rounded-lg hover:bg-danger-soft text-ink-muted hover:text-danger" onClick={() => del(d.id)}><Trash2 size={15} /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? '配当を編集' : '配当を追加'}>
        {edit && <DivForm value={edit} accounts={accounts} onChange={setEdit} onSave={() => save(edit)} />}
      </Modal>
    </Card>
  );
}

function DivForm({ value, accounts, onChange, onSave }: { value: Partial<Dividend>; accounts: Account[]; onChange: (v: Partial<Dividend>) => void; onSave: () => void }) {
  const set = (p: Partial<Dividend>) => onChange({ ...value, ...p });
  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">日付</label><input type="date" className="input" value={value.date} onChange={(e) => set({ date: e.target.value })} /></div>
        <div><label className="label">種別</label>
          <select className="input" value={value.kind} onChange={(e) => set({ kind: e.target.value as DividendKind })}>
            {Object.entries(DIV_KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div><label className="label">銘柄</label><input className="input" value={value.symbol} onChange={(e) => set({ symbol: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">口座</label>
          <select className="input" value={value.accountId ?? ''} onChange={(e) => set({ accountId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">（指定なし）</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div><label className="label">金額(円)</label><input type="number" className="input tnum" value={value.amount} onChange={(e) => set({ amount: Math.round(+e.target.value) })} /></div>
      </div>
      <div><label className="label">メモ</label><input className="input" value={value.note} onChange={(e) => set({ note: e.target.value })} /></div>
      <div className="flex justify-end pt-1"><button className="btn-primary" onClick={onSave} disabled={!value.amount}>保存</button></div>
    </div>
  );
}
