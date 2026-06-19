import { useEffect, useState } from 'react';
import {
  Newspaper, RefreshCw, FileText, Clock, ExternalLink, Search, Filter, Sparkles,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import type { Report, Article, Importance } from '../lib/types';
import { Card, SectionTitle, Skeleton, EmptyState, Badge, Disclaimer, Spinner } from '../components/ui';
import { Markdown } from '../components/Markdown';
import { useToast } from '../components/Toast';

const IMP_LABEL: Record<Importance, { t: string; tone: 'danger' | 'warn' | 'neutral' }> = {
  high: { t: '重要度 高', tone: 'danger' },
  medium: { t: '重要度 中', tone: 'warn' },
  low: { t: '重要度 低', tone: 'neutral' },
};

export default function ReportsPage() {
  const reports = useAsync(() => api.reports(), []);
  const articles = useAsync(() => api.articles(120), []);
  const [selected, setSelected] = useState<Report | null>(null);
  const [busy, setBusy] = useState<null | 'collect' | 'report'>(null);
  const [tab, setTab] = useState<'report' | 'articles'>('report');
  const [q, setQ] = useState('');
  const [impFilter, setImpFilter] = useState<Importance | 'all'>('all');
  const toast = useToast();

  useEffect(() => {
    if (!selected && reports.data?.length) setSelected(reports.data[0]);
  }, [reports.data, selected]);

  const collect = async () => {
    setBusy('collect');
    try { const r = await api.collect(); toast(`新規記事 ${r.inserted} 件を収集しました`); articles.reload(); }
    catch (e: any) { toast(e.message, 'error'); } finally { setBusy(null); }
  };
  const generate = async () => {
    setBusy('report');
    try { const r = await api.generateReport(); toast('レポートを生成しました'); reports.reload(); setSelected(r); }
    catch (e: any) { toast(e.message, 'error'); } finally { setBusy(null); }
  };

  const filteredArticles = (articles.data ?? []).filter((a) => {
    if (impFilter !== 'all' && a.importance !== impFilter) return false;
    if (q && !`${a.title} ${a.summary} ${a.relatedLabels} ${a.source}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tightish">エージェントレポート</h1>
          <p className="text-sm text-ink-muted mt-1">毎朝のブリーフィングと自動収集ニュース（情報整理・客観分析）</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={collect} disabled={busy !== null}>
            {busy === 'collect' ? <Spinner /> : <RefreshCw size={16} />} ニュース収集
          </button>
          <button className="btn-primary" onClick={generate} disabled={busy !== null}>
            {busy === 'report' ? <Spinner /> : <Sparkles size={16} />} レポート生成
          </button>
        </div>
      </div>

      <div className="inline-flex p-1 rounded-xl bg-line-soft">
        <button onClick={() => setTab('report')} className={`btn px-4 py-2 text-sm ${tab === 'report' ? 'bg-white text-accent shadow-soft' : 'text-ink-muted'}`}><FileText size={15} /> ブリーフィング</button>
        <button onClick={() => setTab('articles')} className={`btn px-4 py-2 text-sm ${tab === 'articles' ? 'bg-white text-accent shadow-soft' : 'text-ink-muted'}`}><Newspaper size={15} /> 収集ニュース</button>
      </div>

      {tab === 'report' ? (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          {/* 履歴 */}
          <Card className="p-4 h-fit lg:sticky lg:top-6">
            <SectionTitle icon={Clock}>レポート履歴</SectionTitle>
            {reports.loading ? <div className="space-y-2">{[0,1,2].map(i=><Skeleton key={i} className="h-12" />)}</div> :
              (reports.data?.length ?? 0) === 0 ? <p className="text-sm text-ink-muted py-4">まだありません</p> :
              <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                {reports.data!.map((r) => (
                  <button key={r.id} onClick={() => setSelected(r)}
                    className={`w-full text-left rounded-xl px-3.5 py-2.5 transition ${selected?.id === r.id ? 'bg-accent text-white shadow-kpi' : 'hover:bg-accent-soft text-ink-soft'}`}>
                    <p className="text-sm font-semibold tnum">{r.date}</p>
                    <p className={`text-[11px] ${selected?.id === r.id ? 'text-white/80' : 'text-ink-faint'}`}>{new Date(r.createdAt).toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 生成</p>
                  </button>
                ))}
              </div>}
          </Card>

          {/* 本文 */}
          <Card className="p-6 lg:p-8" hover>
            {reports.loading ? <div className="space-y-3"><Skeleton className="h-7 w-64" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-4/6" /></div> :
              selected ? (
                <article>
                  <div className="rounded-2xl bg-header-gradient border border-line-soft px-5 py-4 mb-5">
                    <div className="flex items-center gap-2 text-accent"><Newspaper size={18} /><span className="text-xs font-bold">朝のブリーフィング</span></div>
                    <h2 className="text-xl font-extrabold text-ink mt-1 tnum">{selected.date}</h2>
                  </div>
                  <Markdown text={selected.body} />
                </article>
              ) : <EmptyState icon={FileText} title="レポートがありません" desc="「レポート生成」で本日のブリーフィングを作成できます。" action={<button className="btn-primary" onClick={generate}><Sparkles size={16} /> いま生成する</button>} />}
          </Card>
        </div>
      ) : (
        <Card className="p-5 lg:p-6">
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input className="input pl-9" placeholder="ニュースを検索…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="flex items-center gap-1.5 text-ink-muted"><Filter size={15} />
              {(['all', 'high', 'medium', 'low'] as const).map((k) => (
                <button key={k} onClick={() => setImpFilter(k)}
                  className={`chip ${impFilter === k ? 'bg-accent text-white' : 'bg-line-soft text-ink-soft'}`}>
                  {k === 'all' ? '全部' : IMP_LABEL[k].t}
                </button>
              ))}
            </div>
          </div>
          {articles.loading ? <div className="space-y-2">{[0,1,2,3].map(i=><Skeleton key={i} className="h-16" />)}</div> :
            filteredArticles.length === 0 ? <EmptyState icon={Newspaper} title="該当するニュースがありません" desc="「ニュース収集」を実行すると、ウォッチ対象に沿った記事を取得します。" /> :
            <div className="space-y-2.5">
              {filteredArticles.map((a) => (
                <div key={a.id} className="rounded-xl border border-line-soft hover:border-accent/30 hover:shadow-soft transition px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge tone={IMP_LABEL[a.importance].tone}>{IMP_LABEL[a.importance].t}</Badge>
                        {a.category && <Badge tone="accent">{a.category}</Badge>}
                        <span className="text-[11px] text-ink-faint">{a.source}</span>
                      </div>
                      <p className="font-semibold text-ink text-sm leading-snug">{a.title}</p>
                      {a.summary && a.summary !== a.title && <p className="text-xs text-ink-muted mt-1 leading-relaxed">{a.summary}</p>}
                      {a.relatedLabels && <p className="text-[11px] text-accent mt-1.5">関連: {a.relatedLabels}</p>}
                    </div>
                    {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-accent-soft text-ink-muted hover:text-accent shrink-0"><ExternalLink size={15} /></a>}
                  </div>
                </div>
              ))}
            </div>}
        </Card>
      )}

      <Disclaimer />
    </div>
  );
}
