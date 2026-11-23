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
