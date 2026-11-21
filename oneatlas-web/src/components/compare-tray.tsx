'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCompare } from './compare-context';

/** Floating glass tray showing the current comparison selection on every page. */
export function CompareTray() {
  const { items, remove, clear } = useCompare();
  const pathname = usePathname();
  if (items.length === 0 || pathname === '/compare') return null;
  const href = `/compare?models=${items.map((i) => i.slug).join(',')}`;
  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4" data-testid="compare-tray">
      <div className="flex w-full max-w-4xl animate-fade-up flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-ink-800/85 p-3 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_0_1px_rgba(139,92,246,0.15)] backdrop-blur-xl">
        <span className="px-1 text-sm font-medium text-white">Compare ({items.length}/6):</span>
        {items.map((i) => (
          <span key={i.slug} className="inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2.5 py-1 text-xs text-brand-300 ring-1 ring-inset ring-brand-400/25">
            {i.name}
            <button type="button" onClick={() => remove(i.slug)} aria-label={`Remove ${i.name}`} className="ml-0.5 font-bold text-brand-300/70 transition hover:text-rose-300">
              ×
            </button>
          </span>
        ))}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={clear} className="btn-secondary !py-1.5 text-xs">
            Clear
          </button>
          {items.length >= 2 ? (
            <Link href={href} className="btn-primary !py-1.5 text-xs">
              Compare now →
            </Link>
          ) : (
            <span className="btn-primary pointer-events-none !py-1.5 text-xs opacity-40">Pick at least 2</span>
          )}
        </div>
      </div>
    </div>
  );
}
