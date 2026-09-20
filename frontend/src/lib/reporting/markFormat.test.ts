import { describe, expect, it } from 'vitest';

import { formatMark, formatPercentage } from './markFormat';

describe('formatMark', () => {
  it.each([
    [40, '40'],
    ['39.00', '39'],
    ['39.50', '39.5'],
    [39.25, '39.25'],
    [0, '0'],
  ])('formats %s without unnecessary decimal zeros', (value, expected) => {
    expect(formatMark(value)).toBe(expected);
  });

  it('uses a placeholder for a missing mark', () => {
    expect(formatMark(null)).toBe('-');
  });

  it.each([
    [100, '100%'],
    ['97.50', '97.5%'],
    [97.86, '97.86%'],
  ])('formats percentage %s without unnecessary decimal zeros', (value, expected) => {
    expect(formatPercentage(value)).toBe(expected);
  });
});
