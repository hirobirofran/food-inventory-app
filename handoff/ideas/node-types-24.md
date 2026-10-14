# @types/node を実行環境（Node 24）に合わせる

状態: 未着手（2026-10-15、PR #52 の /code-review 指摘）

## 何が問題か

PR #52 で `engines.node` と `.nvmrc` を 24 にしたが、`@types/node` は `^20` のまま。Node 24 にしかない API が型に無く、20 時代のシグネチャで型検査が通る。`@types/node@24` は存在し、vitest の peer 範囲（^20 || ^22 || >=24）にも収まる。

## 見送った理由

#37 で承認した更新一覧はメジャー更新を含まない（@types/node は 20 → 24 がメジャー）。#51 の Dependabot もメジャー更新は除外する設定にする予定なので、別途やる必要がある。

## やるとしたら

`npm install -D @types/node@^24` → `npx tsc --noEmit` と `npm test` が通ることを確認。

🤖 Generated with [Claude Code](https://claude.com/claude-code)
