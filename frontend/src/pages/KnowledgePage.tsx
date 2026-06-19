import { useMemo, useState } from 'react';
import {
  BookOpen, Search, Briefcase, Layers, UserCheck, GitCompareArrows, TrendingDown, ListChecks, ShieldAlert,
} from 'lucide-react';
import { Card, SectionTitle, Badge } from '../components/ui';
import { GLOSSARY, GLOSSARY_CATEGORIES, type GlossaryCategory } from '../lib/glossary';

export default function KnowledgePage() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<GlossaryCategory | 'all'>('all');

  const filtered = useMemo(
    () =>
      GLOSSARY.filter((g) => {
        if (cat !== 'all' && g.category !== cat) return false;
        if (q && !`${g.term} ${g.def}`.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [q, cat],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink tracking-tightish">ナレッジ</h1>
        <p className="text-sm text-ink-muted mt-1">一任運用・ラップ口座・IFA の仕組みと、投資・資産運用の用語集</p>
      </div>

      {/* 解説セクション */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Explainer icon={Briefcase} title="一任運用とは">
          投資家が運用の判断（銘柄選定・売買・配分変更）を専門業者に任せる契約形態。投資家はリスク許容度や方針を最初に設定し、以後の個別判断は業者が行う。メリットは手間がかからないこと、専門家の運用を受けられること。デメリットは手数料がかかること、運用成果が保証されないこと。
        </Explainer>
        <Explainer icon={Layers} title="ラップ口座とは">
          証券会社・銀行が提供する一任運用サービスの一形態。「ラップ（wrap）」は売買手数料や運用報酬などを“包んで”一つの料率にまとめる意味。投資家のリスク許容度に応じてポートフォリオを組み、リバランスまで自動で行う。費用は一般に年率1〜2%程度（投資顧問料＋信託報酬等）。最低投資金額が設定されていることが多い。
        </Explainer>
        <Explainer icon={UserCheck} title="IFA（独立系ファイナンシャルアドバイザー）とは">
          特定の金融機関に属さず、中立的な立場で資産設計や商品提案を行うアドバイザー。証券会社と業務提携し、顧客の口座開設・商品選定をサポートする。販売手数料や残高に応じた報酬を受け取るモデルが多い。「独立系」でも提携先の制約や報酬構造があるため、誰の利益で動く報酬体系かを確認することが重要。
        </Explainer>
        <Explainer icon={GitCompareArrows} title="ラップ口座 vs IFA の比較">
          <ul className="space-y-2">
            <li className="flex gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" /><span><b className="text-ink">ラップ口座：</b>パッケージ化された一任運用。設定後はほぼ放置可能。料率は分かりやすいが高め。</span></li>
            <li className="flex gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" /><span><b className="text-ink">IFA：</b>人によるアドバイス＋商品提案。担当者の質に左右される。一任ではなく助言型の場合、最終判断は本人。</span></li>
          </ul>
        </Explainer>
        <Explainer icon={TrendingDown} title="手数料がリターンに与える影響">
          年率1〜2%の手数料は、長期では複利で大きな差になる。例えば年利回り5%でも手数料2%なら実質3%。コストは必ず「リターンから引かれる固定の逆風」として意識する。
        </Explainer>
        <Explainer icon={ListChecks} title="確認すべきチェックリスト">
          <ul className="space-y-1.5 text-sm">
            {[
              '手数料の総額（投資顧問料・信託報酬・売買コストの合計）',
              '過去の運用実績（ただし将来を保証しない）',
              '解約条件と途中解約コスト',
              '担当者/業者の報酬構造（利益相反の有無）',
              '最低投資金額・運用方針の変更可否',
            ].map((t) => (
              <li key={t} className="flex gap-2 text-ink-soft"><span className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 shrink-0" />{t}</li>
            ))}
          </ul>
        </Explainer>
      </div>

      {/* 用語集 */}
      <Card className="p-5 lg:p-6">
        <SectionTitle icon={BookOpen}>用語集</SectionTitle>
        <div className="flex flex-wrap gap-3 items-center mb-5">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input className="input pl-9" placeholder="用語を検索…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={cat === 'all'} onClick={() => setCat('all')}>すべて</FilterChip>
            {GLOSSARY_CATEGORIES.map((c) => (
              <FilterChip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</FilterChip>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-ink-muted py-8 text-center">該当する用語が見つかりませんでした。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((g) => (
              <div key={g.term} className="rounded-xl border border-line-soft hover:border-accent/30 hover:shadow-soft transition px-4 py-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="font-bold text-ink text-sm">{g.term}</p>
                  <Badge tone="accent">{g.category}</Badge>
                </div>
                <p className="text-sm text-ink-muted leading-relaxed">{g.def}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 免責 */}
      <Card className="p-5 bg-warn-soft/40 border-warn/20">
        <div className="flex gap-3">
          <ShieldAlert size={20} className="text-warn shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-ink text-sm mb-1">免責</p>
            <p className="text-xs text-ink-soft leading-relaxed">
              本ページ（解説・用語集を含む）は一般的な情報提供であり、特定の商品・契約を推奨するものではない。実際の契約・投資判断は、複数社を比較し、各社の正式な書面（契約締結前交付書面等）を確認のうえ、必要に応じて専門家に相談すること。
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Explainer({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 lg:p-6" hover>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
          <Icon size={20} strokeWidth={2.1} />
        </div>
        <h3 className="font-bold text-ink text-[15px]">{title}</h3>
      </div>
      <div className="text-sm text-ink-soft leading-relaxed">{children}</div>
    </Card>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`chip transition ${active ? 'bg-accent text-white' : 'bg-line-soft text-ink-soft hover:bg-line'}`}>
      {children}
    </button>
  );
}
