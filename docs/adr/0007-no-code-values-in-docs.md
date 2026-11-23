---
status: accepted
date: 2026-11-24
---

# ドキュメントに、コードにある定義値を書かない

コードコメントも対象にする。
定義値を書く理由があるときは、書く前にオーナーに相談する。

## 理由

同じ値を二重管理すると、コードを変えたときにドキュメントがずれる。

## 出典

1. 2026-11-06 17:47Z、オーナー、[PR #101 のレビュー](https://github.com/hirobirofran/food-inventory-app/pull/101#pullrequestreview-5804518614)。
   ずれる記載をやめ、意味もなく二重管理しないよう指示した。コードコメントも含むとした。
2. 2026-11-06 17:57Z、オーナー、[Issue #19](https://github.com/hirobirofran/food-inventory-app/issues/19) の完了条件。
   最新はコードで指し、理由があれば相談に応じるとした。
3. 2026-11-23 20:51Z、オーナー、[PR #122 のレビュー](https://github.com/hirobirofran/food-inventory-app/pull/122#discussion_r4671851604)。
   コードにもある定義値を書かないよう指示した。
4. 2026-11-23 20:58Z、オーナー、Claude Code のチャット。
   [Issue #105 の要件定義の変更](https://github.com/hirobirofran/food-inventory-app/issues/105#issuecomment-7113835190)に ok した。

## 関連

- Issue #105（この ADR）、Issue #19（ドキュメントと実態の整合）

🤖 Generated with [Claude Code](https://claude.com/claude-code)
