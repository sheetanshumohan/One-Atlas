import { normalizeScore, round } from './scoring';

describe('normalizeScore', () => {
  const pct = { minScore: 0, maxScore: 100, higherIsBetter: true };

  it('is identity for 0-100 higher-is-better scales', () => {
    expect(normalizeScore(0, pct)).toBe(0);
    expect(normalizeScore(88.7, pct)).toBe(88.7);
    expect(normalizeScore(100, pct)).toBe(100);
  });

  it('maps non-percentage scales (Elo 800–1600) onto 0–100', () => {
    const elo = { minScore: 800, maxScore: 1600, higherIsBetter: true };
    expect(normalizeScore(1200, elo)).toBe(50);
    expect(normalizeScore(1400, elo)).toBe(75);
  });

  it('inverts lower-is-better benchmarks so 100 is always best', () => {
    const err = { minScore: 0, maxScore: 100, higherIsBetter: false };
    expect(normalizeScore(10, err)).toBe(90);
    expect(normalizeScore(0, err)).toBe(100);
    expect(normalizeScore(100, err)).toBe(0);
  });

  it('clamps out-of-range scores', () => {
    expect(normalizeScore(120, pct)).toBe(100);
    expect(normalizeScore(-5, pct)).toBe(0);
  });

  it('rounds to 2 decimals', () => {
    expect(normalizeScore(1, { minScore: 0, maxScore: 3, higherIsBetter: true })).toBe(33.33);
  });

  it('rejects degenerate scales', () => {
    expect(() => normalizeScore(1, { minScore: 5, maxScore: 5, higherIsBetter: true })).toThrow();
    expect(() => normalizeScore(1, { minScore: 10, maxScore: 5, higherIsBetter: true })).toThrow();
  });

  it('round() handles floating point edge cases', () => {
    expect(round(1.005)).toBe(1.01);
    expect(round(2.675, 2)).toBe(2.68);
  });
});
