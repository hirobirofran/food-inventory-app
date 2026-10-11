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
});
