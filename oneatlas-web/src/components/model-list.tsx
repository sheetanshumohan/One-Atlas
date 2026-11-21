import Link from 'next/link';
import type { ModelSummary } from '@/lib/types';
import { formatDate, formatPrice, formatTokens } from '@/lib/format';
import { CompareButton } from './compare-button';
import { Avatar, Badge, StatusBadge, TypeBadge } from './ui';

/** Responsive model listing: a dense spec table on desktop, cards on mobile. */
export function ModelList({ models, tableFrom = 'lg' }: { models: ModelSummary[]; tableFrom?: 'lg' | 'xl' }) {
  // Full class names (not interpolated) so Tailwind can see them at build time.
  const tableVis = tableFrom === 'xl' ? 'hidden xl:block' : 'hidden lg:block';
  const cardsVis = tableFrom === 'xl' ? 'xl:hidden' : 'lg:hidden';
  return (
    <>
      {/* Table from lg up (fits without sideways scroll: long names wrap, "Released" only on xl); cards below lg. */}
      <div className={`card overflow-x-auto ${tableVis}`}>
        <table className="w-full" data-testid="model-table">
          <thead className="border-b border-white/[0.06]">
            <tr>
              <th className="th">Model</th>
              <th className="th">Type</th>
              <th className="th text-right">Input $/1M</th>
              <th className="th text-right">Output $/1M</th>
              <th className="th text-right">Context</th>
              <th className="th hidden xl:table-cell">Released</th>
              <th className="th">
                <span className="sr-only">Compare</span>
              </th>
            </tr>
          </thead>
          <tbody className="stagger divide-y divide-white/[0.05]">
            {models.map((m) => (
              <tr key={m.slug} className="group transition-colors hover:bg-white/[0.035]" data-testid="model-row">
                <td className="td min-w-[13rem] !whitespace-normal">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.organization.name} size="sm" />
                    <div className="min-w-0">
                      <Link href={`/models/${m.slug}`} className="font-medium leading-snug text-white transition group-hover:text-brand-300">
                        {m.name}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <Link href={`/labs/${m.organization.slug}`} className="hover:text-slate-300">
                          {m.organization.name}
                        </Link>
                        {m.openWeights && <Badge tone="green">Open weights</Badge>}
                        <StatusBadge status={m.status} />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="td">
                  <TypeBadge type={m.type} />
                </td>
                <td className="td text-right font-medium tabular-nums text-white">{formatPrice(m.pricing.minInputPricePerMTok)}</td>
                <td className="td text-right tabular-nums text-slate-300">{formatPrice(m.pricing.minOutputPricePerMTok)}</td>
                <td className="td text-right tabular-nums text-slate-300">{formatTokens(m.contextWindow)}</td>
                <td className="td hidden text-slate-400 xl:table-cell">{formatDate(m.releaseDate)}</td>
                <td className="td text-right">
                  <CompareButton slug={m.slug} name={m.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className={`stagger grid gap-3 sm:grid-cols-2 ${cardsVis}`} data-testid="model-cards">
        {models.map((m) => (
          <li key={m.slug} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={m.organization.name} />
                <div className="min-w-0">
                  <Link href={`/models/${m.slug}`} className="font-semibold text-white">
                    {m.name}
                  </Link>
                  <div className="text-xs text-slate-500">{m.organization.name}</div>
                </div>
              </div>
              <CompareButton slug={m.slug} name={m.name} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <TypeBadge type={m.type} />
              {m.openWeights && <Badge tone="green">Open weights</Badge>}
              <StatusBadge status={m.status} />
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-white/[0.03] p-3 text-xs ring-1 ring-white/[0.06]">
              <div>
                <dt className="text-slate-500">Input/1M</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-white">{formatPrice(m.pricing.minInputPricePerMTok)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Output/1M</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-white">{formatPrice(m.pricing.minOutputPricePerMTok)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Context</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-white">{formatTokens(m.contextWindow)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
