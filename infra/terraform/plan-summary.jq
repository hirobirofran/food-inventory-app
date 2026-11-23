# terraform show -json <plan のファイル> の出力から、Actions のログに出してよい要約だけを作る。
# .github/workflows/terraform.yml が jq -r -f で使う。
#
# 出すのは、リソースのアドレス・操作・取り込み（import）かどうかと、その件数だけ。
# 属性の値と change.importing.id（プロジェクト ID を含む）は出さない。
# アドレスには for_each のキーも入るので、キーに識別子（メールアドレスなど）を使うリソースを足すときは、
# ここで出すものを見直す
[
  .resource_changes[]?
  | {
      address,
      actions: .change.actions,
      importing: (.change.importing != null)
    }
] as $rc
| ($rc[] | "\(.address): \(.actions | join(", "))\(if .importing then "（取り込み）" else "" end)"),
  "合計: 取り込み \([$rc[] | select(.importing)] | length)、作成 \([$rc[] | select(.actions | any(. == "create"))] | length)、変更 \([$rc[] | select(.actions | any(. == "update"))] | length)、削除 \([$rc[] | select(.actions | any(. == "delete"))] | length)"
