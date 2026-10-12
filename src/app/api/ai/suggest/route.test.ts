import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Gemini SDK は実際には呼ばず、abortSignal を尊重する最小限のモックで差し替える
// vi.mock は import より前に巻き上げられるので、参照する変数も vi.hoisted で先に作る
const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

import { GEMINI_TIMEOUT_MS, POST } from './route';

function makeRequest() {
  return new Request('http://localhost/api/ai/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([]),
  });
}

describe('POST /api/ai/suggest', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    // restoreMocks は spyOn しか戻さないので、mockImplementation は毎回消す
    generateContent.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('Gemini が応答しないとき、上限時間でタイムアウトとして 500 を返す', async () => {
    // 応答しない Gemini: abortSignal が中断されたときだけ reject する
    generateContent.mockImplementation(
      ({ config }: { config?: { abortSignal?: AbortSignal } }) =>
        new Promise((_, reject) => {
          config?.abortSignal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );

    const responsePromise = POST(makeRequest());
    await vi.advanceTimersByTimeAsync(GEMINI_TIMEOUT_MS);

    const res = await responsePromise;
    expect(res.status).toBe(500);
    // Gemini まで到達した上でタイムアウトしたこと（手前の失敗で 500 になったのではないこと）
    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(vi.mocked(console.error)).toHaveBeenCalledWith(
      `AI suggest error (${GEMINI_TIMEOUT_MS}ms):`,
      expect.objectContaining({ message: `Gemini timed out after ${GEMINI_TIMEOUT_MS}ms` }),
    );
  });

  it('Gemini が時間内に応答すれば 200 を返し、タイマーを残さない', async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify({ recipes: [], shopping: [], message: 'ok' }),
      candidates: [{ finishReason: 'STOP' }],
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    ['recipes キーが無い', { shopping: [], message: 'ok' }],
    ['recipes が文字列', { recipes: 'oops', shopping: [], message: 'ok' }],
    ['recipes がオブジェクト', { recipes: {}, shopping: [], message: 'ok' }],
    ['トップレベルが null', null],
    ['トップレベルが配列', []],
  ])('返事の形が不正（%s）なら 500 とエラー本文を返す', async (_name, body) => {
    generateContent.mockResolvedValue({
      // コードフェンス付きにして、null や配列でも JSON.parse まで到達させる
      text: '```json\n' + JSON.stringify(body) + '\n```',
      candidates: [{ finishReason: 'STOP' }],
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'AI提案の生成に失敗しました' });
    expect(vi.mocked(console.error)).toHaveBeenCalledWith(
      expect.stringContaining('AI suggest error'),
      expect.objectContaining({ message: expect.stringContaining('Invalid response shape') }),
    );
  });
});
