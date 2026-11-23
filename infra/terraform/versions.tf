# Terraform 本体と google プロバイダの版、state の置き場所。
# 版は公開から 7 日以上たったものを選び、完全一致で固定する（docs/adr/0001-dependency-update-policy.md）。
# 本体の版をここにだけ書くのは、ワークフローにも書くと、片方だけ直したときに required_version と合わず、init が失敗するため。
# "= x.y.z" の形を変える（"~> 1.17" など）と、ワークフロー（terraform-plan.yml と terraform-apply.yml）が版を読めずに止まる。
terraform {
  required_version = "= 1.17.2"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "= 8.11.0"
    }
  }

  # state は GCS のバケットの gcp/default.tfstate に置く（最初の state は infra/bootstrap/bootstrap.sh が作った）。
  # バケットの名前はここに書かず、terraform init -backend-config="bucket=<state のバケット>" で渡す。
  # prefix を変えると、別の空の state を見に行く（docs/SETUP.md の 6-5）
  backend "gcs" {
    prefix = "gcp"
  }
}
