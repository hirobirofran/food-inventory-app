# Vercel のアプリが、鍵なしでアプリの SA を借りるための入口（Workload Identity Federation。以下 WIF）。
# 借りる許可（どの相手が SA を借りられるか）は service_accounts.tf に書く。
#
# プールとプロバイダに prevent_destroy を付けるのは、消す変更を plan の段階で止めるため。
# 消すと、Vercel のアプリが SA を借りられなくなる。消してから 30 日のあいだは復元できるが、そのあいだは同じ ID で作り直せない
# （https://docs.cloud.google.com/iam/docs/manage-workload-identity-pools-providers）。
# 止まるのは、resource ブロックが残ったまま消す（置き換えを含む）plan だけ。ブロックやこのファイルごと消す変更は止まらず、
# plan の要約に delete として出るので、そこで気付く（https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle）

resource "google_iam_workload_identity_pool" "vercel" {
  workload_identity_pool_id = "vercel"
  display_name              = "Vercel"

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_iam_workload_identity_pool_provider" "vercel" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.vercel.workload_identity_pool_id
  workload_identity_pool_provider_id = "vercel"
  display_name                       = "Vercel"

  # 属性は sub だけ対応させる。借りる相手は sub の完全一致で指すため、ほかの属性は使わない
  attribute_mapping = {
    "google.subject" = "assertion.sub"
  }

  # 発行元の条件に加えて、トークンのチーム ID も確かめる。チームの slug（名前）は、変えた後や消した後に
  # 他人が取り直せるが、ID は使い回されない。名前だけで見分けると、取り直した別のチームのトークンが通りうる
  attribute_condition = "assertion.owner_id == '${var.vercel_team_id}'"

  oidc {
    # allowed_audiences を指定しないのは、GCP が決める、このプロバイダ専用の宛先だけを受け付けるため。
    # Vercel の既定の宛先（チームごとに同じ値）のトークンは、別の場所で使い回せてしまう。
    # 宛先を指定して取ったトークンは、Vercel の発行元の設定によらず、チームの発行元になる
    # （https://vercel.com/docs/oidc/reference）ので、ここもチームの発行元にする
    issuer_uri = "https://oidc.vercel.com/${var.vercel_team_slug}"
  }

  lifecycle {
    prevent_destroy = true
  }
}
