# terraform show -json <plan のファイル> の出力から、Actions のログに出してよい要約だけを作る。
# 出すものを変えると、terraform-plan.yml と terraform-apply.yml の両方のログに出るものが変わる。
#
# 出すのは、リソースのアドレス・操作・取り込み（import）かどうかと、その件数だけ。
# 属性の値と change.importing.id（プロジェクト ID を含む）は出さない。
# アドレスには for_each のキーも入るので、キーに識別子（メールアドレスなど）を使うリソースを足すときは、
# ここで出すものを見直す
#
# 合計の「その他」は、create・update・delete・no-op・read のどれでもない操作（removed ブロックの
# forget など）を含むリソースの数。行には出るが、作成・変更・削除のどれにも数えられないため
[
  .resource_changes[]?
  | {
      address,
      actions: .change.actions,
      importing: (.change.importing != null)
    }
] as $rc
| ($rc[] | "\(.address): \(.actions | join(", "))\(if .importing then "（取り込み）" else "" end)"),
  "合計: 取り込み \([$rc[] | select(.importing)] | length)、作成 \([$rc[] | select(.actions | any(. == "create"))] | length)、変更 \([$rc[] | select(.actions | any(. == "update"))] | length)、削除 \([$rc[] | select(.actions | any(. == "delete"))] | length)、その他 \([$rc[] | select(.actions | any(. as $a | ["create", "update", "delete", "no-op", "read"] | index($a) | not))] | length)"
