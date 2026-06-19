import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, TrendingUp, Coins, PiggyBank, RefreshCw, ArrowUpRight,
  ArrowDownRight, Newspaper, ShieldCheck, Globe2, Layers,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { yen, yenSigned, pct, pnlColor, COUNTRY_LABEL, ASSET_LABEL } from '../lib/format';
import { Card, SectionTitle, Skeleton, Disclaimer, Spinner } from '../components/ui';
import { AssetTrendChart, BreakdownPie } from '../components/charts';
import { Markdown } from '../components/Markdown';
import { useToast } from '../components/Toast';

export default function SummaryPage() {
  const dash = useAsync(() => api.dashboard(), []);
  const reports = useAsync(() => api.reports(), []);
  const selfCheck = useAsync(() => api.selfCheck(), []);
  const [running, setRunning] = useState(false);
  const toast = useToast();

  const runNow = async () => {
    setRunning(true);
    try {
      const r = await api.runNow();
      toast(`収集 ${r.collected} 件・レポートを生成しました`, 'success');
      reports.reload();
      dash.reload();
    } catch (e: any) {
      toast(e.message ?? '実行に失敗しました', 'error');
    } finally {
      setRunning(false);
    }
  };

  const s = dash.data?.summary;
  const trend = dash.data?.trend ?? [];
  // 前月比（推移の最後の2点）
  const prevVal = trend.length >= 2 ? trend[trend.length - 2].valuation : null;
  const lastVal = trend.length ? trend[trend.length - 1].valuation : null;
  const momChange = prevVal != null && lastVal != null ? lastVal - prevVal : null;
  const momPct = momChange != null && prevVal ? (momChange / prevVal) * 100 : null;

  const latestReport = reports.data?.[0];

  return (
    <div className="space-y-7">
      {/* ヘッダー */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tightish">サマリー</h1>
          <p className="text-sm text-ink-muted mt-1">あなたの資産の全体像と当月のハイライト</p>
        </div>
        <button className="btn-primary" onClick={runNow} disabled={running}>
          {running ? <Spinner /> : <RefreshCw size={16} strokeWidth={2.3} />}
          今すぐ収集・レポート生成
        </button>
      </div>

      {/* KPI */}
      {dash.loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[132px] rounded-2xl" />)}
        </div>
      ) : s ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            tone="accent" icon={Wallet} label="総評価額" value={`¥${yen(s.totalValuation)}`}
            sub={momChange != null ? (
              <span className={`inline-flex items-center gap-1 ${pnlColor(momChange)}`}>
                {momChange >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                前月比 {yenSigned(momChange)}（{momPct != null ? pct(momPct) : '—'}）
              </span>
            ) : '前月比データなし'}
          />
          <KpiCard
            tone={s.totalPnl >= 0 ? 'success' : 'danger'} icon={TrendingUp} label="累計損益"
            value={<span className={pnlColor(s.totalPnl)}>¥{yenSigned(s.totalPnl)}</span>}
            sub={<span className={pnlColor(s.totalPnl)}>損益率 {pct(s.pnlPct)}</span>}
          />
          <KpiCard tone="neutral" icon={Coins} label="当月配当合計" value={`¥${yen(s.currentMonthDividend)}`} sub="今月の受取（配当/分配/利息）" />
          <KpiCard tone="neutral" icon={PiggyBank} label="元本合計（拠出−引出）" value={`¥${yen(s.totalPrincipal)}`} sub="累計の投下元本" />
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* 推移 */}
        <Card className="xl:col-span-2 p-5 lg:p-6" hover>
          <SectionTitle icon={TrendingUp}>資産推移（評価額 vs 元本）</SectionTitle>
          {dash.loading ? <Skeleton className="h-[300px]" /> : trend.length ? (
            <AssetTrendChart data={trend} />
          ) : <p className="text-sm text-ink-muted py-16 text-center">データがありません</p>}
        </Card>

        {/* 内訳 */}
        <Card className="p-5 lg:p-6" hover>
          <SectionTitle icon={Globe2}>国別の内訳</SectionTitle>
          {dash.loading ? <Skeleton className="h-[260px]" /> : (
            <BreakdownPie data={dash.data?.byCountry ?? []} labelMap={COUNTRY_LABEL} />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* 最新レポート */}
        <Card className="xl:col-span-2 p-5 lg:p-6" hover>
          <SectionTitle icon={Newspaper} action={<Link to="/reports" className="text-xs font-semibold text-accent hover:underline">すべて見る →</Link>}>
            最新のブリーフィング
          </SectionTitle>
          {reports.loading ? (
            <div className="space-y-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
          ) : latestReport ? (
            <div>
              <div className="max-h-72 overflow-hidden relative">
                <Markdown text={latestReport.body.split('\n').slice(0, 26).join('\n')} />
                <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-white to-transparent" />
              </div>
              <Link to="/reports" className="btn-ghost mt-3 text-xs">続きを読む</Link>
            </div>
          ) : (
            <p className="text-sm text-ink-muted py-8 text-center">
              まだレポートがありません。「今すぐ収集・レポート生成」で作成できます。
            </p>
          )}
        </Card>

        {/* 自己点検 */}
        <Card className="p-5 lg:p-6" hover>
          <SectionTitle icon={ShieldCheck} action={<Link to="/stats" className="text-xs font-semibold text-accent hover:underline">詳細 →</Link>}>
            自己点検メモ
          </SectionTitle>
          {selfCheck.loading ? (
            <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></div>
          ) : (
            <ul className="space-y-2.5">
              {(selfCheck.data?.notes ?? []).map((n, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-ink-soft leading-relaxed">
                  <Layers size={15} className="text-accent shrink-0 mt-0.5" />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Disclaimer />
    </div>
  );
}

function KpiCard({ tone, icon: Icon, label, value, sub }: {
  tone: 'accent' | 'success' | 'danger' | 'neutral'; icon: any; label: string;
  value: React.ReactNode; sub: React.ReactNode;
}) {
  const ring: Record<string, string> = {
    accent: 'bg-accent-soft text-accent',
    success: 'bg-success-soft text-success',
    danger: 'bg-danger-soft text-danger',
    neutral: 'bg-line-soft text-ink-soft',
  };
  return (
    <div className="card card-hover bg-kpi-gradient p-5 relative overflow-hidden">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-ink-muted">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${ring[tone]}`}>
          <Icon size={18} strokeWidth={2.2} />
        </div>
      </div>
      <p className="text-[26px] font-extrabold tracking-tightish text-ink mt-3 tnum">{value}</p>
      <p className="text-xs mt-1.5 text-ink-muted font-medium">{sub}</p>
    </div>
  );
}
