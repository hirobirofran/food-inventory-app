# 値はリポジトリに書かない。ワークフローが GitHub Secrets から TF_VAR_<変数名> の環境変数で渡す。
# 変数名は Secret の名前を小文字にしたもの（docs/SETUP.md の 6-4）

variable "gcp_project_id" {
  description = "Google Cloud のプロジェクト ID（Secret の GCP_PROJECT_ID）"
  type        = string
  nullable    = false
}

variable "app_sa_email" {
  description = "アプリが使う SA のメールアドレス（Secret の APP_SA_EMAIL）"
  type        = string
  nullable    = false
}

# この下の変数は、空のまま plan を通さないために検証する。Secret が未登録だと、ワークフローは空文字を渡す。
# 空のままでは、条件や借りる相手の文字列が誤ったまま plan が通り、気付かずに apply で反映してしまう。
# error_message に値を書かないのは、検証の失敗の文に識別子を残さないため。
# Terraform 自身が出すエラーには値が入るが、plan の出力は全文のファイルに書き、Actions のログには出さない（terraform-plan.yml）

variable "vercel_team_slug" {
  description = "Vercel のチームの slug（Secret の VERCEL_TEAM_SLUG）"
  type        = string
  nullable    = false

  # slug は WIF の発行元の URL と、SA を借りる相手の名前に埋め込む。: や / が混ざると別の相手を指してしまう
  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.vercel_team_slug))
    error_message = "vercel_team_slug が空か、使えない文字を含んでいます（使えるのは小文字・数字・ハイフン）。Secret VERCEL_TEAM_SLUG を確かめてください。"
  }
}

variable "vercel_team_id" {
  description = "Vercel のチーム ID（Secret の VERCEL_TEAM_ID）。トークンの owner_id と照らして、自分のチームのトークンだけを通す"
  type        = string
  nullable    = false

  # ID は WIF の属性の条件（CEL の式）に文字列として埋め込む。引用符などが混ざると、条件を書き換えられてしまう
  validation {
    condition     = can(regex("^[A-Za-z0-9_]+$", var.vercel_team_id))
    error_message = "vercel_team_id が空か、使えない文字を含んでいます（使えるのは英数字とアンダースコア）。Secret VERCEL_TEAM_ID を確かめてください。"
  }
}

variable "vercel_prod_project" {
  description = "Vercel の本番プロジェクトの名前（Secret の VERCEL_PROD_PROJECT）"
  type        = string
  nullable    = false

  # 名前は SA を借りる相手の名前（sub）に埋め込む。: や / が混ざると別の相手を指してしまう。
  # 通す文字は、Vercel のプロジェクト名に使える文字（https://vercel.com/docs/project-configuration/general-settings）
  validation {
    condition     = can(regex("^[a-z0-9._-]+$", var.vercel_prod_project))
    error_message = "vercel_prod_project が空か、使えない文字を含んでいます（使えるのは小文字・数字・ピリオド・アンダースコア・ハイフン）。Secret VERCEL_PROD_PROJECT を確かめてください。"
  }
}

variable "vercel_demo_project" {
  description = "Vercel のデモプロジェクトの名前（Secret の VERCEL_DEMO_PROJECT）"
  type        = string
  nullable    = false

  # 文字を絞る理由は vercel_prod_project と同じ
  validation {
    condition     = can(regex("^[a-z0-9._-]+$", var.vercel_demo_project))
    error_message = "vercel_demo_project が空か、使えない文字を含んでいます（使えるのは小文字・数字・ピリオド・アンダースコア・ハイフン）。Secret VERCEL_DEMO_PROJECT を確かめてください。"
  }
}

variable "owner_email" {
  description = "手元の seed でアプリの SA を借りる人の Google アカウント（Secret の OWNER_EMAIL）"
  type        = string
  nullable    = false

  validation {
    condition     = var.owner_email != ""
    error_message = "owner_email が空です。Secret OWNER_EMAIL を確かめてください。"
  }
}
