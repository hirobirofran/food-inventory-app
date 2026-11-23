---
audience: このリポジトリの決まりや進め方が、なぜ今の形なのかを知りたい人と、新しく ADR を書く人。開発が Issue と PR で進むことは知っている。
purpose: 一度決めたこととその理由をあとから探せるようにして、決まったことを知らずに覆したり、同じ議論をやり直したりしないため。
updated: 2026-11-24
---

# ADR（決定の記録）

1 件 1 ファイル（`0001-slug.md` のように連番）。「何を決めたか、なぜか」を残す。書式は `/domain-modeling` の ADR 形式（1〜3 文で足りる。考えた選択肢・影響は必要なときだけ）。ただしこのリポジトリでは、各 ADR のフロントマター（ファイル先頭の `---` で囲んだ項目欄）の `status` と、本文の後の `## 出典` 節を必須にする。読み方と運用は `docs/agents/domain.md`。

| 番号 | 題名 | status |
| --- | --- | --- |
| 0001 | [依存パッケージの更新は、マイナー・パッチなら CI 通過でマージし、むやみに最新にしない](0001-dependency-update-policy.md) | accepted |
| 0002 | [記録の置き場と更新の仕方: 引き継ぎは handoff/ に ok の後で main 直、決定は ADR に Issue と PR で](0002-record-locations-and-updates.md) | accepted |
| 0003 | [Issue は起票時の要求として扱い、着手時に要件を定義してから実装する](0003-define-requirements-before-implementing.md) | accepted |
| 0004 | [人が読むために書いた文書には、audience・purpose・updated のフロントマターを付ける](0004-docs-frontmatter.md) | accepted |
| 0005 | [コードのコメントには、なぜその処理なのかを書く](0005-code-comments-explain-why.md) | accepted |
| 0006 | [ドキュメント（コードコメント含む）に、コードにある定義値を極力書かない](0006-no-code-values-in-docs.md) | accepted |
| 0007 | [Issue の完了条件は、「修正方法（HOWやWHERE）」ではなく「どういう状態にするか（GOALやSTATE）」で書く](0007-completion-conditions-describe-state.md) | accepted |

🤖 Generated with [Claude Code](https://claude.com/claude-code)
