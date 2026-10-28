---
title: 環境構築手順書
description: 食材管理アプリを Google Cloud と Vercel で動かすための設定手順と、日々の運用
updated: 2026-10-27
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

手元の環境（ローカル）を使うのは次の 2 つだけ。画面は動かさない。

- コードを直し、push の前にテスト・型チェック・lint（`npm test`・`npx tsc --noEmit`・`npm run lint`。5 章）を通す。同じ 3 つは PR の CI でも走る
- デモのシートを `npm run seed:demo` で入れ直す。このときだけ `.env.local` を作る（2-6）。`.env.local` に書くのは、シート用の 4 つの変数と、6 章のスクリプトに渡す変数。ログイン用の値は書かない

次のコマンドで、リポジトリを手元に取ってきて、使うパッケージを入れる。

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
5. Environments で、上の表の環境にチェックを入れる。デモで Production と Preview の両方に入れる変数は、ここでは Production だけにチェックを入れる
6. 「Save」を押す
7. 本番の行を全部入れたら、デモプロジェクト（food-inventory-demo）を開いて 2〜6 を行う
8. デモの各行を編集し、Environments に Preview のチェックを足して保存する

- 最初から Production と Preview の両方にチェックを入れて保存すると、Production 用と Preview 用の 2 行に分かれる（2026-10-25 に確かめた）。値を変えるとき（3-6 など）に 2 行とも直すことになるので、手順 5 と 8 のように 1 行にまとめる
- Config の値を画面で見るときは、Vercel が本人確認（認証コードかパスキー）を求める
- 変数は新しいデプロイにしか効かない。反映（Redeploy）は、ログインの変数も入れた後に 3-4 でまとめて行う
- `.env.local` を作るのは、デモのシートを入れ直す `npm run seed:demo` と、6 章のスクリプトを使うときだけ。書く変数は `.env.local.example` にある

---

## 3. Google アカウントでのログイン

このアプリは、許可リストに載せた Google アカウントだけがログインできる（Auth.js）。許可リストは、Vercel の環境変数 `AUTH_ALLOWED_EMAILS` に書いたメールアドレス。設定する場所は Google Cloud と Vercel の 2 か所。この設定が済むまで、本番・デモ・プレビューのどれもログインできない。

### 3-1. AUTH_SECRET を作る

1. 手元の端末（PowerShell・ターミナルのどれでもよい）で次を実行する。Node.js（前提）だけで動く
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
2. 出力された文字列を 3-3 の `AUTH_SECRET` に使う。本番用とデモ用に 2 回実行して、別々の値にする。Secret は保存した後に画面で見られないので、3-3 で入れ終わるまで端末の画面を閉じない

- デモの Production と Preview には同じ値を入れる。理由は 3-3 の「プレビューでのログインの流れ」

### 3-2. Google Cloud で OAuth クライアントを作る

〈登録後に確認〉は、Google Auth Platform を登録した後でないと画面に出ないため、表記をまだ確かめていない箇所。

1. https://console.cloud.google.com/ で 2-1 のプロジェクトを選ぶ
2. 上部の検索欄に「Google Auth Platform」と入れて開く
3. 「Google Auth Platform はまだ構成されていません」と出たら、「開始」を押す。出なければ（登録済みなら）手順 5 へ進む
4. 「プロジェクト構成」の画面で、次の 4 段を順に入れる。各段は「次へ」で進む。最後の「終了」で「続行」を押してから、「作成」を押す
   1. 「アプリ情報」: 「アプリ名」に `食材管理アプリ` と入れ、「ユーザー サポートメール」で自分のアドレスを選ぶ。アプリ名は後から左のメニューの「ブランディング」で変えられる
   2. 「対象」: 「外部」を選ぶ。「内部」は、Google Workspace の組織に属するプロジェクトで、組織の中の人だけが使うアプリ向け。個人の Google アカウントで作ったプロジェクトと、家族の個人アカウントで使うこのアプリは「外部」になる
   3. 「連絡先情報」: 「メールアドレス」に自分のアドレスを入れる
   4. 「終了」: 「Google API サービス: ユーザーデータに関するポリシーに同意します。」にチェックを入れ、「続行」を押す
5. 登録済みだったときは、左のメニューの「対象」で、ユーザーの種類が「外部」になっているかを見る〈登録後に確認〉
6. 左のメニューの「クライアント」で「クライアントを作成」を押す
7. 「アプリケーションの種類」で「ウェブ アプリケーション」を選ぶ。「名前」は `食材管理アプリ` にする（コンソールで見分けるための名前で、ログインする人には出ない）
8. 「承認済みのリダイレクト URI」の「URI を追加」で次の 2 つを足し、「作成」を押す。「承認済みの JavaScript 生成元」は空のままでよい
    ```
    https://food-inventory-app-nu.vercel.app/api/auth/callback/google
    https://food-inventory-demo.vercel.app/api/auth/callback/google
    ```
9. 表示されたダイアログは開いたままにして、3-3 に進む。ダイアログのクライアント ID とクライアントシークレットを 3-3 で使う

- 公開ステータスは「テスト」〈登録後に確認〉のままにする（左のメニューの「対象」で見える）。アプリの公開は行わない
- 「データアクセス」でスコープは足さない
- Google のログイン画面には、アプリ名ではなく、開いたサイトのホスト名（例: `food-inventory-demo.vercel.app`）が「〜にログイン」と出る（2026-10-25 に確かめた）。上の「OAuth の公開ステータスとユーザーの種類」には、公開済みでブランディングの確認を受けていないアプリは名前とロゴを出さない、とある。テストのアプリについての記述は無い
- 作成画面の注記のとおり、設定が有効になるまで 5 分から数時間かかることがある。作ってすぐにログインを試して失敗したら、時間をおいてもう一度試す（2026-10-25 は、URI を足してから数分待つと通った）
- 手順 8 の 1 行目は本番、2 行目はデモの固定 URL（4 章「環境の定義」の表と同じ）
- テストのアプリには、ふつうはテストユーザー（100 人まで）として登録した人しかログインできない。ただし名前・メール・プロフィール（スコープ `openid`・`email`・`profile`）だけを求めるアプリは例外で、テストユーザーの登録が要らない（[Google: Manage App Audience](https://support.google.com/cloud/answer/15549945)、[Google: OAuth の公開ステータスとユーザーの種類](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview)）。テストユーザーを登録していない状態で、警告の画面も出ずに Google の同意画面まで進めることを確かめた（2026-10-25）。2 つ目のページには「警告の画面が出る」とあるが、実際は 1 つ目のページのとおり出なかった。このアプリが求めるのはこの 3 つだけ（Auth.js の Google ログインの既定値）
- 同じ例外で、テストのアプリにかかる「7 日での失効」（リフレッシュトークンの期限）もかからない（[Google: Refresh token expiration](https://developers.google.com/identity/protocols/oauth2#expiration)）
- 誰が入れるかは Google ではなく、アプリの許可リスト（3-3）で決まる
- Google Cloud の IAP（Identity-Aware Proxy）は使わない。IAP は Google Cloud のロードバランサや Cloud Run を通る通信を守る仕組み（[Google: IAP の概要](https://docs.cloud.google.com/iap/docs/concepts-overview)）。Vercel のアプリに付けるには、有料のロードバランサと独自ドメインを用意してその裏に Vercel を置く必要があり、それでも Vercel の URL に直接来る通信は IAP を通らないため。IAP を使わないので、IAM の「IAP-secured Web App User」の役割も要らない
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
| 「Access Denied」の画面（`/api/auth/error?error=AccessDenied`） | 許可リストに無い。開いている環境（Production か Preview）に `AUTH_ALLOWED_EMAILS` が入っていない、または入れた後に Redeploy していない（このときは全員が拒否される）。Google 側でメールが未確認 | 3-3 の表、3-4、3-5 |
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
2. 確認は **デモ用プレビュー** で行う。PR の Vercel ボットコメントにある food-inventory-demo の行の「Preview」を開く。このリンクはブランチの URL（`food-inventory-demo-git-…`）で、PR の間変わらない。Vercel の画面の「Visit」は、デプロイごとに変わる URL を開く
3. Vercel にログインする（Deployment Protection のため。固定 URL は対象外）。ログインできない端末では、Vercel の共有リンクを発行して開く
4. アプリには Google アカウントでログインする。ログインできるのは、デモプロジェクトの環境変数 `AUTH_ALLOWED_EMAILS` に書いたアカウントだけ。3 章の設定が済んでいないと、ログインの途中でエラーの画面になる（3-7）
5. 動作を確認したら PR をマージする。main が本番とデモに自動デプロイされる

### 環境変数の適用範囲

- デモプロジェクト: 全変数を Production と Preview の両方に適用する。プレビューはデモのシートとデモの鍵で動く
- 入れる変数の一覧は 2-6 と 3-3 の表
- デモプロジェクトの `AUTH_SECRET` は、Production と Preview で同じ値にする（理由は 3-3「プレビューでのログインの流れ」）。`AUTH_REDIRECT_PROXY_URL` はデモプロジェクトにだけ入れる（3-3）
- 本番プロジェクト: Production のみ。本番用プレビューは意図的に動かさない（本番データに触らせないため）。確認には使わない
- 変数を変えても、反映されるのは新しいデプロイだけ。既存のプレビューは、デモプロジェクトの「Overview」の「Active Branches」で、そのブランチの「…」→「Redeploy」を押す。確認のダイアログでブランチ名を確かめてから「Redeploy」を押す（「Deployments」の一覧から選ぶと、main など別のブランチのデプロイを Redeploy してしまうことがある。2026-10-25 に起きた）
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

## 6. Terraform 用の WIF とバケットを作る（初回に 1 回）

GCP の設定を Terraform で管理し、GitHub Actions から動かすための土台を、`infra/bootstrap/bootstrap.sh` で作る。Terraform は state（管理している物の記録）を置く場所が無いと始められず、Actions が鍵を持たずに GCP に入る仕組み（Workload Identity Federation、以下 WIF）も先に要る。そのため、この 2 つは Terraform ではなく gcloud のスクリプトで作る。

用語: SA はサービスアカウント（プログラムが使う Google Cloud のアカウント）。plan は Terraform が変更の予定を出す操作、apply はその変更を実際に反映する操作。seed は、デモのシートにデータを入れ直す `npm run seed:demo` のこと（1 章）。

スクリプトが作る物（無ければ作り、あれば、このスクリプトが決めた設定に直す）:

- API の有効化（`iamcredentials`、`sts`。ほかに、スクリプト自身が使う `iam`、`cloudresourcemanager`、`storage`）
- state を置くバケット（バージョニングあり、公開を防ぐ設定）
- Actions のログを置くバケット（30 日で自動削除、公開を防ぐ設定）。state のバケットとは別にする。plan はどのブランチからも動くので、同じバケットだとログを書く権限が state にも届くため
- GitHub 用の WIF のプールとプロバイダ（名前はどちらも `github`）。このリポジトリのトークンだけを通す
- plan 用 SA（`tf-plan`）と apply 用 SA（`tf-apply`）。plan 用はこのリポジトリのどのブランチからでも借りられ、apply 用は `refs/heads/main` からだけ借りられる
- GitHub Secrets 11 個（下の表）

### 6-1. 前提

- Git Bash（Windows）または bash（macOS・Linux）で動かす
- Google Cloud CLI（`gcloud`）と GitHub CLI（`gh`）が入っている
- `gcloud auth login` が済んでいる。そのアカウントは、対象プロジェクトのオーナー（`roles/owner`）であること
- `gh auth login` が済んでいる。Secrets を登録できる権限（このリポジトリの管理者）があること

### 6-2. 渡す環境変数

次の 9 個を、環境変数か、リポジトリ直下の `.env.local` の `名前=値` の行で渡す。環境変数があればそれを使い、無いものだけ `.env.local` から読む。足りないものがあると、足りない名前だけを並べて止まる。値はこの文書にもリポジトリにも書かない。

| 名前 | 意味 |
|---|---|
| `GCP_PROJECT_ID` | Google Cloud のプロジェクト ID |
| `GITHUB_REPO` | このリポジトリ（`<オーナー>/<リポジトリ名>`。大文字と小文字は GitHub の URL の表記どおりに書く。違うと、ログインはできても権限を借りられない） |
| `TF_STATE_BUCKET` | state を置くバケットの名前（Cloud Storage 全体で一意。ほかの人がすでに使っている名前は使えない） |
| `LOG_BUCKET` | Actions のログを置くバケットの名前（同上） |
| `APP_SA_EMAIL` | アプリが使う今のサービスアカウントのメールアドレス（`GOOGLE_SERVICE_ACCOUNT_EMAIL` と同じ値） |
| `VERCEL_TEAM_SLUG` | Vercel のチームの slug（ダッシュボードの URL に出る名前） |
| `VERCEL_PROD_PROJECT` | Vercel の本番プロジェクトの名前 |
| `VERCEL_DEMO_PROJECT` | Vercel のデモプロジェクトの名前 |
| `OWNER_EMAIL` | 手元の seed でアプリの SA の権限を借りる人の Google アカウント |

### 6-3. 実行

リポジトリ直下で動かす。`.env.local` を使わず、環境変数で渡す場合の例:

```bash
# 値は自分の物に置き換える
export GCP_PROJECT_ID=<GCP_PROJECT_ID>
export GITHUB_REPO=<オーナー>/<リポジトリ名>
# 残りの 7 つも同じように export する
bash infra/bootstrap/bootstrap.sh
```

1 行ずつ「作った」「更新した」「そのまま」を出し、最後に Secrets を登録する。gcloud のログインの有効期限が切れていると、ブラウザで再ログインを求められることがある。出力にはプロジェクト ID やバケットの名前などの識別子が含まれるので、Issue や PR に貼らない。

2 回目以降も動かしてよい。権限が足りないと分かったときは、スクリプトの権限の一覧に足してから動かし直す。

### 6-4. GitHub Secrets の表

Secrets には説明を書く欄が無いので、ここに意味と取り出し方を残す。値を入れ直すときは、GitHub の Settings → Secrets and variables → Actions で、その Secret の「Update」を押して新しい値を入れる。値を変えたいときは、環境変数か `.env.local` を直してスクリプトを動かし直してもよい。Variables は使わない（公開リポジトリでは、Variables の値がログで伏せ字にならないため）。

| 名前 | 意味 | 値の取り出し方 |
|---|---|---|
| `GCP_PROJECT_ID` | Google Cloud のプロジェクト ID | Cloud Console の上部のプロジェクト選択、または `gcloud projects list` |
| `GCP_WIF_PROVIDER` | GitHub 用 WIF プロバイダの完全な名前 | `gcloud iam workload-identity-pools providers describe github --project=<GCP_PROJECT_ID> --location=global --workload-identity-pool=github --format='value(name)'` |
| `TF_PLAN_SA` | plan 用 SA のメールアドレス | `gcloud iam service-accounts list --project=<GCP_PROJECT_ID> --filter='email~^tf-plan@' --format='value(email)'`。Cloud Console の「IAM と管理」→「サービス アカウント」でも見られる |
| `TF_APPLY_SA` | apply 用 SA のメールアドレス | 上の `tf-plan` を `tf-apply` に変えたもの |
| `TF_STATE_BUCKET` | state のバケットの名前 | `.env.local` の同じ名前の行。無ければ `gcloud storage buckets list --project=<GCP_PROJECT_ID> --format='value(name,versioning_enabled)'` で、バージョニングが有効（True）のほう。Cloud Console の「Cloud Storage」→「バケット」でも見られる |
| `LOG_BUCKET` | ログのバケットの名前 | 同じ一覧で、30 日で削除するライフサイクルが付いているほう（`--format='value(name,lifecycle_config)'`） |
| `APP_SA_EMAIL` | アプリが使う SA のメールアドレス | Vercel の環境変数 `GOOGLE_SERVICE_ACCOUNT_EMAIL` と同じ値。Cloud Console の「IAM と管理」→「サービス アカウント」でも見られる |
| `VERCEL_TEAM_SLUG` | Vercel のチームの slug | Vercel ダッシュボードのチームの Settings → General の「Team URL」（`vercel.com/` の後ろの部分） |
| `VERCEL_PROD_PROJECT` | 本番プロジェクトの名前 | Vercel ダッシュボードのプロジェクト一覧 |
| `VERCEL_DEMO_PROJECT` | デモプロジェクトの名前 | 同上 |
| `OWNER_EMAIL` | seed で SA の権限を借りる人の Google アカウント | 本人のアカウント（`gcloud auth list`） |

Secrets の使い道: `GCP_PROJECT_ID` から `LOG_BUCKET` までの 6 つは、Terraform のワークフローが GCP に入り、state とログを置くときに使う。`APP_SA_EMAIL` は、今あるアプリの SA を Terraform の管理に取り込むときに使う。残りの 4 つ（`VERCEL_TEAM_SLUG`、`VERCEL_PROD_PROJECT`、`VERCEL_DEMO_PROJECT`、`OWNER_EMAIL`）は、Vercel から GCP への WIF と、手元の seed がアプリの SA の権限を借りる許可を、Terraform で作るときに使う。

### 6-5. state のロックについて

- Terraform は、state を書き換えるときに、バケットにロックのファイルを作って同時に動かないようにする。plan 用 SA は state を読むだけにしてあるので、Actions の plan はロックを取らない設定（`-lock=false`）で動かす
- そのため、apply の途中の state を plan が読むことはありうる。plan と apply は、同じ concurrency グループ（GitHub Actions で、同じグループの実行を同時に走らせず 1 本ずつ並べる設定）で動かして、これを避ける
- 読むだけの権限で plan が通ることは、Terraform の公式文書には書かれていない（公式文書は Storage Object Admin を求めている）。plan が権限の不足で失敗したら、この節を見直す

出典:

- ロックのファイルは `<prefix>/<workspace>.tflock`。ロックを取るときに新しいファイルを書く（[backend_state.go](https://github.com/hashicorp/terraform/blob/ae75cbe434a7/internal/backend/remote-state/gcs/backend_state.go) の 25 行目・165〜166 行目、同じフォルダの `client.go` の 96〜118 行目）。公式文書にはファイル名の記載を見つけられなかった
- `-lock` の既定は true（[extended.go](https://github.com/hashicorp/terraform/blob/ae75cbe434a7/internal/command/arguments/extended.go) の 270 行目）。`-lock=false` の説明は [terraform plan](https://developer.hashicorp.com/terraform/cli/commands/plan)
- 公式の [gcs バックエンドのページ](https://developer.hashicorp.com/terraform/language/backend/gcs)は "Storage Object Admin" を求める。ロックを取る使い方が前提と読める
- `roles/storage.objectViewer` は `storage.objects.get` と `storage.objects.list` を含む（`gcloud iam roles describe roles/storage.objectViewer` で 2026-10-27 に確認）

---

## 注意事項

- `.env.local` は絶対にコミットしない（`.gitignore` の `.env*` で除外済み。`.env.local.example` だけはコミットする）
- サービスアカウントの JSON キーファイルは、リポジトリのフォルダの外に置く。`.gitignore` では除外していないので、フォルダ内に置くと `git add .` で入ってしまう
- APIキーが漏洩した場合はすぐに無効化して再発行する
