import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ModelList } from '@/components/model-list';
import { Avatar, Badge, EmptyState, Stat } from '@/components/ui';
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
      <nav className="animate-fade-in text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/labs" className="transition hover:text-white">
          AI labs
        </Link>
        <span className="mx-2 text-slate-700">/</span>
        <span className="text-slate-300">{o.name}</span>
      </nav>
      <header className="card relative animate-fade-up overflow-hidden p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-brand-500/30 to-cyan-400/15 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <Avatar name={o.name} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold sm:text-4xl">{o.name}</h1>
              <Badge>{ORG_TYPE_LABEL[o.type]}</Badge>
            </div>
            {o.description && <p className="mt-3 max-w-3xl leading-relaxed text-slate-300">{o.description}</p>}
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
              {o.country && <span>Country: {o.country}</span>}
              {o.foundedYear && <span>Founded {o.foundedYear}</span>}
              {o.website && (
                <a href={o.website} className="link" target="_blank" rel="noopener noreferrer">
                  Website ↗
                </a>
              )}
            </div>
          </div>
        </div>
      </header>
      <section className="stagger grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Lab stats">
        <Stat label="Models" value={o.stats.modelCount} accent />
        <Stat label="Open-weights" value={o.stats.openWeightsModelCount} />
        <Stat label="First release" value={formatDate(o.stats.firstRelease)} />
        <Stat label="Latest release" value={formatDate(o.stats.latestRelease)} />
      </section>
      {o.models.length === 0 ? (
        <EmptyState title="No models listed for this lab yet" />
      ) : (
        <section aria-label="Release timeline" className="space-y-8">
          <h2 className="text-xl font-semibold">Models &amp; releases</h2>
          <ol className="relative space-y-8 border-l border-white/[0.08] pl-6">
            {[...byYear.entries()].map(([year, models]) => (
              <li key={year} className="relative">
                <span aria-hidden className="absolute -left-[1.95rem] top-1 h-3 w-3 rounded-full bg-gradient-to-br from-brand-400 to-fuchsia-400 shadow-[0_0_12px_2px_rgba(139,92,246,0.6)] ring-4 ring-ink-950" />
                <h3 className="mb-3 text-sm font-semibold text-slate-400">{year}</h3>
                <ModelList models={models} />
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
