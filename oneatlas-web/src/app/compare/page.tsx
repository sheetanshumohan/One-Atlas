import type { Metadata } from 'next';
import Link from 'next/link';
import { ComparePicker } from '@/components/compare-picker';
import { Avatar, EmptyState, PageHeader, ScoreBar } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { CATEGORY_LABEL, formatDate, formatParams, formatPrice, formatScore, formatTokens, MODEL_TYPE_LABEL, modalityLabel } from '@/lib/format';
import { MAX_COMPARE, readList, type SearchParams } from '@/lib/query';
import type { Comparison, ModelDetail } from '@/lib/types';

export const metadata: Metadata = { title: 'Compare models' };

function Row({ label, items, render, best }: { label: string; items: ModelDetail[]; render: (m: ModelDetail) => React.ReactNode; best?: string[] }) {
  return (
    <tr className="transition-colors hover:bg-white/[0.025]">
      <th scope="row" className="td sticky left-0 z-10 bg-ink-900/95 text-left font-medium text-slate-400 backdrop-blur">
        {label}
      </th>
      {items.map((m) => {
        const isBest = best?.includes(m.slug);
        return (
          <td key={m.slug} className={`td ${isBest ? 'font-semibold text-emerald-300' : 'text-slate-200'}`} data-best={isBest || undefined}>
            <span className={isBest ? 'rounded-lg bg-emerald-500/10 px-2 py-1 ring-1 ring-inset ring-emerald-400/25' : ''}>
              {render(m)}
              {isBest && (
                <span className="ml-1" aria-label="best">
                  ★
                </span>
              )}
            </span>
          </td>
        );
      })}
    </tr>
  );
}

function GroupRow({ label, span }: { label: string; span: number }) {
  return (
    <tr>
      <th colSpan={span} className="th sticky left-0 bg-white/[0.03] !py-2.5 !text-brand-300">
        {label}
      </th>
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
  const span = (cmp?.items.length ?? 0) + 1;

  return (
    <>
      <PageHeader eyebrow="Side by side" title="Compare models" description="Pricing, context length, capabilities and benchmarks side by side. ★ marks the best value in each row." />
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
          <div className="card animate-fade-up overflow-x-auto">
            <table className="w-full" data-testid="compare-table">
              <thead className="border-b border-white/[0.08]">
                <tr>
                  <th className="th sticky left-0 z-10 bg-ink-900/95 backdrop-blur" />
                  {cmp.items.map((m) => (
                    <th key={m.slug} className="th min-w-[12rem] !py-5 normal-case !tracking-normal">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.organization.name} />
                        <div>
                          <Link href={`/models/${m.slug}`} className="text-sm font-semibold text-white transition hover:text-brand-300">
                            {m.name}
                          </Link>
                          <div className="font-normal text-slate-500">{m.organization.name}</div>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                <GroupRow label="Pricing (USD / 1M tokens)" span={span} />
                <Row label="Input" items={cmp.items} render={(m) => formatPrice(m.pricing.minInputPricePerMTok)} best={cmp.highlights.cheapestInput} />
                <Row label="Output" items={cmp.items} render={(m) => formatPrice(m.pricing.minOutputPricePerMTok)} best={cmp.highlights.cheapestOutput} />
                <Row label="Providers" items={cmp.items} render={(m) => m.pricing.providerCount} best={cmp.highlights.mostProviders} />
                <GroupRow label="Specifications" span={span} />
                <Row label="Context window" items={cmp.items} render={(m) => formatTokens(m.contextWindow)} best={cmp.highlights.largestContext} />
                <Row label="Max output" items={cmp.items} render={(m) => formatTokens(m.maxOutputTokens)} best={cmp.highlights.largestMaxOutput} />
                <Row label="Released" items={cmp.items} render={(m) => formatDate(m.releaseDate)} best={cmp.highlights.newest} />
                <Row label="Type" items={cmp.items} render={(m) => MODEL_TYPE_LABEL[m.type]} />
                <Row label="Parameters" items={cmp.items} render={(m) => formatParams(m.parameterCountB)} />
                <Row label="Open weights" items={cmp.items} render={(m) => (m.openWeights ? 'Yes' : 'No')} />
                <Row label="Input modalities" items={cmp.items} render={(m) => m.inputModalities.map(modalityLabel).join(', ')} />
                {cmp.capabilities.length > 0 && <GroupRow label="Capabilities" span={span} />}
                {cmp.capabilities.map((c) => (
                  <Row
                    key={c.capability.slug}
                    label={c.capability.name}
                    items={cmp!.items}
                    render={(m) => (c.support[m.slug] ? <span className="text-emerald-300">✓ Yes</span> : <span className="text-slate-600">—</span>)}
                  />
                ))}
                {cmp.benchmarks.length > 0 && <GroupRow label="Benchmarks" span={span} />}
                {cmp.benchmarks.map((b) => (
                  <Row
                    key={b.benchmark.slug}
                    label={`${b.benchmark.name} (${CATEGORY_LABEL[b.benchmark.category]})`}
                    items={cmp!.items}
                    best={b.best}
                    render={(m) =>
                      b.scores[m.slug] === null ? (
                        <span className="text-slate-600">—</span>
                      ) : (
                        <span className="inline-flex flex-col gap-1.5 align-middle">
                          <span className="tabular-nums">{formatScore(b.scores[m.slug]!, b.benchmark.unit)}</span>
                          <ScoreBar value={b.normalizedScores[m.slug]!} best={b.best.includes(m.slug)} />
                        </span>
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
