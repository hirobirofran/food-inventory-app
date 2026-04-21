# Issue #3 プラン: API キー/トークンのローテーション自動化

- 親 Epic: [hirobirofran/personal-counselor#3](https://github.com/hirobirofran/personal-counselor/issues/3)
- 子 Issue: [hirobirofran/food-inventory-app#3](https://github.com/hirobirofran/food-inventory-app/issues/3)
- 作業ブランチ: `feat/rotation-automation-issue-3`

本ファイルは Issue #3 の設計プラン概要。詳細な設計方針・マスキング要件は親 Epic を参照する。

---

## Context（なぜやるか）

2026-04-22 の Vercel インシデント対応（`chore/vercel-incident-2026-04` / issue #1）で「新鍵発行 → コピー → Vercel UI に貼る → 再デプロイ」の人手ループに詰まったことが直接のきっかけ。次回以降のローテを workflow 化して、**ユーザーの手数をゼロに近づける** のが本 Issue のゴール。

**ユーザー最大の関心事（本プランの中心テーマ）**:
ツール自身が使うシークレット（Vercel API Token, GCP 鍵管理用 SA, GitHub PAT など）を GitHub Secrets に投入する **bootstrap** は人間がやるしかない。この「初回の人手」をいかに **最小化・1 回で済ませる・今回のインシデント対応のついでに済ませる** 設計にするかが肝。

---

## 棚卸し: このリポのローテ対象

`_incident/checklist.md` から引き写し、自動化適性を付記。

| 優先 | 変数 | 自動化適性 | 備考 |
|---|---|---|---|
| 1 | `GOOGLE_PRIVATE_KEY` | ◎（GCP IAM API で鍵作成/無効化可） | 本丸。発行直後に `::add-mask::` 必須 |
| 1 | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | （鍵と連動） | 鍵発行時に確定 |
| 2 | `GEMINI_API_KEY` | △（公式 API の有無要調査） | 無ければ半自動（生成手動・反映自動） |
| 3 | `AUTH_COOKIE_SECRET` | ◎（`crypto.randomBytes` で生成可・外部依存ゼロ） | **MVP 最適** |
| 3 | `SITE_PASSWORD` | ✗（人間が決める性質） | 自動化しない |
| - | `GOOGLE_SPREADSHEET_ID` / `DEMO_SHEET_ID` | ローテ不要 | 識別子 |
| - | `NEXT_PUBLIC_APP_ENV` | ローテ不要 | 公開フラグ |

デプロイ先は **Vercel 本番 + デモ** の 2 環境。両方へ同期投入 → 両方再デプロイ → 両方で動作確認、が必要。

---

## 設計方針

### ① ツール用シークレット（メタシークレット）の bootstrap を一度だけ・最小集合で

GitHub Actions が使う「ツール側シークレット」= **人間が手で投入する対象**:

| Secret 名 | 用途 | 発行元 | ローテ経路 |
|---|---|---|---|
| `VERCEL_TOKEN` | Vercel env 書き換え・再デプロイ | Vercel ダッシュボード | 手動（年 1 想定） |
| `VERCEL_PROJECT_ID_PROD` / `_DEMO` | 対象プロジェクト識別 | Vercel ダッシュボード | 識別子（ローテ不要） |
| `GCP_ROTATOR_SA_KEY` | `GOOGLE_PRIVATE_KEY` ローテ用の **別 SA** 鍵 | GCP Console | 手動（メタ鍵。年 1 想定） |
| `GEMINI_ROTATOR_*` | Gemini 用（要調査） | Google AI Studio | 要調査 |

**ポイント**: メタシークレット群は **ローテ対象の SA/API とは別口座** で用意（権限分離）。ローテ実行用 SA には「鍵を作る・消す権限」のみ付与し、本番稼働で使う SA は別。

### ② インシデント対応とのシナジー（ユーザー最大期待の答え）

Day 2 以降の Vercel 投入・再デプロイ作業を workflow 置換できる余地がある。2 択:

- **A 案（安全・推奨）**: 今回インシデントは最後まで手作業で閉じ、**次回以降** から自動化。ただし **bootstrap 作業だけは「今ちょうど Vercel UI を開いている」タイミングで並走** させる（次回から自動化される状態で終わる）
- **B 案（野心）**: インシデント対応の Day 2 手順 C 以降を workflow に置換。本番稼働中の変更と並行するのでリスクあり

→ **A 案推奨**。

### ③ ワークフロー構成（MVP → 本丸）

すべて `workflow_dispatch`（手動トリガ）+ `schedule`（期限前自動）の 2 系統。

1. **`rotate-auth-cookie-secret.yml` （MVP / PoC）**
   - 外部 API 不要・依存最小。Vercel env 投入パイプラインの検証に専念
   - Node で `crypto.randomBytes(32).toString('hex')` → `::add-mask::` → Vercel API で本番/デモの env 上書き（sensitive 付き）→ 両環境再デプロイ → ログイン系ヘルスチェック
   - 動いたら以降はこのパイプラインを流用

2. **`rotate-google-private-key.yml` （本丸）**
   - `GCP_ROTATOR_SA_KEY` を使って GCP IAM API から対象 SA の新鍵発行 → `::add-mask::` → Vercel 本番/デモ env 上書き → 再デプロイ → Sheets 読み書きヘルスチェック → 成功時のみ旧鍵無効化
   - 失敗時は旧鍵を残すロールバック安全設計

3. **`rotate-gemini-api-key.yml` （API 有無に依存）**
   - 公式 API 無ければ「人間が新キー発行 → workflow_dispatch に値を渡す → workflow が Vercel 反映・動作確認・旧キー削除」の半自動化

### ④ マスキング・ログ汚染防止

親 Epic のマスキング要件を遵守:

- プロバイダから受けた新鍵は **受領直後に `::add-mask::`**（親 Epic 最大の穴指摘）
- シークレットは **env 経由**（CLI 引数は使わない）
- `set -x` / `ACTIONS_STEP_DEBUG` は本番で OFF
- サードパーティ Action は採用前に echo レビュー
- ダミー値ドライラン → ログ grep で `***` 位置を目視
- カナリアテスト（安全な文字列で境界検証）

### ⑤ 動作確認・ロールバック

- 各 workflow は「新値で疎通確認できるまで旧値を無効化しない」を必須
- 疎通確認は `/api/health` 等の軽量エンドポイント
- デモ/本番を同期投入 → 各々動作確認 → 両方 OK で旧値無効化

---

## Deliverables

### ドキュメント
- `docs/rotation/README.md` — 全体設計・ワークフロー一覧・運用ルール（本ファイルを基に清書）
- `docs/rotation/bootstrap-checklist.md` — **1 回こっきりの人手作業** 手順化
- `docs/rotation/adding-a-new-rotation.md` — 新規 env を仲間入りさせる手順

### ワークフロー
- `.github/workflows/rotate-auth-cookie-secret.yml`（MVP）
- `.github/workflows/rotate-google-private-key.yml`（本丸）
- `.github/workflows/rotate-gemini-api-key.yml`（API 調査次第）

### スクリプト
- `scripts/rotation/lib/vercel.ts` — Vercel env 上書き・再デプロイ共通処理
- `scripts/rotation/lib/masking.ts` — `::add-mask::` 発行ヘルパ
- `scripts/rotation/lib/healthcheck.ts` — 本番・デモ両方の疎通確認
- `scripts/rotation/auth-cookie.ts`
- `scripts/rotation/google-private-key.ts`
- `scripts/rotation/gemini-api-key.ts`

### プロジェクト docs
- `docs/TASKS.md` 更新（本 Issue 進捗・完了サマリ）
- `docs/KNOWLEDGE.md` 更新（ローテ自動化の学び・罠）

---

## 実装順序（3 Phase 分割）

1 PR に詰めると巨大になるので分割。親 Epic のマスキング要件があり、Phase ごとに人間レビューを挟みたい。

| Phase | スコープ | 成果 |
|---|---|---|
| **P1** | 棚卸し・設計ドキュメント・bootstrap-checklist | `docs/rotation/*` のみ。コード変更なし |
| **P2** | `rotate-auth-cookie-secret.yml` + 共通ライブラリ | MVP が動く。パイプライン検証完了 |
| **P3** | `rotate-google-private-key.yml` + `rotate-gemini-api-key.yml`（可能なら） | 本丸完了 |

直近で着手するのは P1（docs のみ）。P2 以降は bootstrap が整ってから着手。

---

## 残リスク・未決（本 Issue で閉じないもの）

- **メタシークレット自身のローテ**: `VERCEL_TOKEN` / `GCP_ROTATOR_SA_KEY` 自体のローテは親 Epic の「本体ツール自身のシークレット」残件
- **2FA 必須プロバイダ**: 親 Epic の A-case。本 Issue のスコープ外
- **Google AI Studio 公式 API 有無**: P3 着手前に決着
