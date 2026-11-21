import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, EmptyState, Stat, TypeBadge } from '@/components/ui';
import { api } from '@/lib/api';
import { formatNumber, formatPrice, formatTokens } from '@/lib/format';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await api.provider((await params).slug);
  return { title: p ? p.name : 'Provider not found' };
}

export default async function ProviderPage({ params }: Props) {
  const p = await api.provider((await params).slug);
  if (!p) notFound();
  const available = p.models.filter((m) => m.isAvailable);
  const cheapest = available.length ? Math.min(...available.map((m) => m.inputPricePerMTok)) : null;

  return (
    <div className="space-y-8">
      <nav className="text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/providers" className="hover:underline">
          Providers
        </Link>{' '}
        / {p.name}
      </nav>
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{p.name}</h1>
        {p.description && <p className="mt-2 text-slate-600 dark:text-slate-300">{p.description}</p>}
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          {p.website && (
            <a href={p.website} className="link" target="_blank" rel="noopener noreferrer">
              Website ↗
            </a>
          )}
          {p.apiBaseUrl && <code className="rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">{p.apiBaseUrl}</code>}
        </div>
      </header>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Models available" value={p.stats.modelCount} />
        <Stat label="Labs covered" value={p.stats.organizations.length} />
        <Stat label="Cheapest input / 1M" value={formatPrice(cheapest)} />
      </section>
      {p.models.length === 0 ? (
        <EmptyState title="This provider has no models listed yet" />
      ) : (
        <section className="card overflow-x-auto">
          <table className="w-full" data-testid="provider-models">
            <thead className="border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="th">Model</th>
                <th className="th">Type</th>
                <th className="th text-right">Input $/1M</th>
                <th className="th text-right">Output $/1M</th>
                <th className="th text-right">Context</th>
                <th className="th text-right">Throughput</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {p.models.map((o) => (
                <tr key={o.model.slug} className={o.isAvailable ? '' : 'opacity-50'}>
                  <td className="td">
                    <Link href={`/models/${o.model.slug}`} className="font-medium hover:text-brand-600">
                      {o.model.name}
                    </Link>
                    {!o.isAvailable && (
                      <span className="ml-2">
                        <Badge tone="red">Unavailable</Badge>
                      </span>
                    )}
                    <div className="text-xs text-slate-500">{o.model.organization.name}</div>
                  </td>
                  <td className="td">
                    <TypeBadge type={o.model.type} />
                  </td>
                  <td className="td text-right tabular-nums">{formatPrice(o.inputPricePerMTok)}</td>
                  <td className="td text-right tabular-nums">{formatPrice(o.outputPricePerMTok)}</td>
                  <td className="td text-right tabular-nums">{formatTokens(o.contextWindow ?? o.model.contextWindow)}</td>
                  <td className="td text-right tabular-nums">{o.throughputTps != null ? `${formatNumber(o.throughputTps)} tok/s` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
