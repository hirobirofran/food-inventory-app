# 環境構築手順書

## 前提

- Node.js 24 がインストール済み（24.15 以上。`.nvmrc` と package.json の `engines.node` で指定。jsdom が 24.15 以上を要求する）
- Gitがインストール済み
- Googleアカウントを持っている

---

## 1. 開発環境の起動

```bash
# リポジトリのクローン（GitHubに上げた後）
git clone <リポジトリURL>
cd food-inventory-app

# 依存パッケージのインストール
npm install

# 開発サーバー起動
npm run dev
```

ブラウザで http://localhost:3000 を開く。

ローカル（http://localhost:3000）では Google ログインの戻り先を登録していないので、ログインは通らない（Issue #77 の決定。ログイン回避も作らない）。動作確認は PR の確認用サイト（5 章）で行う。

---

## 2. Google Sheets API の設定（未実施）

### 2-1. Google Cloud Console でプロジェクト作成

1. https://console.cloud.google.com/ を開く
2. 「新しいプロジェクト」を作成（名前例: `food-inventory`）
3. 作成したプロジェクトを選択

### 2-2. Google Sheets API を有効化

1. 「APIとサービス」→「ライブラリ」を開く
2. "Google Sheets API" を検索して有効化
3. "Google Drive API" も同様に有効化

### 2-3. サービスアカウントの作成

1. 「APIとサービス」→「認証情報」を開く
2. 「認証情報を作成」→「サービスアカウント」
3. 名前を入力して作成（ロールは「編集者」）
4. 作成したサービスアカウントをクリック
5. 「キー」タブ→「キーを追加」→「JSONキーを作成」
6. JSONファイルがダウンロードされる（**このファイルは厳重に管理。GitHubにアップしない**）

### 2-4. スプレッドシートの準備

1. Google スプレッドシートで新規作成
2. シート名を `inventory` に変更
3. 1行目にヘッダーを追加:
   ```
   id | name | category | quantity | unit | expiryDate | storageLocation | minQuantity | note
   ```
4. スプレッドシートをサービスアカウントのメールアドレスと共有（編集権限）
   - サービスアカウントのメール: `xxx@food-inventory.iam.gserviceaccount.com`
5. スプレッドシートIDをURLから取得
   - URL: `https://docs.google.com/spreadsheets/d/【ここがID】/edit`

### 2-5. 環境変数の設定

プロジェクトルートに `.env.local` を作成（**Gitにコミットしない**）:

```env
# Google Sheets
GOOGLE_SPREADSHEET_ID=（スプレッドシートID）
GOOGLE_SERVICE_ACCOUNT_EMAIL=（サービスアカウントのメール）
GOOGLE_PRIVATE_KEY=（JSONキーの private_key フィールドの値）

# Claude API
ANTHROPIC_API_KEY=（AnthropicのAPIキー）
```

---

## 3. Claude API キーの取得（未実施）

1. https://console.anthropic.com/ でアカウント作成
2. 「API Keys」→「Create Key」
3. 取得したキーを `.env.local` の `ANTHROPIC_API_KEY` に設定

---

## 4. Vercel へのデプロイ（未実施）

```bash
# Vercel CLIのインストール
npm install -g vercel

# デプロイ
vercel
```

Vercelのダッシュボードで環境変数（`.env.local` の内容）を設定すること。

---

## 5. デプロイと確認の運用

### 環境の定義

| 名前 | Vercel プロジェクト | 固定 URL | 乗るコード | データ |
|---|---|---|---|---|
| 本番 | food-inventory-app | food-inventory-app-nu.vercel.app | main | 本番シート |
| デモ | food-inventory-demo | food-inventory-demo.vercel.app | main | デモシート（`npm run seed:demo` で入れ直せる） |
| プレビュー | 両プロジェクトに自動生成 | PR ごとの一時 URL | PR のブランチ | デモ用だけ動く（下記） |

本番とデモは同じ main から同時にデプロイされる。push 1 回で両方が更新されるので、「デモで試してから本番」はできない。デモと本番の違いは環境変数だけ（シート、許可リスト、`NEXT_PUBLIC_APP_ENV=demo` のバナー）。

### PR の確認手順

1. ブランチを push して PR を作る。Vercel が本番用とデモ用のプレビューを 1 つずつ作る
2. 確認は **デモ用プレビュー** で行う。PR の Vercel ボットコメントにある food-inventory-demo 側の「Visit Preview」を開く
3. Vercel にログインする（Deployment Protection のため。固定 URL は対象外）。ログインできない端末では、Vercel の共有リンクを発行して開く
4. アプリのログインは、デモの許可リスト（`AUTH_ALLOWED_EMAILS`）にある Google アカウントで行う
5. 動作を確認したら PR をマージする。main が本番とデモに自動デプロイされる

### 環境変数の適用範囲

- デモプロジェクト: 全変数を Production と Preview の両方に適用する。プレビューはデモのシートとデモの鍵で動く
- デモプロジェクトの `AUTH_REDIRECT_PROXY_URL` と `AUTH_SECRET` の扱いは 7 章の 4 を参照
- 本番プロジェクト: Production のみ。本番用プレビューは意図的に動かさない（本番データに触らせないため）。確認には使わない
- 変数を変えても、反映されるのは新しいデプロイだけ。既存のプレビューはダッシュボードから Redeploy する
- 値はダッシュボードで直接入力する。チャットや CLI の引数に貼らない

### 本番だけ戻したいとき

main に push すると両方に出る。本番だけ前の状態に戻すときは、Vercel ダッシュボードの Deployments で前のデプロイを Rollback する。

## 6. テスト

```bash
npm test      # vitest を一度だけ実行（CI と同じ）
npx vitest    # 変更を監視して再実行
```

- 純粋関数のテストは `src/lib/*.test.ts`（Node 環境で動く）
- コンポーネントのテストは `src/components/*.test.tsx`。先頭に `// @vitest-environment jsdom` を書くと jsdom に描画して操作できる（`@testing-library/react`）。例: `src/components/FoodFormModal.test.tsx`
- API ルートのテストは `src/app/api/**/route.test.ts`（Node 環境）。外部 SDK は `vi.mock` で差し替え、参照する `vi.fn()` は `vi.hoisted` で先に作る。時間に依存する処理は `vi.useFakeTimers()` と `vi.advanceTimersByTimeAsync()` で進める。例: `src/app/api/ai/suggest/route.test.ts`
- 各テスト後の DOM の片付けは `vitest.setup.ts` が行い、`vi.spyOn` のモックは `restoreMocks: true` で自動復元される（`vi.fn()` に与えた実装は戻らないので `beforeEach` で `mockReset()` する）。設定は `vitest.config.mts`
- CI（`.github/workflows/ci.yml`）は `npm ci` → `npm test` → `npx tsc --noEmit` → `npm run lint` を順に実行する。docs だけの変更では動かない

---

## 7. Google アカウントログインの設定

コード側（Auth.js）は実装済み。以下はすべて設定で、オーナーが行う。

1. （Google Cloud コンソール）Sheets 用の既存プロジェクトで、OAuth 同意画面を「外部」、公開ステータスを Testing のままにする。スコープは足さない（openid / email / profile のみ）。この組み合わせはテストユーザーの登録が要らず、7 日で失効もしない（出典: https://support.google.com/cloud/answer/15549945 ）
2. （Google Cloud コンソール）OAuth クライアント ID（種類は「ウェブ アプリケーション」）を作り、承認済みのリダイレクト URI に次の 2 つを登録する。完全一致で、ワイルドカードは使えない。localhost は登録しない（出典: https://developers.google.com/identity/protocols/oauth2/web-server ）
   - `https://<本番の固定 URL>/api/auth/callback/google`
   - `https://<デモの固定 URL>/api/auth/callback/google`
3. （Vercel ダッシュボード）環境変数 4 つ（`AUTH_SECRET`、`AUTH_GOOGLE_ID`、`AUTH_GOOGLE_SECRET`、`AUTH_ALLOWED_EMAILS`）を Vercel のダッシュボードから Secret で入れる。`AUTH_ALLOWED_EMAILS` は、Google アカウントに表示されるアドレスをそのまま、半角カンマ区切りで書く（大小文字は区別しない。未設定・空なら全員拒否）。本番は Production、デモは Production と Preview に入れる（ここまではマージ前）
4. （Vercel ダッシュボード、マージ後）**初回は PR #78 のマージ後に入れる**（先に入れると、この PR の確認用サイトが Google の戻り先を旧コードのデモ固定 URL にしてしまい、確認できない）。デモプロジェクトの Production と Preview の両方に `AUTH_REDIRECT_PROXY_URL=https://<デモの固定 URL>/api/auth` を入れる（転送する側＝固定 URL にも要る）。`AUTH_SECRET` は両方で同じ値にする。これで確認用サイト（プレビュー）はデモの固定 URL 経由で戻る（Auth.js の redirectProxyUrl。出典: https://authjs.dev/getting-started/deployment ）ので、PR ごとのブランチ URL を Google に登録する必要は無い
5. 補足: ログイン状態は最後に使ってから 30 日続く（使うたびに延びる。Auth.js の既定）。ログアウト画面は作っていない（Auth.js 組み込みの `/api/auth/signout` は使える）。許可リストに無いアカウントは `/api/auth/error?error=AccessDenied` に出る。許可リストから外した人は、次のリクエストからログアウトされる。`AUTH_ALLOWED_EMAILS` を空にすると全員が即ログアウトになる（Vercel の変数変更は Redeploy 後に効く）

---

## 注意事項

- `.env.local` は絶対にGitHubにコミットしない（`.gitignore` に含まれているが要確認）
- Google Sheets JSONキーファイル（`*.json`）もGitHubにコミットしない
- APIキーが漏洩した場合はすぐに無効化して再発行する
