import { describe, expect, it } from 'vitest';
import { formatQuantity } from './format';

describe('formatQuantity', () => {
  it.each([
    [1, '1'],
    [3, '3'],
    [0, '0'],
    [0.5, '0.5'],
    [1.5, '1.5'],
  ])('%s -> %s', (input, expected) => {
    expect(formatQuantity(input)).toBe(expected);
  });

  it('小数同士の引き算で生じる誤差を整数として扱う (1.4 - 0.4)', () => {
    expect(formatQuantity(1.4 - 0.4)).toBe('1');
  });

  it('引き算の誤差が小数側に出ても小数 1 桁に丸める (3 - 2.9)', () => {
    expect(formatQuantity(3 - 2.9)).toBe('0.1');
  });
});
