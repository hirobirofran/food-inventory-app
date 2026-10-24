# Issue の置き場: GitHub

このリポジトリの Issue と仕様は GitHub Issues にある。操作は `gh` CLI で行う。

## このリポジトリの先行ルール

CLAUDE.md の「コードレビューの手順」と「Issue の完了条件と閉じ方」が優先する。特に:

- Issue 本文は `.github/ISSUE_TEMPLATE/issue.md`、PR 本文は `.github/pull_request_template.md` の構成で書く（`gh` で本文を渡すとテンプレートは自動で入らない）
- `Closes` / `Fixes` / `Resolves` と Issue 番号の組み合わせを、PR 本文にもコミットメッセージにも書かない。Issue の参照は `Issue: #番号`
- Issue はマージで自動クローズしない。完了条件が全部チェックされてから Claude Code が閉じる
- Issue・PR・コメントを作る前に、本文の案を見せてオーナーの ok を得る

## 操作

- 作る: `gh issue create --title "..." --body-file <file>`（複数行の本文はファイルで渡す）
- 読む: `gh issue view <number> --json number,title,body,labels,comments`
- 一覧: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`。`--label` と `--state` で絞る
- 親子にする: `gh issue create --parent <parent> ...`、または後から `gh issue edit <parent> --add-sub-issue <child>`（gh 2.94 以上）。古い gh では `gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>`（database id。下の「ブロック」と同じ）。サブ Issue が使えないときは、子の本文の先頭に `Part of #<parent>`
- コメント: `gh issue comment <number> --body-file <file>`
- ラベル: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- 閉じる: `gh issue close <number> --comment "..."`（完了条件が全部チェックされた後）

リポジトリは `git remote -v` から分かる。clone の中で動かせば `gh` が自動で判定する。

## PR を要望の入口にするか

**PR を要望の入口にする: no。**（外部からの PR を機能要望として扱うなら `yes` にする。`/triage` がこのフラグを読む）

`yes` のときは、Issue と同じラベルと状態で PR も扱う。

- 読む: `gh pr view <number> --comments`、差分は `gh pr diff <number>`
- 外部 PR の一覧: `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] | select(.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not) | {number, title, author: .user.login, author_association, labels: [.labels[].name]}'`
- コメント・ラベル・閉じる: `gh pr comment`、`gh pr edit --add-label` / `--remove-label`、`gh pr close`

GitHub は Issue と PR で番号を共有するので、`#42` は `gh pr view 42` を試し、無ければ `gh issue view 42` で解決する。

## スキルが「issue tracker に publish する」と言ったら

GitHub Issue を作る（上の先行ルールのとおり、本文の案を見せて ok の後）。

## スキルが「該当するチケットを取る」と言ったら

上の「読む」のとおりに読む。

## Wayfinding の操作

`/wayfinder` が使う。map は 1 つの Issue、子 Issue がチケット。

- Map: `wayfinder:map` ラベルの Issue 1 つ（Notes / Decisions-so-far / Fog を本文に持つ）。`gh issue create --label wayfinder:map`
- 子チケット: map のサブ Issue（上の「親子にする」）。サブ Issue が使えなければ map 本文のタスクリストに加え、子の先頭に `Part of #<map>`。ラベルは `wayfinder:<type>`（research / prototype / grilling / task）。着手したら担当の開発者を assign
- ブロック: GitHub の Issue dependencies。`gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`。`<blocker-db-id>` はブロッカーの database id（`gh api repos/<owner>/<repo>/issues/<n> --jq .id`。`#番号` や `node_id` ではない）。GitHub は `issue_dependencies_summary.blocked_by`（open なブロッカーの数）を返す。使えなければ子の先頭に `Blocked by: #<n>, #<n>`。全部のブロッカーが閉じたら解除
- Frontier: map の open な子を列挙し、open なブロッカーがあるもの（`blocked_by > 0`、または `Blocked by` 行に open な Issue）と担当者がいるものを除き、map の順で先頭を選ぶ
- Claim: `gh issue edit <n> --add-assignee @me`（セッション最初の書き込み）
- Resolve: `gh issue comment <n> --body-file <file>` → `gh issue close <n>` → map の Decisions-so-far にポインタ（gist とリンク）を追記
