import type { Category, StorageLocation } from '../src/types/food';

export type DemoSeed = {
  name: string;
  category: Category;
  quantity: number;
  unit: string;
  expiryOffsetDays: number | null;
  storageLocation: StorageLocation;
  minQuantity: number;
  note: string;
};

export const demoFoods: DemoSeed[] = [
  // 調味料（常温多め、期限不明も混ぜる）
  { name: '醤油', category: '調味料', quantity: 1, unit: '本', expiryOffsetDays: 180, storageLocation: '冷蔵庫', minQuantity: 1, note: '開封済' },
  { name: 'みりん', category: '調味料', quantity: 1, unit: '本', expiryOffsetDays: 120, storageLocation: '常温', minQuantity: 1, note: '' },
  { name: '料理酒', category: '調味料', quantity: 1, unit: '本', expiryOffsetDays: 200, storageLocation: '常温', minQuantity: 1, note: '' },
  { name: '味噌', category: '調味料', quantity: 1, unit: 'パック', expiryOffsetDays: 45, storageLocation: '冷蔵庫', minQuantity: 1, note: '' },
  { name: '塩', category: '調味料', quantity: 1, unit: '袋', expiryOffsetDays: null, storageLocation: '常温', minQuantity: 0, note: '' },
  { name: '砂糖', category: '調味料', quantity: 1, unit: '袋', expiryOffsetDays: null, storageLocation: '常温', minQuantity: 0, note: '' },
  { name: 'オリーブオイル', category: '調味料', quantity: 1, unit: '本', expiryOffsetDays: 90, storageLocation: '常温', minQuantity: 1, note: '' },
  { name: 'ごま油', category: '調味料', quantity: 1, unit: '本', expiryOffsetDays: 60, storageLocation: '常温', minQuantity: 0, note: '' },
  { name: 'カレー粉', category: '調味料', quantity: 1, unit: '瓶', expiryOffsetDays: 150, storageLocation: '常温', minQuantity: 0, note: 'パウダー' },
  { name: '鶏ガラの素', category: '調味料', quantity: 1, unit: '袋', expiryOffsetDays: 200, storageLocation: '常温', minQuantity: 1, note: 'パウダー' },
  { name: 'コンソメ', category: '調味料', quantity: 0, unit: '箱', expiryOffsetDays: null, storageLocation: '常温', minQuantity: 1, note: '切れてる' },
  { name: '片栗粉', category: '調味料', quantity: 1, unit: '袋', expiryOffsetDays: null, storageLocation: '常温', minQuantity: 1, note: '' },
  { name: '粉チーズ', category: '調味料', quantity: 1, unit: '袋', expiryOffsetDays: 30, storageLocation: '冷蔵庫', minQuantity: 0, note: '' },

  // 野菜・果物
  { name: '玉ねぎ', category: '野菜・果物', quantity: 3, unit: '個', expiryOffsetDays: 14, storageLocation: '常温', minQuantity: 2, note: '' },
  { name: 'じゃがいも', category: '野菜・果物', quantity: 4, unit: '個', expiryOffsetDays: 20, storageLocation: '常温', minQuantity: 2, note: '' },
  { name: '人参', category: '野菜・果物', quantity: 2, unit: '本', expiryOffsetDays: 7, storageLocation: '冷蔵庫', minQuantity: 1, note: '' },
  { name: 'キャベツ', category: '野菜・果物', quantity: 1, unit: '個', expiryOffsetDays: 5, storageLocation: '冷蔵庫', minQuantity: 0, note: '半分残り' },
  { name: 'トマト', category: '野菜・果物', quantity: 2, unit: '個', expiryOffsetDays: 2, storageLocation: '冷蔵庫', minQuantity: 0, note: '' },
  { name: 'バナナ', category: '野菜・果物', quantity: 3, unit: '本', expiryOffsetDays: -1, storageLocation: '常温', minQuantity: 0, note: '熟してる' },

  // 肉・魚
  { name: '豚バラブロック', category: '肉・魚', quantity: 1, unit: 'パック', expiryOffsetDays: 60, storageLocation: '冷凍庫', minQuantity: 0, note: '1kg' },
  { name: '鶏むね肉', category: '肉・魚', quantity: 2, unit: 'パック', expiryOffsetDays: 45, storageLocation: '冷凍庫', minQuantity: 1, note: '' },
  { name: '合い挽き肉', category: '肉・魚', quantity: 1, unit: 'パック', expiryOffsetDays: 30, storageLocation: '冷凍庫', minQuantity: 0, note: '' },
  { name: '鮭の切り身', category: '肉・魚', quantity: 4, unit: '切', expiryOffsetDays: 1, storageLocation: '冷蔵庫', minQuantity: 0, note: '明日使う' },

  // 乳製品・卵
  { name: '卵', category: '乳製品・卵', quantity: 6, unit: '個', expiryOffsetDays: 10, storageLocation: '冷蔵庫', minQuantity: 4, note: '' },
  { name: '牛乳', category: '乳製品・卵', quantity: 1, unit: '本', expiryOffsetDays: 3, storageLocation: '冷蔵庫', minQuantity: 1, note: '' },
  { name: 'バター', category: '乳製品・卵', quantity: 1, unit: '箱', expiryOffsetDays: 50, storageLocation: '冷蔵庫', minQuantity: 0, note: '' },
  { name: 'ヨーグルト', category: '乳製品・卵', quantity: 0, unit: 'パック', expiryOffsetDays: null, storageLocation: '冷蔵庫', minQuantity: 1, note: '' },

  // 冷凍食品
  { name: '冷凍餃子', category: '冷凍食品', quantity: 1, unit: '袋', expiryOffsetDays: 120, storageLocation: '冷凍庫', minQuantity: 1, note: '' },
  { name: '冷凍うどん', category: '冷凍食品', quantity: 3, unit: '玉', expiryOffsetDays: 90, storageLocation: '冷凍庫', minQuantity: 2, note: '' },
  { name: '冷凍ブロッコリー', category: '冷凍食品', quantity: 1, unit: '袋', expiryOffsetDays: 180, storageLocation: '冷凍庫', minQuantity: 0, note: '' },
  { name: '冷凍フライドポテト', category: '冷凍食品', quantity: 1, unit: '袋', expiryOffsetDays: 150, storageLocation: '冷凍庫', minQuantity: 0, note: '' },

  // その他（インスタント・スープ類）
  { name: 'カップ麺（しょうゆ）', category: 'その他', quantity: 2, unit: '個', expiryOffsetDays: -5, storageLocation: '常温', minQuantity: 0, note: '要チェック' },
  { name: 'レトルトカレー', category: 'その他', quantity: 3, unit: 'パック', expiryOffsetDays: 200, storageLocation: '常温', minQuantity: 2, note: '' },
  { name: 'スープの素（コーン）', category: 'その他', quantity: 1, unit: '箱', expiryOffsetDays: 80, storageLocation: '常温', minQuantity: 0, note: 'パウダー' },
  { name: 'インスタント味噌汁', category: 'その他', quantity: 5, unit: '食', expiryOffsetDays: 100, storageLocation: '常温', minQuantity: 3, note: '' },

  // 飲み物
  { name: '麦茶パック', category: '飲み物', quantity: 1, unit: '袋', expiryOffsetDays: 160, storageLocation: '常温', minQuantity: 1, note: '' },
  { name: '緑茶ティーバッグ', category: '飲み物', quantity: 1, unit: '箱', expiryOffsetDays: null, storageLocation: '常温', minQuantity: 0, note: '' },
];
