# Issue #102 の引き継ぎ

## 現状

- 設計はオーナーと決定済み（2026-11-07）。内容は Issue のコメントを正とする: https://github.com/hirobirofran/food-inventory-app/issues/102#issuecomment-6694006290
- 実装は未着手。設計したセッション（4e587ff5-4c83-44d9-8731-06cda76a3c4d）がレビューを担当し、実装は別のセッションが行う

## 失敗（根拠付き）

- 設計中に、`docs/SETUP.md` の description を「そのまま文書目的として読める」と書いた。オーナーから、description は説明欄で、目的とも扱う範囲とも別の項目だと訂正された（2026-11-07、セッション 4e587ff5）。purpose を下書きするときは、内容の要約を書かず、WHY を書く

## 再開手順（実装の担当向け）

1. 上の設計コメントと、`docs/adr/README.md`、`docs/adr/0002-record-locations-and-updates.md` を読む
2. `docs/adr/0003-*.md` を `status: proposed` で書く。`## 出典` には設計コメントへのリンクを入れる。`docs/adr/README.md` の索引にも 1 行足す
3. 対象の 7 本に title・audience・purpose・updated を付ける。`docs/SETUP.md` の description は purpose に書き直す
4. ブランチを切ってドラフト PR を作る。手順は `CLAUDE.md` の「コードレビューの手順」と `.github/pull_request_template.md` に従う。省く段階があるかは、PR ごとにオーナーに聞く
5. レビューはセッション 4e587ff5 に依頼する

🤖 Generated with [Claude Code](https://claude.com/claude-code)
