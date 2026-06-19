import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Mail, Lock, User, KeyRound, ArrowRight } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Spinner } from '../components/ui';

export default function LoginPage() {
  const { user, login, register } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [signupCode, setSignupCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) nav('/', { replace: true });
  }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, name || undefined, signupCode || undefined);
      nav('/', { replace: true });
    } catch (err: any) {
      setError(err.message ?? 'エラーが発生しました');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        {/* ブランド */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-accent-gradient flex items-center justify-center shadow-kpi mb-3">
            <TrendingUp size={28} className="text-white" strokeWidth={2.4} />
          </div>
          <h1 className="text-xl font-extrabold text-ink tracking-tightish">資産ダッシュボード</h1>
          <p className="text-sm text-ink-muted mt-1">投資情報エージェント</p>
        </div>

        <div className="card p-7">
          <div className="inline-flex w-full p-1 rounded-xl bg-line-soft mb-6">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`btn flex-1 py-2 text-sm ${mode === m ? 'bg-white text-accent shadow-soft' : 'text-ink-muted'}`}
              >
                {m === 'login' ? 'ログイン' : '新規登録'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <Field icon={User} label="表示名（任意）">
                <input className="input pl-10" placeholder="例: 太郎" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
            )}
            <Field icon={Mail} label="メールアドレス">
              <input type="email" required className="input pl-10" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field icon={Lock} label="パスワード">
              <input type="password" required minLength={8} className="input pl-10" placeholder="8文字以上" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            {mode === 'register' && (
              <Field icon={KeyRound} label="招待コード（設定されている場合）">
                <input className="input pl-10" placeholder="管理者から共有されたコード" value={signupCode} onChange={(e) => setSignupCode(e.target.value)} />
              </Field>
            )}

            {error && <div className="rounded-xl bg-danger-soft text-danger text-sm px-3.5 py-2.5">{error}</div>}

            <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
              {busy ? <Spinner /> : <>{mode === 'login' ? 'ログイン' : 'アカウント作成'} <ArrowRight size={16} /></>}
            </button>
          </form>
        </div>

        <p className="text-[11px] text-ink-faint text-center mt-5 leading-relaxed px-4">
          本アプリは情報の収集・整理・客観的分析を目的とし、投資助言を行いません。データはアカウントごとに分離して保存されます。
        </p>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        {children}
      </div>
    </div>
  );
}
