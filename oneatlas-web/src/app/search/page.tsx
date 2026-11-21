import type { Metadata } from 'next';
import Link from 'next/link';
import { ModelList } from '@/components/model-list';
import { EmptyState, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { getLabels } from '@/lib/meta';
import { readString, type SearchParams } from '@/lib/query';

export const metadata: Metadata = { title: 'Search' };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const q = readString(await searchParams, 'q')?.slice(0, 100);
  if (!q) {
    return (
      <>
        <PageHeader title="Search" />
        <EmptyState title="Type a model, lab, provider or benchmark name in the search box above." />
      </>
    );
  }
  const [r, labels] = await Promise.all([api.search(q, 10), getLabels()]);

  return (
    <>
      <PageHeader eyebrow="Search" title={`Results for “${q}”`} description={`${r.total} matches across models, labs, providers and benchmarks.`} />
      {r.total === 0 ? (
        <EmptyState title="Nothing found">
          Try a shorter query, or{' '}
          <Link href={`/models?q=${encodeURIComponent(q)}`} className="link">
            search model descriptions
          </Link>
          .
        </EmptyState>
      ) : (
        <div className="space-y-8">
          {r.models.length > 0 && (
            <section data-testid="search-models">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-xl font-semibold">Models</h2>
                <Link href={`/models?q=${encodeURIComponent(q)}`} className="link text-sm">
                  See all in model explorer →
                </Link>
              </div>
              <ModelList models={r.models} />
            </section>
          )}
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { title: 'AI labs', items: r.organizations.map((o) => ({ href: `/labs/${o.slug}`, name: o.name, meta: labels.organizationType[o.type] })) },
              { title: 'Providers', items: r.providers.map((p) => ({ href: `/providers/${p.slug}`, name: p.name, meta: '' })) },
              { title: 'Benchmarks', items: r.benchmarks.map((b) => ({ href: `/rankings?benchmark=${b.slug}`, name: b.name, meta: labels.benchmarkCategory[b.category] })) },
            ]
              .filter((g) => g.items.length)
              .map((g) => (
                <section key={g.title} className="card animate-fade-up p-5">
                  <h2 className="eyebrow mb-3">{g.title}</h2>
                  <ul className="space-y-1">
                    {g.items.map((it) => (
                      <li key={it.href}>
                        <Link href={it.href} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-200 transition hover:bg-white/[0.05] hover:text-white">
                          {it.name}
                          <span className="text-xs text-slate-500">{it.meta}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
          </div>
        </div>
      )}
    </>
  );
}
