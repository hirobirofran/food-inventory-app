# #51 依存更新の定期運用（Dependabot）

## 現状（2026-10-24）

- 完了。PR #58 を 2026-10-15 05:56 頃にオーナーがマージ（main `68d1ea7`）。完了条件 2 件を根拠付きでチェックし（1 件は取り下げ）、Claude Code が #51 を閉じた
- 入ったもの: `.github/dependabot.yml`（新しいバージョンの確認は週 1 回・月曜 09:00 Asia/Tokyo。npm はメジャー更新も含めて全部 1 本の PR、GitHub Actions も全部 1 本の PR。cooldown 7 日）。`ci.yml` は `node-version-file: .nvmrc` への変更のみ
- 運用（オーナー決定）: メジャー更新で CI が失敗したり実機で動かなかったりしたら、Dependabot のブランチにコミットを足して直す。マージの条件は CI が通ることと Vercel プレビューでの動作確認（メジャー更新の話。マイナー・パッチの扱い、表示確認が要るパッケージの線引き、版の選び方は `docs/adr/0001-dependency-update-policy.md` が優先）
- マージ直後に Dependabot が PR #60（GitHub Actions 2 件、CI 通過）と #61（npm のメジャー 5 件。lint が失敗: eslint-config-next の typescript-eslint が TypeScript 7.0 に未対応）を作成。扱いは各 PR で判断
- GitHub の Settings → Advanced Security の Dependency graph / Dependabot alerts / Dependabot security updates は有効。Grouped security updates は OFF（脆弱性の修正 PR は 1 件ずつ来る）

## 再開手順

- 無し（完了）。Dependabot の PR の扱いは各 PR で判断する。Issue #51 本文の「やること」1・3 は着手前の案で、実際の設定は `dependabot.yml` と Issue のコメント（2026-10-15）が正

🤖 Generated with [Claude Code](https://claude.com/claude-code)
