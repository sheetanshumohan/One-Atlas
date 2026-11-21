import Link from 'next/link';
import type { ModelSummary } from '@/lib/types';
import { formatDate, formatPrice, formatTokens } from '@/lib/format';
import { CompareButton } from './compare-button';
import { Badge, StatusBadge, TypeBadge } from './ui';

/** Responsive model listing: a dense spec table on desktop, cards on mobile. */
export function ModelList({ models }: { models: ModelSummary[] }) {
  return (
    <>
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full" data-testid="model-table">
          <thead className="border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="th">Model</th>
              <th className="th">Type</th>
              <th className="th text-right">Input $/1M</th>
              <th className="th text-right">Output $/1M</th>
              <th className="th text-right">Context</th>
              <th className="th">Released</th>
              <th className="th text-right">Providers</th>
              <th className="th">
                <span className="sr-only">Compare</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {models.map((m) => (
              <tr key={m.slug} className="hover:bg-slate-50 dark:hover:bg-slate-800/50" data-testid="model-row">
                <td className="td">
                  <Link href={`/models/${m.slug}`} className="font-medium hover:text-brand-600">
                    {m.name}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                    <Link href={`/labs/${m.organization.slug}`} className="hover:underline">
                      {m.organization.name}
                    </Link>
                    {m.openWeights && <Badge tone="green">Open weights</Badge>}
                    <StatusBadge status={m.status} />
                  </div>
                </td>
                <td className="td">
                  <TypeBadge type={m.type} />
                </td>
                <td className="td text-right tabular-nums">{formatPrice(m.pricing.minInputPricePerMTok)}</td>
                <td className="td text-right tabular-nums">{formatPrice(m.pricing.minOutputPricePerMTok)}</td>
                <td className="td text-right tabular-nums">{formatTokens(m.contextWindow)}</td>
                <td className="td text-slate-600 dark:text-slate-400">{formatDate(m.releaseDate)}</td>
                <td className="td text-right tabular-nums">{m.pricing.providerCount}</td>
                <td className="td text-right">
                  <CompareButton slug={m.slug} name={m.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-3 md:hidden" data-testid="model-cards">
        {models.map((m) => (
          <li key={m.slug} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/models/${m.slug}`} className="font-semibold hover:text-brand-600">
                  {m.name}
                </Link>
                <div className="text-xs text-slate-500">{m.organization.name}</div>
              </div>
              <CompareButton slug={m.slug} name={m.name} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <TypeBadge type={m.type} />
              {m.openWeights && <Badge tone="green">Open weights</Badge>}
              <StatusBadge status={m.status} />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-slate-500">Input/1M</dt>
                <dd className="font-medium tabular-nums">{formatPrice(m.pricing.minInputPricePerMTok)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Output/1M</dt>
                <dd className="font-medium tabular-nums">{formatPrice(m.pricing.minOutputPricePerMTok)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Context</dt>
                <dd className="font-medium tabular-nums">{formatTokens(m.contextWindow)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
