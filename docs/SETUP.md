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

ローカル（`npm run dev`）では Google ログインを使えない。戻り先の URL に localhost を登録していないためで、ログインを省く仕組みも用意していない。そのため、ローカルではどの画面も開けない。確かめられるのは `npm test`・`npx tsc --noEmit`・`npm run lint` まで。画面の確認は PR の確認用サイトで行う（5 章「PR の確認手順」）。

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
- デモプロジェクトの `AUTH_REDIRECT_PROXY_URL` と `AUTH_SECRET` の入れ方は 7 章「Vercel に環境変数を入れる」を参照
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

## 7. Google アカウントでのログイン

このアプリは、許可リストに載せた Google アカウントだけがログインできる（Auth.js）。設定する場所は Google Cloud と Vercel の 2 か所。ローカルではログインできない（1 章）。

### 7-1. Google Cloud で OAuth クライアントを作る

1. https://console.cloud.google.com/ で 2-1 のプロジェクトを選ぶ
2. 「Google Auth Platform」を開く
3. 未登録なら「開始」〈要確認〉を押し、アプリ名とサポート用メールを入れて登録する〈要確認: 入力項目の名前〉
4. 「対象」〈要確認〉でユーザーの種類を「外部」〈要確認〉にする
5. 公開ステータスは「テスト」〈要確認〉のままにする（アプリの公開は行わない）
6. 「データアクセス」〈要確認〉にスコープを追加しない
7. 「クライアント」〈要確認〉→「クライアントを作成」〈要確認〉を押す
8. 種類で「ウェブ アプリケーション」〈要確認〉を選ぶ
9. 「承認済みのリダイレクト URI」〈要確認〉に下の 2 つを追加して「作成」〈要確認〉を押す
10. 表示されたダイアログを開いたまま、クライアント ID とクライアントシークレットを 7-3 で Vercel に入れる

```
https://<本番の固定 URL>/api/auth/callback/google
https://<デモの固定 URL>/api/auth/callback/google
```

- 固定 URL は 5 章「環境の定義」の表のもの
- 名前・メール・プロフィールだけを求めるアプリは、テストのままでもテストユーザーの登録が要らず、7 日での失効もない
- 誰が入れるかは Google ではなく、アプリの許可リスト（7-3）で決まる
- リダイレクト URI は完全一致で照合され、ワイルドカードは使えない。localhost は登録しない
- クライアントシークレットは作成時にしか表示されない。失くしたら 7-6 で取り替える

### 7-2. AUTH_SECRET を作る

1. 手元の端末で `openssl rand -base64 32` を実行する
2. 出力された文字列を 7-3 の `AUTH_SECRET` に使う

- 本番とデモでは別の値にする
- デモの Production と Preview は同じ値にする（プレビューのログインは、デモの固定 URL を経由して戻る。その間の受け渡しを `AUTH_SECRET` で暗号化しているため）

### 7-3. Vercel に環境変数を入れる

| 変数 | Type | 本番プロジェクト | デモプロジェクト |
|---|---|---|---|
| `AUTH_SECRET` | Secret | Production | Production と Preview（同じ値） |
| `AUTH_GOOGLE_ID` | Secret | Production | Production と Preview |
| `AUTH_GOOGLE_SECRET` | Secret | Production | Production と Preview |
| `AUTH_ALLOWED_EMAILS` | Config | Production | Production と Preview |
| `AUTH_REDIRECT_PROXY_URL` | Config | 入れない | Production と Preview |

1. Vercel ダッシュボードで対象のプロジェクトを開く
2. 「Settings」→「Environment Variables」を開く
3. Key に変数名、Value に値を入れる
4. Type を上の表のとおりに選ぶ
5. Environments で、上の表の環境すべてにチェックを入れる
6. 「Save」を押す
7. 全部入れたら 7-4 に進む

```env
AUTH_ALLOWED_EMAILS=alice@example.com,bob@example.com
AUTH_REDIRECT_PROXY_URL=https://<デモの固定 URL>/api/auth
```

- デモは Production と Preview に同時にチェックを入れて 1 回で保存する。こうすると両方が同じ値になる
- `AUTH_ALLOWED_EMAILS` は Google アカウントに表示されるアドレスをそのまま、半角カンマ区切りで書く。大文字小文字は区別しない。空だと誰もログインできない
- Secret 型は保存後に値を読めず、Config 型にも変えられない。許可リストは人を足すたびに全文を見直すので Config にする
- 許可リストの値（メールアドレス）はリポジトリに書かず、Vercel にだけ置く
- `AUTH_REDIRECT_PROXY_URL` は、プレビューのログインをデモの固定 URL 経由で戻すための値。転送する側（プレビュー）と転送される側（固定 URL）の両方に要る。これがあるので、PR ごとの URL を Google に登録しなくてよい
- チーム設定の「Separate Production Secret Values」は無効のままにする。有効だと、Production と Preview に同じ値を入れられない

### 7-4. 反映して確かめる

1. 「Deployments」で最新の Production デプロイの「…」→「Redeploy」を押す
2. デモも同じく Redeploy する
3. 固定 URL を開く
4. Google のアカウント選択画面が出ることを確かめる
5. 許可リストのアカウントを選び、在庫画面が出ることを確かめる

- 変数は新しいデプロイにしか効かない。変数を変えたら毎回 Redeploy する
- ログイン状態は、最後に使ってから 30 日続く（使うたびに延びる）
- ログアウトは `/api/auth/signout`

### 7-5. 許可リストに人を足す・外す

1. 「Environment Variables」で `AUTH_ALLOWED_EMAILS` の「…」→「Edit」を押す
2. 今の値が見えるので、カンマ区切りで追記（または削除）する
3. 「Save」を押す
4. 7-4 の手順 1〜2 で Redeploy する
5. 自分のアカウントでログインできることを確かめる

- 外した人は、Redeploy 後の次のリクエストでログアウトされる
- 空にすると全員がログインできなくなる（自分も含む）

### 7-6. 鍵を取り替える

`AUTH_SECRET`:

1. 7-2 で新しい値を作る
2. 本番とデモの `AUTH_SECRET` を「Edit」で置き換える（デモは Production と Preview の両方）
3. Redeploy する

- 全員がログアウトされる（強制的にログアウトさせたいときも同じ）。もう一度ログインすればよい

Google のクライアントシークレット:

1. 「Google Auth Platform」→「クライアント」〈要確認〉で対象のクライアントを開く
2. 「シークレットを追加」〈要確認〉を押す
3. 新しい値を、本番とデモの `AUTH_GOOGLE_SECRET` に入れる
4. Redeploy してログインできることを確かめる
5. 古いシークレットを「無効にする」〈要確認〉→ 削除する

### 7-7. うまくいかないとき

| 症状 | 原因 | 直し方 |
|---|---|---|
| Google の画面に `redirect_uri_mismatch` | 戻り先 URL が登録と一致しない | エラーの詳細に出る redirect_uri を 7-1 の登録と見比べる |
| 「Server error」（Configuration）の画面 | `AUTH_SECRET`、`AUTH_GOOGLE_ID`、`AUTH_GOOGLE_SECRET` のどれかが無い、または Redeploy していない | 7-3、7-4 |
| 「Access Denied」の画面（`/api/auth/error?error=AccessDenied`） | 許可リストに無い、または Google 側でメールが未確認 | 7-5 |
| プレビューだけログイン後にエラー | デモに `AUTH_REDIRECT_PROXY_URL` が無い、または `AUTH_SECRET` が Production と Preview で違う | 7-3 の表を見直し、Redeploy |

### 参考

- [Google: Manage App Audience](https://support.google.com/cloud/answer/15549945)
- [Google: Manage OAuth Clients](https://support.google.com/cloud/answer/15549257)
- [Google: OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Auth.js: Deployment（Securing a preview deployment）](https://authjs.dev/getting-started/deployment)
- [Vercel: Config and Secret environment variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables)

---

## 注意事項

- `.env.local` は絶対にコミットしない（`.gitignore` の `.env*` で除外済み。`.env.local.example` だけはコミットする）
- Google Sheets JSONキーファイル（`*.json`）もGitHubにコミットしない
- APIキーが漏洩した場合はすぐに無効化して再発行する
