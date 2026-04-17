'use client';

import { useState } from 'react';
import { FoodItem, getExpiryStatus } from '@/types/food';
import { ExpiryBadge } from './ExpiryBadge';
import { FoodFormModal } from './FoodFormModal';

const locationEmoji: Record<string, string> = {
  '冷蔵庫': '❄️',
  '冷凍庫': '🧊',
  '常温': '📦',
  'その他': '📍',
};

type Props = {
  foods: FoodItem[];
  onUpdate: (id: string, item: Omit<FoodItem, 'id'>) => void;
  onDelete: (id: string) => void;
};

export function FoodList({ foods, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'fridge' | 'freezer' | 'room'>('all');
  const [search, setSearch] = useState('');

  const locationMap = { all: null, fridge: '冷蔵庫', freezer: '冷凍庫', room: '常温' } as const;

  // 賞味期限の近い順にソート
  const sorted = [...foods].sort((a, b) => {
    const statusOrder = { expired: 0, warning: 1, ok: 2, none: 3 };
    const sa = getExpiryStatus(a.expiryDate);
    const sb = getExpiryStatus(b.expiryDate);
    if (statusOrder[sa] !== statusOrder[sb]) return statusOrder[sa] - statusOrder[sb];
    if (a.expiryDate && b.expiryDate) return a.expiryDate.localeCompare(b.expiryDate);
    return 0;
  });

  const filtered = sorted.filter(f => {
    const locMatch = !locationMap[filter] || f.storageLocation === locationMap[filter];
    const searchMatch = !search || f.name.includes(search) || f.category.includes(search);
    return locMatch && searchMatch;
  });

  const expiredCount = foods.filter(f => getExpiryStatus(f.expiryDate) === 'expired').length;
  const warningCount = foods.filter(f => getExpiryStatus(f.expiryDate) === 'warning').length;

  return (
    <div>
      {/* アラートバナー */}
      {(expiredCount > 0 || warningCount > 0) && (
        <div className="mb-3 space-y-2">
          {expiredCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm">
              <span>🚨</span>
              <span className="text-red-700 font-medium">{expiredCount}件が期限切れです</span>
            </div>
          )}
          {warningCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm">
              <span>⚠️</span>
              <span className="text-yellow-700 font-medium">{warningCount}件が3日以内に期限切れです</span>
            </div>
          )}
        </div>
      )}

      {/* 検索 */}
      <div className="mb-3">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="食材を検索..."
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-base bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white"
        />
      </div>

      {/* 場所フィルター */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {([
          { key: 'all', label: 'すべて' },
          { key: 'fridge', label: '❄️ 冷蔵庫' },
          { key: 'freezer', label: '🧊 冷凍庫' },
          { key: 'room', label: '📦 常温' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* リスト */}
      {filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <div className="text-4xl mb-2">🥦</div>
          <p>食材がありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(food => {
            const status = getExpiryStatus(food.expiryDate);
            const rowBg =
              status === 'expired' ? 'bg-red-50 border-red-200' :
              status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
              'bg-white border-gray-100';

            return (
              <div
                key={food.id}
                className={`border rounded-xl px-4 py-3 flex items-center gap-3 ${rowBg}`}
              >
                <div className="text-xl">{locationEmoji[food.storageLocation]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{food.name}</span>
                    <span className="text-gray-500 text-sm">{food.quantity}{food.unit}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-gray-400">{food.category}</span>
                    {food.expiryDate && <ExpiryBadge expiryDate={food.expiryDate} />}
                    {food.note && <span className="text-xs text-gray-400">{food.note}</span>}
                  </div>
                </div>
                <button
                  onClick={() => setEditing(food)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  ✏️
                </button>
                <button
                  onClick={() => onDelete(food.id)}
                  className="text-gray-300 hover:text-red-400 p-1"
                >
                  🗑️
                </button>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <FoodFormModal
          item={editing}
          onSave={data => {
            onUpdate(editing.id, data);
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
