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

const APP_TIME_ZONE = 'Asia/Tokyo';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const todayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function toUtcDay(dateString: string): number {
  const [y, m, d] = dateString.split(/[-/]/).map(Number);
  return Date.UTC(y, m - 1, d);
}

// 実行環境の TZ に関係なく、Asia/Tokyo の暦日どうしの差（日数）を返す
function getDaysUntilExpiry(expiryDate: string): number {
  const today = todayFormatter.format(new Date());
  return Math.round((toUtcDay(expiryDate) - toUtcDay(today)) / MS_PER_DAY);
}

export function getExpiryStatus(expiryDate: string | null): ExpiryStatus {
  if (!expiryDate) return 'none';
  const diffDays = getDaysUntilExpiry(expiryDate);
  if (diffDays < 0) return 'expired';
  if (diffDays <= 3) return 'warning';
  return 'ok';
}

export function getExpiryLabel(expiryDate: string | null): string {
  if (!expiryDate) return '';
  const diffDays = getDaysUntilExpiry(expiryDate);
  if (diffDays < 0) return `${Math.abs(diffDays)}日超過`;
  if (diffDays === 0) return '今日まで';
  if (diffDays === 1) return '明日まで';
  return `あと${diffDays}日`;
}
