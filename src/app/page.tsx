'use client';

import { useCallback, useEffect, useState } from 'react';
import { FoodItem } from '@/types/food';
import { FoodList } from '@/components/FoodList';
import { ShoppingList } from '@/components/ShoppingList';
import { FoodFormModal } from '@/components/FoodFormModal';

type Tab = 'inventory' | 'shopping' | 'ai';

export default function Home() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('inventory');
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchFoods = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/foods');
      if (!res.ok) throw new Error('データの取得に失敗しました');
      const data = await res.json();
      setFoods(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFoods(); }, [fetchFoods]);

  async function handleAdd(data: Omit<FoodItem, 'id'>) {
    const res = await fetch('/api/foods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return;
    const newFood = await res.json();
    setFoods(prev => [...prev, newFood]);
    setShowAddModal(false);
  }

  async function handleUpdate(id: string, data: Omit<FoodItem, 'id'>) {
    const res = await fetch(`/api/foods/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setFoods(prev => prev.map(f => f.id === id ? updated : f));
  }

  async function handleDelete(id: string) {
    if (!confirm('削除してよいですか？')) return;
    const res = await fetch(`/api/foods/${id}`, { method: 'DELETE' });
    if (!res.ok) return;
    setFoods(prev => prev.filter(f => f.id !== id));
  }

  async function handleUpdateQuantity(id: string, quantity: number) {
    const food = foods.find(f => f.id === id);
    if (!food) return;
    await handleUpdate(id, { ...food, quantity });
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
        {loading && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2 animate-spin">⟳</div>
            <p>読み込み中...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            <p className="font-medium">接続エラー</p>
            <p className="mt-1">{error}</p>
            <button
              onClick={fetchFoods}
              className="mt-3 text-red-600 underline text-xs"
            >
              再読み込み
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
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
                  onClick={() => alert('AI連携は次のフェーズで実装します！')}
                >
                  今夜の献立を考えてもらう
                </button>
                <p className="text-xs text-gray-400 mt-3">
                  ※ オートクッカービストロ・ビストロレンジ・グラロボを活用した時短レシピも提案できます
                </p>
              </div>
            )}
          </>
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
