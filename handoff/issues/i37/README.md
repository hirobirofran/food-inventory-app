# #37 依存パッケージの更新

## 現状（2026-10-15）

- 完了。PR #52 を 2026-10-15 03:42 頃にオーナーがマージ（main `3207a1b`）。Issue #37 は自動でクローズ。完了条件 1「audit 0 件」は「修正版の無い dev 依存を除いて 0 件（`npm audit --omit=dev` で 0 件）」と読み替えることにオーナーが OK（#37 のコメント）
- 残る audit 5 件は eslint-config-next → fast-glob → micromatch → braces 3.0.3（修正版なし、lint 専用）。メジャー更新の追従は #51 の Dependabot で扱う
- Vercel の Node.js Version は 24.x（デプロイ 17b9692 の Deployment Settings → Runtime Settings で確認。engines.node から決まる）。Vercel の MCP はこのチームのスコープで 403 になるため、ダッシュボードは Chrome 拡張（claude-in-chrome）で読んだ

## 再開手順

- 無し（完了）

## 派生

- #51 依存更新の定期運用（Dependabot。Renovate との比較付き）。#37 の後
- #19 に next-pwa 削除で古くなった docs 2 箇所をコメント済み

🤖 Generated with [Claude Code](https://claude.com/claude-code)
