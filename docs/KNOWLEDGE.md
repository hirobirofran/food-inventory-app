# 気づき・ナレッジ・申し送り

このファイルには、開発中に気づいたこと、ハマったこと、決めたこと、次回への申し送りを記録する。

---

## 2026-04-17

### 技術的な気づき

- `create-next-app` はデフォルトで `master` ブランチを作るので `git branch -m master main` で変更が必要
- Next.js 15 の App Router では `'use client'` ディレクティブが必要なコンポーネント（useState等を使う場合）を明示する
- TypeScript の `as const` で union型の配列を作るとき、オブジェクトのプロパティが一部のオブジェクトにしかない場合は型エラーになる
  - 対策: すべてのオブジェクトに同じプロパティを持たせる（例: `badge: 0` でデフォルト値を設定）

### UX・設計の気づき

- 賞味期限の色分け（赤/黄/緑）は直感的でわかりやすい。期限切れを一覧の上部に表示するソートも重要
- ボトムナビゲーションは「在庫 / 買い物 / AIレシピ」の3タブが自然
- 買い物リストに「購入済みにする」ボタンを置くと、買い物中にスマホで完了できて便利
- モーダルは画面下から出てくるスタイル（`items-end`）がスマホ操作に自然

### 次回セッションへの申し送り

- 次のステップは Google Sheets API の連携
- 必要な準備（ユーザーが手動でやる作業）:
  1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクト作成
  2. Google Sheets API を有効化
  3. サービスアカウントを作成してJSONキーをダウンロード
  4. 新しいGoogleスプレッドシートを作成して、サービスアカウントに編集権限を付与
  5. スプレッドシートIDをURLから取得
  - URLの形式: `https://docs.google.com/spreadsheets/d/{スプレッドシートID}/edit`

---

## 2026-04-18

### 技術的な気づき

- Google Sheets の `private_key` を `.env.local` に貼るときは値だけを貼る。`"private_key": "..."` のキー名ごとコピーするミスが起きやすい
- `GOOGLE_PRIVATE_KEY` はダブルクォートで囲む必要がある（`"-----BEGIN PRIVATE KEY-----\n..."` の形式）
- Next.js の `.env*` gitignore パターンはサブディレクトリの `.env.local` も対象になるが、Next.js 自体はルート直下の `.env.local` しか読まない
- サービスアカウントは JSON キーファイルを直接置くのではなく、中の `client_email` と `private_key` を環境変数に分けて管理する
- googleapis の `append` は空シートに対して行1から書き込むため、ヘッダー行を先に用意しておく必要がある

### 次回セッションへの申し送り

- 次は Gemini API によるレシピ・献立提案の実装
- `GEMINI_API_KEY` を `.env.local` に追加する
- `src/app/api/ai/suggest/route.ts` を新規作成
- AIタブのボタンを実際の API 呼び出しに接続する

---

---

## 2026-04-18（セッション2）

技術メモ:

- Gemini APIのモデル名は世代交代が早い。`gemini-1.5-flash`はすでに404、`gemini-2.5-flash-lite`が現在の最軽量安定版
- AI Studioの無料枠キーは「請求先アカウントなし」のプロジェクトで作成する（`gen-lang-client-*`形式）
- Google Cloudプロジェクトに紐づいたAPIキーはprepayment credits扱いになり、無料枠と別管理
- レート制限（10回/分）に引っかかると429エラー。テスト時は連続リクエストを避ける
- GeminiのレスポンスはJSONが` ```json ``` `で囲まれることがあるので正規表現で抽出する処理が必要

次回への申し送り:

- Phase 1コア機能がすべて完成（UI・Sheets連携・AI提案）
- 次はPhase 2: カメラ×レシートOCR、またはVercelへのデプロイ
- Vercelデプロイ時は環境変数（`GOOGLE_*`と`GEMINI_API_KEY`）をダッシュボードで設定する

---

<!-- 新しいセッションの記録はこのテンプレートをコピーして追記してください -->
<!--
## YYYY-MM-DD

**技術的な気づき**
- 記録

**UX・設計の気づき**
- 記録

**次回セッションへの申し送り**
- 記録
-->
