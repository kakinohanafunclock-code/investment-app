import { useMemo, useState } from 'react';
import { Wallet, Plus, Pencil, Trash2, Percent, Building2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { yen } from '../lib/format';
import type { Account, Transaction } from '../lib/types';
import { Card, SectionTitle, Modal, EmptyState, Badge, Skeleton } from '../components/ui';
import { useToast } from '../components/Toast';
import { latestValuationByAccount } from '../lib/clientCalc';

export default function AccountsPage() {
  const accounts = useAsync(() => api.accounts(), []);
  const txs = useAsync(() => api.transactions(), []);
  const [edit, setEdit] = useState<Partial<Account> | null>(null);
  const toast = useToast();

  const valByAccount = useMemo(() => latestValuationByAccount(txs.data ?? []), [txs.data]);

  const save = async (a: Partial<Account>) => {
    try {
      if (a.id) await api.updateAccount(a.id, a); else await api.createAccount(a);
      toast('口座を保存しました'); setEdit(null); accounts.reload();
    } catch (e: any) { toast(e.message, 'error'); }
  };
  const del = async (id: number) => { if (!confirm('この口座を削除しますか？')) return; await api.deleteAccount(id); toast('削除しました'); accounts.reload(); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tightish">口座管理</h1>
          <p className="text-sm text-ink-muted mt-1">複数口座を登録し、口座別の評価額と概算手数料を確認できます</p>
        </div>
        <button className="btn-primary" onClick={() => setEdit({ name: '', kind: '', feeRate: 0, note: '' })}>
          <Plus size={16} /> 口座を追加
        </button>
      </div>

      {accounts.loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{[0,1,2].map(i => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
      ) : (accounts.data?.length ?? 0) === 0 ? (
        <Card className="p-6"><EmptyState icon={Wallet} title="口座がありません" desc="特定口座・ラップ口座・IFA経由など、複数の口座を登録できます。" /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.data!.map((a) => {
            const val = valByAccount.get(a.id) ?? 0;
            const annualFee = Math.round((val * a.feeRate) / 100);
            return (
              <Card key={a.id} className="p-5" hover>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
                      <Building2 size={20} strokeWidth={2.1} />
                    </div>
                    <div>
                      <p className="font-bold text-ink leading-tight">{a.name}</p>
                      {a.kind && <Badge tone="neutral">{a.kind}</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded-lg hover:bg-accent-soft text-ink-muted hover:text-accent" onClick={() => setEdit(a)}><Pencil size={15} /></button>
                    <button className="p-1.5 rounded-lg hover:bg-danger-soft text-ink-muted hover:text-danger" onClick={() => del(a.id)}><Trash2 size={15} /></button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-kpi-gradient border border-line-soft px-3.5 py-2.5">
                    <p className="text-[11px] text-ink-muted font-semibold">評価額</p>
                    <p className="text-lg font-extrabold text-ink tnum mt-0.5">¥{yen(val)}</p>
                  </div>
                  <div className="rounded-xl bg-kpi-gradient border border-line-soft px-3.5 py-2.5">
                    <p className="text-[11px] text-ink-muted font-semibold flex items-center gap-1"><Percent size={11} />手数料率(年率)</p>
                    <p className="text-lg font-extrabold text-ink tnum mt-0.5">{a.feeRate}%</p>
                  </div>
                </div>
                {a.feeRate > 0 && (
                  <p className="text-xs text-ink-muted mt-3">
                    概算年間手数料 <span className="font-bold text-warn">¥{yen(annualFee)}</span>
                    <span className="text-ink-faint"> （評価額 × {a.feeRate}%）</span>
                  </p>
                )}
                {a.note && <p className="text-xs text-ink-muted mt-2 leading-relaxed border-t border-line-soft pt-2">{a.note}</p>}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? '口座を編集' : '口座を追加'}>
        {edit && <AccountForm value={edit} onChange={setEdit} onSave={() => save(edit)} />}
      </Modal>
    </div>
  );
}

function AccountForm({ value, onChange, onSave }: { value: Partial<Account>; onChange: (v: Partial<Account>) => void; onSave: () => void }) {
  const set = (p: Partial<Account>) => onChange({ ...value, ...p });
  return (
    <div className="space-y-3.5">
      <div><label className="label">口座名</label><input className="input" placeholder="例: 特定口座（SBI）" value={value.name} onChange={(e) => set({ name: e.target.value })} /></div>
      <div><label className="label">種別</label>
        <input className="input" placeholder="特定口座 / ラップ / IFA など" value={value.kind} onChange={(e) => set({ kind: e.target.value })} list="kinds" />
        <datalist id="kinds"><option value="特定口座" /><option value="一般口座" /><option value="ラップ" /><option value="IFA" /><option value="NISA" /><option value="iDeCo" /></datalist>
      </div>
      <div><label className="label">手数料率（年率 %）</label><input type="number" step="0.01" className="input tnum" value={value.feeRate} onChange={(e) => set({ feeRate: +e.target.value })} /></div>
      <div><label className="label">メモ</label><textarea className="input h-20" value={value.note} onChange={(e) => set({ note: e.target.value })} /></div>
      <div className="flex justify-end pt-1"><button className="btn-primary" onClick={onSave} disabled={!value.name}>保存</button></div>
    </div>
  );
}
