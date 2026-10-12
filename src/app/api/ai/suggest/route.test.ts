import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Gemini SDK は実際には呼ばず、abortSignal を尊重する最小限のモックで差し替える
const generateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

import { POST } from './route';

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
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('Gemini が 30 秒応答しないとき 500 を返す', async () => {
    // 応答しない Gemini: abortSignal が中断されたときだけ reject する
    generateContent.mockImplementation(
      ({ config }: { config?: { abortSignal?: AbortSignal } }) =>
        new Promise((_, reject) => {
          config?.abortSignal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );

    const responsePromise = POST(makeRequest());
    await vi.advanceTimersByTimeAsync(30_000);

    const res = await responsePromise;
    expect(res.status).toBe(500);
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
});
