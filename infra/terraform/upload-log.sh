#!/usr/bin/env bash
# plan と apply のワークフローの同じ処理を、1 か所で直せるようにこのスクリプトに分けている（Issue #84）。
#
# gcloud を使うのは、runner に入っていて、ワークフローの auth が書き出した資格情報をそのまま使えるため。
# gcloud の出力を捨てるのは、バケットの名前や SA のメールアドレスが入り、公開のログに出てしまうため。
# 失敗の理由は、HTTP の状態と権限の名前なら識別子を含まないので、その 2 つだけを抜き出して出す。
set -euo pipefail

name="${1:-}"
level="${2:-}"
if [ -z "$name" ] || [[ "$level" != warning && "$level" != error ]]; then
  echo "使い方: bash upload-log.sh <名前> <warning か error>"
  exit 2
fi

# 試行回数を名前に入れるのは、Re-run で同じ名前にならないようにするため。
# 同じ名前だと上書きになり、上書きの権限（storage.objects.delete）が無いので失敗する。
object="logs/${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-${name}.txt"
err="$RUNNER_TEMP/upload-error.txt"
if gcloud storage cp "$RUNNER_TEMP/terraform.txt" "gs://${LOG_BUCKET}/${object}" >/dev/null 2>"$err"; then
  echo "全文の置き場所: ログのバケット（Secret の LOG_BUCKET）の ${object}"
  exit 0
fi

# 状態を拾う形は、gcloud（googlecloudsdk の api_lib/util/exceptions.py と api_lib/storage/errors.py）の文の形に合わせている。
# 「HTTPError <番号>」は、gcloud が HTTP のエラーに使う既定の形。
# 「not found: <番号>」は、バケットかファイルが無いときの形（gs://<名前> not found: 404.）。
# 「does not have permission to access」は、gcloud が 403 の文を言い換えた形で、番号を含まないので 403 とみなす。
status=$(grep -oE 'HTTPError [0-9]{3}|not found: [0-9]{3}' "$err" | grep -oE '[0-9]{3}$' | head -n 1 || true)
if [ -z "$status" ] && grep -q 'does not have permission to access' "$err"; then status=403; fi
# 権限の名前は、決まった名前と語の全体が一致するものだけを拾う。
# 名前の形（storage.objects.<英字> など）で広く拾うと、バケットの名前などの一部（例: …-storage.objects.audit-…）が出てしまう。
# Secret のマスクは値の全体にしか効かず、一部は隠れない。
# 名前に使えない文字で区切ってから比べるのは、区切りの 1 文字で隣り合う名前も、それぞれ拾うため。
# 語の末尾のドットを落とすのは、文の終わりのドットが付いた名前も拾うため。
# 拾う名前は、アップロードで拒否されうるものに限る:
#   storage.objects.create はファイルを作るとき、storage.objects.get と storage.objects.list は
#   gcloud storage cp が置く前に同じ名前のファイルを確かめるとき（docs/SETUP.md の 6 章）、
#   storage.objects.delete は同じ名前のファイルを上書きするとき、storage.buckets.get は gcloud がバケットの設定を読むときに要る。
known='storage\.objects\.(create|get|list|delete)|storage\.buckets\.get'
perms=$(tr -c 'A-Za-z0-9._-' '\n' <"$err" | sed 's/\.*$//' | grep -xE "(${known})" \
  | sort -u | paste -sd ' ' - || true)
echo "::${level}::アップロード失敗（HTTP の状態: ${status:-不明}、エラーに出た権限: ${perms:-なし}）"
if [ "$level" = error ]; then
  exit 1
fi
