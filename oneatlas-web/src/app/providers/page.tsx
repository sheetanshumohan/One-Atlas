import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/ui';
import { api } from '@/lib/api';

export const metadata: Metadata = { title: 'Providers' };

export default async function ProvidersPage() {
  const providers = await api.providers({ sort: 'modelCount', pageSize: 100 });
  return (
    <>
      <PageHeader title="Inference providers" description="Platforms that serve models via API. The same model often costs different amounts on different providers." />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="providers-grid">
        {providers.data.map((p) => (
          <li key={p.slug}>
            <Link href={`/providers/${p.slug}`} className="card block h-full p-5 hover:border-brand-500">
              <h2 className="font-semibold">{p.name}</h2>
              {p.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{p.description}</p>}
              <p className="mt-3 text-xs text-slate-500">
                <strong className="text-slate-900 dark:text-white">{p.modelCount}</strong> models available
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
