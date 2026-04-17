'use client';

import { FoodItem } from '@/types/food';

type Props = {
  foods: FoodItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
};

export function ShoppingList({ foods, onUpdateQuantity }: Props) {
  const shortItems = foods.filter(f => f.quantity < f.minQuantity);
  const outOfStockItems = foods.filter(f => f.quantity === 0 && f.minQuantity > 0);

  if (shortItems.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-3">🛒</div>
        <p className="text-gray-500 font-medium">買い物は必要ありません</p>
        <p className="text-gray-400 text-sm mt-1">すべての食材が十分にあります</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-gray-500">
          <span className="font-bold text-gray-800">{shortItems.length}件</span> の食材が不足しています
          {outOfStockItems.length > 0 && (
            <span className="text-red-600 ml-1">（うち{outOfStockItems.length}件が在庫ゼロ）</span>
          )}
        </p>
      </div>

      <div className="space-y-2">
        {shortItems
          .sort((a, b) => a.quantity - b.minQuantity - (b.quantity - b.minQuantity))
          .map(food => {
            const needed = food.minQuantity - food.quantity;
            const isEmpty = food.quantity === 0;

            return (
              <div
                key={food.id}
                className={`border rounded-xl px-4 py-3 ${
                  isEmpty ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">{food.name}</span>
                    <span className={`ml-2 text-sm font-medium ${isEmpty ? 'text-red-600' : 'text-orange-600'}`}>
                      {isEmpty ? '在庫ゼロ' : `残り${food.quantity}${food.unit}`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-500">{food.storageLocation}</span>
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    最低 {food.minQuantity}{food.unit} 必要 → あと <strong>{needed.toFixed(1)}{food.unit}</strong> 買う
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(food.id, food.minQuantity)}
                    className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1 text-gray-600 hover:bg-gray-50"
                  >
                    購入済みにする
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-xl">
        <p className="text-sm text-gray-500 text-center">
          💡 AIに「献立を考えて」と頼むと、今ある食材に合わせた買い物プランも提案できます
        </p>
      </div>
    </div>
  );
}
