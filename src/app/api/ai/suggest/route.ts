import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { FoodItem, getExpiryStatus } from '@/types/food';

export type Recipe = {
  title: string;
  appliance: string;
  ingredients: string[];
  steps: string[];
  note: string;
};

export type SuggestResponse = {
  recipes: Recipe[];
  shopping: string[];
  message: string;
};

export async function POST(request: Request) {
  try {
    const foods: FoodItem[] = await request.json();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const urgentFoods = foods.filter(f => getExpiryStatus(f.expiryDate) === 'expired' || getExpiryStatus(f.expiryDate) === 'warning');
    const availableFoods = foods.filter(f => f.quantity > 0);

    const inventoryText = availableFoods.map(f =>
      `- ${f.name}（${f.quantity}${f.unit}）${urgentFoods.find(u => u.id === f.id) ? '⚠️期限間近' : ''}`
    ).join('\n');

    const prompt = `あなたは料理の専門家です。以下の食材在庫を見て、今夜の献立を提案してください。

## 現在の食材在庫
${inventoryText || '（食材なし）'}

## 使える調理器具
- オートクッカービストロ（自動調理鍋・圧力調理・無水調理）
- ビストロレンジ（スチームオーブンレンジ）
- グラロボ（自動グリル）
- 通常の鍋・フライパン

## 指示
1. 今ある食材で作れる料理を3〜5品提案する
2. ⚠️期限間近の食材を優先して使うレシピを提案する
3. オートクッカービストロ・ビストロレンジ・グラロボを活用した省力・時短レシピを優先する
4. 足りない食材があれば最低限の買い物リストも提案する

## 出力形式（必ずこのJSON形式で返すこと）
{
  "recipes": [
    {
      "title": "料理名",
      "appliance": "使う調理器具（例：オートクッカービストロ）",
      "ingredients": ["使う食材1（量）", "使う食材2（量）"],
      "steps": ["手順1", "手順2"],
      "note": "時短ポイントや一言メモ"
    }
  ],
  "shopping": ["買い足すと良い食材1", "食材2"],
  "message": "全体的な一言コメント"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // JSONを抽出（```json ... ``` で囲まれている場合も対応）
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) throw new Error('Invalid response format');

    const parsed: SuggestResponse = JSON.parse(jsonMatch[1]);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('AI suggest error:', error);
    return NextResponse.json({ error: 'AI提案の生成に失敗しました' }, { status: 500 });
  }
}
