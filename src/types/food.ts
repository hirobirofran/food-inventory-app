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
  expiryDate: string | null; // YYYY-MM-DD（印字の賞味・消費期限）
  storageLocation: StorageLocation;
  minQuantity: number; // 最低在庫数（これを下回ったら買い物リストへ）
  note: string;
  openedDate: string | null; // YYYY-MM-DD（開封日）
  daysAfterOpening: number | null; // 開封後の目安日数
};

export type ExpiryStatus = 'expired' | 'warning' | 'ok' | 'none';

export type EffectiveExpiry = {
  date: string | null; // YYYY-MM-DD
  source: 'printed' | 'opened' | null;
};

// dateStr（YYYY-MM-DD）にdays日を加算した日付をローカル日付基準で YYYY-MM-DD で返す
function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + days);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// 実際の期限 = min(印字の期限, 開封日 + 開封後の目安日数)。片方だけならその方、両方なければ null
export function getEffectiveExpiry(
  food: Pick<FoodItem, 'expiryDate' | 'openedDate' | 'daysAfterOpening'>
): EffectiveExpiry {
  const printed = food.expiryDate;
  const openedExpiry =
    food.openedDate && food.daysAfterOpening != null
      ? addDaysToDateString(food.openedDate, food.daysAfterOpening)
      : null;

  if (printed && openedExpiry) {
    return openedExpiry < printed
      ? { date: openedExpiry, source: 'opened' }
      : { date: printed, source: 'printed' };
  }
  if (printed) return { date: printed, source: 'printed' };
  if (openedExpiry) return { date: openedExpiry, source: 'opened' };
  return { date: null, source: null };
}

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
