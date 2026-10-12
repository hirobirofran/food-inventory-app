import { GoogleGenAI } from '@google/genai';
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

// Vercel の関数の上限（秒）。既定（300 秒）に頼らず、下の GEMINI_TIMEOUT_MS より長いことをここで保証する
export const maxDuration = 60;

// Gemini の応答を待つ上限。超えたら中断して 500 を返す。
// httpOptions.timeout は SDK のリトライ 1 回ごとの上限なので、合計時間の上限は abortSignal で付ける
export const GEMINI_TIMEOUT_MS = 30_000;

async function generateWithTimeout(ai: GoogleGenAI, contents: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    return await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents,
      config: { abortSignal: controller.signal },
    });
  } catch (error) {
    // SDK は中断理由を伝えずに AbortError を投げるので、ログでタイムアウトと分かる名前を付ける
    if (controller.signal.aborted) {
      throw new Error(`Gemini timed out after ${GEMINI_TIMEOUT_MS}ms`, { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    const foods: FoodItem[] = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    const ai = new GoogleGenAI({ apiKey });

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
- グルラボ（電子レンジ専用容器。鍋のように煮込み・蒸し・炊飯ができる。「魚焼き」「グリル」モードは存在しない）
- 通常の鍋・フライパン

## 指示
1. 今ある食材で作れる料理を3〜5品提案する
2. ⚠️期限間近の食材を優先して使うレシピを提案する
3. オートクッカービストロ・ビストロレンジ・グルラボを活用した省力・時短レシピを優先する
4. 足りない食材があれば最低限の買い物リストも提案する
5. 各調理器具に実在しないモード・機能を創作しない。使い方が分からない場合はその器具を使わず別の器具で提案する
6. 食材ではないもの（歯磨き・ガム・医薬品・キシリトールタブレットなど）はレシピに組み込まない

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

    const result = await generateWithTimeout(ai, prompt);
    const finishReason = result.candidates?.[0]?.finishReason;
    const text = result.text;
    if (!text) {
      const blockReason = result.promptFeedback?.blockReason;
      throw new Error(`Empty response (finishReason=${finishReason}, blockReason=${blockReason})`);
    }

    // JSONを抽出（```json ... ``` で囲まれている場合も対応）
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) throw new Error(`Invalid response format (finishReason=${finishReason})`);

    const parsed: SuggestResponse = JSON.parse(jsonMatch[1]);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error(`AI suggest error (${Date.now() - startedAt}ms):`, error);
    return NextResponse.json({ error: 'AI提案の生成に失敗しました' }, { status: 500 });
  }
}
