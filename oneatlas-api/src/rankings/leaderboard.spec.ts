import { buildLeaderboard, ResultInput } from './leaderboard';

const pct = { minScore: 0, maxScore: 100, higherIsBetter: true };
const row = (modelSlug: string, benchmarkSlug: string, score: number, scale = pct): ResultInput => ({
  modelSlug, modelName: modelSlug.toUpperCase(), benchmarkSlug, score, scale,
});

describe('buildLeaderboard', () => {
  it('ranks a single benchmark by score descending', () => {
    const board = buildLeaderboard([row('a', 'b1', 70), row('b', 'b1', 90), row('c', 'b1', 80)]);
    expect(board.map((e) => [e.rank, e.modelSlug, e.score])).toEqual([[1, 'b', 90], [2, 'c', 80], [3, 'a', 70]]);
  });

  it('uses competition ranking for ties (1,2,2,4) and orders tied entries by name', () => {
    const board = buildLeaderboard([row('d', 'b1', 50), row('c', 'b1', 80), row('b', 'b1', 80), row('a', 'b1', 90)]);
    expect(board.map((e) => [e.rank, e.modelSlug])).toEqual([[1, 'a'], [2, 'b'], [2, 'c'], [4, 'd']]);
  });

  it('ranks lower-is-better benchmarks correctly', () => {
    const err = { minScore: 0, maxScore: 100, higherIsBetter: false };
    const board = buildLeaderboard([row('a', 'err', 30, err), row('b', 'err', 5, err)]);
    expect(board[0]).toMatchObject({ rank: 1, modelSlug: 'b', score: 95 });
    expect(board[1]).toMatchObject({ rank: 2, modelSlug: 'a', score: 70 });
    expect(board[0].results.err).toEqual({ score: 5, normalizedScore: 95 });
  });


  it('aggregate math is exact', () => {
    const elo = { minScore: 800, maxScore: 1600, higherIsBetter: true };
    const board = buildLeaderboard([row('a', 'pct', 80), row('a', 'elo', 1200, elo), row('b', 'pct', 60)]);
    const a = board.find((e) => e.modelSlug === 'a')!;
    expect(a.score).toBe(65);
    expect(a.benchmarksCovered).toBe(2);
    expect(board.map((e) => e.modelSlug)).toEqual(['a', 'b']);
  });

  it('breaks score ties by coverage (more benchmarks first)', () => {
    const board = buildLeaderboard([row('a', 'x', 70), row('b', 'x', 70), row('b', 'y', 70)]);
    expect(board.map((e) => [e.rank, e.modelSlug])).toEqual([[1, 'b'], [1, 'a']]);
  });

  it('applies minimum coverage', () => {
    const rows = [row('a', 'x', 90), row('b', 'x', 50), row('b', 'y', 50)];
    expect(buildLeaderboard(rows, { minCoverage: 2 }).map((e) => e.modelSlug)).toEqual(['b']);
    expect(buildLeaderboard(rows, { minCoverage: 0 })).toHaveLength(2); // clamped to 1
  });

  it('handles empty input', () => {
    expect(buildLeaderboard([])).toEqual([]);
  });
});
