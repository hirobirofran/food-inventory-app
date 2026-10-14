# #51 依存更新の定期運用（Dependabot）

## 現状（2026-10-15）

- PR #58（ドラフト、ブランチ `chore/dependabot-51`、設定の最終コミット `799c47e`）でオーナーのレビュー・マージ待ち
- 入るもの: `.github/dependabot.yml`（新しいバージョンの確認は週 1 回・月曜 09:00 Asia/Tokyo。npm はメジャー更新も含めて全部 1 本の PR、GitHub Actions も全部 1 本の PR。cooldown 7 日）。`ci.yml` は `node-version-file: .nvmrc` への変更のみ
- レビュー: セルフレビュー（Important 2 件、対応）→ Codex（P1 1 件、対応）→ `/code-review 58 --comment`（7 件。対応 6 件、一部対応 1 件）→ オーナーの質問 1 件（回答）。全スレッドに返信済み。Codex の再レビューは `799c47e` に対して起動済み（結果は PR #58 を見る）
- オーナーの決定（2026-10-15）: メジャー更新も Dependabot の PR で受け取る。CI が失敗したり実機で動かなかったりしたら、Dependabot のブランチにコミットを足して直す（「PR を閉じて Issue を起票」はやめた）。マージの条件は CI が通ることと Vercel プレビューでの動作確認。`workflow_dispatch` は使う場面が無いので外し、完了条件「CI を手動で起動できる」は取り下げ
- `ignore` でメジャー更新を除外する案はやめた。公式リファレンスで、`ignore` はメジャー更新が要る脆弱性修正の PR も止めることを確認したため
- GitHub の Settings → Advanced Security の Dependency graph / Dependabot alerts / Dependabot security updates はオーナーが有効化済み（API で確認）。Grouped security updates は OFF のまま（脆弱性の修正 PR は 1 件ずつ来る）
- 完了条件: 「Dependabot alerts と security updates が有効」はチェック済み。残りは「`dependabot.yml` が入り、最初の PR で CI が通る」で、マージ後に確認する

## 再開手順

1. PR #58 がマージされたら、GitHub の Insights → Dependency graph → Dependabot で `dependabot.yml` に設定エラーが出ていないことを確認する
2. 最初の Dependabot の PR（次の月曜 09:00 の定期確認、または脆弱性の修正 PR）で CI が通ることを確認し、Issue #51 に根拠（PR の URL）をコメントして完了条件にチェックを入れる。全部にチェックが入ったら Claude Code が Issue を閉じる
3. 最初の PR に `@types/node` 24 のようなメジャー更新が入っていたら、CI と Vercel プレビューで確認してマージする（`handoff/ideas/node-types-24.md`）
4. Issue #51 本文の「やること」1・3 は着手前の案で、実際の設定は `dependabot.yml` と Issue のコメント（2026-10-15）が正

🤖 Generated with [Claude Code](https://claude.com/claude-code)
