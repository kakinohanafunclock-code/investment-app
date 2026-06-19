import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, PencilLine, BarChart3, Wallet, Newspaper,
  MessagesSquare, BookOpen, Settings, TrendingUp, Menu, X, Sparkles, LogOut,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { HealthInfo } from '../lib/types';

const NAV = [
  { to: '/', label: 'サマリー', icon: LayoutDashboard, end: true },
  { to: '/input', label: 'データ入力', icon: PencilLine },
  { to: '/stats', label: '統計', icon: BarChart3 },
  { to: '/accounts', label: '口座管理', icon: Wallet },
  { to: '/reports', label: 'エージェントレポート', icon: Newspaper },
  { to: '/chat', label: '対話', icon: MessagesSquare },
  { to: '/knowledge', label: 'ナレッジ', icon: BookOpen },
  { to: '/settings', label: '設定', icon: Settings },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    api.health().then(setHealth).catch(() => {});
  }, []);

  return (
    <div className="min-h-full flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 z-40 h-screen w-[264px] shrink-0 bg-white/80 backdrop-blur-xl border-r border-line
          flex flex-col transition-transform duration-300 ease-smooth
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="px-5 py-5 flex items-center gap-3 border-b border-line-soft">
          <div className="w-10 h-10 rounded-xl bg-accent-gradient flex items-center justify-center shadow-kpi">
            <TrendingUp size={22} className="text-white" strokeWidth={2.4} />
          </div>
          <div className="leading-tight">
            <p className="font-extrabold text-ink text-[15px] tracking-tightish">資産ダッシュボード</p>
            <p className="text-[11px] text-ink-muted font-medium">投資情報エージェント</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
            >
              <n.icon size={18} strokeWidth={2.1} />
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 pb-5 pt-2 space-y-3">
          <div className="rounded-xl border border-line bg-page/60 px-3.5 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} className={health?.ai.enabled ? 'text-success' : 'text-ink-faint'} />
              <span className="text-[11px] font-bold text-ink-soft">AI エージェント</span>
            </div>
            <p className="text-[11px] text-ink-muted leading-snug">
              {health?.ai.enabled ? (
                <>接続済み（{health.ai.model}）</>
              ) : (
                <>未接続：<code className="text-[10px]">ANTHROPIC_API_KEY</code> を設定すると有効化</>
              )}
            </p>
          </div>

          {/* 現在のユーザー */}
          <div className="flex items-center gap-2.5 rounded-xl border border-line bg-white px-3 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center font-bold text-sm shrink-0">
              {(user?.name || user?.email || '?').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-ink truncate">{user?.name || user?.email}</p>
              <p className="text-[10px] text-ink-faint truncate">{user?.role === 'admin' ? '管理者' : 'ユーザー'}</p>
            </div>
            <button onClick={logout} title="ログアウト" className="p-1.5 rounded-lg hover:bg-danger-soft text-ink-muted hover:text-danger transition">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-ink/20 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-line px-4 py-3 flex items-center gap-3">
          <button onClick={() => setOpen((v) => !v)} className="p-2 rounded-lg hover:bg-line-soft text-ink-soft">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="font-bold text-ink">資産ダッシュボード</span>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-9 py-6 lg:py-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>

        <footer className="px-6 lg:px-9 py-5 text-center">
          <p className="text-[11px] text-ink-faint leading-relaxed max-w-3xl mx-auto">
            本アプリは情報の収集・整理・可視化・客観的分析を目的とし、投資助言を行いません。売買判断・発注はご自身で行ってください。
            収集情報の正確性は保証されません。
          </p>
        </footer>
      </div>
    </div>
  );
}
