# アプリが使う SA（Terraform の外で手で作り、後から Terraform の管理に取り込んだ物）と、それを借りる許可。
# 属性は取り込んだときの SA と同じ値のままにする。変えると、動いているアプリの SA を書き換える plan になる。
#
# この Terraform では、tf-plan と tf-apply の 2 つの SA とその IAM を扱わない。
# 借りる許可（roles/iam.workloadIdentityUser）は infra/bootstrap/bootstrap.sh が毎回そろえるので、
# Terraform でも扱うと互いに上書きし合う

locals {
  # SA のメールアドレスの @ より前（SA の ID）
  app_sa_account_id = split("@", var.app_sa_email)[0]
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

locals {
  # SA を借りられる Vercel の相手（トークンの sub の、owner:<チーム>: より後ろ）。
  # 本番の preview を入れないのは、本番のプロジェクトでは Preview を確認に使わず、本番のデータに触らせないため（docs/SETUP.md の 4 章）。
  # development を入れないのは、そのトークンが vercel env pull で手元の .env.local に書き出され、Vercel の外に出るため
  # （https://vercel.com/docs/oidc/access-other-services）。手元の seed は、オーナーの Google アカウントで借りる（下の app_token_creator）
  vercel_borrower_subjects = [
    "project:${var.vercel_prod_project}:environment:production",
    "project:${var.vercel_demo_project}:environment:production",
    "project:${var.vercel_demo_project}:environment:preview",
  ]
}

# google_service_account_iam_binding は、このロールの条件なしの付与を、members の列挙だけにする。
# 条件なしで手で足された相手は、plan に差分として出て、apply で外れる。
# 条件（IAM Conditions。期限などを付けた付与）付きで足された相手は、plan に出ず、apply でも外れない。
# このリソースは、ロールと条件の組で付与を見分け、条件の違う付与を別の物として扱うため
# （https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_service_account_iam）。
# また、見るのはこの SA 自身に付いた許可だけ。プロジェクト全体に付けた権限は、プロジェクトのすべての SA に届くが
# （https://docs.cloud.google.com/iam/docs/manage-access-service-accounts）、plan には出ない。
# google_service_account_iam_policy は使わない。SA のポリシー全体を決めるので、bootstrap.sh が apply 用 SA に付けた、
# この SA を管理する権限まで消えて、次の apply から SA を変更できなくなる。
#
# 相手は sub の完全一致で指す（principal://）。属性の一部で指す principalSet:// だと、
# 同じプロジェクト名の別の環境（本番の preview など）まで入ってしまう。
# プールの name はプロジェクト番号を含む（projects/<番号>/locations/global/workloadIdentityPools/<プール ID>）。
# 番号は Google の文書が、プロジェクト ID ではなく番号で書くよう求めている
# （https://docs.cloud.google.com/iam/docs/principal-identifiers）ので、name から作る
resource "google_service_account_iam_binding" "app_workload_identity_user" {
  service_account_id = google_service_account.app.name
  role               = "roles/iam.workloadIdentityUser"
  members = [
    for subject in local.vercel_borrower_subjects :
    "principal://iam.googleapis.com/${google_iam_workload_identity_pool.vercel.name}/subject/owner:${var.vercel_team_slug}:${subject}"
  ]
}

# seed が、オーナーの Google アカウントで、鍵なしにこの SA のトークンを取るため。
# このロールにするのは、Google が SA を借りる（impersonation）ために付けるよう案内しているロールで、
# トークンを取るのに要る iam.serviceAccounts.getAccessToken を含むため
# （https://docs.cloud.google.com/docs/authentication/use-service-account-impersonation）
resource "google_service_account_iam_binding" "app_token_creator" {
  service_account_id = google_service_account.app.name
  role               = "roles/iam.serviceAccountTokenCreator"
  members            = ["user:${var.owner_email}"]
}
