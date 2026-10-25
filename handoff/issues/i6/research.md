# #6 の調査結果（2026-10-25、セッション 634afc1c）

確かめられなかったものは「未確認」と書いた。識別子は書いていない。

## 1. リポジトリの現状（main a7fba73 時点）

- SA 鍵を使うのは `src/lib/sheets.ts` と `scripts/seed-demo.ts` の 2 か所。読む環境変数は `GOOGLE_SERVICE_ACCOUNT_EMAIL`・`GOOGLE_PRIVATE_KEY`・`GOOGLE_SPREADSHEET_ID`・`DEMO_SHEET_ID`
- Gemini は `GEMINI_API_KEY` で、Vertex AI ではない（Vertex AI に移す案は `handoff/ideas/vertex-ai-keyless.md`）
- 依存: `googleapis` 185。`google-auth-library` は直接の依存に無い（lock に 2 系統）。`@vercel/oidc` は未導入
- Terraform のファイルは無い。`.github/workflows/ci.yml` はテスト・tsc・lint だけで、GCP の認証は無い
- `.env.local.example` は `npm run seed:demo` 用。SA のメールと鍵が載っている
- 本番とデモは別の Vercel プロジェクト、別のスプレッドシート。GCP のプロジェクトと SA が同じかは未確認

## 2. Terraform と GitHub Actions

- GitHub↔GCP の WIF が要るのは、Terraform を GitHub Actions で動かすとき。手元で動かすなら gcloud の ADC で足りる
- state の置き場: GCS バケットが定番。最初のバケットは手で作る（Terraform で作るとバケットが無い状態で state を置けないため）。HCP Terraform は GitHub から使うのに HCP のトークンが要る

## 3. Vercel

- Terraform provider（vercel/vercel）の認証は `api_token`（`VERCEL_API_TOKEN`）だけ: https://github.com/vercel/terraform-provider-vercel/blob/main/docs/index.md
- API トークンの範囲は Full Account／Team／Project の 3 つ。期限を付けられる。Project でも、そのプロジェクトの読み書きは全部できる: https://vercel.com/docs/accounts/access-tokens
- OIDC 連携ポリシー（GitHub の OIDC トークンを短期の Vercel トークンに交換）はある: https://github.com/vercel/terraform-provider-vercel/blob/main/docs/resources/oidc_federation_policy.md 。`client` は `vercel`（CLI）か `turborepo`。公式の手順があるのは Turborepo のキャッシュ（https://vercel.com/docs/monorepos/remote-caching/external-ci-cd）とコンテナレジストリ（https://github.com/vercel/vcr-action）だけ
- CLI のソース（vercel/vercel、2026-09 時点）で OIDC を認証に使うのは blob と `vcr login` だけ。env・project・deploy には無い
- 公式ページ（2026-08-13）: GitHub Actions から Vercel を操作するには今は固定の `VERCEL_TOKEN` が要る: https://vercel.com/i/oidc-federation-ci-tokens 。Vercel は API と CLI の OIDC 対応を予告しているが時期は未確認: https://vercel.com/blog/death-to-long-lived-static-credentials
- Vercel の GitHub App は Vercel が GitHub を読む向きで、GitHub Actions が Vercel を操作する権限にはならない
- `vercel_project_environment_variable` は sensitive な変数を import すると値が null になる（Vercel を Terraform にしないので今回は使わない）

## 4. Vercel→GCP の WIF（アプリの実行時）

- 公式手順: https://vercel.com/docs/oidc/gcp 。`@vercel/oidc` の `getVercelOidcToken()` を `subject_token_supplier` にし、`google-auth-library` の `ExternalAccountClient.fromJSON()` で SA の権限を借りる
- Functions ではトークンがリクエストの `x-vercel-oidc-token` ヘッダで来る（ビルド時は `VERCEL_OIDC_TOKEN`）。`getVercelOidcToken()` はリクエストの中で呼ぶ: https://vercel.com/docs/oidc/reference
- `sub` は `owner:<team>:project:<project>:environment:<environment>`、`aud` の既定は `https://vercel.com/<team>`。トークンの期限は Function 2 時間
- 設定画面: Project → Settings → Security の「Secure backend access with OIDC federation」（Team／Global）。既定でオンかは未確認

## 5. ローカル（seed）

- `gcloud auth application-default login --impersonate-service-account <SA>`。自分のアカウントに対象 SA の Token Creator が要る。Sheets は今と同じく SA のメールにシートを共有する
- この方式で Sheets のスコープが付くかは未確認（Google の ADC の文書は Google Cloud 外のスコープについて OAuth クライアント ID を使う方法を書いている）。PR-B の最初に実機で確かめる

## 6. 取り下げた案: Cloud Run への移行

- Vercel をやめて Cloud Run で動かせば、鍵も Vercel→GCP の WIF も Vercel のトークンも要らない。手間は約 20〜34 時間（推測、根拠なし）。PR ごとのプレビューを自前で組む必要があり、Google ログインの戻り先 URL も変わる。Firebase App Hosting は Next.js 16 の対応が書かれておらず外した
- オーナーがローカルの Vercel CLI を選んだため（Q4）取り下げた

🤖 Generated with [Claude Code](https://claude.com/claude-code)
