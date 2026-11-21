import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ModelList } from '@/components/model-list';
import { Badge, EmptyState, Stat } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, ORG_TYPE_LABEL } from '@/lib/format';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const o = await api.organization((await params).slug);
  return { title: o ? o.name : 'Lab not found' };
}

export default async function LabPage({ params }: Props) {
  const o = await api.organization((await params).slug);
  if (!o) notFound();

  // Group the (newest-first) models by release year for a timeline view.
  const byYear = new Map<string, typeof o.models>();
  for (const m of o.models) {
    const year = m.releaseDate?.slice(0, 4) ?? 'Unknown';
    byYear.set(year, [...(byYear.get(year) ?? []), m]);
  }

  return (
    <div className="space-y-8">
      <nav className="text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/labs" className="hover:underline">
          AI labs
        </Link>{' '}
        / {o.name}
      </nav>
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{o.name}</h1>
          <Badge>{ORG_TYPE_LABEL[o.type]}</Badge>
        </div>
        {o.description && <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-300">{o.description}</p>}
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
          {o.country && <span>Country: {o.country}</span>}
          {o.foundedYear && <span>Founded {o.foundedYear}</span>}
          {o.website && (
            <a href={o.website} className="link" target="_blank" rel="noopener noreferrer">
              Website ↗
            </a>
          )}
        </div>
      </header>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Models" value={o.stats.modelCount} />
        <Stat label="Open-weights" value={o.stats.openWeightsModelCount} />
        <Stat label="First release" value={formatDate(o.stats.firstRelease)} />
        <Stat label="Latest release" value={formatDate(o.stats.latestRelease)} />
      </section>
      {o.models.length === 0 ? (
        <EmptyState title="No models listed for this lab yet" />
      ) : (
        <section aria-label="Release timeline" className="space-y-6">
          <h2 className="text-lg font-semibold">Models & releases</h2>
          {[...byYear.entries()].map(([year, models]) => (
            <div key={year}>
              <h3 className="mb-2 text-sm font-semibold text-slate-500">{year}</h3>
              <ModelList models={models} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
