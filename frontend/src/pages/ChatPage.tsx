import { useEffect, useRef, useState } from 'react';
import { Send, MessagesSquare, Bot, User, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import type { ChatMessage } from '../lib/types';
import { Card, Disclaimer, Spinner } from '../components/ui';
import { Markdown } from '../components/Markdown';

const SUGGESTIONS = [
  '今のポートフォリオの国別比率は？',
  '直近で重要度の高いニュースを整理して',
  '配当の傾向を教えて',
  '私の保有はどんなリスクに偏っている？',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const next = [...messages, { role: 'user' as const, content: text.trim() }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const { answer } = await api.chat(next);
      setMessages([...next, { role: 'assistant', content: answer }]);
    } catch (e: any) {
      setMessages([...next, { role: 'assistant', content: `エラー: ${e.message}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 h-full flex flex-col">
      <div>
        <h1 className="text-2xl font-extrabold text-ink tracking-tightish">対話エージェント</h1>
        <p className="text-sm text-ink-muted mt-1">収集済みニュースと保有データの「事実」をもとに、中立的に整理して回答します</p>
      </div>

      <Card className="flex-1 flex flex-col min-h-[60vh] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 lg:p-6 space-y-5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-accent-gradient flex items-center justify-center shadow-kpi mb-4">
                <MessagesSquare size={26} className="text-white" />
              </div>
              <p className="text-[15px] font-bold text-ink">質問してみましょう</p>
              <p className="text-sm text-ink-muted mt-1.5 max-w-md leading-relaxed">
                事実ベースの整理に徹し、特定銘柄の売買推奨は行いません。不確実な点は不確実と明示します。
              </p>
              <div className="grid sm:grid-cols-2 gap-2 mt-6 w-full max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)}
                    className="text-left text-sm rounded-xl border border-line hover:border-accent/40 hover:bg-accent-soft/40 transition px-4 py-3 text-ink-soft flex items-center gap-2">
                    <Sparkles size={14} className="text-accent shrink-0" /> {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-accent text-white' : 'bg-accent-soft text-accent'}`}>
                  {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${m.role === 'user' ? 'bg-accent text-white' : 'bg-page border border-line-soft'}`}>
                  {m.role === 'user' ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p> : <Markdown text={m.content} />}
                </div>
              </div>
            ))
          )}
          {busy && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-accent-soft text-accent flex items-center justify-center"><Bot size={16} /></div>
              <div className="bg-page border border-line-soft rounded-2xl px-4 py-3 flex items-center gap-2 text-ink-muted text-sm"><Spinner /> 整理しています…</div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-line-soft p-3.5 bg-white">
          <div className="flex gap-2 items-end">
            <textarea
              className="input resize-none h-12 py-3"
              placeholder="質問を入力（Enter で送信、Shift+Enter で改行）"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
            />
            <button className="btn-primary h-12 px-4" onClick={() => send(input)} disabled={busy || !input.trim()}>
              <Send size={16} />
            </button>
          </div>
        </div>
      </Card>

      <Disclaimer compact />
    </div>
  );
}
