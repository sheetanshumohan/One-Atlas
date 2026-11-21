import Link from 'next/link';
import type { ModelStatus, ModelType } from '@/lib/types';
import { getLabels } from '@/lib/meta';

export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex animate-fade-up flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2 text-brand-300">{eyebrow}</p>}
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-400">{description}</p>}
      </div>
      {children}
    </div>
  );
}

type Tone = 'slate' | 'brand' | 'green' | 'amber' | 'red' | 'cyan';
const TONES: Record<Tone, string> = {
  slate: 'bg-white/[0.06] text-slate-300 ring-white/10',
  brand: 'bg-brand-500/10 text-brand-300 ring-brand-400/25',
  green: 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/25',
  amber: 'bg-amber-500/10 text-amber-300 ring-amber-400/25',
  red: 'bg-rose-500/10 text-rose-300 ring-rose-400/25',
  cyan: 'bg-cyan-500/10 text-cyan-300 ring-cyan-400/25',
};

export function Badge({ children, tone = 'slate', title }: { children: React.ReactNode; tone?: Tone; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${TONES[tone]}`}>
      {children}
    </span>
  );
}

// Colour per type/status is presentation; the TEXT of every badge comes from the API (GET /meta labels).
const TYPE_TONE: Partial<Record<ModelType, Tone>> = { REASONING: 'cyan', CODE: 'amber', EMBEDDING: 'green' };

export async function TypeBadge({ type }: { type: ModelType }) {
  const labels = await getLabels();
  return <Badge tone={TYPE_TONE[type] ?? 'brand'}>{labels.modelType[type] ?? type}</Badge>;
}

export async function StatusBadge({ status }: { status: ModelStatus }) {
  if (status === 'ACTIVE') return null;
  const labels = await getLabels();
  return <Badge tone={status === 'PREVIEW' ? 'amber' : 'red'}>{labels.modelStatus[status] ?? status}</Badge>;
}

const GRADIENTS = [
  'from-indigo-500 to-violet-500',
  'from-fuchsia-500 to-pink-500',
  'from-cyan-500 to-blue-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-red-500',
  'from-sky-500 to-indigo-500',
  'from-violet-500 to-fuchsia-500',
];

/** Deterministic gradient monogram for a lab/provider (same name → same colour everywhere). Decorative only. */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const initials = name.replace(/\(.*\)/, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const sizes = { sm: 'h-6 w-6 text-[10px] rounded-md', md: 'h-9 w-9 text-xs rounded-lg', lg: 'h-14 w-14 text-lg rounded-2xl' };
  return (
    <span aria-hidden className={`inline-grid shrink-0 place-items-center bg-gradient-to-br font-semibold text-white shadow-lg shadow-black/30 ring-1 ring-white/20 ${GRADIENTS[h % GRADIENTS.length]} ${sizes[size]}`}>
      {initials}
    </span>
  );
}

export function Stat({ label, value, hint, accent }: { label: string; value: React.ReactNode; hint?: string; accent?: boolean }) {
  return (
    <div className="card group relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-500/10 blur-2xl transition group-hover:bg-brand-500/25" />
      <div className="eyebrow">{label}</div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${accent ? 'text-gradient' : 'text-white'}`} title={hint}>
        {value}
      </div>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card animate-fade-in p-12 text-center" data-testid="empty-state">
      <div aria-hidden className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.05] text-xl ring-1 ring-white/10">
        ✦
      </div>
      <p className="font-medium text-white">{title}</p>
      {children && <div className="mt-2 text-sm text-slate-400">{children}</div>}
    </div>
  );
}

/** Horizontal 0–100 bar for normalised benchmark scores; animates in, green when it's the best. */
export function ScoreBar({ value, best }: { value: number; best?: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/[0.07]" aria-hidden>
        <div
          className={`h-full origin-left animate-grow-x rounded-full ${best ? 'bg-gradient-to-r from-emerald-400 to-teal-300' : 'bg-gradient-to-r from-brand-500 via-violet-500 to-fuchsia-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular-nums text-xs text-slate-400">{value.toFixed(1)}</span>
    </div>
  );
}

export function Pagination({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (p: number) => string }) {
  if (totalPages <= 1) return null;
  const pages = [...new Set([1, page - 1, page, page + 1, totalPages])].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className="btn-secondary" rel="prev">
          ← Prev
        </Link>
      ) : (
        <span className="btn-secondary opacity-30">← Prev</span>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-slate-600">…</span>}
          <Link href={hrefFor(p)} aria-current={p === page ? 'page' : undefined} className={`${p === page ? 'btn-primary' : 'btn-secondary'} min-w-[2.5rem]`}>
            {p}
          </Link>
        </span>
      ))}
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className="btn-secondary" rel="next">
          Next →
        </Link>
      ) : (
        <span className="btn-secondary opacity-30">Next →</span>
      )}
    </nav>
  );
}

/** Section heading with an optional "view all" link. */
export function SectionHeading({ title, href, linkLabel = 'View all →' }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {href && (
        <Link href={href} className="link text-sm">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
