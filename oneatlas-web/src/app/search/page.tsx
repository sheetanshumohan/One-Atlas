import type { Metadata } from 'next';
import Link from 'next/link';
import { ModelList } from '@/components/model-list';
import { EmptyState, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { CATEGORY_LABEL, ORG_TYPE_LABEL } from '@/lib/format';
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
  const r = await api.search(q, 10);

  return (
    <>
      <PageHeader title={`Results for “${q}”`} description={`${r.total} matches across models, labs, providers and benchmarks.`} />
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
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="font-semibold">Models</h2>
                <Link href={`/models?q=${encodeURIComponent(q)}`} className="link text-sm">
                  See all in model explorer →
                </Link>
              </div>
              <ModelList models={r.models} />
            </section>
          )}
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { title: 'AI labs', items: r.organizations.map((o) => ({ href: `/labs/${o.slug}`, name: o.name, meta: ORG_TYPE_LABEL[o.type] })) },
              { title: 'Providers', items: r.providers.map((p) => ({ href: `/providers/${p.slug}`, name: p.name, meta: '' })) },
              { title: 'Benchmarks', items: r.benchmarks.map((b) => ({ href: `/rankings?benchmark=${b.slug}`, name: b.name, meta: CATEGORY_LABEL[b.category] })) },
            ]
              .filter((g) => g.items.length)
              .map((g) => (
                <section key={g.title} className="card p-4">
                  <h2 className="mb-2 font-semibold">{g.title}</h2>
                  <ul className="space-y-1">
                    {g.items.map((it) => (
                      <li key={it.href} className="flex justify-between gap-2 text-sm">
                        <Link href={it.href} className="hover:text-brand-600">
                          {it.name}
                        </Link>
                        <span className="text-xs text-slate-500">{it.meta}</span>
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
