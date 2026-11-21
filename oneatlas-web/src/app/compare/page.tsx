import type { Metadata } from 'next';
import Link from 'next/link';
import { ComparePicker } from '@/components/compare-picker';
import { EmptyState, PageHeader, ScoreBar } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { CATEGORY_LABEL, formatDate, formatParams, formatPrice, formatScore, formatTokens, MODEL_TYPE_LABEL, modalityLabel } from '@/lib/format';
import { MAX_COMPARE, readList, type SearchParams } from '@/lib/query';
import type { Comparison, ModelDetail } from '@/lib/types';

export const metadata: Metadata = { title: 'Compare models' };

function Row({ label, items, render, best }: { label: string; items: ModelDetail[]; render: (m: ModelDetail) => React.ReactNode; best?: string[] }) {
  return (
    <tr>
      <th scope="row" className="td sticky left-0 bg-white text-left font-medium text-slate-500 dark:bg-slate-900">
        {label}
      </th>
      {items.map((m) => (
        <td key={m.slug} className={`td ${best?.includes(m.slug) ? 'font-semibold text-emerald-700 dark:text-emerald-400' : ''}`} data-best={best?.includes(m.slug) || undefined}>
          {render(m)}
          {best?.includes(m.slug) && <span className="ml-1" aria-label="best">★</span>}
        </td>
      ))}
    </tr>
  );
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const slugs = readList(await searchParams, 'models').slice(0, MAX_COMPARE);
  const all = await api.models({ sort: 'name', pageSize: 100 });
  const options = all.data.map((m) => ({ slug: m.slug, name: m.name, org: m.organization.name }));

  let cmp: Comparison | null = null;
  let error: string | null = null;
  if (slugs.length >= 2) {
    try {
      cmp = await api.compare(slugs);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 400)) error = e.message;
      else throw e;
    }
  }
  const selected = cmp ? cmp.items.map((m) => ({ slug: m.slug, name: m.name })) : slugs.map((s) => ({ slug: s, name: options.find((o) => o.slug === s)?.name ?? s }));

  return (
    <>
      <PageHeader title="Compare models" description="Pricing, context length, capabilities and benchmarks side by side. ★ marks the best value in each row." />
      <ComparePicker selected={selected} options={options} />

      <div className="mt-6">
        {error ? (
          <EmptyState title="Couldn't compare these models">{error}</EmptyState>
        ) : !cmp ? (
          <EmptyState title="Pick at least two models">
            Add models above, or use the “+ Compare” buttons on the{' '}
            <Link href="/models" className="link">
              models list
            </Link>
            .{' '}
            <Link href="/compare?models=gpt-4o,claude-3.5-sonnet,gemini-2.0-flash" className="link">
              Try an example →
            </Link>
          </EmptyState>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full" data-testid="compare-table">
              <thead className="border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="th sticky left-0 bg-white dark:bg-slate-900" />
                  {cmp.items.map((m) => (
                    <th key={m.slug} className="th min-w-[11rem] normal-case">
                      <Link href={`/models/${m.slug}`} className="text-sm font-semibold text-slate-900 hover:text-brand-600 dark:text-white">
                        {m.name}
                      </Link>
                      <div className="font-normal tracking-normal text-slate-500">{m.organization.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr className="bg-slate-50 dark:bg-slate-950">
                  <th colSpan={cmp.items.length + 1} className="th">
                    Pricing (USD / 1M tokens)
                  </th>
                </tr>
                <Row label="Input" items={cmp.items} render={(m) => formatPrice(m.pricing.minInputPricePerMTok)} best={cmp.highlights.cheapestInput} />
                <Row label="Output" items={cmp.items} render={(m) => formatPrice(m.pricing.minOutputPricePerMTok)} best={cmp.highlights.cheapestOutput} />
                <Row label="Providers" items={cmp.items} render={(m) => m.pricing.providerCount} best={cmp.highlights.mostProviders} />
                <tr className="bg-slate-50 dark:bg-slate-950">
                  <th colSpan={cmp.items.length + 1} className="th">
                    Specifications
                  </th>
                </tr>
                <Row label="Context window" items={cmp.items} render={(m) => formatTokens(m.contextWindow)} best={cmp.highlights.largestContext} />
                <Row label="Max output" items={cmp.items} render={(m) => formatTokens(m.maxOutputTokens)} best={cmp.highlights.largestMaxOutput} />
                <Row label="Released" items={cmp.items} render={(m) => formatDate(m.releaseDate)} best={cmp.highlights.newest} />
                <Row label="Type" items={cmp.items} render={(m) => MODEL_TYPE_LABEL[m.type]} />
                <Row label="Parameters" items={cmp.items} render={(m) => formatParams(m.parameterCountB)} />
                <Row label="Open weights" items={cmp.items} render={(m) => (m.openWeights ? 'Yes' : 'No')} />
                <Row label="Input modalities" items={cmp.items} render={(m) => m.inputModalities.map(modalityLabel).join(', ')} />
                {cmp.capabilities.length > 0 && (
                  <tr className="bg-slate-50 dark:bg-slate-950">
                    <th colSpan={cmp.items.length + 1} className="th">
                      Capabilities
                    </th>
                  </tr>
                )}
                {cmp.capabilities.map((c) => (
                  <Row
                    key={c.capability.slug}
                    label={c.capability.name}
                    items={cmp!.items}
                    render={(m) => (c.support[m.slug] ? <span className="text-emerald-600">✓ Yes</span> : <span className="text-slate-400">—</span>)}
                  />
                ))}
                {cmp.benchmarks.length > 0 && (
                  <tr className="bg-slate-50 dark:bg-slate-950">
                    <th colSpan={cmp.items.length + 1} className="th">
                      Benchmarks
                    </th>
                  </tr>
                )}
                {cmp.benchmarks.map((b) => (
                  <Row
                    key={b.benchmark.slug}
                    label={`${b.benchmark.name} (${CATEGORY_LABEL[b.benchmark.category]})`}
                    items={cmp!.items}
                    best={b.best}
                    render={(m) =>
                      b.scores[m.slug] === null ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <div>
                          <div className="tabular-nums">{formatScore(b.scores[m.slug]!, b.benchmark.unit)}</div>
                          <ScoreBar value={b.normalizedScores[m.slug]!} best={b.best.includes(m.slug)} />
                        </div>
                      )
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
