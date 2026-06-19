import { useMemo, useState } from 'react';
import { BarChart3, Globe2, Layers, Wallet, TrendingUp, Coins, ShieldCheck, LineChart as LineIcon } from 'lucide-react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { yen, pct, pnlColor, COUNTRY_LABEL, ASSET_LABEL } from '../lib/format';
import { Card, SectionTitle, Skeleton, Disclaimer, Badge } from '../components/ui';
import { AssetTrendChart, CumulativePnlChart, DividendBarChart, BreakdownPie } from '../components/charts';

const PERIODS = [
  { key: '1M', months: 1 }, { key: '3M', months: 3 }, { key: '6M', months: 6 },
  { key: '1Y', months: 12 }, { key: 'ALL', months: 0 },
];

export default function StatsPage() {
  const dash = useAsync(() => api.dashboard(), []);
  const selfCheck = useAsync(() => api.selfCheck(), []);
  const analysis = useAsync(() => api.dataAnalysis(), []);
  const [period, setPeriod] = useState('6M');

  const trend = useMemo(() => {
    const all = dash.data?.trend ?? [];
    const p = PERIODS.find((x) => x.key === period)!;
    if (p.months === 0) return all;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - p.months);
    const cut = cutoff.toISOString().slice(0, 10);
    const filtered = all.filter((d) => d.date >= cut);
    return filtered.length ? filtered : all;
  }, [dash.data, period]);

  const cumPnl = useMemo(() => {
    const all = dash.data?.cumulativePnl ?? [];
    const p = PERIODS.find((x) => x.key === period)!;
    if (p.months === 0) return all;
    const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - p.months);
    const cut = cutoff.toISOString().slice(0, 10);
    const f = all.filter((d) => d.date >= cut);
    return f.length ? f : all;
  }, [dash.data, period]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink tracking-tightish">統計</h1>
        <p className="text-sm text-ink-muted mt-1">資産推移・配当・内訳の可視化と、客観的な点検・分析</p>
      </div>

      {/* 資産推移 */}
      <Card className="p-5 lg:p-6" hover>
        <SectionTitle icon={TrendingUp} action={
          <div className="inline-flex p-1 rounded-xl bg-line-soft">
            {PERIODS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`btn px-3 py-1.5 text-xs ${period === p.key ? 'bg-white text-accent shadow-soft' : 'text-ink-muted'}`}>
                {p.key === 'ALL' ? '全期間' : p.key}
              </button>
            ))}
          </div>
        }>資産推移（評価額 vs 元本）</SectionTitle>
        {dash.loading ? <Skeleton className="h-[300px]" /> : <AssetTrendChart data={trend} />}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5 lg:p-6" hover>
          <SectionTitle icon={LineIcon}>累計損益推移</SectionTitle>
          {dash.loading ? <Skeleton className="h-[280px]" /> : <CumulativePnlChart data={cumPnl} />}
        </Card>
        <Card className="p-5 lg:p-6" hover>
          <SectionTitle icon={Coins}>配当の月次推移</SectionTitle>
          {dash.loading ? <Skeleton className="h-[280px]" /> :
            (dash.data?.monthlyDividends.length ? <DividendBarChart data={dash.data.monthlyDividends} /> :
              <p className="text-sm text-ink-muted py-20 text-center">配当データがありません</p>)}
        </Card>
      </div>

      {/* 内訳3種 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-5 lg:p-6" hover>
          <SectionTitle icon={Globe2}>国別</SectionTitle>
          {dash.loading ? <Skeleton className="h-[260px]" /> : <BreakdownPie data={dash.data?.byCountry ?? []} labelMap={COUNTRY_LABEL} />}
        </Card>
        <Card className="p-5 lg:p-6" hover>
          <SectionTitle icon={Layers}>資産クラス別</SectionTitle>
          {dash.loading ? <Skeleton className="h-[260px]" /> : <BreakdownPie data={dash.data?.byAssetClass ?? []} labelMap={ASSET_LABEL} />}
        </Card>
        <Card className="p-5 lg:p-6" hover>
          <SectionTitle icon={Wallet}>銘柄別</SectionTitle>
          {dash.loading ? <Skeleton className="h-[260px]" /> : <BreakdownPie data={(dash.data?.bySymbol ?? []).slice(0, 8)} />}
        </Card>
      </div>

      {/* 自己点検 */}
      <Card className="p-5 lg:p-6" hover>
        <SectionTitle icon={ShieldCheck}>② 自己点検（集中リスク・偏りの客観算出）</SectionTitle>
        {selfCheck.loading ? <Skeleton className="h-24" /> : selfCheck.data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="最大保有銘柄" value={selfCheck.data.concentration.topSymbol ?? '—'} />
              <Stat label="最大銘柄比率" value={`${selfCheck.data.concentration.topShare.toFixed(1)}%`} />
              <Stat label="集中度 HHI" value={selfCheck.data.concentration.hhi.toFixed(2)} hint="1に近いほど集中" />
              <Stat label="保有銘柄数" value={`${selfCheck.data.concentration.bySymbol.length}`} />
            </div>
            <div className="rounded-xl bg-page/60 border border-line-soft p-4 space-y-2">
              {selfCheck.data.notes.map((n, i) => (
                <p key={i} className="text-sm text-ink-soft leading-relaxed flex gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />{n}
                </p>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* データ分析 */}
      <Card className="p-5 lg:p-6" hover>
        <SectionTitle icon={BarChart3}>③ データ分析（取引・配当の実績から傾向を読み解く）</SectionTitle>
        {analysis.loading ? <Skeleton className="h-24" /> : analysis.data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="累計拠出" value={`¥${yen(analysis.data.totalContribution)}`} />
              <Stat label="累計引出" value={`¥${yen(analysis.data.totalWithdrawal)}`} />
              <Stat label="累計配当" value={`¥${yen(analysis.data.totalDividends)}`} />
              <Stat label="配当データ年数" value={`${analysis.data.dividendGrowth.length}`} />
            </div>
            {analysis.data.dividendGrowth.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-ink-muted border-b border-line">
                    <th className="px-3 py-2 font-semibold">年</th>
                    <th className="px-3 py-2 font-semibold text-right">配当合計</th>
                    <th className="px-3 py-2 font-semibold text-right">前年比成長率</th>
                  </tr></thead>
                  <tbody>
                    {analysis.data.dividendGrowth.map((g) => (
                      <tr key={g.year} className="border-b border-line-soft">
                        <td className="px-3 py-2 tnum text-ink-soft">{g.year}</td>
                        <td className="px-3 py-2 text-right tnum font-semibold text-ink">¥{yen(g.amount)}</td>
                        <td className="px-3 py-2 text-right tnum">
                          {g.growthPct == null ? <span className="text-ink-faint">—</span> :
                            <span className={pnlColor(g.growthPct)}>{pct(g.growthPct)}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="rounded-xl bg-page/60 border border-line-soft p-4 space-y-2">
              {analysis.data.notes.map((n, i) => (
                <p key={i} className="text-sm text-ink-soft leading-relaxed flex gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 shrink-0" />{n}
                </p>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Disclaimer />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-kpi-gradient border border-line-soft px-4 py-3">
      <p className="text-[11px] text-ink-muted font-semibold">{label}</p>
      <p className="text-lg font-extrabold text-ink tnum mt-0.5 truncate">{value}</p>
      {hint && <p className="text-[10px] text-ink-faint mt-0.5">{hint}</p>}
    </div>
  );
}
