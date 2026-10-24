# #75 「記録の置き場と更新の仕方」を ADR として記録する

時刻はすべて UTC（日本時間は +9 時間）。「セッション」は Claude Code の会話記録（ID は先頭 8 桁）。

## 現状（2026-10-24）

- PR #76 をオーナーがマージ（13:22:28Z、main `934ae92`）。ADR-0002 `docs/adr/0002-record-locations-and-updates.md`、索引の行、CLAUDE.md「引き継ぎ情報の置き場所」、`docs/agents/domain.md` の 1 行が main にある
- Issue #75 は OPEN。完了条件 3 件のチェックと close は起票者のセッション（c143d165）が行う（オーナー指示 13:22Z）。実装したセッション（3852aa18）は触らない
- オーナーの判断（PR #76 本文「特にレビューしてほしい観点」に記録）: status は accepted のまま、根拠はオーナーの発言（09fff9c）。失敗の根拠の発言は要旨か原文（0d07dce）。起票者と実装者を分ける運用はケースバイケースで、ADR に書かない
- 関連して main に入れたもの: `handoff/ideas/passkey-login.md` と索引の行の削除（a768bc0、オーナー「消す」）。`handoff/issues/i1/README.md` と `handoff/ideas/item-data-model.md` の参照は残る（未指示）

## 失敗（根拠付き）

### 1. 前セッションの下書きを、検証せずに ok を求めた

- 何をした: 起票者セッションが残した未コミットの ADR 下書きを、「出典 2 は未検証」と添えてそのまま見せ、ok を求めた（セッション 3852aa18、12:1xZ）
- 根拠: オーナー「Issue 以外は破棄して構わない。お前が把握していないものは許可しない。お前が作ったものは Issue 起票者がレビューする」
- 正しくは: 引き継いだ下書きは捨て、Issue 本文（ok 済み）と一次資料（セッションログ・GitHub・git）から自分で書く。出典はログで確かめる

### 2. ブランチをローカル main から切り、無関係な削除が PR に混入した

- 何をした: ローカル main（6cb3dd1、オーナーの未 push コミット、passkey-login.md の削除）からブランチを切ったため、PR #76 の差分にその削除が入り、GitHub では CONFLICTING になった
- 根拠: Codex の P2（コメント 4367114633、12:28Z）、起票者セッションの返信（4367127826）、/code-review（4367134020）の 3 つが指摘
- 正しくは: ブランチは `origin/main` から切る。PR を作る前に `git diff --stat origin/main` で差分のファイルが Issue の範囲だけか見る。直し方は `git rebase --onto origin/main <混入コミット>` と force push（2fecb9f）

### 3. 判断を 4 件まとめて、用語の説明なしに聞いた

- 何をした: status / accepted / proposed、失敗の根拠、発言の要旨、ローカル main の分岐を、説明なしに 1 メッセージで聞いた（12:4xZ）
- 根拠: オーナー「すまんがわからん」「1 つずつしかわからない」「何に困っているのか なぜそうしたいのか 選んだらどうなるのか 選ばないとどうなるか」
- 正しくは: 1 件ずつ。用語は先に説明し、「困っていること／直したい理由／選ぶと／選ばないと」の 4 点で聞く

## 再開手順

- 起票者セッション: Issue #75 の完了条件 3 件を main `934ae92`（ADR と索引、CLAUDE.md の参照）を根拠にチェックし、根拠をコメントして閉じる
- 実装側の残作業は無し

🤖 Generated with [Claude Code](https://claude.com/claude-code)
