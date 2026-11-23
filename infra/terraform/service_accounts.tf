# アプリが使う SA（Terraform の外で手で作った物）を、Terraform の管理に取り込む。
# 属性は今の SA と同じ値にして、取り込みの plan で変更が出ないようにする。
#
# この Terraform では、tf-plan と tf-apply の 2 つの SA とその IAM を扱わない。
# 借りる許可（roles/iam.workloadIdentityUser）は infra/bootstrap/bootstrap.sh が毎回そろえるので、
# Terraform でも扱うと互いに上書きし合う

locals {
  # SA のメールアドレスの @ より前（SA の ID）
  app_sa_account_id = split("@", var.app_sa_email)[0]
}

# 取り込みは 1 回だけ。apply の後、次の Issue（#85）でこのブロックを消す
import {
  to = google_service_account.app
  id = "projects/${var.gcp_project_id}/serviceAccounts/${var.app_sa_email}"
}

resource "google_service_account" "app" {
  account_id = local.app_sa_account_id
  # 今の表示名は SA の ID と同じ
  display_name = local.app_sa_account_id
  description  = "スプレッドシート更新権限用"

  # SA を消すとアプリが Google Sheets を読み書きできなくなる。この resource ブロックがある間は、
  # SA を消す plan をエラーで止める。ブロックごと消すと、この守りも無くなり、SA を消す plan が通る。
  # Terraform の管理から外すときは、ブロックを消す代わりに、SA を消さない removed ブロックを書く:
  #   removed {
  #     from = google_service_account.app
  #     lifecycle {
  #       destroy = false
  #     }
  #   }
  # 出典: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
  #       https://developer.hashicorp.com/terraform/language/block/removed
  lifecycle {
    prevent_destroy = true
  }
}
