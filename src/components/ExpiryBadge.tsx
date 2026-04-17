'use client';

import { ExpiryStatus, getExpiryLabel, getExpiryStatus } from '@/types/food';

const statusStyles: Record<ExpiryStatus, string> = {
  expired: 'bg-red-100 text-red-700 border border-red-300',
  warning: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  ok: 'bg-green-100 text-green-700 border border-green-300',
  none: 'bg-gray-100 text-gray-500 border border-gray-200',
};

type Props = {
  expiryDate: string | null;
};

export function ExpiryBadge({ expiryDate }: Props) {
  const status = getExpiryStatus(expiryDate);
  const label = getExpiryLabel(expiryDate);

  if (status === 'none') return <span className="text-gray-400 text-xs">期限なし</span>;

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyles[status]}`}>
      {label}
    </span>
  );
}
