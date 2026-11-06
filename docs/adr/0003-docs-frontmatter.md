---
status: proposed
date: 2026-11-07
decided_by: オーナー
---

# 人が読むために書いた文書には、title・audience・purpose・updated のフロントマターを付ける

人が読むために書いた文書の先頭に、フロントマター（ファイル先頭の `---` で囲んだ項目欄）を付けるかどうか、どの項目を書くか、どの文書に付けるかを決めた。

1. **項目は title・audience・purpose・updated の 4 つにし、description は使わない。** `title` は題名。`audience` は想定読者で、誰が読むかと、その人がすでに知っていること（前提知識）を書く。`purpose` は文書目的で、なぜこの文書があるのか、読む人は何を得るのか、何を伝え何を残したいのかを書く。「〜の手順です」のような内容の要約は書かない。`updated` は中身を変えた日付で、中身を変えたら書き換える。更新漏れを自動で確かめる仕組みは、今は作らない。理由: updated があれば、git の履歴を見なくても、文書を開いただけでいつの内容かがわかる。更新は日付を書き換えるだけで手間がかからない。description は内容を説明する欄で、目的とは別のものなので、purpose に置き換える
2. **付けるのは、人が読むために書いた文書。** 今はルートの `README.md`、`docs/` の `VISION.md`・`ARCHITECTURE.md`・`SETUP.md`・`KNOWLEDGE.md`・`TASKS.md`、`docs/adr/README.md` の 7 本。人向けの文書を新しく作るときも付ける。README を対象にするのは、外部の人がまだ何も知らないときに読む文書で、数行で想定読者と目的がわかると助かるから。ルートの README は長くなりがちで、目的を先に書けば書きすぎを防げる。次の文書には付けない
   - エージェント向けの文書（`CLAUDE.md`、`AGENTS.md`、`docs/agents/`、`handoff/`）: updated を付ける意味が無く、かえって害になる。人間が読まないので、目的を書いても活かされない。人間向けでないことは置き場所でわかる
   - ADR の各ファイル: status などの専用のフロントマターを持つ。決まったことは書き換えず、新しい ADR で置き換える
   - `.github/` のテンプレート: 先頭の項目欄は GitHub が読む設定欄

## 出典

1. 2026-10-24 17:47Z、オーナー、PR #78 のレビューコメント（`docs/SETUP.md`）。SETUP.md にフロントマターを付けるよう指示した。付ける理由はどこにも記録されず、PR #101（2026-11-06）で理由を知らないまま updated を消す案が出た
2. 2026-11-06 19:07Z、Issue #102 の本文。updated の理由（git の履歴を見なくても文書を開いただけでいつの内容かわかる、人間も読むので役に立つ、更新は日付を書き換えるだけ）を、Claude Code がオーナーの記憶として記録した
3. 2026-11-06 19:50Z（日本時間 11-07 04:50）までに、オーナー、Claude Code のチャット（セッション 4e587ff5）。範囲・項目・付けない文書とその理由・README を対象にする理由・description をやめることを決め、Claude Code が Issue #102 のコメントに記録した（https://github.com/hirobirofran/food-inventory-app/issues/102#issuecomment-6694006290 ）

## 関連

- `docs/agents/domain.md`（ADR の運用）
- Issue #102 / PR #104（この ADR と、7 本へのフロントマターの追加）

🤖 Generated with [Claude Code](https://claude.com/claude-code)
