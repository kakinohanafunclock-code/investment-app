import { type ReactNode } from 'react';
import { Info, X } from 'lucide-react';

export function Card({ children, className = '', hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
  return <div className={`card ${hover ? 'card-hover' : ''} ${className}`}>{children}</div>;
}

export function SectionTitle({ icon: Icon, children, action }: { icon?: any; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="section-title">
        {Icon && <Icon size={18} className="text-accent" strokeWidth={2.2} />}
        {children}
      </h2>
      {action}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function EmptyState({ icon: Icon, title, desc, action }: { icon: any; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-14 h-14 rounded-2xl bg-accent-soft flex items-center justify-center mb-4">
        <Icon size={26} className="text-accent" strokeWidth={1.8} />
      </div>
      <p className="text-[15px] font-bold text-ink">{title}</p>
      {desc && <p className="text-sm text-ink-muted mt-1.5 max-w-sm leading-relaxed">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'accent' | 'success' | 'danger' | 'warn'; children: ReactNode }) {
  const map: Record<string, string> = {
    neutral: 'bg-line-soft text-ink-soft',
    accent: 'bg-accent-soft text-accent',
    success: 'bg-success-soft text-success',
    danger: 'bg-danger-soft text-danger',
    warn: 'bg-warn-soft text-warn',
  };
  return <span className={`chip ${map[tone]}`}>{children}</span>;
}

/** 全エージェント出力に添える免責バナー（安全設計の必須要件） */
export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex gap-2.5 rounded-xl bg-warn-soft/70 border border-warn/20 text-warn ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
      <Info size={compact ? 15 : 17} className="shrink-0 mt-0.5" strokeWidth={2} />
      <p className={`${compact ? 'text-[11px]' : 'text-xs'} leading-relaxed text-warn/90`}>
        本内容は情報の収集・整理・客観的分析であり、<b>投資助言ではありません</b>。特定銘柄の売買を推奨するものではなく、
        収集情報の正確性も保証されません。最終的な投資判断はご自身の責任で行ってください。
      </p>
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" />
      <div
        className="relative card w-full max-w-lg p-6 animate-[fadeIn_.15s_ease]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-line-soft text-ink-muted transition">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent"
      style={{ width: size, height: size }}
    />
  );
}
