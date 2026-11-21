import type { Metadata } from 'next';
import Link from 'next/link';
import { RankingsControls } from '@/components/rankings-controls';
import { Avatar, Badge, EmptyState, PageHeader, Pagination, ScoreBar } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { formatScore } from '@/lib/format';
import { getLabels, getMeta } from '@/lib/meta';
import { readPage, readString, withParams, type SearchParams } from '@/lib/query';
import type { LeaderboardEntry } from '@/lib/types';

export const metadata: Metadata = { title: 'Rankings & leaderboards' };

const MEDALS = ['🥇', '🥈', '🥉'];
const PODIUM_STYLE = [
  'from-amber-400/25 to-amber-500/5 ring-amber-300/30 sm:-translate-y-4',
  'from-slate-300/20 to-slate-400/5 ring-slate-300/25',
  'from-orange-500/20 to-orange-600/5 ring-orange-400/25',
];

/** Top-3 podium (only on the first page, when there are at least three entries). Visual summary; the table below is the full list. */
function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  const order = [1, 0, 2]; // silver, gold, bronze — classic podium layout on wide screens
  return (
    <section aria-label="Top three" className="mb-6 grid gap-3 sm:grid-cols-3 sm:items-end">
      {order.map((i) => {
        const e = entries[i];
        return (
          <Link
            key={e.model.slug}
            href={`/models/${e.model.slug}`}
            className={`group relative animate-fade-up overflow-hidden rounded-2xl bg-gradient-to-b p-5 ring-1 ring-inset backdrop-blur transition hover:-translate-y-1 ${PODIUM_STYLE[i]} ${i === 0 ? 'sm:order-2' : i === 1 ? 'sm:order-1' : 'sm:order-3'}`}
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-3xl">{MEDALS[i]}</span>
              <span className="text-2xl font-semibold tabular-nums text-white">{e.score.toFixed(1)}</span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              {e.model.organization && <Avatar name={e.model.organization.name} />}
              <div className="min-w-0">
                <p className="truncate font-semibold text-white transition group-hover:text-brand-300">{e.model.name}</p>
                <p className="truncate text-xs text-slate-400">{e.model.organization?.name}</p>
              </div>
            </div>
          </Link>
        );
      })}
    </section>
  );
}

export default async function RankingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  // Scope options (categories, benchmarks), type filter and every label come from the API.
  const [meta, labels, benchmarks] = await Promise.all([getMeta(), getLabels(), api.allBenchmarks()]);
  const rankedBenchmarks = benchmarks.filter((b) => b.resultCount > 0);

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
    heading = single ? `${single.name} leaderboard` : board.scope.category ? `${labels.benchmarkCategory[board.scope.category]} leaderboard` : heading;
    content =
      board.data.length === 0 ? (
        <EmptyState title="No ranked models for this selection" />
      ) : (
        <>
          {board.meta.page === 1 && board.data.length >= 3 && <Podium entries={board.data.slice(0, 3)} />}
          <div className="card animate-fade-up overflow-x-auto">
            <table className="w-full" data-testid="leaderboard">
              <thead className="border-b border-white/[0.06]">
                <tr>
                  <th className="th w-16 text-center">Rank</th>
                  <th className="th">Model</th>
                  <th className="th hidden md:table-cell">Type</th>
                  {single && <th className="th text-right">Raw score</th>}
                  <th className="th">{single ? 'Normalised' : 'Avg. normalised score'}</th>
                  {!single && <th className="th text-right">Benchmarks</th>}
                </tr>
              </thead>
              <tbody className="stagger divide-y divide-white/[0.05]">
                {board.data.map((e) => (
                  <tr key={e.model.slug} data-testid="leaderboard-row" className="group transition-colors hover:bg-white/[0.03]">
                    <td className="td text-center font-semibold tabular-nums text-slate-400">{e.rank <= 3 ? <span className="text-lg">{MEDALS[e.rank - 1]}</span> : e.rank}</td>
                    <td className="td">
                      <div className="flex items-center gap-3">
                        {e.model.organization && <Avatar name={e.model.organization.name} size="sm" />}
                        <div>
                          <Link href={`/models/${e.model.slug}`} className="font-medium text-white transition group-hover:text-brand-300">
                            {e.model.name}
                          </Link>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            {e.model.organization?.name}
                            {e.model.openWeights && <Badge tone="green">Open</Badge>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="td hidden text-sm text-slate-400 md:table-cell">{e.model.type ? labels.modelType[e.model.type] : '—'}</td>
                    {single && <td className="td text-right tabular-nums text-white">{formatScore(e.results[single.slug].score, single.unit)}</td>}
                    <td className="td">
                      <ScoreBar value={e.score} best={e.rank === 1} />
                    </td>
                    {!single && <td className="td text-right tabular-nums text-slate-400">{e.benchmarksCovered}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={board.meta.page} totalPages={board.meta.totalPages} hrefFor={(p) => `/rankings${withParams(sp, { page: p === 1 ? [] : String(p) })}`} />
          {single && !single.higherIsBetter && (
            <p className="mt-4 text-xs text-slate-500">Lower raw scores are better on this benchmark; the normalised score is inverted so higher is always better.</p>
          )}
          {!single && (
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
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
      <PageHeader
        eyebrow="Rankings & benchmarks"
        title={heading}
        description="Rank models by a single benchmark, a benchmark category, or across everything. Scores from different scales (%, Elo, error rates) are normalised to 0–100."
      />
      <RankingsControls
        categories={meta.facets.benchmarkCategories.map((c) => ({ value: c.value, label: c.label }))}
        benchmarks={rankedBenchmarks.map((b) => ({ slug: b.slug, name: b.name, category: b.category }))}
        types={meta.facets.modelTypes.map((t) => ({ value: t.value, label: t.label }))}
      />
      <div className="mt-6">{content}</div>
    </>
  );
}
