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
#   - GitHub Secrets（gh secret set。値は画面に出さない）
#
# 手順と前提は docs/SETUP.md の 6 章。実際の識別子（プロジェクト ID など）は
# このファイルに書かず、環境変数か、リポジトリ直下の .env.local で渡す。
# =====================================================================
set -euo pipefail

# Git Bash が "/" で始まる引数をファイルパスと誤解して書き換えるのを止める
export MSYS_NO_PATHCONV=1

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT/.env.local"

# 識別子ではない固定の設定
REGION="asia-northeast1"
POOL_ID="github"
PROVIDER_ID="github"
PLAN_SA_NAME="tf-plan"
APPLY_SA_NAME="tf-apply"
LOG_RETENTION_DAYS=30

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
[ -n "$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null)" ] \
  || die "gcloud にログインしていません。'gcloud auth login' を実行してください。"
gh auth status >/dev/null 2>&1 || die "gh にログインしていません。'gh auth login' を実行してください。"

# ---------------------------------------------------------------------
# 2. 環境変数の読み込み
#    環境にある値を優先する。無いものだけ .env.local の "名前=" の行から読む。
#    .env.local には複数行の値があるため、ファイル全体は source しない。
# ---------------------------------------------------------------------
read_from_env_file() {
  local name="$1" line value
  [ -f "$ENV_FILE" ] || return 0
  line="$(grep -m1 "^${name}=" "$ENV_FILE" || true)"
  [ -n "$line" ] || return 0
  value="${line#*=}"
  value="${value%$'\r'}"
  case "$value" in
    \"*\") value="${value#\"}"; value="${value%\"}" ;;
    \'*\') value="${value#\'}"; value="${value%\'}" ;;
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
  printf '  %s\n' "${REQUIRED_VARS[@]}" >&2
  printf '見つからなかったもの: %s\n' "${missing[*]}" >&2
  exit 1
fi

# 条件式（CEL）に埋め込むので、想定外の文字を入れさせない
[[ "$GITHUB_REPO" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] \
  || die "GITHUB_REPO は '<オーナー>/<リポジトリ名>' の形で渡してください。"

PROJECT_NUMBER="$(gcloud projects describe "$GCP_PROJECT_ID" --format='value(projectNumber)')"
[ -n "$PROJECT_NUMBER" ] || die "プロジェクトの番号を取得できませんでした。"

PLAN_SA="${PLAN_SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
APPLY_SA="${APPLY_SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
POOL_PATH="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}"
PROVIDER_PATH="${POOL_PATH}/providers/${PROVIDER_ID}"
PRINCIPAL_BASE="principalSet://iam.googleapis.com/${POOL_PATH}"

# ---------------------------------------------------------------------
# 3. API の有効化
#    iamcredentials・sts: WIF で SA の権限を借りるために要る。
#    iam・cloudresourcemanager: このスクリプトが SA・プール・プロジェクトの権限を扱うために要る。
# ---------------------------------------------------------------------
for api in iam.googleapis.com cloudresourcemanager.googleapis.com iamcredentials.googleapis.com sts.googleapis.com; do
  if [ -n "$(gcloud services list --enabled --project "$GCP_PROJECT_ID" \
        --filter="config.name=$api" --format='value(config.name)')" ]; then
    say "そのまま" "API $api は有効"
  else
    gcloud services enable "$api" --project "$GCP_PROJECT_ID"
    say "更新した" "API $api を有効にした"
  fi
done

# ---------------------------------------------------------------------
# 4. バケット
# ---------------------------------------------------------------------
LIFECYCLE_FILE="$(mktemp)"
trap 'rm -f "$LIFECYCLE_FILE"' EXIT
cat >"$LIFECYCLE_FILE" <<JSON
{"rule": [{"action": {"type": "Delete"}, "condition": {"age": ${LOG_RETENTION_DAYS}}}]}
JSON
# gcloud は Windows のネイティブ版なので、Git Bash のパスを Windows 形式に直す
LIFECYCLE_FILE_ARG="$(cygpath -m "$LIFECYCLE_FILE" 2>/dev/null || printf '%s' "$LIFECYCLE_FILE")"

bucket_state() {
  gcloud storage buckets describe "gs://$1" \
    --format='value(location,uniform_bucket_level_access,public_access_prevention,versioning_enabled,lifecycle_config.rule)'
}

# ensure_bucket <名前> <versioning: yes|no> <lifecycle: yes|no>
ensure_bucket() {
  local bucket="$1" versioning="$2" lifecycle="$3" created=no before after location
  if ! gcloud storage buckets describe "gs://$bucket" --format='value(name)' >/dev/null 2>&1; then
    gcloud storage buckets create "gs://$bucket" --project "$GCP_PROJECT_ID" \
      --location "$REGION" --uniform-bucket-level-access --public-access-prevention
    created=yes
  fi
  location="$(gcloud storage buckets describe "gs://$bucket" --format='value(location)')"
  if [ "$(printf '%s' "$location" | tr '[:upper:]' '[:lower:]')" != "$REGION" ]; then
    say "注意" "バケット $bucket の場所は $location です（$REGION ではありません）。場所は後から変えられないので、そのままにします。"
  fi
  before="$(bucket_state "$bucket")"
  local args=(--uniform-bucket-level-access --public-access-prevention)
  if [ "$versioning" = yes ]; then args+=(--versioning); else args+=(--no-versioning); fi
  if [ "$lifecycle" = yes ]; then args+=(--lifecycle-file "$LIFECYCLE_FILE_ARG"); fi
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

ensure_bucket "$TF_STATE_BUCKET" yes no
ensure_bucket "$LOG_BUCKET" no yes

# ---------------------------------------------------------------------
# 5. WIF のプールとプロバイダ
#    GitHub Actions のトークンのうち、このリポジトリのものだけを通す。
# ---------------------------------------------------------------------
ISSUER_URI="https://token.actions.githubusercontent.com"
ATTRIBUTE_MAPPING="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref"
ATTRIBUTE_CONDITION="assertion.repository == '${GITHUB_REPO}'"

if gcloud iam workload-identity-pools describe "$POOL_ID" --project "$GCP_PROJECT_ID" \
     --location global >/dev/null 2>&1; then
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
)
if provider_json="$(gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
     --project "$GCP_PROJECT_ID" --location global --workload-identity-pool "$POOL_ID" \
     --format=json 2>/dev/null)"; then
  # 属性の対応表・条件・発行元が望む形か確かめる。違えば更新する
  if printf '%s' "$provider_json" | grep -qF "\"attributeCondition\": \"${ATTRIBUTE_CONDITION}\"" \
     && printf '%s' "$provider_json" | grep -qF '"google.subject": "assertion.sub"' \
     && printf '%s' "$provider_json" | grep -qF '"attribute.repository": "assertion.repository"' \
     && printf '%s' "$provider_json" | grep -qF '"attribute.ref": "assertion.ref"' \
     && printf '%s' "$provider_json" | grep -qF "\"issuerUri\": \"${ISSUER_URI}\""; then
    say "そのまま" "WIF プロバイダ $PROVIDER_ID"
  else
    gcloud iam workload-identity-pools providers update-oidc "$PROVIDER_ID" "${provider_args[@]}" >/dev/null
    say "更新した" "WIF プロバイダ $PROVIDER_ID の属性と条件"
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
# bind_role <project|sa|bucket> <対象> <メンバー> <ロール>
bind_role() {
  local kind="$1" target="$2" member="$3" role="$4" existing i
  local filter="bindings.role=\"$role\" AND bindings.members=\"$member\""
  case "$kind" in
    project) existing="$(gcloud projects get-iam-policy "$target" --flatten='bindings[].members' \
               --filter="$filter" --format='value(bindings.role)')" ;;
    sa)      existing="$(gcloud iam service-accounts get-iam-policy "$target" --project "$GCP_PROJECT_ID" \
               --flatten='bindings[].members' --filter="$filter" --format='value(bindings.role)')" ;;
    bucket)  existing="$(gcloud storage buckets get-iam-policy "gs://$target" --flatten='bindings[].members' \
               --filter="$filter" --format='value(bindings.role)')" ;;
  esac
  if [ -n "$existing" ]; then
    say "そのまま" "$kind $target: $role"
    return 0
  fi
  for i in 1 2 3 4 5; do
    local ok=no
    case "$kind" in
      project) gcloud projects add-iam-policy-binding "$target" --member "$member" --role "$role" \
                 --condition=None --quiet >/dev/null 2>&1 && ok=yes ;;
      sa)      gcloud iam service-accounts add-iam-policy-binding "$target" --project "$GCP_PROJECT_ID" \
                 --member "$member" --role "$role" --quiet >/dev/null 2>&1 && ok=yes ;;
      bucket)  gcloud storage buckets add-iam-policy-binding "gs://$target" --member "$member" \
                 --role "$role" --quiet >/dev/null 2>&1 && ok=yes ;;
    esac
    if [ "$ok" = yes ]; then
      say "作った" "$kind $target: $role を付与"
      return 0
    fi
    sleep 5
  done
  die "$kind $target に $role を付けられませんでした。"
}

# SA を借りる許可
bind_role sa "$PLAN_SA" "${PRINCIPAL_BASE}/attribute.repository/${GITHUB_REPO}" roles/iam.workloadIdentityUser
bind_role sa "$APPLY_SA" "${PRINCIPAL_BASE}/attribute.ref/refs/heads/main" roles/iam.workloadIdentityUser

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
# 8. GitHub Secrets
#    値は標準入力で渡す（--body だとプロセスの引数に値が出るため）。画面には名前と出どころだけ出す。
#    すでにある Secret は上書きされる（同じ値なら変わらない）。
# ---------------------------------------------------------------------
set_secret() {
  local name="$1" value="$2" source="$3"
  printf '%s' "$value" | gh secret set "$name" --repo "$GITHUB_REPO" >/dev/null
  say "登録した" "Secret $name（出どころ: $source）"
}

set_secret GCP_PROJECT_ID "$GCP_PROJECT_ID" "環境変数 GCP_PROJECT_ID"
set_secret GCP_WIF_PROVIDER "$PROVIDER_PATH" "プロジェクト番号から組み立てた WIF プロバイダの名前"
set_secret TF_PLAN_SA "$PLAN_SA" "SA ${PLAN_SA_NAME} のメールアドレス"
set_secret TF_APPLY_SA "$APPLY_SA" "SA ${APPLY_SA_NAME} のメールアドレス"
set_secret TF_STATE_BUCKET "$TF_STATE_BUCKET" "環境変数 TF_STATE_BUCKET"
set_secret LOG_BUCKET "$LOG_BUCKET" "環境変数 LOG_BUCKET"
set_secret APP_SA_EMAIL "$APP_SA_EMAIL" "環境変数 APP_SA_EMAIL"
set_secret VERCEL_TEAM_SLUG "$VERCEL_TEAM_SLUG" "環境変数 VERCEL_TEAM_SLUG"
set_secret VERCEL_PROD_PROJECT "$VERCEL_PROD_PROJECT" "環境変数 VERCEL_PROD_PROJECT"
set_secret VERCEL_DEMO_PROJECT "$VERCEL_DEMO_PROJECT" "環境変数 VERCEL_DEMO_PROJECT"
set_secret OWNER_EMAIL "$OWNER_EMAIL" "環境変数 OWNER_EMAIL"

echo "完了しました。"
