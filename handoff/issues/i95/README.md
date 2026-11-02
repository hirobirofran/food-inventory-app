# #95 googleapis 本体を Sheets 専用の @googleapis/sheets に置き換える

時刻はすべて UTC（日本時間は +9 時間）。「セッション」は Claude Code の会話記録（ID は先頭 8 桁。再開用だけ全桁）。

## 現状（2026-11-02 04:3xZ 時点。PR #98 はドラフト、レビュー段階は Codex まで終了、オーナーのレビュー待ち）

- PR #98（ブランチ `feat/i95-googleapis-sheets`、コミット bee0f1d）。変更は 5 ファイル: `package.json`・`package-lock.json`（`googleapis` 188 → `@googleapis/sheets` 18.1.1。`googleapis-common` 9.2.0 と `google-auth-library` 11.2.0 は動いていない）、`src/lib/sheets.ts`・`scripts/seed-demo.ts`（import を `sheets as sheetsApi, auth as googleAuth` に置き換え。ロジック・引数・スコープは不変）、`docs/adr/0001-dependency-update-policy.md`（例の 1 語）
- 版を 18.1.1 にした理由: 18.1.2 は 2026-10-30 公開で、ADR-0001 の「公開から 7 日未満は使わない」に当たる（18.1.1 は 2026-10-07 公開）。Dependabot が cooldown 後に 18.1.2 を提案する
- レビュー段階: セルフレビュー（Critical 0 / Important 0 / Minor 3、修正なし）、`/simplify`（修正なし）、`/code-review --comment`（改善提案 6 件、全件スレッドに返信済み。採否は PR #98 のまとめコメント）、Codex（04:17Z に完了、指摘なし。対象コミット bee0f1d）
- 完了条件: 1・2・5 は PR #98 と CI で確認済み（根拠は #95 のコメント 6568951570）。3（デモのプレビューで一覧・追加・更新・削除）はオーナーが行う。4（`seed:demo` の実行）はこの PC に `.env.local`（SA の鍵）が無いため Claude Code では実行できない。オーナーが手元で実行するか、#86（seed を鍵なしで動かす）の後に回す
- Issue #95 の特記事項「#88 が終わってから着手する案」より先に着手した（2026-11-02 にオーナーが #95 の対応を指示）。#88 は、この PR の後の `src/lib/sheets.ts` を前提に `getAuth()` を書き換える

### 次にやること

1. オーナー: PR #98 をレビューし、マージする
2. オーナー: デモのプレビューで在庫の一覧・追加・更新・削除を確かめ、URL と結果を #95 のコメントに書く（完了条件 3）。URL は PR #98 の Vercel のコメント（`food-inventory-demo-git-feat-...`）
3. オーナー: `.env.local` のある環境で `npm run seed:demo` を実行し、結果を #95 のコメントに書く（完了条件 4）。または #86 の後に回す（その場合は #95 のコメントに書く）
4. Claude Code: 3・4 が #95 に記録されたら、完了条件にチェックを入れて #95 を閉じる
5. オーナーの判断待ち（`/code-review` の見送り 2 件の行き先）: (a) `src/lib/sheets.ts` のテストを足すか、(b) `docs/KNOWLEDGE.md` 44 行目の「googleapis の `append`」を「Sheets API の `append`」に直すか。新しい Issue か handoff/ideas か、やらないか

### #88 への申し送り（`/code-review` の指摘から。PR #98 のスレッドに原文）

- `google-auth-library` の揃える相手は、この PR の後は「`googleapis-common` が使う版」（今は 9.2.0 → 11.2.0）。#88 本文の「googleapis が中で使う版と揃える」は読み替えが要る。別のメジャー（例: ^12）を直接依存にすると `node_modules` に 3 本目が入り、`sheets()` の `auth` オプションの型と `ExternalAccountClient` の型が合わなくなる
- `getAuth()` を書き換えるときに一緒に決める候補: クライアントをリクエストごとに作らず使い回す（アクセストークンのキャッシュが効く）。4 関数の `getAuth()` + `sheetsApi(...)` の 2 行を `getSheetsClient()` に集約する。`drive.readonly` スコープは 5 操作のどれも使っていないので `spreadsheets` だけにするか
- 注意: `{ version: 'v4', auth }` のオブジェクトを定数で使い回してはいけない。`googleapis-common` の `getAPI` が `options.version` を delete するため、2 回目の呼び出しが失敗する

## 失敗（根拠付き）

〈このセッションでオーナーの指摘を受けた失敗は、2026-11-02 04:3xZ 時点で無い。あれば追記する〉

## 再開手順

1. この README と PR #98 のまとめコメント、#95 のコメントを読む
2. 作業ツリーは `C:\work\git\food-inventory-app\.claude\worktrees\i95`（ブランチ `feat/i95-googleapis-sheets`）。残っていなければ `git worktree add .claude/worktrees/i95 feat/i95-googleapis-sheets`
3. セッションを続けるなら `claude --resume db04f4c3-1167-462f-a5d3-f0c5696d23a9`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
