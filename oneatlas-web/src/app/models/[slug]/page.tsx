import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CompareButton } from '@/components/compare-button';
import { Badge, ScoreBar, Stat, StatusBadge, TypeBadge } from '@/components/ui';
import { api } from '@/lib/api';
import { CATEGORY_LABEL, formatDate, formatNumber, formatParams, formatPrice, formatScore, formatTokens, modalityLabel } from '@/lib/format';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = await api.model((await params).slug);
  return m ? { title: m.name, description: m.description ?? undefined } : { title: 'Model not found' };
}

export default async function ModelDetailPage({ params }: Props) {
  const m = await api.model((await params).slug);
  if (!m) notFound();

  const specs: [string, React.ReactNode][] = [
    ['Released', formatDate(m.releaseDate)],
    ['Knowledge cutoff', formatDate(m.knowledgeCutoff)],
    ['Context window', m.contextWindow ? `${formatTokens(m.contextWindow)} (${m.contextWindow.toLocaleString('en-US')} tokens)` : '—'],
    ['Max output', m.maxOutputTokens ? `${formatTokens(m.maxOutputTokens)} tokens` : '—'],
    ['Parameters', formatParams(m.parameterCountB)],
    ['Weights', m.openWeights ? 'Open' : 'Closed'],
    ['License', m.license ?? '—'],
    ['Input', m.inputModalities.map(modalityLabel).join(', ')],
    ['Output', m.outputModalities.map(modalityLabel).join(', ')],
  ];

  return (
    <article className="space-y-8">
      <nav className="text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/models" className="hover:underline">
          Models
        </Link>{' '}
        /{' '}
        <Link href={`/labs/${m.organization.slug}`} className="hover:underline">
          {m.organization.name}
        </Link>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">{m.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
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
          {m.description && <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">{m.description}</p>}
        </div>
        <CompareButton slug={m.slug} name={m.name} size="md" />
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Key facts">
        <Stat label="Input / 1M tokens" value={formatPrice(m.pricing.minInputPricePerMTok)} hint="Cheapest available provider" />
        <Stat label="Output / 1M tokens" value={formatPrice(m.pricing.minOutputPricePerMTok)} hint="Cheapest available provider" />
        <Stat label="Context window" value={formatTokens(m.contextWindow)} />
        <Stat label="Providers" value={m.pricing.providerCount} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-1">
          <h2 className="mb-3 font-semibold">Specifications</h2>
          <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {specs.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mb-2 mt-5 text-sm font-semibold">Capabilities</h3>
          {m.capabilities.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {m.capabilities.map((c) => (
                <li key={c.slug}>
                  <Link href={`/models?capability=${c.slug}`} title={c.description ?? undefined}>
                    <Badge tone="brand">{c.name}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">None listed.</p>
          )}
        </section>

        <section className="card overflow-hidden lg:col-span-2" aria-labelledby="providers-h">
          <h2 id="providers-h" className="px-5 pt-5 font-semibold">
            Available providers & pricing
          </h2>
          <p className="px-5 text-xs text-slate-500">USD per 1M tokens, cheapest first.</p>
          {m.providers.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No token-priced providers listed for this model.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full" data-testid="providers-table">
                <thead className="border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                  <tr>
                    <th className="th">Provider</th>
                    <th className="th text-right">Input</th>
                    <th className="th text-right">Output</th>
                    <th className="th text-right">Cached in</th>
                    <th className="th text-right">Latency</th>
                    <th className="th text-right">Throughput</th>
                    <th className="th text-right">Uptime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {m.providers.map((p) => (
                    <tr key={p.provider.slug} className={p.isAvailable ? '' : 'opacity-50'}>
                      <td className="td">
                        <Link href={`/providers/${p.provider.slug}`} className="font-medium hover:text-brand-600">
                          {p.provider.name}
                        </Link>
                        {!p.isAvailable && (
                          <span className="ml-2">
                            <Badge tone="red">Unavailable</Badge>
                          </span>
                        )}
                        <div className="font-mono text-xs text-slate-500">{p.providerModelId}</div>
                      </td>
                      <td className="td text-right tabular-nums">{formatPrice(p.inputPricePerMTok)}</td>
                      <td className="td text-right tabular-nums">{formatPrice(p.outputPricePerMTok)}</td>
                      <td className="td text-right tabular-nums">{formatPrice(p.cachedInputPerMTok)}</td>
                      <td className="td text-right tabular-nums">{p.avgLatencyMs != null ? `${formatNumber(p.avgLatencyMs)} ms` : '—'}</td>
                      <td className="td text-right tabular-nums">{p.throughputTps != null ? `${formatNumber(p.throughputTps)} tok/s` : '—'}</td>
                      <td className="td text-right tabular-nums">{p.uptimePct != null ? `${p.uptimePct}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="card overflow-hidden" aria-labelledby="bench-h">
        <h2 id="bench-h" className="px-5 pt-5 font-semibold">
          Benchmarks
        </h2>
        <p className="px-5 text-xs text-slate-500">Normalised score: 0–100 where higher is always better (lower-is-better benchmarks are inverted).</p>
        {m.benchmarks.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No benchmark results yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full" data-testid="benchmarks-table">
              <thead className="border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                <tr>
                  <th className="th">Benchmark</th>
                  <th className="th">Category</th>
                  <th className="th text-right">Score</th>
                  <th className="th">Normalised</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {m.benchmarks.map((b) => (
                  <tr key={b.benchmark.slug}>
                    <td className="td">
                      <Link href={`/rankings?benchmark=${b.benchmark.slug}`} className="font-medium hover:text-brand-600">
                        {b.benchmark.name}
                      </Link>
                      {!b.benchmark.higherIsBetter && <span className="ml-1 text-xs text-slate-500">(lower is better)</span>}
                    </td>
                    <td className="td text-slate-600 dark:text-slate-400">{CATEGORY_LABEL[b.benchmark.category]}</td>
                    <td className="td text-right tabular-nums">{formatScore(b.score, b.benchmark.unit)}</td>
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
