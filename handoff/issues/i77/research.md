# #77 調査結果（2026-10-24、出典付き）

起票者セッション a11918a6 がサブエージェント 2 本で調べた事実。実装者は出典を自分で確かめること。秘密情報と環境固有の識別子は書かない。

## 今のログイン（リポジトリの事実）

- ログイン画面 `src/app/login/page.tsx`、API `src/app/api/login/route.ts`。`SITE_PASSWORD` と `timingSafeEqual` で比較
- 強制は `src/proxy.ts` だけ。Cookie `auth` の値は `HMAC_SHA256(AUTH_COOKIE_SECRET, "ok")` で全員同じ。httpOnly、secure（production のみ）、sameSite=lax、maxAge 30 日。Cookie 自体に期限は無い
- 未ログイン時: `/api/*` は 401 JSON、それ以外は `/login?next=` へ。matcher は `/((?!_next/|favicon.ico|icon-|manifest|login|api/login).*)`
- ログアウトは無い。ログインのテストも無い（テストは `src/app/api/ai/suggest/route.test.ts` ほか 3 件のみ）
- API は `ai/suggest`、`foods`、`foods/[id]`、`login` の 4 系統。cron / health は無い
- 依存: 認証ライブラリは無い。`googleapis`、`@google/genai` のみ。Next.js 16.4.1、React 19.3.0、Node 24.x（`package.json`）
- 環境: 本番とデモの 2 プロジェクトが同じ main から同時デプロイ。差は環境変数のみ。確認用サイトはデモ側で、Vercel Authentication（Standard Protection）が ON、固定 URL は対象外（`docs/SETUP.md` 5 章、`handoff/issues/i1/vercel-settings.md`）
- Google Cloud は Sheets 用に使用中（`docs/SETUP.md` 2 章）。OAuth クライアント（ログイン用）は未作成

## Auth.js（next-auth v5）

- `npm view next-auth dist-tags`: latest 4.24.15、beta 5.0.0-beta.32。v5 は beta のまま。beta.32 の peer は next `^14.0.0-0 || ^15.0.0 || ^16.0.0`
- Next.js 16 の proxy: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`。export は default か名前付き `proxy`、runtime は Node.js 固定、matcher は定数。「proxy だけで認可を済ませない」と明記
- Auth.js の公式手順（Next.js 16+）: `proxy.ts` に `export { auth as proxy } from "@/auth"`。https://authjs.dev/getting-started/session-management/protecting
- 環境変数: `AUTH_SECRET`（必須）、`AUTH_GOOGLE_ID`、`AUTH_GOOGLE_SECRET`（自動検出）。`AUTH_URL` は通常省略可。アダプタ無しなら JWT セッション、既定 30 日。https://authjs.dev/getting-started/migrating-to-v5 、https://authjs.dev/reference/core
- 許可リスト: `callbacks.signIn` で `false` を返すと拒否（`AccessDenied`）。https://authjs.dev/reference/core
- 転送: `redirectProxyUrl`（環境変数 `AUTH_REDIRECT_PROXY_URL`）。Vercel の確認用サイト向けと公式に記載。転送元と転送先で `AUTH_SECRET` が同じ必要がある。https://authjs.dev/reference/core （実装者が該当節を確かめること。起票者は要旨のみ確認）
- 既知の問題: nextauthjs/next-auth#13388（open、2026-03-01）Next.js 16 で `signIn` を Server Action として呼ぶと `Configuration` エラー。HTTP ハンドラ経由（組み込みのサインイン画面、`/api/auth/signin/<provider>` へのフォーム POST）は動くと報告。#13498（closed）`next dev` で `MissingCSRF` が断続的に出る報告（16.3.x）。Next.js 16.4 + beta.32 での成功例は見つけられなかった
- 代替: Better Auth 1.7.12 は DB 無し（stateless）でも動くと公式に記載。Next.js 16 + Google の実例は見つけられなかった。https://www.better-auth.com/docs/concepts/database

## Google 側

- 同意画面（External）で非機密スコープだけなら審査は不要。https://support.google.com/cloud/answer/13463073
- テストモードは通常テストユーザー 100 人・7 日失効だが、name / email / profile だけを要求するアプリは例外で、テストユーザー登録不要・警告なし・7 日失効なし。他のスコープを 1 つでも足すと例外は効かない。https://support.google.com/cloud/answer/15549945 （実機未確認）
- 戻り先 URI は完全一致、ワイルドカード不可。localhost は HTTPS 必須の例外。https://developers.google.com/identity/protocols/oauth2/web-server
- Vercel のブランチ URL（`<project>-git-<branch>-<scope>.vercel.app`）は PR の間は固定なので、一時登録に使える（Vercel の仕様。実装者が確認用サイトの URL で確かめること）

## Terraform / Terragrunt（今回は入れない。#7 で別に）

- IAP OAuth Admin API は 2026-03-19 に停止。API で作れる OAuth クライアントは IAP 専用。汎用のウェブアプリ用クライアントを Terraform / gcloud で作れる根拠は見つけられなかった。https://docs.cloud.google.com/iap/docs/programmatic-oauth-clients
- Vercel provider: `vercel_project_environment_variable`。`sensitive` 必須。`value_wo`（Terraform 1.11 以降）なら state に値が入らない。`value` だと入る。import 可。https://github.com/vercel/terraform-provider-vercel/blob/main/docs/resources/project_environment_variable.md
- Issue #7 は OPEN（導入検討まで。Codex は「非本番 1 変数の PoC に縮小」と指摘）
- 環境変数の出入り: 消す 2（`SITE_PASSWORD`、`AUTH_COOKIE_SECRET`）、増やす 4（`AUTH_SECRET`、`AUTH_GOOGLE_ID`、`AUTH_GOOGLE_SECRET`、許可リスト）+ デモ Preview に `AUTH_REDIRECT_PROXY_URL`。本番 6 回、デモ 7〜14 回

## 未確認のまま残ること

- Next.js 16.4.1 + next-auth 5.0.0-beta.32 で `auth` を proxy に使った実成功例
- `redirectProxyUrl` が Vercel Authentication 付きの確認用サイトで動くか（Google からデモ固定 URL に戻り、そこから確認用サイトへ転送。確認用サイト側の Vercel ログインの Cookie はブラウザに残っている前提）
- 基本スコープだけの「テストモードのまま」運用の実機確認

🤖 Generated with [Claude Code](https://claude.com/claude-code)
