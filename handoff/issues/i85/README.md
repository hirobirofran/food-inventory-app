# #85 の引き継ぎ（WIF 移行 3/7: Vercel から GCP への WIF と、SA を借りる許可）

## 現状（2026-11-27 21:50Z）

完了条件は、引き継ぎ（この README）を除いてすべて確かめた。

- 拠り所は、要件定義のコメント（https://github.com/hirobirofran/food-inventory-app/issues/85#issuecomment-7226371336 ）と、変更 1（#issuecomment-7227419516）
- PR #131 はマージ済み。main は cc54458。apply は成功した（https://github.com/hirobirofran/food-inventory-app/actions/runs/46068166019 の試行 2）
- 完了条件の確認は #issuecomment-7228627711、作業の報告は #issuecomment-7228627368
- Vercel 用の WIF がある。自分のチーム（ID で見分ける）のトークンだけを通す。宛先（audience）は、このプロバイダ専用の値だけを受け付ける
- アプリの SA に付く許可は、Terraform がポリシー全体で決める（`infra/terraform/service_accounts.tf`）。書いていない許可は、次の plan に差分として出て、次の apply で外れる
- apply 用 SA がアプリの SA を管理する許可は、Terraform と `bootstrap.sh` の 2 か所に書いてある。片方を変えるときは、もう片方も変える（理由は `service_accounts.tf` のコメント）
- apply 用 SA が SA を管理する権限は、アプリの SA 1 つにだけ付いている。WIF を管理する権限は、プロジェクト全体のまま（絞る方法を、Google の公式文書に見つけられなかった）
- `.env.local` に `VERCEL_TEAM_ID` を足してある（`bootstrap.sh` が読む）
- Vercel の MCP は、オーナーがチームへのアクセスを承認し、チームの中身を読めるようになった（2026-11-27 21:3xZ）

後の Issue への申し送り：

- #87：連絡のコメント（https://github.com/hirobirofran/food-inventory-app/issues/87#issuecomment-7228654420 ）。発行元の設定を確かめて直す作業は、要らなくなった。手元で production の環境のトークンを取れるかは、未検証
- #88：連絡のコメント（https://github.com/hirobirofran/food-inventory-app/issues/88#issuecomment-7228654774 ）。アプリは、トークンを取るときに宛先を渡す。この方式がアプリで動くかは、未検証
- 未検証：環境を作り直すとき、絞った権限で `import` が通るか（`docs/SETUP.md` の 7-5）

見送った指摘（理由は PR #131 のコメントにある）：

- `bootstrap.sh` で、plan 用・apply 用 SA のプロジェクト全体の権限を一覧で決め、一覧に無い物を外す形にする案（https://github.com/hirobirofran/food-inventory-app/pull/131#issuecomment-7226914616 ）
- apply 用 SA のロールを、Terraform が使う権限だけの専用のロールに絞る案（https://github.com/hirobirofran/food-inventory-app/pull/131#issuecomment-7227810716 ）

## 失敗（根拠付き）

1. **Secret の登録より先に作られた apply の実行を、そのまま承認してもらった**
   - 何をした：新しい Secret（`VERCEL_TEAM_ID`）の登録より先に、PR がマージされた。承認待ちの apply の実行はマージの時点で作られていたのに、`bootstrap.sh` の後、その実行の承認を頼んだ。apply は plan の段で失敗した（GCP は変わらなかった）
   - 根拠：実行 46068166019 の試行 1（2026-11-27 21:30Z に失敗）。エラーは「`vercel_team_id` が空」の 1 件。GitHub は、リポジトリの Secret を、実行が作られた時点で読む（https://docs.github.com/en/actions/reference/security/secrets ）。セッション b7d7f25e
   - 正しくは：新しい Secret を足す PR は、Secret の登録 → PR の plan の成功 → マージ、の順にする。順番が崩れたら、実行をやり直してから承認を頼む（やり直した実行は、新しい Secret を読む。実行 46065791923 の試行 2 で確認）
2. **道具で取れる値を、オーナーの手作業として頼んだ**
   - 何をした：Vercel のチーム ID を、画面で調べて `.env.local` に足すよう、3 回頼んだ。Vercel の MCP の問い合わせ 1 回で取れる値だった
   - 根拠：2026-11-27 21:1xZ〜21:2xZ、オーナーの指摘（コマンドか MCP で取れないのか、という趣旨。Claude Code のチャット、セッション b7d7f25e）。試さなかった原因は、「Vercel の MCP はこのチームで 403 になる」という手元のメモを、「使えない」と読み替えたこと
   - 正しくは：手作業を頼む前に、コマンドや MCP で取れないかを実際に試す
3. **PR のチェックリストを、事実に合わない状態で出した**
   - 何をした：レビューが済んでも、チェックを 1 つも入れていなかった。次に、失敗している CI（plan）の項目を空欄で残した。plan を CI の外と説明してチェックを入れ、取り消した。❌️ の理由に、どうなったら OK になるかを書かなかった
   - 根拠：2026-11-27 20:46Z〜20:57Z、オーナーの指摘 4 件（チェックが無い／plan が CI と別とは何か／空欄は未着手の意味で、満たせない項目は ❌️ と理由を書く／OK になる条件が書いていない。同じチャット）。直した結果は https://github.com/hirobirofran/food-inventory-app/pull/131#issuecomment-7228015277
   - 正しくは：済んだ項目には、その場でチェックを入れる。満たせない項目は、❌️ と、原因（実物で確かめた証跡）、OK になる条件、それまでの扱いを書く。PR で自動で動く確認は、どれも CI として扱う
4. **要件を崩す指摘を、確かめずに見送った**
   - 何をした：セルフレビューが「条件付きで足された許可は plan に出ない」と指摘したのに、推測だとして見送った。`/code-review` の同じ指摘には、文書に注意を書いて済ませた。Codex に同じ点を指摘されて、作りを変えた（要件定義の変更 1）
   - 根拠：セルフレビューの記録（https://github.com/hirobirofran/food-inventory-app/pull/131#issuecomment-7227810716 ）、`/code-review` の指摘（https://github.com/hirobirofran/food-inventory-app/pull/131#discussion_r4723220680 ）、Codex の指摘（https://github.com/hirobirofran/food-inventory-app/pull/131#discussion_r4723339056 ）。セッション b7d7f25e
   - 正しくは：指摘を見送る前に、その指摘が要件（借りられる相手は、決めた相手だけ）を崩すかを、公式文書で確かめる。崩すなら、文書の注意書きで済ませず、オーナーに諮る（ADR-0003 の決め 5）

## 再開手順

#85 の作業は、この README のコミットと、Issue のクローズで終わる。再開は不要。

続きの作業（#86、#87）を始めるときは：

1. その Issue の本文を要求として読み、ADR-0003 のとおり、要件定義の案をオーナーに見せる
2. #85 からの連絡のコメント（上の「後の Issue への申し送り」）と、`docs/SETUP.md` の 7-5 を読む
3. この README の失敗を読む

このセッションに戻るとき：

`claude --resume b7d7f25e-af28-481a-b2c2-45d80701c25e`
