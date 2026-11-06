# アーキテクチャ・技術選定

## 全体構成

```
[スマホ / PC / タブレット（ブラウザ）]
           ↓
   Next.js アプリ（Vercel）
     ├── UI（React + Tailwind）
     ├── 認証（Auth.js + Google ログイン。proxy.ts で画面と API を保護）
     ├── API Routes（バックエンド処理）
     │     ├── Google Sheets API  ← データの読み書き
     │     └── Gemini API         ← レシピ提案・買い物リスト提案
```

## 技術スタック

版は `package.json`（Node.js は `.nvmrc`）を見る。

| 役割 | 技術 | 理由 |
|------|------|------|
| フロントエンド | Next.js (App Router) | SSR/CSRの柔軟性、API Routesでバックエンドも一体化 |
| スタイル | Tailwind CSS | モバイルファーストのUI構築が速い |
| 言語 | TypeScript | 型安全性。食材データの構造を明確に保てる |
| データ保存 | Google Sheets API | 既存Googleアカウントで使える。家族共有が簡単。バックアップ自動 |
| 認証 | Auth.js (`next-auth`) + Google ログイン | 許可リスト（環境変数 `AUTH_ALLOWED_EMAILS`）に入れた Google アカウントだけが使える。手順は `docs/SETUP.md` の 3 章 |
| AI | Gemini API (`@google/genai`。モデル名は `src/app/api/ai/suggest/route.ts`) | 無料枠の範囲で運用できる。用途はレシピ提案・買い物リストの提案。レシート OCR は未実装（`handoff/ideas/receipt-ocr.md`） |
| デプロイ | Vercel | Next.jsと相性最良。無料枠あり。スマホからもアクセス可 |
| PWA | 未設定 | manifest・Service Worker・アイコンは無く、スマホはブラウザの「ホーム画面に追加」で開く。PWA 化の案は `handoff/ideas/launch-plan.md` の Step 3 |

## データ設計（Google Sheets）

### シート構成

**inventory シート**（食材在庫）

| 列 | 名前 | 型 | 例 |
|----|------|----|----|
| A | id | string | `1735123456789` |
| B | name | string | `牛乳` |
| C | category | string | `乳製品・卵` |
| D | quantity | number | `1` |
| E | unit | string | `本` |
| F | expiryDate | date (YYYY-MM-DD) | `2026-04-20` |
| G | storageLocation | string | `冷蔵庫` |
| H | minQuantity | number | `1` |
| I | note | string | `開封済み` |

`quantity` は同じ品目の合計個数、`expiryDate` は最も近い期限を入れる。消費したら個数を減らし、次の期限に書き換える。個数ごとの期限（ロット管理）は `handoff/ideas/item-data-model.md` を参照。

### カテゴリ
`野菜・果物` / `肉・魚` / `乳製品・卵` / `調味料` / `飲み物` / `冷凍食品` / `その他`

### 保存場所
`冷蔵庫` / `冷凍庫` / `常温` / `その他`

## 重要な設計判断

### なぜGoogle Sheetsをデータベースにするのか
- セットアップが簡単（Google Cloud設定のみ）
- スプレッドシートとして直接見たり編集したりできる
- バックアップ・エクスポートが標準機能として使える
- 食材管理程度のデータ量では速度問題なし
- 将来的にSupabase等へ移行することも可能

### なぜGeminiを使っているか
- 無料枠の範囲で運用できる
- 無料枠が使えなくなった場合の代案（Claude API への切り替えなど）は `handoff/ideas/ai-provider-alternatives.md`
- モデル名は世代交代が早い（`docs/KNOWLEDGE.md`）

### PWA vs ネイティブアプリ
- ネイティブアプリ（React Native等）はApp Store審査が必要
- PWAならWebブラウザだけで「ホーム画面に追加」できる
- スマホカメラへのアクセスもPWAで可能
- PWA 化の状況と案は、上の技術スタック表の PWA の行を参照

## ディレクトリ構成

```
src/
├── app/
│   ├── page.tsx           # メインページ（タブ切り替え）
│   ├── layout.tsx         # ルートレイアウト・メタデータ
│   └── api/
│       ├── auth/          # Google ログイン（Auth.js）
│       ├── foods/         # 食材CRUD（Google Sheets連携）
│       └── ai/            # AI提案エンドポイント（Gemini API）
├── auth.ts / auth.config.ts  # Auth.js の設定（許可リストの確認）
├── proxy.ts               # 未ログインの要求を止める（画面はログインへ、API は 401）
├── components/
│   ├── FoodList.tsx       # 食材一覧（フィルター・ソート）
│   ├── FoodFormModal.tsx  # 食材追加・編集フォーム
│   ├── ShoppingList.tsx   # 買い物リスト
│   ├── AiSuggest.tsx      # AI提案の画面（/api/ai/suggest を呼ぶ）
│   └── ExpiryBadge.tsx    # 賞味期限バッジ（色分け）
├── lib/
│   ├── format.ts          # 数量の表示用の整形
│   ├── mockData.ts        # モックデータ（現在は未使用）
│   └── sheets.ts          # Google Sheets APIクライアント
└── types/
    └── food.ts            # 型定義・ユーティリティ関数
```
