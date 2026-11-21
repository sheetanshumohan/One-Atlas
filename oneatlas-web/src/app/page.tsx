import Link from 'next/link';
import { CompareButton } from '@/components/compare-button';
import { SearchBox } from '@/components/search-box';
import { Avatar, Badge, ScoreBar, SectionHeading, Stat, TypeBadge } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatPrice, formatTokens } from '@/lib/format';

const FEATURES = [
  { href: '/models', icon: '⌕', title: 'Discover', text: 'Search and filter every model by lab, provider, capability, modality, context and price.' },
  { href: '/compare', icon: '⇄', title: 'Compare', text: 'Put up to six models side by side, with the best value in each row highlighted.' },
  { href: '/rankings', icon: '▲', title: 'Rank', text: 'Leaderboards by benchmark or category, with scores normalised to 0–100.' },
  { href: '/labs', icon: '◎', title: 'Explore', text: 'Browse AI labs and inference providers, their releases and their pricing.' },
];

const QUICK = [
  { href: '/models?capability=tool-calling,vision&sort=inputPrice', label: 'Cheapest vision + tools' },
  { href: '/models?openWeights=true', label: 'Open-weights models' },
  { href: '/models?minContext=1000000', label: '1M+ context' },
  { href: '/rankings?category=CODING', label: 'Best at coding' },
];

export default async function HomePage() {
  const [stats, newest, cheapest, top, labs] = await Promise.all([
    api.stats(),
    api.models({ sort: 'releaseDate', pageSize: 6, status: 'PREVIEW,ACTIVE' }),
    api.models({ sort: 'inputPrice', pageSize: 5, type: 'CHAT,REASONING', status: 'ACTIVE' }),
    api.rankings({ pageSize: 5, minBenchmarks: 3 }),
    api.organizations({ sort: 'modelCount', pageSize: 8 }),
  ]);

  return (
    <div className="space-y-20">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative pt-4 text-center sm:pt-10">
        <div className="animate-fade-up">
          <Link href="/models" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300 backdrop-blur transition hover:border-brand-400/40">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Live catalogue · {stats.totals.models} models · {stats.totals.providers} providers
          </Link>
        </div>
        <h1 className="mx-auto mt-6 max-w-4xl animate-fade-up text-4xl font-semibold leading-[1.05] [animation-delay:80ms] sm:text-6xl lg:text-7xl">
          Find the right AI model, <span className="text-gradient">fast.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl animate-fade-up text-base leading-relaxed text-slate-400 [animation-delay:160ms] sm:text-lg">
          Compare {stats.totals.models} models from {stats.totals.organizations} labs across {stats.totals.providers} providers. Pricing, context windows, capabilities and
          benchmarks, all in one place.
        </p>
        <div className="mx-auto mt-10 max-w-2xl animate-fade-up [animation-delay:240ms]">
          <div className="rounded-[1.25rem] bg-gradient-to-r from-brand-500/60 via-fuchsia-500/60 to-cyan-400/60 p-px shadow-[0_0_60px_-12px_rgba(139,92,246,0.6)]">
            <div className="rounded-[1.2rem] bg-ink-900">
              <SearchBox large />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2 text-sm">
            <Link href="/models" className="btn-primary !rounded-full !px-4">
              Browse all models
            </Link>
            <Link href="/rankings" className="btn-secondary !rounded-full !px-4">
              Leaderboards
            </Link>
            {QUICK.map((q) => (
              <Link key={q.href} href={q.href} className="btn-secondary !rounded-full !px-4 text-slate-400">
                {q.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      <section className="stagger grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Catalogue stats">
        <Stat label="Models" value={stats.totals.models} accent />
        <Stat label="AI labs" value={stats.totals.organizations} />
        <Stat label="Providers" value={stats.totals.providers} />
        <Stat label="Benchmark scores" value={stats.totals.benchmarkResults} />
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="What you can do">
        {FEATURES.map((f) => (
          <Link key={f.href} href={f.href} className="card card-hover group p-6">
            <span aria-hidden className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500/30 to-fuchsia-500/20 text-lg text-white ring-1 ring-white/10 transition group-hover:scale-110">
              {f.icon}
            </span>
            <h2 className="mt-4 text-base font-semibold">{f.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{f.text}</p>
          </Link>
        ))}
      </section>

      {/* ── Latest releases ──────────────────────────────────── */}
      <section>
        <SectionHeading title="Latest releases" href="/models" />
        <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {newest.data.map((m) => (
            <article key={m.slug} className="card card-hover group relative flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={m.organization.name} />
                  <div className="min-w-0">
                    <Link href={`/models/${m.slug}`} className="block truncate font-semibold text-white after:absolute after:inset-0 after:content-['']">
                      {m.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {m.organization.name} · {formatDate(m.releaseDate)}
                    </p>
                  </div>
                </div>
                <div className="relative z-10">
                  <CompareButton slug={m.slug} name={m.name} />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <TypeBadge type={m.type} />
                {m.openWeights && <Badge tone="green">Open weights</Badge>}
                {m.status === 'PREVIEW' && <Badge tone="amber">Preview</Badge>}
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-4 text-xs">
                <div>
                  <dt className="text-slate-500">Input/1M</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-white">{formatPrice(m.pricing.minInputPricePerMTok)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Output/1M</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-white">{formatPrice(m.pricing.minOutputPricePerMTok)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Context</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-white">{formatTokens(m.contextWindow)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      {/* ── Leaderboard + cheapest ───────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <SectionHeading title="Top overall (benchmarks)" href="/rankings" linkLabel="Full leaderboard →" />
          <ol className="space-y-3">
            {top.data.map((e) => (
              <li key={e.model.slug} className="flex items-center gap-3 text-sm">
                <span className="w-7 text-center text-base">{e.rank <= 3 ? ['🥇', '🥈', '🥉'][e.rank - 1] : <span className="text-slate-500">{e.rank}</span>}</span>
                <Link href={`/models/${e.model.slug}`} className="min-w-0 flex-1 truncate font-medium text-white transition hover:text-brand-300">
                  {e.model.name}
                </Link>
                <ScoreBar value={e.score} best={e.rank === 1} />
              </li>
            ))}
          </ol>
        </section>
        <section className="card p-6">
          <SectionHeading title="Most affordable chat models" href="/models?sort=inputPrice&type=CHAT,REASONING" linkLabel="More →" />
          <ol className="space-y-3">
            {cheapest.data.map((m) => (
              <li key={m.slug} className="flex items-center gap-3 text-sm">
                <Avatar name={m.organization.name} size="sm" />
                <Link href={`/models/${m.slug}`} className="min-w-0 flex-1 truncate font-medium text-white transition hover:text-brand-300">
                  {m.name}
                </Link>
                <span className="rounded-lg bg-emerald-500/10 px-2 py-0.5 font-mono text-xs tabular-nums text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
                  {formatPrice(m.pricing.minInputPricePerMTok)} / {formatPrice(m.pricing.minOutputPricePerMTok)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* ── Labs ─────────────────────────────────────────────── */}
      <section>
        <SectionHeading title="AI labs" href="/labs" linkLabel="All labs →" />
        <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
          {labs.data.map((o) => (
            <Link key={o.slug} href={`/labs/${o.slug}`} className="card card-hover flex items-center gap-3 p-4">
              <Avatar name={o.name} />
              <div className="min-w-0">
                <div className="truncate font-medium text-white">{o.name}</div>
                <div className="text-xs text-slate-500">{o.modelCount} models</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
