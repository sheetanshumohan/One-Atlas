import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { ORG_TYPE_LABEL } from '@/lib/format';

export const metadata: Metadata = { title: 'AI labs & companies' };

export default async function LabsPage() {
  const orgs = await api.organizations({ sort: 'modelCount', pageSize: 100 });
  return (
    <>
      <PageHeader title="AI labs & companies" description={`${orgs.meta.total} organizations building AI models. Open one to see its models and release timeline.`} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="labs-grid">
        {orgs.data.map((o) => (
          <li key={o.slug}>
            <Link href={`/labs/${o.slug}`} className="card block h-full p-5 hover:border-brand-500">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold">{o.name}</h2>
                <Badge>{ORG_TYPE_LABEL[o.type]}</Badge>
              </div>
              {o.description && <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{o.description}</p>}
              <div className="mt-3 flex gap-4 text-xs text-slate-500">
                <span>
                  <strong className="text-slate-900 dark:text-white">{o.modelCount}</strong> models
                </span>
                {o.country && <span>{o.country}</span>}
                {o.foundedYear && <span>Founded {o.foundedYear}</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
