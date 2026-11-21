import { normalizeScore, round, ScoreScale } from '../common/utils/scoring';

export interface ResultInput {
  modelSlug: string;
  modelName: string;
  benchmarkSlug: string;
  score: number;
  scale: ScoreScale;
}

export interface LeaderboardEntry {
  rank: number;
  modelSlug: string;
  modelName: string;
  /** 0–100, higher is always better (average of normalised scores when aggregating). */
  score: number;
  benchmarksCovered: number;
  results: Record<string, { score: number; normalizedScore: number }>;
}

/**
 * Builds a ranked leaderboard from raw results.
 *  - single benchmark: ordering by normalised score == ordering by raw score in the "better" direction
 *  - multiple benchmarks: mean of normalised scores over the benchmarks a model has results for;
 *    `minCoverage` excludes models evaluated on too few benchmarks (prevents a model with one lucky
 *    score from topping an aggregate board).
 * Ties share a rank using standard competition ranking ("1224").
 */
export function buildLeaderboard(rows: ResultInput[], opts: { minCoverage?: number } = {}): LeaderboardEntry[] {
  const minCoverage = Math.max(1, opts.minCoverage ?? 1);
  const byModel = new Map<string, { name: string; results: LeaderboardEntry['results'] }>();

  for (const r of rows) {
    const entry = byModel.get(r.modelSlug) ?? { name: r.modelName, results: {} };
    entry.results[r.benchmarkSlug] = { score: r.score, normalizedScore: normalizeScore(r.score, r.scale) };
    byModel.set(r.modelSlug, entry);
  }

  const entries = [...byModel.entries()]
    .map(([slug, e]) => {
      const norms = Object.values(e.results).map((x) => x.normalizedScore);
      return {
        modelSlug: slug,
        modelName: e.name,
        score: round(norms.reduce((a, b) => a + b, 0) / norms.length),
        benchmarksCovered: norms.length,
        results: e.results,
      };
    })
    .filter((e) => e.benchmarksCovered >= minCoverage)
    .sort((a, b) => b.score - a.score || b.benchmarksCovered - a.benchmarksCovered || a.modelName.localeCompare(b.modelName) || a.modelSlug.localeCompare(b.modelSlug));

  let previous: number | undefined;
  let rank = 0;
  return entries.map((e, i) => {
    if (e.score !== previous) rank = i + 1;
    previous = e.score;
    return { rank, ...e };
  });
}
