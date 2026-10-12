import { afterEach, describe, expect, it, vi } from 'vitest';
import { getExpiryLabel, getExpiryStatus } from './food';

// 期待値はすべて Asia/Tokyo の暦日基準。実行環境の TZ には依存しない。
describe('期限判定は Asia/Tokyo の暦日で行う', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('JST 2026-09-27 05:00（UTC では 9/26 20:00）', () => {
    const setNow = () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-26T20:00:00Z'));
    };

    it('昨日の期限は expired / 1日超過', () => {
      setNow();
      expect(getExpiryStatus('2026-09-26')).toBe('expired');
      expect(getExpiryLabel('2026-09-26')).toBe('1日超過');
    });

    it('今日の期限は warning / 今日まで', () => {
      setNow();
      expect(getExpiryStatus('2026-09-27')).toBe('warning');
      expect(getExpiryLabel('2026-09-27')).toBe('今日まで');
    });

    it('YYYY/MM/DD 形式（シート手編集）も同じ判定になる', () => {
      setNow();
      expect(getExpiryStatus('2026/09/26')).toBe('expired');
      expect(getExpiryLabel('2026/09/27')).toBe('今日まで');
    });

    it('3日後は warning、4日後は ok / あと4日', () => {
      setNow();
      expect(getExpiryStatus('2026-09-30')).toBe('warning');
      expect(getExpiryStatus('2026-10-01')).toBe('ok');
      expect(getExpiryLabel('2026-10-01')).toBe('あと4日');
    });
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
