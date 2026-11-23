---
status: accepted
date: 2026-11-24
---

# Issue の完了条件は、「修正方法（HOWやWHERE）」ではなく「どういう状態にするか（GOALやSTATE）」で書く

Issue の完了条件の書き方を決めた。

## 決め

- 完了条件には、Issue が終わったときに達成しているはずのなし得た状態を書く。
- 修正方法（HOWやWHERE）は、完了条件に書かない。

例:

- 悪い例: `src/app/layout.tsx` の `description` に「PWA」と書かれていない

## 理由

- 修正方法は起票者が指定しないため（禁止事項）
- どう直すかを起票者が指定してはいけない。どうなってほしいかを指定する。
- Issue #19 では、はじめの完了条件が、確かめるファイルを名指ししていた。名指しの外の `src/app/layout.tsx` にも、同じ種類のずれ（説明文の「PWA」）があった。このずれは対象の外として残され、PR #99 のマージの後に Issue が閉じられた。
- 悪い例は、Issue #19 を開け直したときに出た案で、これも直す場所を名指ししていた。

## 出典

1. 2026-11-06 17:49Z、オーナー、Claude Code のチャット（セッション 55874853）。Issue #19 を開け直したときに、Claude Code が直す場所を名指しした完了条件を足す案を出した。オーナーはこれを却下し、完了条件は直し方の指示ではなく、どういう状態にするかを書くものだと示した
2. 2026-11-06 20:21Z、Issue #106 の本文。出典 1 の方針と、Issue #19 の抜け（`handoff/issues/i19/README.md` の失敗 4 と 9）を、Claude Code が記録した
3. 2026-11-23 18:55Z、オーナー、Claude Code のチャット（セッション 891eef4c）。Issue #106 の要件定義を承認した（https://github.com/hirobirofran/food-inventory-app/issues/106#issuecomment-7110866868 ）。Issue テンプレートと CLAUDE.md からこの ADR を読めるようにすることは、Claude Code の提案

## 関連

- `docs/adr/0003-define-requirements-before-implementing.md`（着手時の要件定義で、完了条件を書き直す）
- `.github/ISSUE_TEMPLATE/issue.md`（完了条件の欄）
- CLAUDE.md「Issue の完了条件と閉じ方」（完了条件の書き方の 1 項目）
- Issue #19（起きたこと）、Issue #106（この ADR）

🤖 Generated with [Claude Code](https://claude.com/claude-code)
