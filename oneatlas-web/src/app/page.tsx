import Link from 'next/link';
import { ModelList } from '@/components/model-list';
import { SearchBox } from '@/components/search-box';
import { Stat } from '@/components/ui';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/format';

export default async function HomePage() {
  const [stats, newest, cheapest, top, labs] = await Promise.all([
    api.stats(),
    api.models({ sort: 'releaseDate', pageSize: 6, status: 'PREVIEW,ACTIVE' }),
    api.models({ sort: 'inputPrice', pageSize: 5, type: 'CHAT,REASONING', status: 'ACTIVE' }),
    api.rankings({ pageSize: 5, minBenchmarks: 3 }),
    api.organizations({ sort: 'modelCount', pageSize: 8 }),
  ]);

  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-900 px-6 py-10 text-white sm:px-10 sm:py-14">
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Find the right AI model — fast.</h1>
        <p className="mt-3 max-w-2xl text-brand-100">
          Compare {stats.totals.models} models from {stats.totals.organizations} labs across {stats.totals.providers} providers: pricing, context windows, capabilities and
          benchmarks in one place.
        </p>
        <div className="mt-6 max-w-xl text-slate-900">
            <SearchBox />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link href="/models" className="rounded-lg bg-white/15 px-3 py-1.5 hover:bg-white/25">
            Browse all models
          </Link>
          <Link href="/rankings" className="rounded-lg bg-white/15 px-3 py-1.5 hover:bg-white/25">
            Leaderboards
          </Link>
          <Link href="/models?capability=tool-calling,vision&sort=inputPrice" className="rounded-lg bg-white/15 px-3 py-1.5 hover:bg-white/25">
            Cheapest vision + tools
          </Link>
          <Link href="/models?openWeights=true" className="rounded-lg bg-white/15 px-3 py-1.5 hover:bg-white/25">
            Open-weights models
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Catalogue stats">
        <Stat label="Models" value={stats.totals.models} />
        <Stat label="AI labs" value={stats.totals.organizations} />
        <Stat label="Providers" value={stats.totals.providers} />
        <Stat label="Benchmark scores" value={stats.totals.benchmarkResults} />
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Latest releases</h2>
          <Link href="/models" className="link text-sm">
            View all →
          </Link>
        </div>
        <ModelList models={newest.data} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-semibold">Top overall (benchmarks)</h2>
            <Link href="/rankings" className="link text-sm">
              Full leaderboard →
            </Link>
          </div>
          <ol className="space-y-2">
            {top.data.map((e) => (
              <li key={e.model.slug} className="flex items-center gap-3 text-sm">
                <span className="w-6 text-right font-semibold tabular-nums text-slate-400">{e.rank}</span>
                <Link href={`/models/${e.model.slug}`} className="flex-1 font-medium hover:text-brand-600">
                  {e.model.name}
                </Link>
                <span className="tabular-nums">{e.score.toFixed(1)}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="card p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-semibold">Most affordable chat models</h2>
            <Link href="/models?sort=inputPrice&type=CHAT,REASONING" className="link text-sm">
              More →
            </Link>
          </div>
          <ol className="space-y-2">
            {cheapest.data.map((m) => (
              <li key={m.slug} className="flex items-center gap-3 text-sm">
                <Link href={`/models/${m.slug}`} className="flex-1 font-medium hover:text-brand-600">
                  {m.name}
                </Link>
                <span className="tabular-nums text-slate-500">
                  {formatPrice(m.pricing.minInputPricePerMTok)} / {formatPrice(m.pricing.minOutputPricePerMTok)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">AI labs</h2>
          <Link href="/labs" className="link text-sm">
            All labs →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {labs.data.map((o) => (
            <Link key={o.slug} href={`/labs/${o.slug}`} className="card p-4 hover:border-brand-500">
              <div className="font-medium">{o.name}</div>
              <div className="text-xs text-slate-500">{o.modelCount} models</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
