# アーキテクチャ・技術選定

## 全体構成

```
[スマホ / PC / タブレット（ブラウザ）]
           ↓
   Next.js PWA（Vercel）
     ├── UI（React + Tailwind）
     ├── API Routes（バックエンド処理）
     │     ├── Google Sheets API  ← データの読み書き
     │     ├── Claude API         ← AI機能全般
     │     └── Gmail API          ← 購入メール解析（Phase 2）
     └── PWA（ホーム画面追加・Push通知）
```

## 技術スタック

| 役割 | 技術 | 理由 |
|------|------|------|
| フロントエンド | Next.js 15 (App Router) | SSR/CSRの柔軟性、API Routesでバックエンドも一体化 |
| スタイル | Tailwind CSS | モバイルファーストのUI構築が速い |
| 言語 | TypeScript | 型安全性。食材データの構造を明確に保てる |
| データ保存 | Google Sheets API | 既存Googleアカウントで使える。家族共有が簡単。バックアップ自動 |
| AI | Claude API (claude-sonnet-4-6) | レシピ提案・OCR・買い物プラン生成。Vision対応 |
| デプロイ | Vercel | Next.jsと相性最良。無料枠あり。スマホからもアクセス可 |
| PWA | next-pwa | スマホのホーム画面に追加できる（アプリ感覚） |

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

### なぜClaudeを選ぶか（GeminiではなくClaude）
- Vision（画像認識）の精度が高い → レシート読み取りに有利
- 日本語の料理レシピ生成の品質が良い
- Anthropic APIの料金体系がコントロールしやすい

### PWA vs ネイティブアプリ
- ネイティブアプリ（React Native等）はApp Store審査が必要
- PWAならWebブラウザだけで「ホーム画面に追加」できる
- スマホカメラへのアクセスもPWAで可能

## ディレクトリ構成

```
src/
├── app/
│   ├── page.tsx           # メインページ（タブ切り替え）
│   ├── layout.tsx         # PWA設定・メタデータ
│   └── api/
│       ├── foods/         # 食材CRUD（Google Sheets連携）
│       └── ai/            # AI提案エンドポイント（Claude API）
├── components/
│   ├── FoodList.tsx       # 食材一覧（フィルター・ソート）
│   ├── FoodFormModal.tsx  # 食材追加・編集フォーム
│   ├── ShoppingList.tsx   # 買い物リスト
│   └── ExpiryBadge.tsx    # 賞味期限バッジ（色分け）
├── lib/
│   ├── mockData.ts        # 開発用モックデータ
│   └── sheets.ts          # Google Sheets APIクライアント（未実装）
└── types/
    └── food.ts            # 型定義・ユーティリティ関数
```
