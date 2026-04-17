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

## 注意事項

- `.env.local` は絶対にGitHubにコミットしない（`.gitignore` に含まれているが要確認）
- Google Sheets JSONキーファイル（`*.json`）もGitHubにコミットしない
- APIキーが漏洩した場合はすぐに無効化して再発行する
