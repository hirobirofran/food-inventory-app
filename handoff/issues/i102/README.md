# Issue #102 の引き継ぎ

## 現状

- 完了。Issue #102 は 2026-11-23 に閉じた（完了条件 2 つとも根拠付きでチェック済み）
- 決まりは `docs/adr/0004-docs-frontmatter.md`（accepted）。対象の 7 本へのフロントマター付与は PR #104、accepted にしたのは PR #116
- PR #116 で、ADR の status から `proposed` をやめた。ADR は `accepted` で書いて PR に出し、オーナーのマージを決定とする（`docs/agents/domain.md`）

## 失敗（根拠付き）

- 設計中に、`docs/SETUP.md` の description を「そのまま文書目的として読める」と書いた。オーナーから、description は説明欄で、目的とも扱う範囲とも別の項目だと訂正された（2026-11-07、セッション 4e587ff5）。purpose を下書きするときは、内容の要約を書かず、WHY を書く
- PR #104 の ADR を、main に別の ADR-0003 が入った後も 0003 のままにしていた。`/code-review` の指摘（https://github.com/hirobirofran/food-inventory-app/pull/104#discussion_r4666774257 ）で 0004 に改名した。ADR の番号は、PR を出す前と main を取り込んだときに、main の `docs/adr/` と照らす
- PR #104 を `status: proposed` のままマージに回し、status だけを変える PR #116 が別に要った。オーナーから「無駄PR」「マージしても proposed であるユースケースがあるのか」と指摘された（2026-11-23 14:4xZ、Claude Code のチャット）。使い道の無い状態だったので、PR #116 で proposed 自体をやめた

## 再開手順

無し（完了）。フロントマターの決まりを変えるときは、ADR-0004 を新しい ADR で置き換える。

🤖 Generated with [Claude Code](https://claude.com/claude-code)
