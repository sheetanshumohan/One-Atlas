import type { Metadata } from 'next';
import Link from 'next/link';
import { Avatar, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';

export const metadata: Metadata = { title: 'Providers' };

export default async function ProvidersPage() {
  const providers = await api.providers({ sort: 'modelCount', pageSize: 100 });
  return (
    <>
      <PageHeader eyebrow="Directory" title="Inference providers" description="Platforms that serve models via API. The same model often costs different amounts on different providers." />
      <ul className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="providers-grid">
        {providers.data.map((p) => (
          <li key={p.slug}>
            <Link href={`/providers/${p.slug}`} className="card card-hover group flex h-full flex-col p-6">
              <div className="flex items-center gap-3">
                <Avatar name={p.name} />
                <h2 className="font-semibold transition group-hover:text-brand-300">{p.name}</h2>
              </div>
              {p.description && <p className="mt-3 text-sm leading-relaxed text-slate-400">{p.description}</p>}
              <p className="mt-auto pt-5 text-xs text-slate-500">
                <strong className="text-base font-semibold text-white">{p.modelCount}</strong> models available
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
