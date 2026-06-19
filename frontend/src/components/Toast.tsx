import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

type Tone = 'success' | 'error' | 'info';
interface Toast { id: number; tone: Tone; msg: string }

const Ctx = createContext<(msg: string, tone?: Tone) => void>(() => {});
export const useToast = () => useContext(Ctx);

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((msg: string, tone: Tone = 'success') => {
    const id = ++counter;
    setToasts((t) => [...t, { id, tone, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const icon = { success: CheckCircle2, error: AlertCircle, info: Info };
  const tone = {
    success: 'border-success/30 text-success',
    error: 'border-danger/30 text-danger',
    info: 'border-accent/30 text-accent',
  };

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2.5 w-[min(92vw,360px)]">
        {toasts.map((t) => {
          const Icon = icon[t.tone];
          return (
            <div
              key={t.id}
              className={`card ${tone[t.tone]} flex items-start gap-2.5 px-4 py-3 shadow-card-hover animate-[slideIn_.2s_ease]`}
            >
              <Icon size={18} className="shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-ink leading-snug">{t.msg}</p>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
