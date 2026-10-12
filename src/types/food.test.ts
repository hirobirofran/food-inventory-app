import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getExpiryLabel, getExpiryStatus } from './food';

// 期待値はすべて Asia/Tokyo の暦日基準。実行環境の TZ には依存しない。
describe('期限判定は Asia/Tokyo の暦日で行う', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('JST 2026-09-27 05:00（UTC では 9/26 20:00）', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-26T20:00:00Z'));
    });

    it('昨日の期限は expired / 1日超過', () => {
      expect(getExpiryStatus('2026-09-26')).toBe('expired');
      expect(getExpiryLabel('2026-09-26')).toBe('1日超過');
    });

    it('今日の期限は warning / 今日まで', () => {
      expect(getExpiryStatus('2026-09-27')).toBe('warning');
      expect(getExpiryLabel('2026-09-27')).toBe('今日まで');
    });

    it('3日後は warning、4日後は ok / あと4日', () => {
      expect(getExpiryStatus('2026-09-30')).toBe('warning');
      expect(getExpiryStatus('2026-10-01')).toBe('ok');
      expect(getExpiryLabel('2026-10-01')).toBe('あと4日');
    });

    it('YYYY/MM/DD 形式（シート手編集）や時刻付きでも同じ判定になる', () => {
      expect(getExpiryStatus('2026/09/26')).toBe('expired');
      expect(getExpiryLabel('2026/09/27')).toBe('今日まで');
      expect(getExpiryStatus('2026/09/26 0:00:00')).toBe('expired');
      expect(getExpiryStatus('2026-09-27T00:00:00.000Z')).toBe('warning');
    });

    it('null と空文字は none / 空ラベル', () => {
      expect(getExpiryStatus(null)).toBe('none');
      expect(getExpiryLabel(null)).toBe('');
      expect(getExpiryStatus('')).toBe('none');
      expect(getExpiryLabel('')).toBe('');
    });
  });

  it('JST の日付境界: 9/26 23:59:59 は「明日まで」、9/27 00:00:00 は「今日まで」', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-26T14:59:59Z'));
    expect(getExpiryLabel('2026-09-27')).toBe('明日まで');
    vi.setSystemTime(new Date('2026-09-26T15:00:00Z'));
    expect(getExpiryLabel('2026-09-27')).toBe('今日まで');
  });

  it('JST 2026-09-28 04:00（LA では 9/27 12:00）で期限 9/28 は今日まで', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-27T19:00:00Z'));
    expect(getExpiryStatus('2026-09-28')).toBe('warning');
    expect(getExpiryLabel('2026-09-28')).toBe('今日まで');
  });

  it('LA 9/27 12:00 でも期限 9/27 は JST 基準で expired / 1日超過', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-27T19:00:00Z'));
    expect(getExpiryStatus('2026-09-27')).toBe('expired');
    expect(getExpiryLabel('2026-09-27')).toBe('1日超過');
  });
});
