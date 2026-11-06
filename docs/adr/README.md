---
title: ADR（決定の記録）
audience: このリポジトリの決まりや進め方が、なぜ今の形なのかを知りたい人と、新しく ADR を書く人。開発が Issue と PR で進むことは知っている。
purpose: 一度決めたこととその理由をあとから探せるようにして、決まったことを知らずに覆したり、同じ議論をやり直したりしないため。
updated: 2026-11-07
---

# ADR（決定の記録）

1 件 1 ファイル（`0001-slug.md` のように連番）。「何を決めたか、なぜか」を残す。書式は `/domain-modeling` の ADR 形式（1〜3 文で足りる。考えた選択肢・影響は必要なときだけ）。ただしこのリポジトリでは frontmatter の `status` と `## 出典` 節を必須にする。読み方と運用は `docs/agents/domain.md`。

| 番号 | 題名 | status |
| --- | --- | --- |
| 0001 | [依存パッケージの更新は、マイナー・パッチなら CI 通過でマージし、むやみに最新にしない](0001-dependency-update-policy.md) | accepted |
| 0002 | [記録の置き場と更新の仕方: 引き継ぎは handoff/ に ok の後で main 直、決定は ADR に Issue と PR で](0002-record-locations-and-updates.md) | accepted |
| 0003 | [人が読むための文書には、title・audience・purpose・updated のフロントマターを付ける](0003-docs-frontmatter.md) | proposed |

🤖 Generated with [Claude Code](https://claude.com/claude-code)
