export type StorageLocation = '冷蔵庫' | '冷凍庫' | '常温' | 'その他';

export type Category =
  | '野菜・果物'
  | '肉・魚'
  | '乳製品・卵'
  | '調味料'
  | '飲み物'
  | '冷凍食品'
  | 'その他';

export type FoodItem = {
  id: string;
  name: string;
  category: Category;
  quantity: number;
  unit: string;
  expiryDate: string | null; // YYYY-MM-DD
  storageLocation: StorageLocation;
  minQuantity: number; // 最低在庫数（これを下回ったら買い物リストへ）
  note: string;
};

export type ExpiryStatus = 'expired' | 'warning' | 'ok' | 'none';

export function getExpiryStatus(expiryDate: string | null): ExpiryStatus {
  if (!expiryDate) return 'none';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 3) return 'warning';
  return 'ok';
}

export function getExpiryLabel(expiryDate: string | null): string {
  if (!expiryDate) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `${Math.abs(diffDays)}日超過`;
  if (diffDays === 0) return '今日まで';
  if (diffDays === 1) return '明日まで';
  return `あと${diffDays}日`;
}
