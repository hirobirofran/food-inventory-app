'use client';

import { useState } from 'react';
import { FoodItem } from '@/types/food';
import { Recipe, SuggestResponse } from '@/app/api/ai/suggest/route';

const applianceEmoji: Record<string, string> = {
  'オートクッカービストロ': '🍲',
  'ビストロレンジ': '📡',
  'グラロボ': '🔥',
};

function getApplianceEmoji(appliance: string): string {
  for (const [key, emoji] of Object.entries(applianceEmoji)) {
    if (appliance.includes(key)) return emoji;
  }
  return '🍳';
}

type Props = {
  foods: FoodItem[];
};

export function AiSuggest({ foods }: Props) {
  const [result, setResult] = useState<SuggestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openRecipe, setOpenRecipe] = useState<number | null>(null);

  async function handleSuggest() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(foods),
      });
      if (!res.ok) throw new Error('提案の取得に失敗しました');
      const data: SuggestResponse = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* 在庫サマリー */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
        <p className="text-sm text-gray-600 font-medium mb-2">現在の在庫: {foods.length}品目</p>
        <div className="flex flex-wrap gap-1">
          {foods.filter(f => f.quantity > 0).slice(0, 10).map(f => (
            <span key={f.id} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
              {f.name}
            </span>
          ))}
          {foods.filter(f => f.quantity > 0).length > 10 && (
            <span className="text-gray-400 text-xs px-2 py-1">
              他{foods.filter(f => f.quantity > 0).length - 10}品目...
            </span>
          )}
        </div>
      </div>

      {/* 提案ボタン */}
      <button
        onClick={handleSuggest}
        disabled={loading || foods.length === 0}
        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white py-4 rounded-2xl font-bold text-base transition-colors"
      >
        {loading ? '考え中...' : '🤖 今夜の献立を考えてもらう'}
      </button>

      {loading && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-3xl mb-2 animate-pulse">🍽️</div>
          <p className="text-sm">在庫を見てレシピを考えています...</p>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 結果表示 */}
      {result && (
        <div className="mt-4 space-y-3">
          {result.message && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
              💬 {result.message}
            </div>
          )}

          <h2 className="font-bold text-gray-800 text-base">おすすめレシピ</h2>

          {result.recipes.map((recipe: Recipe, i: number) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpenRecipe(openRecipe === i ? null : i)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left"
              >
                <span className="text-2xl">{getApplianceEmoji(recipe.appliance)}</span>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{recipe.title}</p>
                  <p className="text-xs text-gray-500">{recipe.appliance}</p>
                </div>
                <span className="text-gray-400">{openRecipe === i ? '▲' : '▼'}</span>
              </button>

              {openRecipe === i && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">使う食材</p>
                    <div className="flex flex-wrap gap-1">
                      {recipe.ingredients.map((ing, j) => (
                        <span key={j} className="bg-orange-50 text-orange-700 text-xs px-2 py-0.5 rounded-full border border-orange-200">
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">作り方</p>
                    <ol className="space-y-1">
                      {recipe.steps.map((step, j) => (
                        <li key={j} className="text-sm text-gray-700 flex gap-2">
                          <span className="text-green-500 font-bold shrink-0">{j + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  {recipe.note && (
                    <div className="bg-yellow-50 rounded-lg px-3 py-2 text-xs text-yellow-800">
                      💡 {recipe.note}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {result.shopping && result.shopping.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="font-bold text-blue-800 text-sm mb-2">🛒 買い足すと良い食材</p>
              <ul className="space-y-1">
                {result.shopping.map((item, i) => (
                  <li key={i} className="text-sm text-blue-700 flex gap-2">
                    <span>•</span><span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleSuggest}
            className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl text-sm hover:bg-gray-50"
          >
            もう一度提案してもらう
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4 text-center">
        ※ オートクッカービストロ・ビストロレンジ・グラロボを活用した時短レシピを優先して提案します
      </p>
    </div>
  );
}
