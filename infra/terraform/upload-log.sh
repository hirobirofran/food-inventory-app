#!/usr/bin/env bash
# Terraform の出力の全文（$RUNNER_TEMP/terraform.txt）を、ログのバケットに上げる（Issue #84）。
# .github/workflows/terraform-plan.yml と terraform-apply.yml の「全文を上げる」のステップから呼ぶ。
#
# 使い方: bash upload-log.sh <名前> <warning か error>
#   名前: 置き場所の末尾。全文は logs/<実行の ID>-<試行回数>-<名前>.txt に上がる
#   warning: アップロードに失敗しても、ステップを失敗にしない
#   error: アップロードに失敗したら、ステップを失敗にする
# 使う環境変数: LOG_BUCKET（Secret）と、Actions が渡す RUNNER_TEMP・GITHUB_RUN_ID・GITHUB_RUN_ATTEMPT
#
# gcloud は runner に入っている。認証は、ワークフローの auth が書き出した資格情報を使う。
# gcloud の出力にはバケットの名前や SA のメールアドレスが入るので、そのままは出さない。
# 失敗したときは、標準エラーから HTTP の状態と権限の名前（storage.objects.get など）だけを抜き出して出す
set -euo pipefail

name="${1:-}"
level="${2:-}"
if [ -z "$name" ] || [[ "$level" != warning && "$level" != error ]]; then
  echo "使い方: bash upload-log.sh <名前> <warning か error>"
  exit 2
fi

object="logs/${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-${name}.txt"
err="$RUNNER_TEMP/upload-error.txt"
if gcloud storage cp "$RUNNER_TEMP/terraform.txt" "gs://${LOG_BUCKET}/${object}" >/dev/null 2>"$err"; then
  echo "全文の置き場所: ログのバケット（Secret の LOG_BUCKET）の ${object}"
  exit 0
fi

# 「does not have permission to access」は、gcloud が HTTP 403 のときだけ使う決まった文
status=$(grep -oE 'HTTPError [0-9]{3}|not found: [0-9]{3}' "$err" | grep -oE '[0-9]{3}$' | head -n 1 || true)
if [ -z "$status" ] && grep -q 'does not have permission to access' "$err"; then status=403; fi
# 権限の名前は、アップロードで要りうる決まった名前だけを、前後が名前の続きでないときに拾う。
# 任意の文字列を拾うと、バケットの名前などの一部（例: …-storage.objects.audit-…）が出てしまうため。
# Secret のマスクは値の全体にしか効かず、一部は隠れない
known='storage\.objects\.(create|get|list|delete)|storage\.buckets\.get'
perms=$(grep -oE "(^|[^A-Za-z0-9._-])(${known})([^A-Za-z0-9._-]|$)" "$err" \
  | grep -oE "${known}" | sort -u | paste -sd ' ' - || true)
echo "::${level}::アップロード失敗（HTTP の状態: ${status:-不明}、エラーに出た権限: ${perms:-なし}）"
if [ "$level" = error ]; then
  exit 1
fi
