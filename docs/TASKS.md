# タスク一覧

## Issue 受け入れ条件のチェックルール

- 受け入れ条件のチェックは、条件を確かめた時点で入れる
  - コードを読めば確かめられる項目 → コードレビューで確認できた時点
  - 動かさないと分からない項目（フォーム・表示・シートへの読み書きなど）→ Vercel プレビューで操作して確認できた時点
  - マージはすべてにチェックが入ってから
- チェックを入れるときは、根拠（確認したコミット・方法）を PR か Issue のコメントに残す

## Phase 1: コア機能（進行中）

### ✅ 完了

- [x] Next.js 15 プロジェクト初期セットアップ（TypeScript + Tailwind CSS + PWA）
- [x] 食材の型定義 (`src/types/food.ts`)
- [x] 開発用モックデータ (`src/lib/mockData.ts`)
- [x] 食材一覧UI（検索・場所フィルター・賞味期限色分け）
- [x] 食材追加・編集・削除フォーム（モーダル）
- [x] 買い物リスト（最低在庫数を下回った食材を自動表示）
- [x] AIレシピタブのUI（ボタンのみ、API未接続）
- [x] ボトムナビゲーション（在庫 / 買い物 / AIレシピ）
- [x] ドキュメント整備（docs/ フォルダ）
- [x] Google Sheets API 連携（CRUD 完全実装、データ永続化）
- [x] GitHub リポジトリ公開・push

### 🔲 次にやること

- [x] **Gemini API によるAIレシピ・献立提案**（`gemini-3.5-flash-lite`、`@google/genai` SDK、無料枠。2026-09に旧 `gemini-2.5-flash-lite`／`@google/generative-ai` から移行）
  - `src/app/api/ai/suggest/route.ts` 実装
  - 在庫リストをプロンプトに埋め込む
  - オートクッカービストロ・ビストロレンジ・グルラボを使ったレシピを優先する指示
  - フロントエンドのAIタブに接続
- [x] **Vercel デプロイ**（本番 + デモ環境）
  - 本番: <https://food-inventory-app-nu.vercel.app/>
  - デモ: <https://food-inventory-demo.vercel.app/> （`NEXT_PUBLIC_APP_ENV=demo` でオレンジバナー表示）
  - 本番用とデモ用で別々のGoogleスプレッドシートを使用
- [x] **パスワードゲート認証**（家族共有パスワード、Cookie 署名ベース、Next.js 16 の `src/proxy.ts`）
- [x] **デモダミーデータ 37 件投入**（`npm run seed:demo` で `scripts/seed-demo.ts` を実行）
- [x] AI プロンプト改善（グルラボへの誤字修正、実在しないモード創作の禁止、非食材の組み込み禁止）

### 🔜 次のステップ

- [x] **セキュリティ更新 + Gemini移行 + lintのIssue #12修正**（2026-09、ブランチ `chore/security-deps-gemini-2026-09`）
  - Next.js 16.2.4 → 16.3.6（Critical含む既知脆弱性の緊急修正版）、React/ReactDOM 19.3.0 に整合
  - `@google/generative-ai`（非推奨）→ `@google/genai` へ移行、モデルを新規プロジェクト非推奨の `gemini-2.5-flash-lite` から `gemini-3.5-flash-lite` へ変更
  - 未使用だった `@google-cloud/local-auth` / `next-pwa` を削除、`tsx` を同メジャー内で更新し、`npm audit` を 0件に
  - `npm run lint` が `react-hooks/set-state-in-effect` で失敗していた件（Issue #12）を `src/app/page.tsx` の effect を ignore フラグ付きの直接 fetch に書き換えて解消（抑制コメントなし）
  - `package.json` の `engines.node` を `24.x`、`.nvmrc` を `24` に統一（Vercel は `engines.node` の major を優先しビルドに使う）
- [ ] AI 安全弁のローカルテストケース整備（歯磨き・ガム等をプロンプトに混ぜて、組み込まれないこと・器具で壊れないことを検証）
- [ ] デモ環境の定期リセット機構（cron で `seed:demo` を定期実行）
- [ ] 補充アサイン機能の設計（誰が買うか、常備しないフラグ）
- [ ] 賞味期限「不明」の UI 化
- [ ] バーコード+商品写真で Gemini Vision 登録 PoC
- [ ] Phase 2 着手（レシートOCR or Push通知）

---

## Phase 2: 便利機能（未着手）

- [ ] カメラ × Claude Vision でレシートを撮影 → 食材自動登録
- [ ] ブラウザ Push 通知（賞味期限アラート）
- [ ] 購入メール解析（Gmail API → Claude API で商品抽出）

---

## Phase 3: 高難度機能（将来）

- [ ] 食材の置き場所をカメラで記録
- [ ] ネットスーパー向け購入プラン生成（リンク付き）

---

## 進め方のルール

- 各セッションの最後にこのファイルを更新する
- 「次にやること」の先頭が次回セッションの開始タスク
- 詰まったこと・決めたことは `KNOWLEDGE.md` に記録する
