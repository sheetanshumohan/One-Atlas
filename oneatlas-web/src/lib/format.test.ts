import { describe, expect, it } from 'vitest';
import { formatDate, formatNumber, formatParams, formatPrice, formatScore, formatTokens } from './format';

describe('formatPrice', () => {
  it.each([
    [2.5, '$2.50'], [15, '$15.00'], [0.15, '$0.15'], [0.1, '$0.10'], [0.4, '$0.40'], [0.075, '$0.075'], [0.0375, '$0.0375'], [0.02, '$0.02'], [0.123456, '$0.1235'], [0, 'Free'], [null, '—'], [undefined, '—'],
  ])('%p → %s', (v, out) => expect(formatPrice(v)).toBe(out));
});

describe('formatTokens', () => {
  it.each([
    [128000, '128K'], [8191, '8K'], [8192, '8K'], [32768, '32K'], [131072, '128K'], [16384, '16K'], [200000, '200K'], [64000, '64K'], [1047576, '1M'], [1048576, '1M'], [2097152, '2M'], [512, '512'], [null, '—'],
  ])('%p → %s', (v, out) => expect(formatTokens(v)).toBe(out));
});

describe('formatDate', () => {
  it('formats ISO dates without timezone shifts', () => {
    expect(formatDate('2024-05-13')).toBe('May 13, 2024');
    expect(formatDate('2025-01-01T00:00:00.000Z')).toBe('Jan 1, 2025');
    expect(formatDate(null)).toBe('—');
    expect(formatDate('garbage')).toBe('—');
  });
});

describe('misc formatters', () => {
  it('numbers, params and scores', () => {
    expect(formatNumber(1200)).toBe('1,200');
    expect(formatNumber(88.72)).toBe('88.7');
    expect(formatParams(405)).toBe('405B');
    expect(formatParams(1.55)).toBe('1.6B');
    expect(formatParams(0.5)).toBe('500M');
    expect(formatParams(null)).toBe('—');
    expect(formatScore(88.7, '%')).toBe('88.7%');
    expect(formatScore(1285, 'elo')).toBe('1,285 elo');
  });
});
