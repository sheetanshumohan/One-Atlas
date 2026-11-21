import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CompareButton } from '@/components/compare-button';
import { Avatar, Badge, ScoreBar, Stat, StatusBadge, TypeBadge } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatNumber, formatParams, formatPrice, formatScore, formatTokens } from '@/lib/format';
import { getLabels } from '@/lib/meta';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = await api.model((await params).slug);
  return m ? { title: m.name, description: m.description ?? undefined } : { title: 'Model not found' };
}

export default async function ModelDetailPage({ params }: Props) {
  const slug = (await params).slug;
  const m = await api.model(slug);
  if (!m) notFound();
  // Labels and the price-change log both come from the API.
  const [labels, history] = await Promise.all([getLabels(), api.priceHistory(slug, { pageSize: 20 })]);

  const specs: [string, React.ReactNode][] = [
    ['Released', formatDate(m.releaseDate)],
    ['Knowledge cutoff', formatDate(m.knowledgeCutoff)],
    ['Context window', m.contextWindow ? `${formatTokens(m.contextWindow)} (${m.contextWindow.toLocaleString('en-US')} tokens)` : '—'],
    ['Max output', m.maxOutputTokens ? `${formatTokens(m.maxOutputTokens)} tokens` : '—'],
    ['Parameters', formatParams(m.parameterCountB)],
    ['Weights', m.openWeights ? 'Open' : 'Closed'],
    ['License', m.license ?? '—'],
    ['Input', m.inputModalities.map((x) => labels.modality[x]).join(', ')],
    ['Output', m.outputModalities.map((x) => labels.modality[x]).join(', ')],
  ];
  const cheapestIn = m.pricing.minInputPricePerMTok;

  return (
    <article className="space-y-8">
      <nav className="animate-fade-in text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/models" className="transition hover:text-white">
          Models
        </Link>
        <span className="mx-2 text-slate-700">/</span>
        <Link href={`/labs/${m.organization.slug}`} className="transition hover:text-white">
          {m.organization.name}
        </Link>
      </nav>

      <header className="card relative animate-fade-up overflow-hidden p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-brand-500/30 to-fuchsia-500/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar name={m.organization.name} size="lg" />
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold sm:text-4xl">{m.name}</h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                <span>
                  by{' '}
                  <Link href={`/labs/${m.organization.slug}`} className="link">
                    {m.organization.name}
                  </Link>
                </span>
                <TypeBadge type={m.type} />
                <StatusBadge status={m.status} />
                {m.openWeights && <Badge tone="green">Open weights</Badge>}
              </div>
              {m.description && <p className="mt-4 max-w-3xl leading-relaxed text-slate-300">{m.description}</p>}
            </div>
          </div>
          <CompareButton slug={m.slug} name={m.name} size="md" />
        </div>
      </header>

      <section className="stagger grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Key facts">
        <Stat label="Input / 1M tokens" value={formatPrice(m.pricing.minInputPricePerMTok)} hint="Cheapest available provider" accent />
        <Stat label="Output / 1M tokens" value={formatPrice(m.pricing.minOutputPricePerMTok)} hint="Cheapest available provider" />
        <Stat label="Context window" value={formatTokens(m.contextWindow)} />
        <Stat label="Providers" value={m.pricing.providerCount} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card animate-fade-up p-6 lg:col-span-1">
          <h2 className="mb-4 text-lg font-semibold">Specifications</h2>
          <dl className="divide-y divide-white/[0.06] text-sm">
            {specs.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right font-medium text-slate-200">{v}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mb-3 mt-6 text-sm font-semibold">Capabilities</h3>
          {m.capabilities.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {m.capabilities.map((c) => (
                <li key={c.slug}>
                  <Link href={`/models?capability=${c.slug}`} title={c.description ?? undefined} className="inline-block transition hover:scale-105">
                    <Badge tone="brand">{c.name}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">None listed.</p>
          )}
        </section>

        <section className="card animate-fade-up overflow-hidden lg:col-span-2" aria-labelledby="providers-h">
          <div className="px-6 pt-6">
            <h2 id="providers-h" className="text-lg font-semibold">
              Available providers &amp; pricing
            </h2>
            <p className="mt-1 text-xs text-slate-500">USD per 1M tokens, cheapest first.</p>
          </div>
          {m.providers.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No token-priced providers listed for this model.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full" data-testid="providers-table">
                <thead className="border-y border-white/[0.06] bg-white/[0.02]">
                  <tr>
                    <th className="th">Provider</th>
                    <th className="th text-right">Input</th>
                    <th className="th text-right">Output</th>
                    <th className="th hidden text-right xl:table-cell">Cached in</th>
                    <th className="th text-right">Latency</th>
                    <th className="th text-right">Throughput</th>
                    <th className="th text-right">Uptime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {m.providers.map((p) => {
                    const best = p.isAvailable && p.inputPricePerMTok === cheapestIn;
                    return (
                      <tr key={p.provider.slug} className={`transition-colors hover:bg-white/[0.03] ${p.isAvailable ? '' : 'opacity-45'}`}>
                        <td className="td">
                          <div className="flex items-center gap-3">
                            <Avatar name={p.provider.name} size="sm" />
                            <div>
                              <Link href={`/providers/${p.provider.slug}`} className="font-medium text-white transition hover:text-brand-300">
                                {p.provider.name}
                              </Link>
                              {!p.isAvailable && (
                                <span className="ml-2">
                                  <Badge tone="red">Unavailable</Badge>
                                </span>
                              )}
                              <div className="font-mono text-[11px] text-slate-500">{p.providerModelId}</div>
                            </div>
                          </div>
                        </td>
                        <td className={`td text-right tabular-nums ${best ? 'font-semibold text-emerald-300' : 'text-white'}`}>{formatPrice(p.inputPricePerMTok)}</td>
                        <td className="td text-right tabular-nums text-slate-300">{formatPrice(p.outputPricePerMTok)}</td>
                        <td className="td hidden text-right tabular-nums text-slate-400 xl:table-cell">{formatPrice(p.cachedInputPerMTok)}</td>
                        <td className="td text-right tabular-nums text-slate-400">{p.avgLatencyMs != null ? `${formatNumber(p.avgLatencyMs)} ms` : '—'}</td>
                        <td className="td text-right tabular-nums text-slate-400">{p.throughputTps != null ? `${formatNumber(p.throughputTps)} tok/s` : '—'}</td>
                        <td className="td text-right tabular-nums text-slate-400">{p.uptimePct != null ? `${p.uptimePct}%` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="card animate-fade-up overflow-hidden" aria-labelledby="history-h">
        <div className="flex flex-wrap items-end justify-between gap-2 px-6 pt-6">
          <div>
            <h2 id="history-h" className="text-lg font-semibold">
              Price history
            </h2>
            <p className="mt-1 text-xs text-slate-500">Every listing, price change and delisting, newest first (USD per 1M tokens).</p>
          </div>
          {history.meta.total > history.data.length && <span className="text-xs text-slate-500">Showing latest {history.data.length} of {history.meta.total}</span>}
        </div>
        {history.data.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No price events recorded.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full" data-testid="price-history">
              <thead className="border-y border-white/[0.06] bg-white/[0.02]">
                <tr>
                  <th className="th">Date</th>
                  <th className="th">Provider</th>
                  <th className="th">Event</th>
                  <th className="th text-right">Input</th>
                  <th className="th text-right">Output</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {history.data.map((h, i) => (
                  <tr key={`${h.provider.slug}-${h.recordedAt}-${i}`} className="transition-colors hover:bg-white/[0.03]">
                    <td className="td text-slate-400">{formatDate(h.recordedAt)}</td>
                    <td className="td">
                      <Link href={`/providers/${h.provider.slug}`} className="text-white transition hover:text-brand-300">
                        {h.provider.name}
                      </Link>
                    </td>
                    <td className="td">
                      <Badge tone={h.change === 'CREATED' ? 'green' : h.change === 'REMOVED' ? 'red' : 'amber'}>{labels.priceChange[h.change]}</Badge>
                    </td>
                    <td className="td text-right tabular-nums text-white">{formatPrice(h.inputPricePerMTok)}</td>
                    <td className="td text-right tabular-nums text-slate-300">{formatPrice(h.outputPricePerMTok)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card animate-fade-up overflow-hidden" aria-labelledby="bench-h">
        <div className="px-6 pt-6">
          <h2 id="bench-h" className="text-lg font-semibold">
            Benchmarks
          </h2>
          <p className="mt-1 text-xs text-slate-500">Normalised score: 0–100 where higher is always better (lower-is-better benchmarks are inverted).</p>
        </div>
        {m.benchmarks.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No benchmark results yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full" data-testid="benchmarks-table">
              <thead className="border-y border-white/[0.06] bg-white/[0.02]">
                <tr>
                  <th className="th">Benchmark</th>
                  <th className="th">Category</th>
                  <th className="th text-right">Score</th>
                  <th className="th">Normalised</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {m.benchmarks.map((b) => (
                  <tr key={b.benchmark.slug} className="transition-colors hover:bg-white/[0.03]">
                    <td className="td">
                      <Link href={`/rankings?benchmark=${b.benchmark.slug}`} className="font-medium text-white transition hover:text-brand-300">
                        {b.benchmark.name}
                      </Link>
                      {!b.benchmark.higherIsBetter && <span className="ml-1.5 text-xs text-slate-500">(lower is better)</span>}
                    </td>
                    <td className="td text-slate-400">{labels.benchmarkCategory[b.benchmark.category]}</td>
                    <td className="td text-right tabular-nums text-white">{formatScore(b.score, b.benchmark.unit)}</td>
                    <td className="td">
                      <ScoreBar value={b.normalizedScore} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </article>
  );
}
