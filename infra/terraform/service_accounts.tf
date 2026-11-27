# アプリが使う SA（Terraform の外で手で作り、後から Terraform の管理に取り込んだ物）と、この SA に付く許可。
# 属性は取り込んだときの SA と同じ値のままにする。変えると、動いているアプリの SA を書き換える plan になる。
#
# この Terraform では、tf-plan と tf-apply の 2 つの SA 自身と、それを借りる許可（roles/iam.workloadIdentityUser）を扱わない。
# どちらも infra/bootstrap/bootstrap.sh が毎回そろえるので、Terraform でも扱うと互いに上書きし合う。
# ただし、tf-apply がアプリの SA を管理する許可は、アプリの SA のポリシーの一部なので、下のポリシーに書く

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
  # （https://vercel.com/docs/oidc/access-other-services）。手元の seed は、オーナーの Google アカウントで借りる（下のポリシー）
  vercel_borrower_subjects = [
    "project:${var.vercel_prod_project}:environment:production",
    "project:${var.vercel_demo_project}:environment:production",
    "project:${var.vercel_demo_project}:environment:preview",
  ]

  # トークンの sub そのもの。下の長さの確かめと、借りる相手の名前（principal://）を同じ値で作るため、1 か所で組み立てる
  vercel_borrower_subs = [for subject in local.vercel_borrower_subjects : "owner:${var.vercel_team_slug}:${subject}"]

  # google.subject の長さの上限（https://docs.cloud.google.com/iam/docs/workload-identity-federation）
  google_subject_max_length = 127

  # apply 用 SA の名前。infra/bootstrap/bootstrap.sh の APPLY_SA_NAME と同じ値にする。片方を変えるときは、もう片方も変える。
  # 名前とプロジェクト ID から組み立てるのは、plan のワークフロー（terraform-plan.yml）に、apply 用 SA の Secret を
  # 渡さずに済むため（plan のファイルには、apply 用の SA と Secrets を書かない）。bootstrap.sh も同じ形で組み立てている
  apply_sa_name  = "tf-apply"
  apply_sa_email = "${local.apply_sa_name}@${var.gcp_project_id}.iam.gserviceaccount.com"
}

# アプリの SA に付く許可を、ここに書いた物だけにする。
# ロールごとに相手を決める書き方（google_service_account_iam_binding）にしないのは、決めたロールの条件なしの付与しか見ず、
# 期限などの条件を付けて足した相手と、ほかのロール（SA の鍵を作れるロールなど）で足した相手が、plan に出ないため
# （https://registry.terraform.io/providers/hashicorp/google/8.11.0/docs/resources/google_service_account_iam）。
# このポリシーは SA のポリシー全体を置き換えるので、ここに無い許可は、ロールや条件によらず plan に差分として出て、apply で外れる。
# 許可を足すときは、ここを直す。
# ただし、見るのはこの SA 自身に付いた許可だけ。プロジェクト全体に付けた権限は、プロジェクトのすべての SA に届くが
# （https://docs.cloud.google.com/iam/docs/manage-access-service-accounts）、plan には出ない。
# ポリシーを data source で組み立てるのは、プロバイダの文書が、ポリシーを resource に渡す方法をこれだけとしているため
# （https://registry.terraform.io/providers/hashicorp/google/8.11.0/docs/data-sources/iam_policy）。
# この data source は手元で組み立てるだけで GCP に問い合わせないので、plan 用 SA に権限を足さなくてよい
# （https://github.com/hashicorp/terraform-provider-google/blob/v8.11.0/google/services/resourcemanager/data_source_google_iam_policy.go）
data "google_iam_policy" "app" {
  # 相手は sub の完全一致で指す（principal://）。属性の一部で指す principalSet:// だと、
  # 同じプロジェクト名の別の環境（本番の preview など）まで入ってしまう。
  # プールの name はプロジェクト番号を含む（projects/<番号>/locations/global/workloadIdentityPools/<プール ID>）。
  # 番号は Google の文書が、プロジェクト ID ではなく番号で書くよう求めている
  # （https://docs.cloud.google.com/iam/docs/principal-identifiers）ので、name から作る
  binding {
    role = "roles/iam.workloadIdentityUser"
    members = [
      for sub in local.vercel_borrower_subs :
      "principal://iam.googleapis.com/${google_iam_workload_identity_pool.vercel.name}/subject/${sub}"
    ]
  }

  # seed が、オーナーの Google アカウントで、鍵なしにこの SA のトークンを取るため。
  # このロールにするのは、Google が SA を借りる（impersonation）ために付けるよう案内しているロールで、
  # トークンを取るのに要る iam.serviceAccounts.getAccessToken を含むため
  # （https://docs.cloud.google.com/docs/authentication/use-service-account-impersonation）
  binding {
    role    = "roles/iam.serviceAccountTokenCreator"
    members = ["user:${var.owner_email}"]
  }

  # apply 用 SA が、この SA とそのポリシーを変えられるようにするため。bootstrap.sh が付けている物と同じ許可で、
  # ここに無いと、最初の apply でこの許可が外れ、次の apply から SA を変えられなくなる。
  # bootstrap.sh にも残すのは、最初の apply の前から要るため。片方を変えるときは、もう片方も変える。
  # 2 か所（ここと bootstrap.sh）がずれると、apply 用 SA の許可を外す plan になり、plan の要約に、このポリシーの update として出る。
  # 外れたときは、先に 2 か所の名前をそろえてから、bootstrap.sh を動かし直し、apply を動かし直す
  binding {
    role    = "roles/iam.serviceAccountAdmin"
    members = ["serviceAccount:${local.apply_sa_email}"]
  }
}

# このリソースを消すか置き換えると、プロバイダは SA のポリシーを空にする
# （https://github.com/hashicorp/terraform-provider-google/blob/v8.11.0/google/tpgiamresource/resource_iam_policy.go の ResourceIamPolicyDelete）。
# 空になると、Vercel のアプリとオーナーが SA を借りられなくなり、apply 用 SA もこの SA を管理する許可を失う。
# service_account_id を変えると置き換えになり
# （https://github.com/hashicorp/terraform-provider-google/blob/v8.11.0/google/services/resourcemanager/iam_service_account.go）、
# 置き換えは、既定では消してから作る順で動く（https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle）。
# 置き換えの plan は、下の prevent_destroy で止める。
# Terraform の管理から外すときは、ブロックを消す代わりに、上の SA と同じく removed ブロック（destroy = false）を書く
resource "google_service_account_iam_policy" "app" {
  service_account_id = google_service_account.app.name
  policy_data        = data.google_iam_policy.app.policy_data

  lifecycle {
    # 置き換えの plan を止めるため（理由は、この resource ブロックの上のコメント）
    prevent_destroy = true

    # sub が上限を超えても、plan と apply は通り、アプリが SA を借りるとき（トークンの交換）に初めて失敗する。
    # 気付くのが遅れないよう、plan で止める。bootstrap.sh も、GitHub 用の sub で同じ上限を確かめている
    precondition {
      condition     = alltrue([for sub in local.vercel_borrower_subs : length(sub) <= local.google_subject_max_length])
      error_message = "Vercel の相手の sub が、google.subject の上限（${local.google_subject_max_length} 文字）を超えます。Secret VERCEL_TEAM_SLUG・VERCEL_PROD_PROJECT・VERCEL_DEMO_PROJECT の長さを確かめてください。"
    }
  }
}
