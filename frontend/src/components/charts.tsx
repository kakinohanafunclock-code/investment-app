import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { compactYen, yen, CHART_COLORS } from '../lib/format';

const axisStyle = { fontSize: 11, fill: '#9CA3AF', fontWeight: 500 };
const gridProps = { stroke: '#EEF0F3', strokeDasharray: '0', vertical: false } as const;

function TooltipBox({ active, payload, label, fmtLabel }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white border border-line shadow-card-hover px-3.5 py-2.5">
      <p className="text-[11px] font-bold text-ink-muted mb-1.5">{fmtLabel ? fmtLabel(label) : label}</p>
      <div className="space-y-1">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
            <span className="text-ink-muted">{p.name}</span>
            <span className="ml-auto font-bold tnum text-ink">{yen(p.value)} 円</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AssetTrendChart({ data }: { data: { date: string; valuation: number; principal: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="valFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2F6BFF" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#2F6BFF" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} minTickGap={28} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => compactYen(v)} />
        <Tooltip content={<TooltipBox />} />
        <Area type="monotone" dataKey="valuation" name="評価額" stroke="#2F6BFF" strokeWidth={2.4} fill="url(#valFill)" />
        <Line type="monotone" dataKey="principal" name="元本" stroke="#9CA3AF" strokeWidth={1.8} strokeDasharray="5 4" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CumulativePnlChart({ data }: { data: { date: string; pnl: number }[] }) {
  const positive = (data.at(-1)?.pnl ?? 0) >= 0;
  const color = positive ? '#1FA971' : '#E5484D';
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="pnlFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} minTickGap={28} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => compactYen(v)} />
        <Tooltip content={<TooltipBox />} />
        <Area type="monotone" dataKey="pnl" name="累計損益" stroke={color} strokeWidth={2.4} fill="url(#pnlFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DividendBarChart({ data }: { data: { month: string; amount: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="divBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1FA971" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#1FA971" stopOpacity={0.55} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="month" tick={axisStyle} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => compactYen(v)} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: 'rgba(47,107,255,.05)' }} />
        <Bar dataKey="amount" name="配当合計" fill="url(#divBar)" radius={[6, 6, 0, 0]} maxBarSize={42} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BreakdownPie({
  data, labelMap, height = 260,
}: { data: { key: string; value: number }[]; labelMap?: Record<string, string>; height?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const named = data.map((d) => ({ ...d, name: labelMap?.[d.key] ?? d.key }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={named}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={58}
          outerRadius={88}
          paddingAngle={2}
          stroke="#fff"
          strokeWidth={2}
        >
          {named.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }: any) => {
            if (!active || !payload?.length) return null;
            const p = payload[0];
            const share = total ? ((p.value / total) * 100).toFixed(1) : '0';
            return (
              <div className="rounded-xl bg-white border border-line shadow-card-hover px-3.5 py-2.5">
                <p className="text-xs font-bold text-ink">{p.name}</p>
                <p className="text-xs text-ink-muted mt-0.5 tnum">{yen(p.value)} 円 ・ {share}%</p>
              </div>
            );
          }}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          iconSize={8}
          formatter={(v) => <span className="text-xs text-ink-soft">{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
