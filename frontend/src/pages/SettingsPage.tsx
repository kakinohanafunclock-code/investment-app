import { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon, Clock, Star, Plus, Trash2, Download, RotateCcw,
  Sparkles, Server, Calendar, Database,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import type { WatchItem, HealthInfo } from '../lib/types';
import { Card, SectionTitle, Badge, Skeleton } from '../components/ui';
import { useToast } from '../components/Toast';

const WEEKDAYS = [
  { v: '1', l: '月' }, { v: '2', l: '火' }, { v: '3', l: '水' },
  { v: '4', l: '木' }, { v: '5', l: '金' }, { v: '6', l: '土' }, { v: '0', l: '日' },
];

/** "分 時 * * 曜日" を {time, days} に分解 */
function parseCron(expr: string): { time: string; days: string[] } {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return { time: '07:30', days: ['1', '2', '3', '4', '5'] };
  const [min, hour, , , dow] = parts;
  const time = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  let days: string[];
  if (dow === '*') days = WEEKDAYS.map((w) => w.v);
  else if (dow.includes('-')) {
    const [a, b] = dow.split('-').map(Number);
    days = []; for (let i = a; i <= b; i++) days.push(String(i));
  } else days = dow.split(',');
  return { time, days };
}
function buildCron(time: string, days: string[]): string {
  const [h, m] = time.split(':');
  const dow = days.length === 7 ? '*' : days.slice().sort().join(',');
  return `${Number(m)} ${Number(h)} * * ${dow || '*'}`;
}

export default function SettingsPage() {
  const settings = useAsync(() => api.settings(), []);
  const health = useAsync(() => api.health(), []);
  const watch = useAsync(() => api.watchlist(), []);
  const toast = useToast();

  const [time, setTime] = useState('07:30');
  const [days, setDays] = useState<string[]>(['1', '2', '3', '4', '5']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings.data?.cron) {
      const { time, days } = parseCron(settings.data.cron);
      setTime(time); setDays(days);
    }
  }, [settings.data]);

  const saveCron = async () => {
    setSaving(true);
    try { const r = await api.updateCron(buildCron(time, days)); toast(`収集時刻を更新しました（${r.cron}）`); settings.reload(); health.reload(); }
    catch (e: any) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  const exportJson = async () => {
    const data = await api.export();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    download(blob, `portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`);
    toast('JSON をエクスポートしました');
  };
  const exportCsv = async () => {
    const data = await api.export();
    const rows = [['type', 'date', 'accountId', 'symbol', 'valuation', 'contribution', 'withdrawal', 'amount', 'kind']];
    for (const t of data.transactions) rows.push(['transaction', t.date, t.accountId, t.symbol, t.valuation, t.contribution, t.withdrawal, '', '']);
    for (const d of data.dividends) rows.push(['dividend', d.date, d.accountId ?? '', d.symbol, '', '', '', d.amount, d.kind]);
    const csv = rows.map((r) => r.join(',')).join('\n');
    download(new Blob([csv], { type: 'text/csv' }), `portfolio-${new Date().toISOString().slice(0, 10)}.csv`);
    toast('CSV をエクスポートしました');
  };

  const reset = async (seed: boolean) => {
    if (!confirm(seed ? '全データを削除し、サンプルデータを入れ直しますか？' : '全データを削除しますか？元に戻せません。')) return;
    await api.reset(seed);
    toast(seed ? 'リセットしてサンプルを投入しました' : '全データを削除しました');
    settings.reload(); watch.reload();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink tracking-tightish">設定</h1>
        <p className="text-sm text-ink-muted mt-1">収集スケジュール・ウォッチリスト・データ管理</p>
      </div>

      {/* ステータス */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatusCard icon={Sparkles} label="AI エージェント"
          value={health.data?.ai.enabled ? '接続済み' : '未接続'}
          ok={health.data?.ai.enabled}
          hint={health.data?.ai.enabled ? health.data.ai.model : 'ANTHROPIC_API_KEY 未設定' } />
        <StatusCard icon={Server} label="スケジューラ"
          value={health.data?.scheduler?.running ? '稼働中' : '停止'}
          ok={health.data?.scheduler?.running}
          hint={health.data?.scheduler?.cron ?? '—'} />
        <StatusCard icon={Database} label="データ" value="SQLite" ok hint="ローカル保存" />
      </div>

      {/* 収集時刻 */}
      <Card className="p-5 lg:p-6" hover>
        <SectionTitle icon={Clock}>毎朝の自動収集・レポート生成 時刻</SectionTitle>
        {settings.loading ? <Skeleton className="h-24" /> : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="label">実行時刻</label>
                <input type="time" className="input w-36 tnum" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <div>
                <label className="label">実行する曜日</label>
                <div className="flex gap-1.5">
                  {WEEKDAYS.map((w) => (
                    <button key={w.v} onClick={() => setDays((d) => d.includes(w.v) ? d.filter((x) => x !== w.v) : [...d, w.v])}
                      className={`w-9 h-9 rounded-lg text-sm font-semibold transition ${days.includes(w.v) ? 'bg-accent text-white shadow-soft' : 'bg-line-soft text-ink-muted hover:bg-line'}`}>
                      {w.l}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn-primary" onClick={saveCron} disabled={saving}>保存</button>
            </div>
            <p className="text-xs text-ink-muted flex items-center gap-1.5">
              <Calendar size={13} /> cron 式: <code className="bg-line-soft px-1.5 py-0.5 rounded tnum">{buildCron(time, days)}</code>
              （タイムゾーンはサーバの <code>CRON_TZ</code> 設定に従います）
            </p>
          </div>
        )}
      </Card>

      {/* ウォッチリスト */}
      <Card className="p-5 lg:p-6">
        <SectionTitle icon={Star}>ウォッチリスト（収集の中心となる銘柄・セクター・指標）</SectionTitle>
        <WatchEditor watch={watch} />
      </Card>

      {/* データ管理 */}
      <Card className="p-5 lg:p-6">
        <SectionTitle icon={Database}>エクスポート / リセット</SectionTitle>
        <div className="flex flex-wrap gap-2.5">
          <button className="btn-ghost" onClick={exportJson}><Download size={16} /> JSON バックアップ</button>
          <button className="btn-ghost" onClick={exportCsv}><Download size={16} /> CSV エクスポート</button>
          <button className="btn-subtle" onClick={() => reset(true)}><RotateCcw size={16} /> リセット＆サンプル投入</button>
          <button className="btn px-4 py-2.5 text-sm bg-danger-soft text-danger hover:bg-danger hover:text-white transition" onClick={() => reset(false)}>
            <Trash2 size={16} /> 全データ削除
          </button>
        </div>
        <p className="text-xs text-ink-muted mt-3">バックアップは手元に保存されます。リセットは元に戻せないためご注意ください。</p>
      </Card>
    </div>
  );
}

function WatchEditor({ watch }: { watch: ReturnType<typeof useAsync<WatchItem[]>> }) {
  const toast = useToast();
  const [label, setLabel] = useState('');
  const [type, setType] = useState<'symbol' | 'sector' | 'macro'>('symbol');

  const add = async () => {
    if (!label.trim()) return;
    await api.createWatch({ type, label: label.trim(), country: null, note: '' });
    setLabel(''); toast('追加しました'); watch.reload();
  };
  const del = async (id: number) => { await api.deleteWatch(id); watch.reload(); };

  const typeLabel = { symbol: '銘柄', sector: 'セクター', macro: '指標' };
  const grouped = (['symbol', 'sector', 'macro'] as const).map((t) => ({ t, items: (watch.data ?? []).filter((w) => w.type === t) }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select className="input w-32" value={type} onChange={(e) => setType(e.target.value as any)}>
          <option value="symbol">銘柄</option><option value="sector">セクター</option><option value="macro">指標</option>
        </select>
        <input className="input flex-1 min-w-[200px]" placeholder="例: 7203 トヨタ / 半導体 / USD/JPY" value={label}
          onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn-primary" onClick={add}><Plus size={16} /> 追加</button>
      </div>
      {watch.loading ? <Skeleton className="h-16" /> : (
        <div className="space-y-3">
          {grouped.map(({ t, items }) => items.length > 0 && (
            <div key={t}>
              <p className="text-xs font-bold text-ink-muted mb-1.5">{typeLabel[t]}</p>
              <div className="flex flex-wrap gap-2">
                {items.map((w) => (
                  <span key={w.id} className="chip bg-accent-soft text-accent group">
                    {w.label}
                    <button onClick={() => del(w.id)} className="hover:text-danger transition"><Trash2 size={12} /></button>
                  </span>
                ))}
              </div>
            </div>
          ))}
          {(watch.data?.length ?? 0) === 0 && <p className="text-sm text-ink-muted">ウォッチ項目がありません。追加すると、その対象を中心にニュースを収集します。</p>}
        </div>
      )}
    </div>
  );
}

function StatusCard({ icon: Icon, label, value, ok, hint }: { icon: any; label: string; value: string; ok?: boolean; hint: string }) {
  return (
    <Card className="p-4 flex items-center gap-3" hover>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${ok ? 'bg-success-soft text-success' : 'bg-line-soft text-ink-muted'}`}>
        <Icon size={20} strokeWidth={2.1} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-ink-muted font-semibold">{label}</p>
        <p className="font-bold text-ink leading-tight">{value}</p>
        <p className="text-[11px] text-ink-faint truncate">{hint}</p>
      </div>
    </Card>
  );
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
