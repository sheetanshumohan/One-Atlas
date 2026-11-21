import type { Metadata } from 'next';
import { FilterPanel, type FilterOptions } from '@/components/filter-panel';
import { FiltersShell } from '@/components/filters-shell';
import { ModelList } from '@/components/model-list';
import { SortSelect } from '@/components/sort-select';
import { EmptyState, PageHeader, Pagination } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { readList, readPage, readString, withParams, type SearchParams } from '@/lib/query';

export const metadata: Metadata = { title: 'Models' };

const PAGE_SIZE = 20;

export default async function ModelsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = readPage(sp);
  const query = {
    q: readString(sp, 'q'),
    organization: readList(sp, 'organization'),
    provider: readList(sp, 'provider'),
    capability: readList(sp, 'capability'),
    type: readList(sp, 'type'),
    status: readList(sp, 'status'),
    inputModality: readList(sp, 'inputModality'),
    openWeights: readString(sp, 'openWeights'),
    minContext: readString(sp, 'minContext'),
    maxInputPrice: readString(sp, 'maxInputPrice'),
    sort: readString(sp, 'sort'),
    order: readString(sp, 'order'),
    page,
    pageSize: PAGE_SIZE,
  };

  const [orgs, providers, capabilities] = await Promise.all([
    api.organizations({ pageSize: 100 }),
    api.providers({ pageSize: 100 }),
    api.capabilities(),
  ]);
  const options: FilterOptions = {
    organizations: orgs.data.filter((o) => o.modelCount > 0).map((o) => ({ slug: o.slug, name: o.name, count: o.modelCount })),
    providers: providers.data.filter((p) => p.modelCount > 0).map((p) => ({ slug: p.slug, name: p.name, count: p.modelCount })),
    capabilities: capabilities.data.filter((c) => c.modelCount > 0).map((c) => ({ slug: c.slug, name: c.name, count: c.modelCount })),
  };

  let content: React.ReactNode;
  let total = 0;
  try {
    const result = await api.models(query);
    total = result.meta.total;
    content =
      result.data.length === 0 ? (
        <EmptyState title="No models match these filters">Try removing a filter or widening the price / context range.</EmptyState>
      ) : (
        <>
          <ModelList models={result.data} tableFrom="xl" />
          <Pagination page={result.meta.page} totalPages={result.meta.totalPages} hrefFor={(p) => `/models${withParams(sp, { page: p === 1 ? [] : String(p) })}`} />
        </>
      );
  } catch (e) {
    // Invalid filter combinations (e.g. a hand-edited URL) are reported inline instead of crashing the page.
    if (e instanceof ApiError && e.status === 400) {
      content = (
        <EmptyState title="Some filters are invalid">
          {e.details?.map((d) => d.messages.join(', ')).join('; ') ?? e.message}
        </EmptyState>
      );
    } else throw e;
  }

  return (
    <>
      <PageHeader eyebrow="Model explorer" title="Models" description="Browse, search and filter AI models by lab, provider, capability and type. Prices are the cheapest available, in USD per 1M tokens.">
          <SortSelect />
      </PageHeader>
      <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
        <FiltersShell>
            <FilterPanel options={options} />
        </FiltersShell>
        <div className="min-w-0">
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400 shadow-[0_0_8px_2px_rgba(129,140,248,0.6)]" aria-hidden />
            <span data-testid="result-count">
              {total} {total === 1 ? 'model' : 'models'}
            </span>
          </div>
          {content}
        </div>
      </div>
    </>
  );
}
