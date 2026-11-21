export interface ScoreScale {
  minScore: number;
  maxScore: number;
  higherIsBetter: boolean;
}

export function round(value: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/**
 * Maps a raw benchmark score onto 0–100 where 100 is always "best", so scores from
 * benchmarks with different scales / directions (e.g. Elo vs %, error-rate) are comparable.
 */
export function normalizeScore(score: number, scale: ScoreScale): number {
  const range = scale.maxScore - scale.minScore;
  if (!(range > 0)) throw new Error('Invalid score scale: maxScore must be greater than minScore');
  const clamped = Math.min(Math.max(score, scale.minScore), scale.maxScore);
  const pct = ((clamped - scale.minScore) / range) * 100;
  return round(scale.higherIsBetter ? pct : 100 - pct);
}
