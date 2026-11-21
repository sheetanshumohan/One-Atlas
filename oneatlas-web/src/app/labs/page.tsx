import type { Metadata } from 'next';
import Link from 'next/link';
import { Avatar, Badge, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { ORG_TYPE_LABEL } from '@/lib/format';

export const metadata: Metadata = { title: 'AI labs & companies' };

export default async function LabsPage() {
  const orgs = await api.organizations({ sort: 'modelCount', pageSize: 100 });
  return (
    <>
      <PageHeader eyebrow="Directory" title="AI labs & companies" description={`${orgs.meta.total} organizations building AI models. Open one to see its models and release timeline.`} />
      <ul className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="labs-grid">
        {orgs.data.map((o) => (
          <li key={o.slug}>
            <Link href={`/labs/${o.slug}`} className="card card-hover group flex h-full flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={o.name} />
                  <h2 className="font-semibold transition group-hover:text-brand-300">{o.name}</h2>
                </div>
                <Badge>{ORG_TYPE_LABEL[o.type]}</Badge>
              </div>
              {o.description && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-400">{o.description}</p>}
              <div className="mt-auto flex gap-4 pt-5 text-xs text-slate-500">
                <span>
                  <strong className="text-base font-semibold text-white">{o.modelCount}</strong> models
                </span>
                {o.country && <span className="self-end">{o.country}</span>}
                {o.foundedYear && <span className="self-end">Founded {o.foundedYear}</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
