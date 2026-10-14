# #37 依存パッケージの更新

## 現状（2026-10-15）

- PR #52（ドラフト、ブランチ `chore/deps-audit-37`、`17b9692`）でオーナーのレビュー待ち。本文は新テンプレートの構成に書き直し済み
- 変更: next / eslint-config-next 16.4.0、react / react-dom 19.3.0、未使用の next-pwa と @google-cloud/local-auth を削除、@google/genai・tsx・tailwindcss・eslint を同メジャー内で更新、`npm audit fix`（--force なし）、engines.node と .nvmrc を 24.x
- `npm audit` 26 → 5。残り 5 件は eslint-config-next → fast-glob → micromatch → braces 3.0.3（最新。修正版なし。lint 専用の dev 依存）。`npm audit --omit=dev` は 0 件。完了条件 1「audit 0 件」の読み替えはオーナー判断待ち
- lint・test 29 件・tsc・build・CI・本番/デモのプレビューはすべて通過。セルフレビュー（Minor 4）、Codex（指摘なし、オーナーが起動）、`/code-review 52 --comment`（7 件。lockfile の engines 反映と SETUP.md の Node 版を修正 `17b9692`、@types/node 24 は `handoff/ideas/node-types-24.md`、ci.yml の .nvmrc 参照は #51、ARCHITECTURE.md は #19、eslint 10 は #51 の Dependabot）まで完了

## 再開手順

1. 残る 5 件（braces）の扱いと完了条件の読み替えについて、Issue #37 のコメントでオーナーの判断をもらう（相談は投稿済み）
2. オーナーのレビュー指摘があれば対応し、各スレッドに返信する
3. Vercel のビルドログで Node 24 が使われていることは未確認（MCP が別チームのスコープで 403、CLI 未導入）。オーナーがダッシュボードで確認できる

## 派生

- #51 依存更新の定期運用（Dependabot。Renovate との比較付き）。#37 の後
- #19 に next-pwa 削除で古くなった docs 2 箇所をコメント済み

🤖 Generated with [Claude Code](https://claude.com/claude-code)
