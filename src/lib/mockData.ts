import { FoodItem } from '@/types/food';

function daysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export const mockFoods: FoodItem[] = [
  {
    id: '1',
    name: '牛乳',
    category: '乳製品・卵',
    quantity: 1,
    unit: '本',
    expiryDate: daysFromToday(-1), // 期限切れ
    storageLocation: '冷蔵庫',
    minQuantity: 1,
    note: '',
  },
  {
    id: '2',
    name: '卵',
    category: '乳製品・卵',
    quantity: 4,
    unit: '個',
    expiryDate: daysFromToday(2), // 警告（3日以内）
    storageLocation: '冷蔵庫',
    minQuantity: 6,
    note: '',
  },
  {
    id: '3',
    name: 'キャベツ',
    category: '野菜・果物',
    quantity: 0.5,
    unit: '個',
    expiryDate: daysFromToday(3), // ちょうど3日
    storageLocation: '冷蔵庫',
    minQuantity: 0,
    note: '',
  },
  {
    id: '4',
    name: '鶏むね肉',
    category: '肉・魚',
    quantity: 2,
    unit: 'パック',
    expiryDate: daysFromToday(10),
    storageLocation: '冷凍庫',
    minQuantity: 1,
    note: '冷凍済み',
  },
  {
    id: '5',
    name: 'トマト缶',
    category: 'その他',
    quantity: 0,
    unit: '缶',
    expiryDate: daysFromToday(365),
    storageLocation: '常温',
    minQuantity: 2,
    note: '',
  },
  {
    id: '6',
    name: '醤油',
    category: '調味料',
    quantity: 1,
    unit: '本',
    expiryDate: daysFromToday(180),
    storageLocation: '常温',
    minQuantity: 1,
    note: '',
  },
  {
    id: '7',
    name: 'ほうれん草',
    category: '野菜・果物',
    quantity: 1,
    unit: '袋',
    expiryDate: daysFromToday(1), // 明日まで
    storageLocation: '冷蔵庫',
    minQuantity: 0,
    note: '',
  },
  {
    id: '8',
    name: '豆腐',
    category: 'その他',
    quantity: 2,
    unit: '丁',
    expiryDate: daysFromToday(5),
    storageLocation: '冷蔵庫',
    minQuantity: 1,
    note: '',
  },
];
