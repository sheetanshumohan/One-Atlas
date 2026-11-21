import Link from 'next/link';
import type { ModelStatus, ModelType } from '@/lib/types';
import { MODEL_TYPE_LABEL, STATUS_LABEL } from '@/lib/format';

export function PageHeader({ title, description, children }: { title: string; description?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function Badge({ children, tone = 'slate', title }: { children: React.ReactNode; tone?: 'slate' | 'brand' | 'green' | 'amber' | 'red'; title?: string }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-700/30 dark:text-brand-100',
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    red: 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  return (
    <span title={title} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function TypeBadge({ type }: { type: ModelType }) {
  return <Badge tone="brand">{MODEL_TYPE_LABEL[type]}</Badge>;
}

export function StatusBadge({ status }: { status: ModelStatus }) {
  if (status === 'ACTIVE') return null;
  return <Badge tone={status === 'PREVIEW' ? 'amber' : 'red'}>{STATUS_LABEL[status]}</Badge>;
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-semibold" title={hint}>
        {value}
      </div>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card p-10 text-center" data-testid="empty-state">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">{children}</div>}
    </div>
  );
}

/** Horizontal 0–100 bar used for normalised benchmark scores. */
export function ScoreBar({ value, best }: { value: number; best?: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" aria-hidden>
        <div className={`h-full rounded-full ${best ? 'bg-emerald-500' : 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular-nums text-xs text-slate-600 dark:text-slate-400">{value.toFixed(1)}</span>
    </div>
  );
}

export function Pagination({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (p: number) => string }) {
  if (totalPages <= 1) return null;
  const pages = [...new Set([1, page - 1, page, page + 1, totalPages])].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  return (
    <nav className="mt-6 flex flex-wrap items-center justify-center gap-1" aria-label="Pagination">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className="btn-secondary" rel="prev">
          ← Prev
        </Link>
      ) : (
        <span className="btn-secondary opacity-40">← Prev</span>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-slate-400">…</span>}
          <Link href={hrefFor(p)} aria-current={p === page ? 'page' : undefined} className={p === page ? 'btn-primary' : 'btn-secondary'}>
            {p}
          </Link>
        </span>
      ))}
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className="btn-secondary" rel="next">
          Next →
        </Link>
      ) : (
        <span className="btn-secondary opacity-40">Next →</span>
      )}
    </nav>
  );
}
