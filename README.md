# 投資情報エージェント付き 資産ダッシュボード

個人投資家向けの Web アプリ（マルチユーザー・PWA・クラウド常時稼働対応）です。2層構成：

1. **資産ダッシュボード** — 取引・配当データを手入力 / CSV で記録し、可視化・統計します。
2. **情報エージェント** — 日本株・米国株のニュースを 1 日 1 回（毎朝）自動収集・要約・分析し、保有ポートフォリオに照らしたブリーフィングレポートを生成します。

**アカウント登録制**で、データはユーザーごとに完全分離されます（3名程度の少人数運用を想定）。毎朝のジョブはクラウド上のバックエンドで全ユーザー分が自動実行されるため、各自の PC が起動していなくても動作します。

> ⚠️ **最重要の設計原則**
> 売買判断と発注はユーザー本人が行います。本システムは情報収集・整理・可視化・客観的分析に徹し、**特定銘柄の売買推奨（投資助言）は一切行いません。** エージェントの出力は「事実整理・論点提示・リスク指摘」に限定し、断定的な売買指示を出さず、最終判断はユーザーに委ねます。

---

## アーキテクチャ

| 層 | 技術 |
|----|------|
| フロントエンド | React + TypeScript + Vite + Tailwind CSS + Recharts + lucide-react（PWA: manifest + Service Worker） |
| バックエンド | Node.js + Express + TypeScript |
| 認証 | トークン（HS256・自作の軽量 JWT）＋ scrypt パスワードハッシュ（**ネイティブ依存なし**）。ユーザー別データ分離。 |
| スケジューラ | node-cron（1 日 1 回・平日朝に**全ユーザー分**を収集＋レポート生成。時刻は環境変数・管理者設定で変更可） |
| データ保存 | SQLite（Node 24 組み込みの `node:sqlite` を使用。**ネイティブビルド不要**）。接続層は分離し Postgres へ移行可。 |
| AI | Anthropic Claude API（要約・分類・重要度付け・レポート生成・対話） |
| ニュース収集 | 無料 RSS（各社マーケットフィード）＋ Claude web search |

モノレポ構成（npm workspaces）：

```
投資アプリ/
├── backend/    Express API・SQLite・エージェント処理・スケジューラ
├── frontend/   React SPA（8 ページ）
└── package.json（ワークスペースのルート）
```

---

## 必要環境

- **Node.js 22.5 以上**（`node:sqlite` を使うため。推奨 24+）
- npm 10 以上
- **Visual Studio 等のビルドツールは不要**（ネイティブモジュールを使いません）

---

## セットアップ

```bash
# リポジトリのルート（投資アプリ/）で
npm install
```

### 環境変数（.env）

`backend/.env.example` を `backend/.env` にコピーして編集します。

```bash
cp backend/.env.example backend/.env
```

| 変数 | 説明 | 既定値 |
|------|------|--------|
| `ANTHROPIC_API_KEY` | **あなた自身の** Claude API キー。https://console.anthropic.com/ で取得。 | （空） |
| `ANTHROPIC_MODEL` | 使用モデル | `claude-opus-4-8` |
| `PORT` | API ポート | `4000` |
| `CLIENT_ORIGIN` | 許可するフロントオリジン（CORS）。カンマ区切り可。`*` で全許可（開発用）。 | `http://localhost:5173` |
| `JWT_SECRET` | **【本番必須】** トークン署名シークレット。長いランダム値（`openssl rand -base64 48`）。 | （開発用の暫定値） |
| `TOKEN_TTL_SEC` | ログイントークンの有効期限（秒） | `604800`（7日） |
| `SIGNUP_CODE` | 設定すると新規登録に招待コードを要求（公開デプロイでの無差別登録防止）。 | （空＝誰でも登録可） |
| `DB_PATH` | SQLite ファイルパス。クラウドでは永続ボリューム上（例 `/data/app.sqlite`）。 | `data/app.sqlite` |
| `DATABASE_URL` | 【将来用】PostgreSQL 接続文字列（現状は移行ポイントのみ） | （空） |
| `SERVE_STATIC` | `true` で Express が `frontend/dist` を配信（単一サービスデプロイ） | `false` |
| `NEWS_CRON` | 収集＋レポート生成の cron 式（全ユーザー対象） | `30 7 * * 1-5`（平日 7:30） |
| `CRON_TZ` | タイムゾーン | `Asia/Tokyo` |
| `ENABLE_SCHEDULER` | 起動時にスケジューラを有効化 | `true` |

> **API キーが未設定でもアプリは起動します。** その場合 AI 機能は「スタブ応答」で動作し、レポートはデータから生成される決定的なフォールバック版になります。実キーを設定すると本番の AI 分析が有効になります。
>
> **最初に登録したユーザーが管理者（admin）**になります（cron 実行時刻の変更が可能）。2人目以降は一般ユーザーです。

### 認証とデータ分離

- `/login` でアカウント登録・ログイン。データ（口座・取引・配当・ウォッチリスト・収集記事・レポート）はすべて `userId` で分離され、他ユーザーからは一切見えません。
- パスワードは scrypt でハッシュ化して保存（平文保存なし）。ログインで発行されるトークンはブラウザの localStorage に保持し、API 呼び出し時に `Authorization: Bearer` で送信します。
- 公開デプロイ時は `SIGNUP_CODE` を設定して、身内だけが登録できるようにすることを推奨します。

---

## ローカル起動

```bash
# ルートで（フロント・バックを同時起動）
npm run dev
```

- フロントエンド: http://localhost:5173
- バックエンド API: http://localhost:4000

個別に起動する場合：

```bash
npm run dev:backend    # API のみ
npm run dev:frontend   # SPA のみ
```

**新規アカウント登録時**、そのユーザーにサンプルデータが自動投入されます（空画面回避）。

### デモユーザー / サンプルデータ

- CLI：`npm run seed` … `demo@example.com` / `demo12345` を作成し、サンプルを投入（`SEED_EMAIL`・`SEED_PASSWORD` で変更可）
- アプリ内：**設定 → エクスポート/リセット** から「リセット＆サンプル投入」「全データ削除」（自分のデータのみ対象）

---

## node-cron の時刻設定

毎朝のジョブ（**全ユーザー分**のニュース収集 → ブリーフィング生成）は、常駐するバックエンドプロセス内の node-cron で実行します。常時稼働させれば、各ユーザーの PC が起動していなくても自動で動きます。

- **既定**：平日 7:30（`30 7 * * 1-5`）、タイムゾーン `Asia/Tokyo`
- **変更方法（2 通り）**
  1. アプリの **設定** 画面で時刻・曜日を選んで保存（**管理者のみ**。DB に保存され再起動後も保持）
  2. `NEWS_CRON` 環境変数を編集（DB 設定が無い場合の初期値）
- **手動実行**：サマリー画面の「**今すぐ収集・レポート生成**」ボタン、またはレポート画面の「ニュース収集 / レポート生成」（自分の分のみ）

cron 式は `分 時 日 月 曜日`。例：`0 8 * * *` = 毎日 8:00、`30 7 * * 1-5` = 平日 7:30。

---

## テスト（テスト駆動開発）

バックエンドのビジネスロジックは vitest でテスト駆動開発しています。

```bash
npm test                      # 全テスト実行（ルート）
npm run test --workspace backend
npm run test:watch --workspace backend
```

カバー範囲：金額の整数管理、CSV パース＆マッピング、ポートフォリオ集計（サマリー/推移/内訳/集中度/配当成長率）、記事の重複排除、**パスワードハッシュ／トークン署名・検証**、**ユーザー別データ分離**のリポジトリ CRUD、RSS パース、ニュース収集フロー、レポート生成、**全ユーザーループの cron ジョブ**、**認証・認可つき API 統合テスト**（計 63 テスト）。

---

## 主な機能

### 0. アカウント / マルチユーザー
- メール＋パスワードで登録・ログイン。ユーザーごとに全データを分離。
- 最初の登録者が管理者（cron 時刻の変更が可能）。`SIGNUP_CODE` で登録を制限可能。
- PWA：ホーム画面に追加でき、Service Worker がアプリシェルをキャッシュ（API はキャッシュせず常に最新）。

### A. 資産ダッシュボード
- サマリー（総評価額・元本・累計損益・損益率・当月配当・前月比）
- データ入力（取引／配当の手入力・編集・削除、CSV 取込＋カラムマッピング）
- 口座管理（複数口座・手数料率・概算手数料）
- 統計グラフ（資産推移[期間切替]・配当月次・国別/資産クラス別/銘柄別内訳・累計損益）
- エクスポート（JSON/CSV）＆リセット

### B. 情報エージェント
- 自動ニュース収集（毎朝・重複排除・AI 要約/分類/重要度付け）
- 毎朝のブリーフィングレポート（日本/米国概況・ウォッチ銘柄・ポートフォリオ論点・注目イベント・出典リンク・履歴閲覧）
- 3 つの分析：①情報収集 ②自己点検（集中リスク・偏りの客観算出）③データ分析（配当成長率・実績傾向）
- 対話エージェント（収集ニュース＋保有データを文脈に事実ベースで回答）

### C. ナレッジ
- 一任運用・ラップ口座・IFA の解説、手数料の影響、チェックリスト
- 検索＆カテゴリフィルタ付き用語集

### 安全設計
- 全エージェント出力に「投資助言ではない」旨を表示
- システムプロンプトで断定的な売買推奨を抑止、不確実性の明示、出典提示を指示
- 収集情報の正確性は保証されない旨を UI に明記

---

## データ構造

`backend/src/types.ts` に型、`backend/src/db/schema.ts` に SQLite スキーマを定義。
**金額はすべて整数（円）で保持**し、浮動小数点誤差を回避しています。
データアクセスはリポジトリ層（`backend/src/db/repositories.ts`）に分離しており、将来 PostgreSQL 等へ移行する際は DDL と SQL の差し替えで対応できます。

---

## クラウド配置（常時稼働・3名運用）

3名程度での常時稼働を想定した配置手順です。**バックエンド＋フロントを 1 サービスにまとめる**構成（最も簡単・推奨）と、**フロント/バックを分ける**構成の両方を説明します。

> ⚠️ **無料枠は一定時間アクセスがないとスリープし、その間 node-cron が動きません**（＝毎朝のジョブが実行されない）。毎朝の自動実行が必要なので、**スリープしない最小有料プラン**（Render `Starter` / Railway 従量）を前提にしてください。

### 構成 A：単一サービス（推奨・最短）

Express が API と `frontend/dist`（PWA）の両方を配信します。`SERVE_STATIC=true` を使用。CORS はフロントとバックが同一オリジンになるため実質不要です。

#### A-1. Render（Blueprint 同梱：`render.yaml`）

1. リポジトリを GitHub に push。
2. Render ダッシュボード → **New → Blueprint** → このリポジトリを選択（`render.yaml` を自動検出）。
3. デプロイ前に環境変数を設定（`render.yaml` で `sync:false` のもの）：
   - `ANTHROPIC_API_KEY`：あなたの Claude API キー
   - `JWT_SECRET`：`generateValue:true` で Render が自動生成（手動でも可）
   - `SIGNUP_CODE`：身内だけ登録できるよう任意のコード（推奨）
   - `CLIENT_ORIGIN`：自分の公開 URL（例 `https://asset-dashboard.onrender.com`）
4. **Disk**（永続ディスク）が `render.yaml` で `/data` にマウントされ、`DB_PATH=/data/app.sqlite`。**再デプロイしても SQLite は消えません。**
5. デプロイ完了後、公開 URL を開き `/login` から最初のユーザーを登録（= 管理者）。

#### A-2. Railway（`Dockerfile` + `railway.json` 同梱）

1. リポジトリを GitHub に push。
2. Railway → **New Project → Deploy from GitHub repo** → このリポジトリ。`railway.json` により Dockerfile ビルドになります。
3. **Variables** に環境変数を設定：`ANTHROPIC_API_KEY` / `JWT_SECRET`（長いランダム値） / `SIGNUP_CODE` / `CLIENT_ORIGIN`（公開 URL）。`SERVE_STATIC=true`・`DB_PATH=/data/app.sqlite`・`ENABLE_SCHEDULER=true` は Dockerfile に既定済み。
4. **Volume** を追加し、**Mount path を `/data`** に設定（Railway は Dockerfile の `VOLUME` 命令に非対応のため、必ずダッシュボードの Volume 機能で作成します。`DB_PATH=/data/app.sqlite` がここを指すので**再デプロイしても SQLite は消えません**）。
5. 生成された公開ドメインを開き、`/login` から登録。

> 💡 **ビルドが「Could not find a declaration file for module 'express'」等で失敗する場合**：`NODE_ENV=production` により devDependencies（型定義・tsc）が入っていないのが原因です。本リポジトリでは Render は `npm install --include=dev`（`render.yaml`）、Railway は Dockerfile の `npm install --include=dev` で解決済みです。Render で Blueprint を使わず手動設定する場合は、Build Command を `npm install --include=dev && npm run build` にしてください。

### 構成 B：フロントとバックを分ける

- **バックエンド**：Render/Railway に上記同様デプロイ（ただし `SERVE_STATIC=false`）。`CLIENT_ORIGIN` にフロントの URL を設定（カンマ区切りで複数可）。これにより **その URL からのみ API を許可**（CORS）。
- **フロントエンド**：Vercel / Netlify / Cloudflare Pages に配信。
  - ビルド設定：`npm install && npm --workspace frontend run build`、出力ディレクトリ `frontend/dist`
  - 環境変数 `VITE_API_BASE_URL` に **バックエンドの公開 URL**（例 `https://asset-dashboard-api.onrender.com`）を設定。フロントはこの URL の `/api` を呼びます。
  - SPA フォールバック：Netlify は `/* /index.html 200`、Vercel は rewrites を設定（PWA のルーティング用）。

### HTTPS

Render / Railway / Vercel / Netlify いずれも標準で HTTPS（TLS 証明書の自動発行）です。追加設定は不要です。

### ヘルスチェック / スリープ対策

- `GET /api/health` が稼働確認用エンドポイント（認証不要）。AI 接続状況・スケジューラ稼働・cron 式・登録ユーザー数を返します。
  ```bash
  curl https://<あなたのドメイン>/api/health
  ```
- Render/Railway のヘルスチェックパスに `/api/health` を設定済み（`render.yaml` / `railway.json`）。
- **スリープ回避**：基本は有料プランで常時稼働。無料枠を使う場合は外部の死活監視（UptimeRobot 等）から `/api/health` を 5〜10 分間隔で叩いて起こし続ける手もありますが、cron の確実性を考えると**有料プラン推奨**です。

### cron が毎朝動いたかの確認（ログの見方）

ジョブは標準出力にログを残します。Render は **Logs** タブ、Railway は **Deployments → View Logs** で確認できます。次のような行が毎朝出ます：

```
[cron] 2026-06-19T07:30:00.123Z 毎朝ジョブ開始（対象 3 ユーザー）
[cron]   user#1 taro@example.com: 新規記事 8 件 / レポート #42
[cron]   user#2 hanako@example.com: 新規記事 5 件 / レポート #43
[cron]   user#3 ...: 失敗 - <エラー内容>    ← 失敗時はこの行（他ユーザーは続行）
[cron] 毎朝ジョブ完了: 合計 13 件収集 / 成功 3/3
```

- 起動時ログに `スケジューラ: 有効 "30 7 * * 1-5" (Asia/Tokyo)` が出ていれば登録済み。
- アプリの **設定** 画面でも、スケジューラの稼働状態と現在の cron 式を確認できます。
- すぐ動作確認したいときは、ログイン後にサマリー画面の「今すぐ収集・レポート生成」を押す（自分の分が即実行され、結果がログに出ます）。

### 無料枠 vs 有料枠の注意

| | 無料枠 | 最小有料枠 |
|--|--------|-----------|
| スリープ | あり（cron が止まる） | なし（常時稼働） |
| 永続ディスク | 不可なことが多い（再デプロイで SQLite 消失） | 可（`/data` に保持） |
| 毎朝ジョブ | **動かない恐れ** | 確実に動く |
| 推奨 | 動作確認のみ | **本番運用はこちら** |

毎朝の自動実行と SQLite の永続化が要件なので、**有料の最小プラン**（Render Starter は月数ドル程度〜、Railway は使用量従量）を選んでください。

### 想定コスト感とコスト削減のヒント

- **ホスティング**：Render Starter で概ね月 $7 前後／Railway は使用量次第で月 $5〜。永続ディスク 1GB は十分（SQLite は小さい）。
- **Claude API（従量）**：毎朝のジョブ 1 回で「ニュース分類 1 リクエスト＋レポート生成 1 リクエスト」×ユーザー数。3 名・平日のみなら 1 日最大 6 リクエスト程度。費用は使用モデルと入出力トークン量に依存します（最新の料金は Anthropic の料金ページを参照）。
- **コストを抑えるヒント**：
  - **ウォッチリストを絞る**（収集・分類対象が減り、トークン消費が下がる）。
  - 実行頻度を平日のみ・1 日 1 回に保つ（`NEWS_CRON`）。
  - 必要十分なモデルを選ぶ（`ANTHROPIC_MODEL`）。要約中心なら軽量モデルでコスト減。
  - 手動の「今すぐ実行」を多用しない。
  - API キー未設定でもアプリは動作（スタブ）するため、まずは無料で UI を確認してから課金を始められます。

### PostgreSQL への移行（3名を超えて拡張する場合）

SQLite で十分な規模ですが、同時利用が増える場合は Postgres へ。移行ポイントは `backend/src/db/repositories.ts` 冒頭のコメントに明記しています：環境変数 `DATABASE_URL` を見て接続を切替え、各 SQL を pg 用（`$1` プレースホルダ・非同期）に置換します。**全クエリが既に `userId` でスコープ済み**なので、分離ロジックの作り直しは不要です。

---

## ライセンス / 免責

本アプリは一般的な情報提供を目的とし、投資助言を行いません。収集情報の正確性は保証されません。実際の投資判断はご自身の責任で、必要に応じて専門家にご相談ください。
