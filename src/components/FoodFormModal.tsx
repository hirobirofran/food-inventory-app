'use client';

import { useState } from 'react';
import { Category, FoodItem, StorageLocation } from '@/types/food';

const CATEGORIES: Category[] = [
  '野菜・果物', '肉・魚', '乳製品・卵', '調味料', '飲み物', '冷凍食品', 'その他',
];

const LOCATIONS: StorageLocation[] = ['冷蔵庫', '冷凍庫', '常温', 'その他'];

type Props = {
  item?: FoodItem;
  onSave: (item: Omit<FoodItem, 'id'>) => void;
  onClose: () => void;
};

export function FoodFormModal({ item, onSave, onClose }: Props) {
  const [form, setForm] = useState({
    name: item?.name ?? '',
    category: item?.category ?? '野菜・果物' as Category,
    quantity: item?.quantity ?? 1,
    unit: item?.unit ?? '個',
    expiryDate: item?.expiryDate ?? '',
    storageLocation: item?.storageLocation ?? '冷蔵庫' as StorageLocation,
    minQuantity: item?.minQuantity ?? 0,
    note: item?.note ?? '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      ...form,
      expiryDate: form.expiryDate || null,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{item ? '食材を編集' : '食材を追加'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">食材名 *</label>
            <input
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="例：牛乳"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">単位</label>
              <input
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="個, g, 本..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">保存場所</label>
            <div className="flex gap-2 flex-wrap">
              {LOCATIONS.map(loc => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, storageLocation: loc }))}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    form.storageLocation === loc
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">賞味期限</label>
            <input
              type="date"
              value={form.expiryDate}
              onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              最低在庫数 <span className="text-gray-400 font-normal text-xs">（これ未満で買い物リストへ）</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={form.minQuantity}
              onChange={e => setForm(f => ({ ...f, minQuantity: parseFloat(e.target.value) || 0 }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
            <input
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="冷凍済み、開封済みなど"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
