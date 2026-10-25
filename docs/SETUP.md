---
title: 環境構築手順書
description: 食材管理アプリを Google Cloud と Vercel で動かすための設定手順と、日々の運用
updated: 2026-10-25
---

# 環境構築手順書

## 前提

- Node.js 24（24.15 以上）がインストール済み。`.nvmrc` と package.json の `engines.node` は 24 系を指定している。24.15 以上が要るのは、テストで使う jsdom が求めるため
- Git がインストール済み
- Google アカウントを持っている
- Vercel に本番とデモの 2 つのプロジェクトがあり、どちらも GitHub のこのリポジトリを取り込んでいる。作るときは、Vercel ダッシュボードでこのリポジトリを 2 回取り込み、名前を分ける（[Vercel: Deploying Git Repositories](https://vercel.com/docs/git)）。2 つの違いは 4 章「環境の定義」

本番とデモは、Vercel の別々のプロジェクト。どちらのプロジェクトにも 2 つの環境がある。Production は main のコードを固定 URL で動かす環境、Preview は PR のコードを PR ごとの URL で動かす環境（プレビュー）。

---

## 1. 開発環境の準備

コードを手元で直し、テスト・型チェック・lint（5 章）を走らせるための準備。次のコマンドで、リポジトリを手元に取ってきて、使うパッケージを入れる。

```bash
# リポジトリのクローン
git clone https://github.com/hirobirofran/food-inventory-app.git
cd food-inventory-app

# 依存パッケージのインストール
npm install
```

ローカル（`npm run dev`）では Google ログインを使えないので、http://localhost:3000 を開いてもアプリの画面は使えない。Google に登録するログイン後の戻り先の URL（3-2）に localhost を入れておらず、ログインを省く仕組みも無いため。画面の動きは、PR を作ると Vercel が作るデモ用プレビューで確かめる（4 章「PR の確認手順」）。

---

## 2. Google Cloud と Vercel の設定（ログイン以外）

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

本番用とデモ用に 1 枚ずつ作る。どちらも次の手順で作り、サービスアカウントと共有する。

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

### 2-5. Gemini の API キーを作る

レシピ提案（AI）に使うキーを作る。

1. Google AI Studio（https://aistudio.google.com/ ）を開く
2. API キーを作る（[Google: Using Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key)）
3. 作ったキーを 2-6 の `GEMINI_API_KEY` に使う

- 無料枠で使うときは、請求先アカウントの無いプロジェクトでキーを作る。請求先アカウントのある Google Cloud プロジェクトに紐づいたキーは、無料枠とは別の扱いになる

### 2-6. Vercel に環境変数を入れる（ログイン以外）

アプリは、Sheets に接続する値などを Vercel の環境変数から読む。下の表は、どのプロジェクトのどの環境に、何を入れるかを示す。

| 変数 | 入れる値 | Type | 本番プロジェクト | デモプロジェクト |
|---|---|---|---|---|
| `GOOGLE_SPREADSHEET_ID` | 2-4 で取得したスプレッドシート ID。本番とデモで別のシート | Secret | Production | Production と Preview |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | 2-3 で作ったサービスアカウントのメールアドレス | Secret | Production | Production と Preview |
| `GOOGLE_PRIVATE_KEY` | JSON キーの `private_key` の値 | Secret | Production | Production と Preview |
| `GEMINI_API_KEY` | 2-5 で作った API キー | Secret | Production | Production と Preview |
| `NEXT_PUBLIC_APP_ENV` | `demo`（画面にデモのバナーを出す） | Config | 入れない | Production と Preview |

1. Vercel ダッシュボードで本番プロジェクト（food-inventory-app）を開く
2. 「Settings」→「Environment Variables」を開く
3. Key に変数名、Value に上の表の値を入れる
4. Type を上の表のとおりに選ぶ
5. Environments で、上の表の環境すべてにチェックを入れる。デモは Production と Preview に同時にチェックを入れ、1 回で保存する（両方が同じ値になる）
6. 「Save」を押す
7. 本番の行を全部入れたら、デモプロジェクト（food-inventory-demo）を開いて 2〜6 を行う

- 変数は新しいデプロイにしか効かない。反映（Redeploy）は、ログインの変数も入れた後に 3-4 でまとめて行う
- `.env.local` を作るのは、デモのシートを入れ直す `npm run seed:demo` を使うときだけ。書く変数は `.env.local.example` にある

---

## 3. Google アカウントでのログイン

このアプリは、許可リストに載せた Google アカウントだけがログインできる（Auth.js）。許可リストは、Vercel の環境変数 `AUTH_ALLOWED_EMAILS` に書いたメールアドレス。設定する場所は Google Cloud と Vercel の 2 か所。この設定が済むまで、本番・デモ・プレビューのどれもログインできない。

### 3-1. AUTH_SECRET を作る

1. 手元の端末で `openssl rand -base64 32` を実行する
2. 出力された文字列を 3-3 の `AUTH_SECRET` に使う。本番用とデモ用に 2 回実行して、別々の値にする

- デモの Production と Preview には同じ値を入れる。理由は 3-3 の「プレビューでのログインの流れ」

### 3-2. Google Cloud で OAuth クライアントを作る

〈登録後に確認〉は、Google Auth Platform を登録した後でないと画面に出ないため、表記をまだ確かめていない箇所。

1. https://console.cloud.google.com/ で 2-1 のプロジェクトを選ぶ
2. 上部の検索欄に「Google Auth Platform」と入れて開く
3. 「Google Auth Platform はまだ構成されていません」と出たら、「開始」を押す。出なければ（登録済みなら）手順 5 へ進む
4. 「プロジェクト構成」の画面で、次の 4 段を順に入れる。各段は「次へ」で進み、最後に「作成」を押す
   1. 「アプリ情報」: 「アプリ名」に `食材管理アプリ` と入れ、「ユーザー サポートメール」で自分のアドレスを選ぶ。アプリ名は後から左のメニューの「ブランディング」で変えられる
   2. 「対象」: 「外部」を選ぶ。「内部」は、Google Workspace の組織に属するプロジェクトで、組織の中の人だけが使うアプリ向け。個人の Google アカウントで作ったプロジェクトと、家族の個人アカウントで使うこのアプリは「外部」になる
   3. 「連絡先情報」: 「メールアドレス」に自分のアドレスを入れる
   4. 「終了」: ポリシーへの同意を求められたら同意する〈登録後に確認〉
5. 登録済みだったときは、左のメニューの「対象」で、ユーザーの種類が「外部」になっているかを見る〈登録後に確認〉
6. 左のメニューの「クライアント」で「クライアントを作成」〈登録後に確認〉を押す
7. アプリケーションの種類で「ウェブ アプリケーション」〈登録後に確認〉を選ぶ
8. 「承認済みのリダイレクト URI」〈登録後に確認〉に次の 2 つを追加して、「作成」〈登録後に確認〉を押す
    ```
    https://food-inventory-app-nu.vercel.app/api/auth/callback/google
    https://food-inventory-demo.vercel.app/api/auth/callback/google
    ```
9. 表示されたダイアログは開いたままにして、3-3 に進む。ダイアログのクライアント ID とクライアントシークレットを 3-3 で使う

- 公開ステータスは「テスト」〈登録後に確認〉のままにする（左のメニューの「対象」で見える）。アプリの公開は行わない
- 「データアクセス」でスコープは足さない〈登録後に確認〉
- 手順 8 の 1 行目は本番、2 行目はデモの固定 URL（4 章「環境の定義」の表と同じ）
- テストのアプリには、ふつうはテストユーザー（100 人まで）として登録した人しかログインできない。ただし名前・メール・プロフィール（スコープ `openid`・`email`・`profile`）だけを求めるアプリは例外で、テストユーザーの登録が要らない。ログインのとき、テスト中のアプリだという画面が出る〈登録後に確認〉（[Google: OAuth の公開ステータスとユーザーの種類](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview)）。このアプリが求めるのはこの 3 つだけ（Auth.js の Google ログインの既定値）
- 同じ例外で、テストのアプリにかかる「7 日での失効」（リフレッシュトークンの期限）もかからない（[Google: Refresh token expiration](https://developers.google.com/identity/protocols/oauth2#expiration)）
- 誰が入れるかは Google ではなく、アプリの許可リスト（3-3）で決まる
- Google Cloud の IAP（Identity-Aware Proxy）は使わない。IAP は Google Cloud のロードバランサや Cloud Run を通る通信だけを守る仕組みで、Vercel の URL に直接来る通信は通らないため（[Google: IAP の概要](https://docs.cloud.google.com/iap/docs/concepts-overview)）。IAP を使わないので、IAM の「IAP-secured Web App User」の役割も要らない
- リダイレクト URI は完全一致で照合され、ワイルドカードは使えない。localhost は登録しない
- クライアントシークレットは作成時にしか表示されない。失くしたら 3-6 で取り替える

### 3-3. Vercel に環境変数を入れる

2-6 と同じ手順で、下の表の値を入れる。表の見方も 2-6 と同じ。

| 変数 | 入れる値 | Type | 本番プロジェクト | デモプロジェクト |
|---|---|---|---|---|
| `AUTH_SECRET` | 3-1 で作った文字列。本番とデモで別の値 | Secret | Production | Production と Preview（同じ値） |
| `AUTH_GOOGLE_ID` | 3-2 のダイアログのクライアント ID。本番とデモで同じ値 | Secret | Production | Production と Preview |
| `AUTH_GOOGLE_SECRET` | 3-2 のダイアログのクライアントシークレット。本番とデモで同じ値 | Secret | Production | Production と Preview |
| `AUTH_ALLOWED_EMAILS` | ログインを許すメールアドレス（例: `alice@example.com,bob@example.com`）。プロジェクトごとに決める | Config | Production | Production と Preview |
| `AUTH_REDIRECT_PROXY_URL` | `https://food-inventory-demo.vercel.app/api/auth` | Config | 入れない | Production と Preview |

全部入れたら 3-4 に進む。

- `AUTH_ALLOWED_EMAILS` は、Google アカウントに表示されるアドレスをそのまま半角カンマ区切りで書く。大文字小文字は区別しない。空だと誰もログインできない
- Secret 型は保存後に値を読めず、Config 型にも変えられない。許可リストは人を足すたびに全文を見直すので Config にする
- 許可リストの値（メールアドレス）はリポジトリに書かず、Vercel にだけ置く

プレビューでのログインの流れ:

1. プレビューの URL は PR ごとに変わるので、Google に登録できない。そこでプレビューは、Google に「戻り先はデモの固定 URL」と伝える。このとき、ログインの要求に自分の URL を書き添える
2. Google は、ログインが済むとデモの固定 URL に戻す
3. デモの固定 URL は、書き添えられた URL を `AUTH_SECRET` で読み解き、そのプレビューへログインの結果を転送する
4. プレビューがログインを終える

- `AUTH_REDIRECT_PROXY_URL` は、この転送を行うための値。転送する側（デモの Production）と転送される側（デモの Preview）の両方に要る
- 書き添えた URL は `AUTH_SECRET` で暗号化される。デモの Production と Preview で `AUTH_SECRET` が違うと読み解けず、転送できない
- デモの固定 URL から直接ログインしたときは、転送せずにそのままログインする
- この仕組みがあるので、PR ごとの URL を Google に登録しなくてよい

### 3-4. 反映して確かめる

1. 本番プロジェクトの「Deployments」で、最新の Production デプロイの「…」→「Redeploy」を押し、確認のダイアログでも「Redeploy」を押す
2. デモプロジェクトでも同じく Redeploy する
3. 本番の固定 URL（https://food-inventory-app-nu.vercel.app）を開く
4. 「Sign in with Google」のボタンがある英語の画面が出るので、ボタンを押す
5. Google のアカウント選択画面で、許可リストのアカウントを選ぶ。在庫の一覧が出れば完了
6. デモの固定 URL（https://food-inventory-demo.vercel.app）でも 3〜5 を行う
7. プレビューでのログインは、次に PR を作ったときに 4 章「PR の確認手順」で確かめる

- 許可リストに無いアカウントを選ぶと、「Access Denied」の画面になる
- 変数は新しいデプロイにしか効かない。変数を変えたら毎回 Redeploy する
- ログイン状態は、最後に使ってから 30 日続く（使うたびに延びる）
- ログアウトは `/api/auth/signout`

### 3-5. 許可リストに人を足す・外す

1. 変えたいプロジェクト（本番かデモ）の「Settings」→「Environment Variables」で、`AUTH_ALLOWED_EMAILS` の「…」→「Edit」を押す
2. 今の値が見えるので、カンマ区切りで追記（または削除）する
3. 「Save」を押す
4. そのプロジェクトの最新の Production デプロイを Redeploy する（3-4 の手順 1 と同じ操作）
5. 自分のアカウントでログインできることを確かめる

- 外した人は、Redeploy の後、次に画面を開いたときにログアウトされる
- 空にすると全員がログインできなくなる（自分も含む）
- デモの許可リストを変えたときは、確認中のプレビューも Redeploy する（4 章「環境変数の適用範囲」）

### 3-6. 鍵を取り替える

`AUTH_SECRET`:

1. 3-1 で新しい値を作る
2. 本番とデモの `AUTH_SECRET` を「Edit」で置き換える（デモは Production と Preview の両方）
3. 両方のプロジェクトで Redeploy する。確認中のデモ用プレビューも Redeploy する（4 章「環境変数の適用範囲」）

- 全員がログアウトされる（強制的にログアウトさせたいときも同じ）。もう一度ログインすればよい

Google のクライアントシークレット:

1. 「Google Auth Platform」→「クライアント」で対象のクライアントを開く
2. 「シークレットを追加」〈登録後に確認〉を押す
3. 新しい値を、本番とデモの `AUTH_GOOGLE_SECRET` に入れる（デモは Production と Preview の両方）
4. 両方のプロジェクトで Redeploy して、ログインできることを確かめる。確認中のデモ用プレビューも Redeploy する（4 章「環境変数の適用範囲」）
5. 古いシークレットを「無効にする」〈登録後に確認〉→ 削除する

### 3-7. うまくいかないとき

| 症状 | 原因 | 直し方 |
|---|---|---|
| Google の画面に `redirect_uri_mismatch` | 戻り先 URL が登録と一致しない | エラーの詳細に出る redirect_uri を、3-2 の手順 8 の登録と見比べる。redirect_uri がプレビューの URL なら、デモの Preview に `AUTH_REDIRECT_PROXY_URL` が無い（3-3） |
| 「Server error」（Configuration）の画面 | `AUTH_SECRET`、`AUTH_GOOGLE_ID`、`AUTH_GOOGLE_SECRET` のどれかが無い、または Redeploy していない | 3-3、3-4 |
| 「Access Denied」の画面（`/api/auth/error?error=AccessDenied`） | 許可リストに無い、または Google 側でメールが未確認 | 3-5 |
| プレビューだけ、ログイン後にエラー | デモの Production に `AUTH_REDIRECT_PROXY_URL` が無い、または `AUTH_SECRET` が Production と Preview で違う | 3-3 の表を見直し、Redeploy |
| 環境変数の保存時に「Production must use a separate value.」と出る | チームの設定「Separate Production Secret Values」が有効になっている | チームの「Settings」→「Security」の「Separate Production Secret Values」で、「Require Separate Values」を切る（Vercel のチームで Owner の役割が要る）。デモの Production と Preview には同じ値が要る |

### 参考

- [Google: Manage App Audience](https://support.google.com/cloud/answer/15549945)
- [Google: Manage OAuth Clients](https://support.google.com/cloud/answer/15549257)
- [Google: OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Auth.js: Deployment（Securing a preview deployment）](https://authjs.dev/getting-started/deployment)
- [Vercel: Config and Secret environment variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables)

---

## 4. デプロイと確認の運用

### 環境の定義

| 名前 | Vercel プロジェクト | 固定 URL | 乗るコード | データ |
|---|---|---|---|---|
| 本番 | food-inventory-app | food-inventory-app-nu.vercel.app | main | 本番シート |
| デモ | food-inventory-demo | food-inventory-demo.vercel.app | main | デモシート（`npm run seed:demo` で入れ直せる） |
| プレビュー | 両プロジェクトに自動生成 | PR ごとの一時 URL | PR のブランチ | デモ用だけ動く（下記） |

本番とデモは同じ main から同時にデプロイされる。push 1 回で両方が更新されるので、「デモで試してから本番」はできない。デモと本番の違いは環境変数だけ（シート、許可リスト、`AUTH_SECRET` の値、`NEXT_PUBLIC_APP_ENV=demo` のバナー、デモにだけ入れる `AUTH_REDIRECT_PROXY_URL`）。

### PR の確認手順

1. ブランチを push して PR を作る。Vercel が本番用とデモ用のプレビューを 1 つずつ作る
2. 確認は **デモ用プレビュー** で行う。PR の Vercel ボットコメントにある food-inventory-demo 側の「Visit Preview」を開く
3. Vercel にログインする（Deployment Protection のため。固定 URL は対象外）。ログインできない端末では、Vercel の共有リンクを発行して開く
4. アプリには Google アカウントでログインする。ログインできるのは、デモプロジェクトの環境変数 `AUTH_ALLOWED_EMAILS` に書いたアカウントだけ。3 章の設定が済んでいないと、ログインの途中でエラーの画面になる（3-7）
5. 動作を確認したら PR をマージする。main が本番とデモに自動デプロイされる

### 環境変数の適用範囲

- デモプロジェクト: 全変数を Production と Preview の両方に適用する。プレビューはデモのシートとデモの鍵で動く
- 入れる変数の一覧は 2-6 と 3-3 の表
- デモプロジェクトの `AUTH_SECRET` は、Production と Preview で同じ値にする（理由は 3-3「プレビューでのログインの流れ」）。`AUTH_REDIRECT_PROXY_URL` はデモプロジェクトにだけ入れる（3-3）
- 本番プロジェクト: Production のみ。本番用プレビューは意図的に動かさない（本番データに触らせないため）。確認には使わない
- 変数を変えても、反映されるのは新しいデプロイだけ。既存のプレビューはダッシュボードから Redeploy する
- 値はダッシュボードで直接入力する。チャットや CLI の引数に貼らない

### 本番だけ戻したいとき

main に push すると両方に出る。本番だけ前の状態に戻すときは、Vercel ダッシュボードの Deployments で前のデプロイを Rollback する。

## 5. テスト

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

## 注意事項

- `.env.local` は絶対にコミットしない（`.gitignore` の `.env*` で除外済み。`.env.local.example` だけはコミットする）
- サービスアカウントの JSON キーファイルは、リポジトリのフォルダの外に置く。`.gitignore` では除外していないので、フォルダ内に置くと `git add .` で入ってしまう
- APIキーが漏洩した場合はすぐに無効化して再発行する
