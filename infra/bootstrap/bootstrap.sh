#!/usr/bin/env bash
# =====================================================================
# Terraform を GitHub Actions から動かすための土台を、gcloud で 1 回だけ作る。
#
# 作る物（無ければ作り、あれば望む設定に更新する。何度動かしても同じ結果になる）:
#   - API の有効化
#   - Terraform の state を置くバケット（バージョニングあり）
#   - Actions のログを置くバケット（30 日で自動削除）
#   - GitHub 用の Workload Identity Federation（WIF）のプールとプロバイダ
#   - plan 用と apply 用のサービスアカウント（SA）と、その権限
#   - Terraform の最初の state（無いときだけ。Docker の Terraform に作らせ、plan で「変更なし」を確かめる）
#   - GitHub の Environment（apply のジョブを、承認されるまで止める。承認できるのは実行した人だけ）
#   - GitHub Secrets（gh secret set。値は画面に出さない）
#
# 手順と前提は docs/SETUP.md の 6 章。実際の識別子（プロジェクト ID など）は
# このファイルに書かず、環境変数か、リポジトリ直下の .env.local で渡す。
# =====================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT/.env.local"

# 識別子ではない固定の設定
REGION="asia-northeast1"
POOL_ID="github"
PROVIDER_ID="github"
PLAN_SA_NAME="tf-plan"
APPLY_SA_NAME="tf-apply"
# apply のジョブが通る GitHub の Environment の名前。ワークフローの environment: にも同じ名前を書く
APPLY_ENV="terraform-apply"
LOG_RETENTION_DAYS=30
# state のバケットの中で、state を置くフォルダ（Terraform の backend の設定の prefix）。backend の設定にも同じ値を書く
TF_STATE_PREFIX="gcp"
# 最初の state を作るときだけ使う Terraform。この PC には入れず、HashiCorp の公式の Docker イメージで動かす。
# 版とダイジェスト（イメージの中身から計算した値。同じ版の名前で中身を差し替えられても気づける）の両方で固定する。
# ダイジェストは、CPU の種類ごとのイメージをまとめた一覧のもの（Docker Hub の 1.17.0 のタグで確認）
TF_VERSION="1.17.0"
TF_IMAGE="hashicorp/terraform:${TF_VERSION}@sha256:4d1b496a256f2989bccdb04b9104a4ede97234b10fba90259e173e905ec4fb58"

REQUIRED_VARS=(
  GCP_PROJECT_ID GITHUB_REPO TF_STATE_BUCKET LOG_BUCKET APP_SA_EMAIL
  VERCEL_TEAM_SLUG VERCEL_PROD_PROJECT VERCEL_DEMO_PROJECT OWNER_EMAIL
)

say() { printf '[%s] %s\n' "$1" "$2"; }
die() { printf 'エラー: %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------------
# 1. 前提の確認
# ---------------------------------------------------------------------
command -v gcloud >/dev/null 2>&1 || die "gcloud が見つかりません。Google Cloud CLI を入れてください。"
command -v gh >/dev/null 2>&1 || die "gh（GitHub CLI）が見つかりません。"
# Git Bash の gcloud は出力の行末に \r（復帰文字）を付けることがあり、値の比較がずれる。
# 標準出力から \r を落とすラッパーに差し替える（標準エラーは変えない。pipefail で gcloud の失敗は伝わる）
gcloud() { command gcloud "$@" | tr -d '\r'; }
acct="$(gcloud auth list --filter=status:ACTIVE --format='value(account)')" \
  || die "gcloud を実行できませんでした（上のエラーを見てください）。"
[ -n "$acct" ] || die "gcloud にログインしていません。'gcloud auth login' を実行してください。"
gh auth status >/dev/null 2>&1 || die "gh にログインしていません。'gh auth login' を実行してください。"

# ---------------------------------------------------------------------
# 2. 環境変数の読み込み
#    環境にある値を優先する。無いものだけ .env.local の "名前=" の行から読む。
#    .env.local には複数行の値があるため、ファイル全体は source しない。
# ---------------------------------------------------------------------
read_from_env_file() {
  local name="$1" line value
  [ -f "$ENV_FILE" ] || return 0
  # 行頭に "export " があっても読む
  line="$(grep -m1 -E "^(export[[:space:]]+)?${name}=" "$ENV_FILE" || true)"
  [ -n "$line" ] || return 0
  value="${line#*=}"
  value="${value%$'\r'}"
  case "$value" in
    \"*\") value="${value#\"}"; value="${value%\"}" ;;
    \'*\') value="${value#\'}"; value="${value%\'}" ;;
    *)
      # 引用符で囲んでいない値は、" #" 以降のコメントと末尾の空白を落とす
      value="${value%%[[:space:]]#*}"
      value="${value%"${value##*[![:space:]]}"}"
      ;;
  esac
  printf '%s' "$value"
}

missing=()
for name in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!name:-}" ]; then
    value="$(read_from_env_file "$name")"
    if [ -n "$value" ]; then
      export "$name=$value"
    else
      missing+=("$name")
    fi
  fi
done
if [ "${#missing[@]}" -gt 0 ]; then
  printf 'エラー: 次の環境変数が見つかりません（環境にも .env.local にもありません）。\n' >&2
  printf '  %s\n' "${missing[@]}" >&2
  exit 1
fi

# SA を借りる相手の名前（sub）に埋め込むので、想定外の文字を入れさせない
[[ "$GITHUB_REPO" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] \
  || die "GITHUB_REPO は '<オーナー>/<リポジトリ名>' の形で渡してください。"

# リポジトリの番号。名前は、消したり改名したりした後に別の人が取り直せるが、番号は使い回されない
# （Google の文書）。WIF の条件と plan 用 SA の借り手は、名前ではなくこの番号で絞る。
# 手で写す間違いを無くすため、環境変数では受け取らずに GitHub から取る
REPO_ID=""
REPO_FULL_NAME=""
repo_line="$(gh api "repos/${GITHUB_REPO}" --jq '"\(.id) \(.full_name)"' | tr -d '\r')"
REPO_ID="${repo_line%% *}"
REPO_FULL_NAME="${repo_line#* }"
[[ "$REPO_ID" =~ ^[0-9]+$ ]] || die "リポジトリ $GITHUB_REPO の番号を取得できませんでした。"
# gh api は大文字と小文字の違いや改名前の名前も受け付けるが、GitHub がトークンの sub に入れるのは正式な名前。
# 渡された表記のままだと、sub に合わず apply 用 SA を借りられないので、違えばここで止める
[ "$REPO_FULL_NAME" = "$GITHUB_REPO" ] \
  || die "GITHUB_REPO（$GITHUB_REPO）が、GitHub 上の名前（$REPO_FULL_NAME）と違います。大文字と小文字や、改名した後の名前に合わせてください。"

# apply 用 SA を借りる相手の sub は、GitHub の既定の形（repo:<オーナー>/<リポジトリ名>:...）を前提にしている。
# 形を変える設定（sub の項目の指定や、番号入りの形）があると借りられなくなるので、ここで止める
sub_template="$(gh api "repos/${GITHUB_REPO}/actions/oidc/customization/sub" \
  --jq '"\(.use_default) \(.use_immutable_subject // false)"' | tr -d '\r')"
[ "$sub_template" = "true false" ] \
  || die "リポジトリ $GITHUB_REPO の OIDC の sub の形が既定と違います（use_default use_immutable_subject = $sub_template）。docs/SETUP.md の 6 章を見てください。"

PROJECT_NUMBER="$(gcloud projects describe "$GCP_PROJECT_ID" --format='value(projectNumber)')"
[ -n "$PROJECT_NUMBER" ] || die "プロジェクトの番号を取得できませんでした。"

PLAN_SA="${PLAN_SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
APPLY_SA="${APPLY_SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
POOL_PATH="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}"
PROVIDER_PATH="${POOL_PATH}/providers/${PROVIDER_ID}"
PRINCIPAL_BASE="principalSet://iam.googleapis.com/${POOL_PATH}"

# Environment を参照したジョブの OIDC トークンでは、sub が "repo:<オーナー>/<リポジトリ名>:environment:<名前>" になる
# （GitHub の文書）。google.subject=assertion.sub なので、この値の 1 人だけに apply 用 SA を貸す
APPLY_SUBJECT="repo:${GITHUB_REPO}:environment:${APPLY_ENV}"
# google.subject は 127 文字まで（Google の文書）。超えるとトークンを交換できない
[ "${#APPLY_SUBJECT}" -le 127 ] \
  || die "GITHUB_REPO が長すぎて、apply のジョブの sub（${#APPLY_SUBJECT} 文字）が google.subject の上限 127 文字を超えます。"
APPLY_PRINCIPAL="principal://iam.googleapis.com/${POOL_PATH}/subject/${APPLY_SUBJECT}"

# ---------------------------------------------------------------------
# 3. API の有効化
#    iamcredentials・sts: WIF で SA の権限を借りるために要る。
#    iam・cloudresourcemanager: このスクリプトが SA・プール・プロジェクトの権限を扱うために要る。
#    storage: バケットを作るために要る。
# ---------------------------------------------------------------------
apis=(iam.googleapis.com cloudresourcemanager.googleapis.com iamcredentials.googleapis.com sts.googleapis.com storage.googleapis.com)
enabled_apis="$(gcloud services list --enabled --project "$GCP_PROJECT_ID" --format='value(config.name)')"
to_enable=()
for api in "${apis[@]}"; do
  if grep -qx "$api" <<<"$enabled_apis"; then
    say "そのまま" "API $api は有効"
  else
    to_enable+=("$api")
  fi
done
if [ "${#to_enable[@]}" -gt 0 ]; then
  gcloud services enable "${to_enable[@]}" --project "$GCP_PROJECT_ID"
  for api in "${to_enable[@]}"; do
    say "更新した" "API $api を有効にした"
  done
fi

# ---------------------------------------------------------------------
# 4. バケット
# ---------------------------------------------------------------------
LIFECYCLE_FILE="$(mktemp)"
ERR_FILE="$(mktemp)"
# 下の「8. 最初の state」で、state を作るときだけ使う一時フォルダ（.terraform/ もここにできる）
TF_WORK_DIR=""
trap 'rm -f "$LIFECYCLE_FILE" "$ERR_FILE"; [ -z "$TF_WORK_DIR" ] || rm -rf "$TF_WORK_DIR"' EXIT
cat >"$LIFECYCLE_FILE" <<JSON
{"rule": [{"action": {"type": "Delete"}, "condition": {"age": ${LOG_RETENTION_DAYS}}}]}
JSON

bucket_state() {
  gcloud storage buckets describe "gs://$1" \
    --format='value(location,uniform_bucket_level_access,public_access_prevention,versioning_enabled,lifecycle_config.rule)'
}

# ensure_bucket <名前> <versioning: yes|no> <lifecycle: yes|no>
ensure_bucket() {
  local bucket="$1" versioning="$2" lifecycle="$3" created=no before after location owner_number
  # 存在の確認と、バケットがあるプロジェクトの番号の取得を 1 回で行う
  if ! owner_number="$(gcloud storage buckets describe "gs://$bucket" --raw --format='value(projectNumber)' 2>/dev/null)"; then
    gcloud storage buckets create "gs://$bucket" --project "$GCP_PROJECT_ID" \
      --location "$REGION" --uniform-bucket-level-access --public-access-prevention
    created=yes
  else
    if [ "$owner_number" != "$PROJECT_NUMBER" ]; then
      die "バケット $bucket は、対象のプロジェクト（番号 $PROJECT_NUMBER）ではなく、別のプロジェクト（番号 $owner_number）にあります。名前を変えてください。"
    fi
  fi
  before="$(bucket_state "$bucket")"
  location="${before%%$'\t'*}"  # bucket_state の最初の項目が場所
  if [ "$(printf '%s' "$location" | tr '[:upper:]' '[:lower:]')" != "$REGION" ]; then
    say "注意" "バケット $bucket の場所は $location です（$REGION ではありません）。場所は後から変えられないので、そのままにします。"
  fi
  local args=(--uniform-bucket-level-access --public-access-prevention)
  if [ "$versioning" = yes ]; then args+=(--versioning); else args+=(--no-versioning); fi
  # ライフサイクルが要らないバケットに既存の設定があれば消す（設定が違えば直す方針）
  if [ "$lifecycle" = yes ]; then args+=(--lifecycle-file "$LIFECYCLE_FILE"); else args+=(--clear-lifecycle); fi
  gcloud storage buckets update "gs://$bucket" "${args[@]}" >/dev/null
  after="$(bucket_state "$bucket")"
  if [ "$created" = yes ]; then
    say "作った" "バケット $bucket"
  elif [ "$before" != "$after" ]; then
    say "更新した" "バケット $bucket の設定"
  else
    say "そのまま" "バケット $bucket"
  fi
}

[ "$TF_STATE_BUCKET" != "$LOG_BUCKET" ] \
  || die "TF_STATE_BUCKET と LOG_BUCKET が同じ名前です。state 用とログ用は別のバケットにしてください（ログ用だけ 30 日で自動削除するため）。"

ensure_bucket "$TF_STATE_BUCKET" yes no
ensure_bucket "$LOG_BUCKET" no yes

# ---------------------------------------------------------------------
# 5. WIF のプールとプロバイダ
#    GitHub Actions のトークンのうち、このリポジトリ（番号で見分ける）のものだけを通す。
#    attribute.repository（名前）は、ログなどで読むための値として残す。
# ---------------------------------------------------------------------
ISSUER_URI="https://token.actions.githubusercontent.com"
ATTRIBUTE_MAPPING="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_id=assertion.repository_id,attribute.ref=assertion.ref"
ATTRIBUTE_CONDITION="assertion.repository_id == '${REPO_ID}'"
# Cloud Console でどのリポジトリ用か分かるようにする。説明は 256 文字まで（gcloud の文書）
PROVIDER_DESCRIPTION="GitHub Actions: ${GITHUB_REPO}"
[ "${#PROVIDER_DESCRIPTION}" -le 256 ] || die "GITHUB_REPO が長すぎて、WIF プロバイダの説明が 256 文字を超えます。"

# 削除済みや無効のプールとプロバイダは、トークンの交換ができない。引数は "状態,無効か" の 1 行
wif_unusable() {
  local state="${1%%,*}" disabled="${1#*,}"
  [ "$state" = DELETED ] && return 0
  case "$disabled" in True|true) return 0 ;; esac
  return 1
}

if pool_status="$(gcloud iam workload-identity-pools describe "$POOL_ID" --project "$GCP_PROJECT_ID" \
     --location global --format='csv[no-heading](state,disabled)' 2>/dev/null)"; then
  if wif_unusable "$pool_status"; then
    die "WIF プール $POOL_ID は削除済みか無効です（状態: $pool_status）。Cloud Console か gcloud で復旧するか、別の名前にしてください。自動では直しません。"
  fi
  say "そのまま" "WIF プール $POOL_ID"
else
  gcloud iam workload-identity-pools create "$POOL_ID" --project "$GCP_PROJECT_ID" \
    --location global --display-name "GitHub" >/dev/null
  say "作った" "WIF プール $POOL_ID"
fi

provider_args=(
  --project "$GCP_PROJECT_ID" --location global --workload-identity-pool "$POOL_ID"
  --issuer-uri "$ISSUER_URI"
  --attribute-mapping "$ATTRIBUTE_MAPPING"
  --attribute-condition "$ATTRIBUTE_CONDITION"
  --description "$PROVIDER_DESCRIPTION"
)
provider_describe() {
  gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
    --project "$GCP_PROJECT_ID" --location global --workload-identity-pool "$POOL_ID" "$@"
}
if provider_status="$(provider_describe --format='csv[no-heading](state,disabled)' 2>/dev/null)"; then
  if wif_unusable "$provider_status"; then
    die "WIF プロバイダ $PROVIDER_ID は削除済みか無効です。Cloud Console か gcloud で復旧するか、別の名前にしてください。自動では直しません。"
  fi
  # 毎回 update して望む形にそろえる。前後の状態が違えば「更新した」と出す
  provider_format='value(attributeCondition,attributeMapping,oidc.issuerUri,description)'
  before="$(provider_describe --format="$provider_format")"
  gcloud iam workload-identity-pools providers update-oidc "$PROVIDER_ID" "${provider_args[@]}" >/dev/null
  after="$(provider_describe --format="$provider_format")"
  if [ "$before" != "$after" ]; then
    say "更新した" "WIF プロバイダ $PROVIDER_ID の属性・条件・説明"
  else
    say "そのまま" "WIF プロバイダ $PROVIDER_ID"
  fi
else
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" "${provider_args[@]}" \
    --display-name "GitHub" >/dev/null
  say "作った" "WIF プロバイダ $PROVIDER_ID"
fi

# ---------------------------------------------------------------------
# 6. サービスアカウント
# ---------------------------------------------------------------------
ensure_sa() {
  local name="$1" email="$2" display="$3"
  if gcloud iam service-accounts describe "$email" --project "$GCP_PROJECT_ID" >/dev/null 2>&1; then
    say "そのまま" "SA $name"
  else
    gcloud iam service-accounts create "$name" --project "$GCP_PROJECT_ID" --display-name "$display" >/dev/null
    say "作った" "SA $name"
  fi
}
ensure_sa "$PLAN_SA_NAME" "$PLAN_SA" "Terraform plan"
ensure_sa "$APPLY_SA_NAME" "$APPLY_SA" "Terraform apply"

# ---------------------------------------------------------------------
# 7. 権限の付与（無ければ付ける。付けた後に反映が遅れることがあるので数回やり直す）
# ---------------------------------------------------------------------
# get_bound <project|sa|bucket> <対象> <メンバー> <ロール>  ... 付いていれば、そのロールを出す
get_bound() {
  local kind="$1" target="$2" member="$3" role="$4"
  # gcloud の --filter は大文字と小文字を区別しないため、ロールで絞ったメンバーの一覧を取り、
  # 大文字と小文字を区別した完全一致（grep -Fx）で比べる。
  # 条件付きの付与（期限付きなど）は、このスクリプトが付ける条件なしの付与とは別物なので数えない。
  # 2 列目（条件）が空の行だけを残す
  local filter="bindings.role=\"$role\"" format='value(bindings.members,bindings.condition)' rows
  case "$kind" in
    project) rows="$(gcloud projects get-iam-policy "$target" --flatten='bindings[].members' \
               --filter="$filter" --format="$format")" || return 1 ;;
    sa)      rows="$(gcloud iam service-accounts get-iam-policy "$target" --project "$GCP_PROJECT_ID" \
               --flatten='bindings[].members' --filter="$filter" --format="$format")" || return 1 ;;
    bucket)  rows="$(gcloud storage buckets get-iam-policy "gs://$target" --flatten='bindings[].members' \
               --filter="$filter" --format="$format")" || return 1 ;;
  esac
  if awk -F'\t' '$2 == "" { print $1 }' <<<"$rows" | grep -Fxq -- "$member"; then printf '%s\n' "$role"; fi
  return 0
}

# run_bind <project|sa|bucket> <対象> <メンバー> <ロール>  ... 付与を 1 回試す
run_bind() {
  local kind="$1" target="$2" member="$3" role="$4"
  case "$kind" in
    project) gcloud projects add-iam-policy-binding "$target" --member "$member" --role "$role" \
               --condition=None --quiet ;;
    sa)      gcloud iam service-accounts add-iam-policy-binding "$target" --project "$GCP_PROJECT_ID" \
               --member "$member" --role "$role" --quiet ;;
    bucket)  gcloud storage buckets add-iam-policy-binding "gs://$target" --member "$member" \
               --role "$role" --quiet ;;
  esac
}

# 作った直後のサービスアカウントは、60 秒以上たたないと権限の操作に使えないことがある（Google の文書）。
# そのため 12 回 × 10 秒（最後の試行の後は待たない）で、合計 約 2 分待つ。
BIND_ATTEMPTS=12
BIND_WAIT_SECONDS=10

# bind_role <project|sa|bucket> <対象> <メンバー> <ロール>
# 確認も付与も、作った直後は見えないことがあるので数回やり直す。最後に失敗したら gcloud のエラーを出す
bind_role() {
  local kind="$1" target="$2" member="$3" role="$4" existing i err=""
  for ((i = 1; i <= BIND_ATTEMPTS; i++)); do
    if existing="$(get_bound "$kind" "$target" "$member" "$role" 2>"$ERR_FILE")"; then
      if [ -n "$existing" ]; then
        say "そのまま" "$kind $target: $role"
        return 0
      fi
      if err="$(run_bind "$kind" "$target" "$member" "$role" 2>&1 >/dev/null)"; then
        say "作った" "$kind $target: $role を付与"
        return 0
      fi
    else
      err="$(cat "$ERR_FILE")"
    fi
    if [ "$i" -lt "$BIND_ATTEMPTS" ]; then sleep "$BIND_WAIT_SECONDS"; fi
  done
  printf '%s\n' "$err" >&2
  die "$kind $target に $role を付けられませんでした（上が gcloud のエラー）。"
}

# SA を借りる許可
bind_role sa "$PLAN_SA" "${PRINCIPAL_BASE}/attribute.repository_id/${REPO_ID}" roles/iam.workloadIdentityUser
bind_role sa "$APPLY_SA" "$APPLY_PRINCIPAL" roles/iam.workloadIdentityUser

# state のバケット: plan は読むだけ、apply は読み書き
bind_role bucket "$TF_STATE_BUCKET" "serviceAccount:${PLAN_SA}" roles/storage.objectViewer
bind_role bucket "$TF_STATE_BUCKET" "serviceAccount:${APPLY_SA}" roles/storage.objectAdmin

# ログのバケット: どちらもファイルを作るだけ（上書き・削除はできない）
bind_role bucket "$LOG_BUCKET" "serviceAccount:${PLAN_SA}" roles/storage.objectCreator
bind_role bucket "$LOG_BUCKET" "serviceAccount:${APPLY_SA}" roles/storage.objectCreator

# プロジェクトの権限（最初の候補。足りない分が分かったらここに足して動かし直す）
bind_role project "$GCP_PROJECT_ID" "serviceAccount:${PLAN_SA}" roles/iam.securityReviewer
bind_role project "$GCP_PROJECT_ID" "serviceAccount:${PLAN_SA}" roles/iam.workloadIdentityPoolViewer
bind_role project "$GCP_PROJECT_ID" "serviceAccount:${APPLY_SA}" roles/iam.workloadIdentityPoolAdmin
bind_role project "$GCP_PROJECT_ID" "serviceAccount:${APPLY_SA}" roles/iam.serviceAccountAdmin

# ---------------------------------------------------------------------
# 8. 最初の state
#    state のファイルが無いと、Terraform は init の途中で空の state を書こうとし、そのときロックの
#    ファイルを作る。state を読むだけの plan 用 SA では、ここで止まる（-lock=false でも避けられない）。
#    そこで、state が無いときだけ、このスクリプトを動かす人のログインで Terraform 自身に作らせ、
#    続けて plan で「変更なし」を確かめる。state のファイルを手で書いて置くことはしない。
#    Terraform は Docker の公式イメージで動かす（上の TF_IMAGE）。
# ---------------------------------------------------------------------
STATE_OBJECT="gs://${TF_STATE_BUCKET}/${TF_STATE_PREFIX}/default.tfstate"

# tf_docker <terraform の引数...>  ... 一時フォルダを /work に入れて、Docker の Terraform を動かす。
# 認証は環境変数 GOOGLE_OAUTH_ACCESS_TOKEN（gcs backend が読む）。-e には名前だけを渡し、値を引数に出さない
tf_docker() {
  local host_dir="$TF_WORK_DIR"
  # Git Bash では、Docker に渡すフォルダを Windows の形（C:\...）にする
  if command -v cygpath >/dev/null 2>&1; then host_dir="$(cygpath -w "$TF_WORK_DIR")"; fi
  # MSYS_NO_PATHCONV=1 は、Git Bash が /work を Windows のパスに書き換えないようにするもの。docker の呼び出しにだけ付ける。
  # --user: 一時フォルダにできるファイルを、この PC のユーザーの物にする（root の物になると、後で消せないことがある）
  MSYS_NO_PATHCONV=1 docker run --rm \
    --user "$(id -u):$(id -g)" -e HOME=/tmp -e CHECKPOINT_DISABLE=1 \
    -e GOOGLE_OAUTH_ACCESS_TOKEN \
    -v "${host_dir}:/work" -w /work \
    "$TF_IMAGE" "$@"
}

if gcloud storage objects describe "$STATE_OBJECT" >/dev/null 2>"$ERR_FILE"; then
  say "そのまま" "state $STATE_OBJECT"
elif ! grep -qiE '404|not found|No such object|No URLs matched' "$ERR_FILE"; then
  # 通信の失敗やトークン切れを「無い」と取り違えると、既存の state があるのに空の設定で plan をかけてしまう
  cat "$ERR_FILE" >&2
  die "state $STATE_OBJECT があるかを確かめられませんでした（上が gcloud のエラー）。"
else
  command -v docker >/dev/null 2>&1 \
    || die "docker が見つかりません。最初の state を作るのに要ります。Docker Desktop を入れてください（docs/SETUP.md の 6 章）。"
  docker info >/dev/null 2>&1 \
    || die "Docker が動いていません。Docker Desktop を起動してから、もう一度動かしてください。"

  TF_WORK_DIR="$(mktemp -d)"
  cat >"$TF_WORK_DIR/main.tf" <<HCL
terraform {
  required_version = "= ${TF_VERSION}"
  backend "gcs" {}
}
HCL

  tf_token="$(gcloud auth print-access-token)" || die "gcloud のアクセストークンを取得できませんでした。"
  [ -n "$tf_token" ] || die "gcloud のアクセストークンが空でした。'gcloud auth login' をやり直してください。"

  GOOGLE_OAUTH_ACCESS_TOKEN="$tf_token" tf_docker init -input=false \
    -backend-config="bucket=${TF_STATE_BUCKET}" -backend-config="prefix=${TF_STATE_PREFIX}" \
    || die "terraform init が失敗しました（上が Terraform のエラー）。"
  gcloud storage objects describe "$STATE_OBJECT" >/dev/null \
    || die "terraform init の後も $STATE_OBJECT が見つかりません。"
  say "作った" "state $STATE_OBJECT（Terraform $TF_VERSION の init）"

  # -detailed-exitcode: 終了コードが 0 なら変更なし、2 なら変更あり、1 ならエラー
  plan_rc=0
  GOOGLE_OAUTH_ACCESS_TOKEN="$tf_token" tf_docker plan -input=false -lock=false -detailed-exitcode \
    || plan_rc=$?
  unset tf_token
  [ "$plan_rc" -eq 0 ] \
    || die "作った state に plan をかけたところ、「変更なし」になりませんでした（終了コード $plan_rc。上が Terraform の出力）。state はもうあるので、動かし直してもこの確認は行われません。state のバケットの ${TF_STATE_PREFIX}/default.tfstate の中身を確かめてください。"
  say "確かめた" "state $STATE_OBJECT に plan をかけて、変更なし"

  rm -rf "$TF_WORK_DIR"
  TF_WORK_DIR=""
fi

# ---------------------------------------------------------------------
# 9. GitHub の Environment
#    apply のジョブはこの Environment を通る。ジョブは承認されるまで止まり、承認できるのは
#    このスクリプトを実行している gh のログインユーザーだけ。main 以外のブランチのジョブは通れない。
#    毎回 PUT して望む形にそろえる（承認できる人を画面で変えていても、実行した人に戻る）。
# ---------------------------------------------------------------------
ENV_API="repos/${GITHUB_REPO}/environments/${APPLY_ENV}"
POLICY_API="${ENV_API}/deployment-branch-policies"

# 承認できる人。ユーザーの番号は API に渡すだけで、画面には出さない
user_line="$(gh api user -q '"\(.id) \(.login)"' | tr -d '\r')"
reviewer_id="${user_line%% *}"
reviewer_login="${user_line#* }"
[[ "$reviewer_id" =~ ^[0-9]+$ ]] || die "gh のログインユーザーを取得できませんでした。"

# 比べるための状態（デプロイ元の決め方、self-review を防ぐか、承認できる人の番号）。画面には出さない
env_state() {
  gh api "$ENV_API" -q '[.deployment_branch_policy,
    [.protection_rules[]? | select(.type == "required_reviewers") | .prevent_self_review, [.reviewers[]?.reviewer.id]]]
    | tostring' 2>/dev/null | tr -d '\r'
}
# Environment があるかは HTTP の状態コードで見る。404 のときだけ「無い」。認証や通信のエラーを「無い」と取り違えない
env_head="$(gh api -i "$ENV_API" 2>&1 || true)"
env_head="${env_head%%$'\n'*}"
env_existed=yes
before=""
case "$env_head" in
  *" 200 "*) before="$(env_state)" ;;
  *" 404 "*) env_existed=no ;;
  *) die "Environment $APPLY_ENV があるかを確かめられませんでした（応答: $env_head）。gh の認証と通信を確かめてください。" ;;
esac
# prevent_self_review は false にする。true だと、承認できる人が 1 人だけのとき、
# その人が動かしたジョブ（マージで動く apply）を誰も承認できなくなる
printf '{"reviewers":[{"type":"User","id":%s}],"prevent_self_review":false,"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}' \
  "$reviewer_id" | gh api -X PUT "$ENV_API" --input - >/dev/null
after="$(env_state)"
if [ "$env_existed" = no ]; then
  say "作った" "Environment $APPLY_ENV（承認できる人: $reviewer_login）"
elif [ "$before" != "$after" ]; then
  say "更新した" "Environment $APPLY_ENV の設定（承認できる人: $reviewer_login）"
else
  say "そのまま" "Environment $APPLY_ENV（承認できる人: $reviewer_login）"
fi

# デプロイ元の規則: main ブランチの 1 つだけにする。ほかの規則があれば消す
policies="$(gh api --paginate "$POLICY_API" -q '.branch_policies[] | "\(.id)\t\(.type)\t\(.name)"' | tr -d '\r')"
has_main=no
while IFS=$'\t' read -r policy_id policy_type policy_name; do
  [ -n "$policy_id" ] || continue
  if [ "$policy_type" = branch ] && [ "$policy_name" = main ] && [ "$has_main" = no ]; then
    has_main=yes
  else
    gh api -X DELETE "${POLICY_API}/${policy_id}" >/dev/null
    say "外した" "Environment $APPLY_ENV のデプロイ元の規則（$policy_type $policy_name）"
  fi
done <<<"$policies"
if [ "$has_main" = yes ]; then
  say "そのまま" "Environment $APPLY_ENV のデプロイ元の規則（main ブランチだけ）"
else
  gh api -X POST "$POLICY_API" -f name=main -f type=branch >/dev/null
  say "作った" "Environment $APPLY_ENV のデプロイ元の規則（main ブランチだけ）"
fi

# ---------------------------------------------------------------------
# 10. GitHub Secrets
#    値は標準入力で渡す（--body だとプロセスの引数に値が出るため）。画面には名前と出どころだけ出す。
#    すでにある Secret は上書きされる（同じ値なら変わらない）。
# ---------------------------------------------------------------------
set_secret() {
  local name="$1" value="$2" source="$3"
  printf '%s' "$value" | gh secret set "$name" --repo "$GITHUB_REPO" >/dev/null
  say "登録した" "Secret $name（出どころ: $source）"
}

# 組み立てた値
set_secret GCP_WIF_PROVIDER "$PROVIDER_PATH" "プロジェクト番号から組み立てた WIF プロバイダの名前"
set_secret TF_PLAN_SA "$PLAN_SA" "SA ${PLAN_SA_NAME} のメールアドレス"
set_secret TF_APPLY_SA "$APPLY_SA" "SA ${APPLY_SA_NAME} のメールアドレス"
# 環境変数の値をそのまま登録するもの
for name in GCP_PROJECT_ID TF_STATE_BUCKET LOG_BUCKET APP_SA_EMAIL \
    VERCEL_TEAM_SLUG VERCEL_PROD_PROJECT VERCEL_DEMO_PROJECT OWNER_EMAIL; do
  set_secret "$name" "${!name}" "環境変数 $name"
done

echo "完了しました。"
