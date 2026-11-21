import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar, Badge, EmptyState, Stat, TypeBadge } from '@/components/ui';
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
      <nav className="animate-fade-in text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/providers" className="transition hover:text-white">
          Providers
        </Link>
        <span className="mx-2 text-slate-700">/</span>
        <span className="text-slate-300">{p.name}</span>
      </nav>
      <header className="card relative animate-fade-up overflow-hidden p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-cyan-400/25 to-brand-500/20 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <Avatar name={p.name} size="lg" />
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold sm:text-4xl">{p.name}</h1>
            {p.description && <p className="mt-3 leading-relaxed text-slate-300">{p.description}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              {p.website && (
                <a href={p.website} className="link" target="_blank" rel="noopener noreferrer">
                  Website ↗
                </a>
              )}
              {p.apiBaseUrl && <code className="max-w-full truncate rounded-lg bg-white/[0.05] px-2.5 py-1 font-mono text-xs text-slate-300 ring-1 ring-white/10">{p.apiBaseUrl}</code>}
            </div>
          </div>
        </div>
      </header>
      <section className="stagger grid grid-cols-2 gap-3 md:grid-cols-3" aria-label="Provider stats">
        <Stat label="Models available" value={p.stats.modelCount} accent />
        <Stat label="Labs covered" value={p.stats.organizations.length} />
        <Stat label="Cheapest input / 1M" value={formatPrice(cheapest)} />
      </section>
      {p.models.length === 0 ? (
        <EmptyState title="This provider has no models listed yet" />
      ) : (
        <section className="card animate-fade-up overflow-x-auto">
          <table className="w-full" data-testid="provider-models">
            <thead className="border-b border-white/[0.06]">
              <tr>
                <th className="th">Model</th>
                <th className="th">Type</th>
                <th className="th text-right">Input $/1M</th>
                <th className="th text-right">Output $/1M</th>
                <th className="th text-right">Context</th>
                <th className="th hidden text-right lg:table-cell">Throughput</th>
              </tr>
            </thead>
            <tbody className="stagger divide-y divide-white/[0.05]">
              {p.models.map((o) => (
                <tr key={o.model.slug} className={`group transition-colors hover:bg-white/[0.03] ${o.isAvailable ? '' : 'opacity-45'}`}>
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <Avatar name={o.model.organization.name} size="sm" />
                      <div>
                        <Link href={`/models/${o.model.slug}`} className="font-medium text-white transition group-hover:text-brand-300">
                          {o.model.name}
                        </Link>
                        {!o.isAvailable && (
                          <span className="ml-2">
                            <Badge tone="red">Unavailable</Badge>
                          </span>
                        )}
                        <div className="text-xs text-slate-500">{o.model.organization.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="td">
                    <TypeBadge type={o.model.type} />
                  </td>
                  <td className="td text-right tabular-nums text-white">{formatPrice(o.inputPricePerMTok)}</td>
                  <td className="td text-right tabular-nums text-slate-300">{formatPrice(o.outputPricePerMTok)}</td>
                  <td className="td text-right tabular-nums text-slate-300">{formatTokens(o.contextWindow ?? o.model.contextWindow)}</td>
                  <td className="td hidden text-right tabular-nums text-slate-400 lg:table-cell">{o.throughputTps != null ? `${formatNumber(o.throughputTps)} tok/s` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
