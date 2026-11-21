import type { Metadata } from 'next';
import Link from 'next/link';
import { RankingsControls } from '@/components/rankings-controls';
import { Badge, EmptyState, PageHeader, Pagination, ScoreBar } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { CATEGORY_LABEL, formatScore, MODEL_TYPE_LABEL } from '@/lib/format';
import { readPage, readString, withParams, type SearchParams } from '@/lib/query';
import type { BenchmarkCategory, ModelType } from '@/lib/types';

export const metadata: Metadata = { title: 'Rankings & leaderboards' };

export default async function RankingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const benchmarksList = await api.benchmarks({ pageSize: 100 });
  const usedCategories = [...new Set(benchmarksList.data.filter((b) => b.resultCount > 0).map((b) => b.category))];

  let content: React.ReactNode;
  let heading = 'Overall leaderboard';
  try {
    const board = await api.rankings({
      benchmark: readString(sp, 'benchmark'),
      category: readString(sp, 'category'),
      type: readString(sp, 'type'),
      openWeights: readString(sp, 'openWeights'),
      minBenchmarks: readString(sp, 'minBenchmarks'),
      page: readPage(sp),
      pageSize: 25,
    });
    const single = board.scope.kind === 'benchmark' ? board.scope.benchmarks[0] : null;
    heading = single ? `${single.name} leaderboard` : board.scope.category ? `${CATEGORY_LABEL[board.scope.category]} leaderboard` : heading;
    content =
      board.data.length === 0 ? (
        <EmptyState title="No ranked models for this selection" />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full" data-testid="leaderboard">
              <thead className="border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="th w-14 text-right">Rank</th>
                  <th className="th">Model</th>
                  <th className="th">Type</th>
                  {single && <th className="th text-right">Raw score</th>}
                  <th className="th">{single ? 'Normalised' : 'Avg. normalised score'}</th>
                  {!single && <th className="th text-right">Benchmarks</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {board.data.map((e) => (
                  <tr key={e.model.slug} data-testid="leaderboard-row">
                    <td className="td text-right font-semibold tabular-nums">{e.rank <= 3 ? ['🥇', '🥈', '🥉'][e.rank - 1] : e.rank}</td>
                    <td className="td">
                      <Link href={`/models/${e.model.slug}`} className="font-medium hover:text-brand-600">
                        {e.model.name}
                      </Link>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        {e.model.organization?.name}
                        {e.model.openWeights && <Badge tone="green">Open</Badge>}
                      </div>
                    </td>
                    <td className="td text-sm">{e.model.type ? MODEL_TYPE_LABEL[e.model.type as ModelType] : '—'}</td>
                    {single && <td className="td text-right tabular-nums">{formatScore(e.results[single.slug].score, single.unit)}</td>}
                    <td className="td">
                      <ScoreBar value={e.score} best={e.rank === 1} />
                    </td>
                    {!single && <td className="td text-right tabular-nums">{e.benchmarksCovered}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={board.meta.page} totalPages={board.meta.totalPages} hrefFor={(p) => `/rankings${withParams(sp, { page: p === 1 ? [] : String(p) })}`} />
          {single && !single.higherIsBetter && <p className="mt-3 text-xs text-slate-500">Lower raw scores are better on this benchmark; the normalised score is inverted so higher is always better.</p>}
          {!single && (
            <p className="mt-3 text-xs text-slate-500">
              Benchmarks included: {board.scope.benchmarks.map((b) => b.name).join(', ')}. Each score is normalised to 0–100 and averaged over the benchmarks a model has results
              for; use “Min. benchmarks” to exclude thinly evaluated models. Ties share a rank.
            </p>
          )}
        </>
      );
  } catch (e) {
    if (e instanceof ApiError && (e.status === 400 || e.status === 404)) content = <EmptyState title="Unknown leaderboard">{e.message}</EmptyState>;
    else throw e;
  }

  return (
    <>
      <PageHeader title={heading} description="Rank models by a single benchmark, a benchmark category, or across everything. Scores from different scales (%, Elo, error rates) are normalised to 0–100." />
        <RankingsControls
          categories={usedCategories.map((c) => ({ value: c, label: CATEGORY_LABEL[c as BenchmarkCategory] }))}
          benchmarks={benchmarksList.data.filter((b) => b.resultCount > 0).map((b) => ({ slug: b.slug, name: b.name, category: b.category }))}
          types={(['CHAT', 'REASONING', 'CODE'] as ModelType[]).map((t) => ({ value: t, label: MODEL_TYPE_LABEL[t] }))}
        />
      <div className="mt-6">{content}</div>
    </>
  );
}
