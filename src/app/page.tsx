'use client';

import { useState } from 'react';
import { FoodItem } from '@/types/food';
import { mockFoods } from '@/lib/mockData';
import { FoodList } from '@/components/FoodList';
import { ShoppingList } from '@/components/ShoppingList';
import { FoodFormModal } from '@/components/FoodFormModal';

type Tab = 'inventory' | 'shopping' | 'ai';

export default function Home() {
  const [foods, setFoods] = useState<FoodItem[]>(mockFoods);
  const [tab, setTab] = useState<Tab>('inventory');
  const [showAddModal, setShowAddModal] = useState(false);

  function handleAdd(data: Omit<FoodItem, 'id'>) {
    const newItem: FoodItem = { ...data, id: Date.now().toString() };
    setFoods(prev => [...prev, newItem]);
    setShowAddModal(false);
  }

  function handleUpdate(id: string, data: Omit<FoodItem, 'id'>) {
    setFoods(prev => prev.map(f => f.id === id ? { ...data, id } : f));
  }

  function handleDelete(id: string) {
    if (confirm('削除してよいですか？')) {
      setFoods(prev => prev.filter(f => f.id !== id));
    }
  }

  function handleUpdateQuantity(id: string, quantity: number) {
    setFoods(prev => prev.map(f => f.id === id ? { ...f, quantity } : f));
  }

  const shortCount = foods.filter(f => f.quantity < f.minQuantity).length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">🥗 食材管理</h1>
          {tab === 'inventory' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium"
            >
              + 追加
            </button>
          )}
        </div>
      </header>

      {/* コンテンツ */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {tab === 'inventory' && (
          <FoodList
            foods={foods}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        )}
        {tab === 'shopping' && (
          <ShoppingList
            foods={foods}
            onUpdateQuantity={handleUpdateQuantity}
          />
        )}
        {tab === 'ai' && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🤖</div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">AIレシピ提案</h2>
            <p className="text-gray-500 text-sm mb-6">
              今ある食材をもとに、今夜の献立や<br />買い物プランを提案します
            </p>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 text-left space-y-3 mb-4">
              <p className="text-sm text-gray-600 font-medium">現在の在庫: {foods.length}品目</p>
              <div className="flex flex-wrap gap-1">
                {foods.slice(0, 8).map(f => (
                  <span key={f.id} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                    {f.name}
                  </span>
                ))}
                {foods.length > 8 && (
                  <span className="text-gray-400 text-xs px-2 py-1">他{foods.length - 8}品目...</span>
                )}
              </div>
            </div>
            <button
              className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-bold text-base"
              onClick={() => alert('Claude API連携は次のフェーズで実装します！')}
            >
              今夜の献立を考えてもらう
            </button>
            <p className="text-xs text-gray-400 mt-3">
              ※ オートクッカービストロ・ビストロレンジ・グラロボを活用した時短レシピも提案できます
            </p>
          </div>
        )}
      </main>

      {/* ボトムナビ */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 flex">
        {([
          { key: 'inventory', label: '在庫', icon: '📋', badge: 0 },
          { key: 'shopping', label: '買い物', icon: '🛒', badge: shortCount },
          { key: 'ai', label: 'AIレシピ', icon: '🤖', badge: 0 },
        ] as const).map(({ key, label, icon, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${
              tab === key ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            <span className="text-2xl relative inline-block">
              {icon}
              {badge ? (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {badge}
                </span>
              ) : null}
            </span>
            <span className={`text-xs font-medium ${tab === key ? 'text-green-600' : 'text-gray-400'}`}>
              {label}
            </span>
          </button>
        ))}
      </nav>

      {showAddModal && (
        <FoodFormModal
          onSave={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
