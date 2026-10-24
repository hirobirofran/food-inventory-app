---
status: accepted
date: 2026-10-24
decided_by: オーナー
---

# 記録の置き場と更新の仕方: 引き継ぎは handoff/ に ok の後で main 直、決定は ADR に Issue と PR で

作業の引き継ぎと、決めた方針を、どこに書き、どう更新するかを決めた。

1. **作業の引き継ぎは `handoff/` に書く。Claude Code のメモリだけに書くのは引き継ぎにならない。** Issue の作業は `handoff/issues/i<N>/`、Issue の無い PR（Dependabot の PR など）の作業は `handoff/prs/pr<N>/`。どちらも `README.md` に「現状」「失敗（根拠付き）」「再開手順」を書く。失敗は 1 件ごとに「何をした／根拠／正しくは」の 3 点を書く。根拠は UTC の時刻、GitHub のコメント ID やコミット、オーナーの発言の要旨、Claude Code のセッション ID（先頭 8 桁）で、後任がログを読み直さずに確かめられるようにする。経緯の全文は書かない（git と GitHub に残る）。理由: 2026-10-23〜24 の脆弱性対応で、5 セッション（`handoff/prs/pr67/README.md` の失敗 6）が引き継ぎをメモリにだけ残し、すでにあった `handoff/` に書かなかったため、次のセッションが同じ調査を繰り返した。失敗を書いても根拠が無ければ後任は確かめられず、根拠の無い初稿はオーナーが差し戻した
2. **更新の仕方は置き場で分ける。** `handoff/` は、本文の案を見せてオーナーの ok を得たら main に直接コミットする（PR は作らない）。ADR は、Issue を起票してから PR で入れる。Issue と PR には「なぜ記録するか」を中心に書き、PR は CLAUDE.md のレビュー手順を通す。どちらの置き場でも、Issue 本文・PR 本文・新規ファイルは、案を見せて ok を得る前に作らない（`docs/agents/issue-tracker.md`）。理由: handoff はその Issue や PR の作業にだけ効く記録で、リポジトリ全体の方針ではない。ADR は以後のすべての作業の進め方を変える準ルールなので、できた経緯を後任が辿れるように Issue と PR に残し、レビューで多面的に確かめる。ok 無しに作った ADR の PR #70 は却下され、ok 無しに起票した Issue #75 もいったん閉じられた（出典 3）

## 出典

1. 2026-10-24 07:05Z〜07:33Z、オーナー、Claude Code のチャット（セッション c143d165）。経緯を記録するファイルが無いのかと問い、すでにある `handoff/` を使って引き継いでいないことを指摘。Issue #68 と PR #67 それぞれの失敗を handoff に書き、ログから根拠を付けて後任が理解できるようにせよと指示。書き直した本文に 07:33Z に ok し、直後に `handoff/issues/i68/README.md` と `handoff/prs/pr67/README.md` を main `2fa1ee3` に直接コミット（07:34Z）
2. 2026-10-24 07:44Z、オーナー、同（ADR 導入 #71 の進め方）。ADR は main 直でもよい作業内容だが、できた経緯を後任が分かるように Issue と PR で残したい。Issue と PR には設計ではなく「なんで追加するのか」を中心に書く。PR にすればレビューもできる、と指示
3. 2026-10-24 08:22Z、オーナー、同（PR #72 のマージ後）。ADR の更新は起票を前提にするのが無難か（準ルールの置き場所だから）、handoff は main 直でよいか、と問い、Claude Code が「ADR は Issue と PR、handoff は ok の後に main 直」の分け方を答えた。この分け方を accepted の ADR として記録すると書いた Issue #75 の本文（完了条件 2 に分け方の中身、考察に status accepted）に、オーナーが 11:58Z に ok。この ok を決定の日時とする。起票は 08:54Z に ok 無しで行われ 11:29Z に閉じられ、本文の ok の後 11:59Z に再オープン
4. `docs/agents/issue-tracker.md`（PR #72、2026-10-24 マージ）。Issue 本文・PR 本文・新規ファイルは案を見せて ok の後に作る（オーナー指示、2026-10-24。PR #70 の却下が理由）

## 関連

- CLAUDE.md「引き継ぎ情報の置き場所（`handoff/`）」
- `docs/agents/domain.md`（ADR の運用。status と出典の書き方）、`docs/agents/issue-tracker.md`（ok が要る範囲）
- `handoff/issues/i68/README.md`、`handoff/prs/pr67/README.md`（失敗を根拠付きで書いた実例。発言は原文で引用している。この ADR の「要旨」の決めより前の 07:33Z に ok を得て入ったもの）
- Issue #71 / PR #72（ADR の導入）、Issue #75 / PR #76（この ADR）

🤖 Generated with [Claude Code](https://claude.com/claude-code)
