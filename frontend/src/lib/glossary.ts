export type GlossaryCategory = '基礎' | '商品・口座' | '指標' | 'リスク・コスト' | '制度・税';

export interface GlossaryTerm {
  term: string;
  def: string;
  category: GlossaryCategory;
}

export const GLOSSARY: GlossaryTerm[] = [
  // 基礎
  { term: 'ポートフォリオ', def: '保有資産の組み合わせ全体。', category: '基礎' },
  { term: '分散投資', def: '資産・地域・時間を分けてリスクを抑える考え方。', category: '基礎' },
  { term: 'アセットアロケーション', def: '株・債券・現金等への資産配分。', category: '基礎' },
  { term: 'リバランス', def: '値動きで崩れた配分を元の比率に戻す調整。', category: '基礎' },
  { term: 'ドルコスト平均法', def: '一定額を定期的に投資し取得単価を平準化する手法。', category: '基礎' },
  { term: '複利', def: '利益が元本に組み入れられ利益が利益を生む効果。', category: '基礎' },
  // 商品・口座
  { term: '株式（現物）', def: '企業の所有権の一部。値上がり益と配当が期待できる。', category: '商品・口座' },
  { term: '投資信託', def: '資金をまとめ専門家が運用する商品。', category: '商品・口座' },
  { term: 'ETF', def: '取引所に上場し株のように売買できる投資信託。', category: '商品・口座' },
  { term: '債券', def: '国や企業への貸付。利息と満期償還が基本。', category: '商品・口座' },
  { term: 'REIT', def: '不動産に投資し賃料収入等を分配する商品。', category: '商品・口座' },
  { term: 'NISA', def: '日本の少額投資非課税制度。一定枠の利益が非課税。', category: '商品・口座' },
  { term: 'iDeCo', def: '私的年金制度。掛金が所得控除になる等の税制優遇。', category: '商品・口座' },
  { term: '特定口座／一般口座', def: '税計算の方式が異なる証券口座の種類。', category: '商品・口座' },
  // 指標
  { term: '配当利回り', def: '株価に対する年間配当の割合。', category: '指標' },
  { term: 'PER（株価収益率）', def: '株価が利益の何倍かを示す割安・割高の目安。', category: '指標' },
  { term: 'PBR（株価純資産倍率）', def: '株価が純資産の何倍かを示す指標。', category: '指標' },
  { term: 'ROE（自己資本利益率）', def: '自己資本に対する利益率。資本効率の指標。', category: '指標' },
  { term: '時価総額', def: '株価×発行株数。企業規模の目安。', category: '指標' },
  { term: 'ベンチマーク', def: '運用成績を比較する基準指数（例：TOPIX、S&P500）。', category: '指標' },
  // リスク・コスト
  { term: 'ボラティリティ', def: '価格変動の大きさ。', category: 'リスク・コスト' },
  { term: '信託報酬', def: '投資信託の保有中にかかる運用管理費用。', category: 'リスク・コスト' },
  { term: 'スプレッド', def: '売値と買値の差。実質的な取引コスト。', category: 'リスク・コスト' },
  { term: '為替リスク', def: '外貨建て資産で為替変動により損益が生じるリスク。', category: 'リスク・コスト' },
  { term: 'カントリーリスク', def: '投資先国の政治・経済情勢に伴うリスク。', category: 'リスク・コスト' },
  { term: '流動性リスク', def: '売りたい時に売れない／不利な価格になるリスク。', category: 'リスク・コスト' },
  { term: '元本割れ', def: '投資額を下回ること。', category: 'リスク・コスト' },
  // 制度・税
  { term: '譲渡益課税', def: '売却益にかかる税金（日本では通常20.315%）。', category: '制度・税' },
  { term: '配当課税', def: '配当に対する課税。', category: '制度・税' },
  { term: '損益通算', def: '利益と損失を相殺して課税対象を圧縮する仕組み。', category: '制度・税' },
  { term: '繰越控除', def: 'その年で引ききれない損失を翌年以降に繰り越す制度。', category: '制度・税' },
];

export const GLOSSARY_CATEGORIES: GlossaryCategory[] = ['基礎', '商品・口座', '指標', 'リスク・コスト', '制度・税'];
