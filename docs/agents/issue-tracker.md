# Issue の置き場: GitHub

このリポジトリの Issue と仕様は GitHub Issues にある。操作は `gh` CLI で行う。

## このリポジトリの先行ルール

CLAUDE.md の「コードレビューの手順」と「Issue の完了条件と閉じ方」が優先する。特に:

- Issue 本文は `.github/ISSUE_TEMPLATE/issue.md`、PR 本文は `.github/pull_request_template.md` の構成で書く（`gh` で本文を渡すとテンプレートは自動で入らない）
- `Closes` / `Fixes` / `Resolves` と Issue 番号の組み合わせを、PR 本文にもコミットメッセージにも書かない。Issue の参照は `Issue: #番号`
- Issue はマージで自動クローズしない。完了条件が全部チェックされてから Claude Code が閉じる
- Claude Code が作る Issue・PR・コメントの末尾には署名を 1 回入れる（CLAUDE.md「Claude Code の署名」）

このリポジトリで足したルール（オーナー指示、2026-10-24）:

- Issue 本文・PR 本文・新規ファイルは、本文の案を見せてオーナーの ok を得てから作る（2026-10-23 に許可なく作った PR #70 が却下された）。CLAUDE.md のレビュー手順で決まっているコメント（レビュー指摘のスレッド返信、完了条件の根拠、Codex の起動）は ok 不要
- `/triage` が wontfix にした要望の置き場は `handoff/ideas/`（`.out-of-scope/` は使わない）

## 操作

- 作る: `gh issue create --title "..." --body-file <file>`（複数行の本文はファイルで渡す）
- 読む: `gh issue view <number> --json number,title,body,labels,comments`
- 一覧: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`。`--label` と `--state` で絞る
- 親子にする: `gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>`（database id。`gh api repos/<owner>/<repo>/issues/<n> --jq .id` で取る）。gh 2.94 以上なら `gh issue create --parent <parent> ...` か `gh issue edit <parent> --add-sub-issue <child>` でもよい（`gh --version` で確かめる）。サブ Issue が使えないときは、子の本文の先頭に `Part of #<parent>`
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

🤖 Generated with [Claude Code](https://claude.com/claude-code)
