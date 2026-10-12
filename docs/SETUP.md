# 環境構築手順書

## 前提

- Node.js 18以上がインストール済み
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

本番とデモは同じ main から同時にデプロイされる。push 1 回で両方が更新されるので、「デモで試してから本番」はできない。デモと本番の違いは環境変数だけ（シート、パスワード、`NEXT_PUBLIC_APP_ENV=demo` のバナー）。

### PR の確認手順

1. ブランチを push して PR を作る。Vercel が本番用とデモ用のプレビューを 1 つずつ作る
2. 確認は **デモ用プレビュー** で行う。PR の Vercel ボットコメントにある food-inventory-demo 側の「Visit Preview」を開く
3. Vercel にログインする（Deployment Protection のため。固定 URL は対象外）。ログインできない端末では、Vercel の共有リンクを発行して開く
4. アプリのログインはデモのパスワードを使う
5. 動作を確認したら PR をマージする。main が本番とデモに自動デプロイされる

### 環境変数の適用範囲

- デモプロジェクト: 全変数を Production と Preview の両方に適用する。プレビューはデモのシートとデモの鍵で動く
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
- 各テスト後の DOM の片付けは `vitest.setup.ts` が行い、モックは `restoreMocks: true` で自動復元される。設定は `vitest.config.mts`
- CI（`.github/workflows/ci.yml`）は `npm ci` → `npm test` → `npx tsc --noEmit` → `npm run lint` を順に実行する。docs だけの変更では動かない

---

## 注意事項

- `.env.local` は絶対にGitHubにコミットしない（`.gitignore` に含まれているが要確認）
- Google Sheets JSONキーファイル（`*.json`）もGitHubにコミットしない
- APIキーが漏洩した場合はすぐに無効化して再発行する
