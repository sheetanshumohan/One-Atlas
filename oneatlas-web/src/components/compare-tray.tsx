'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCompare } from './compare-context';

/** Floating tray showing the current comparison selection on every page. */
export function CompareTray() {
  const { items, remove, clear } = useCompare();
  const pathname = usePathname();
  if (items.length === 0 || pathname === '/compare') return null;
  const href = `/compare?models=${items.map((i) => i.slug).join(',')}`;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95" data-testid="compare-tray">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3">
        <span className="text-sm font-medium">Compare ({items.length}/6):</span>
        {items.map((i) => (
          <span key={i.slug} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs text-brand-700 dark:bg-slate-800 dark:text-brand-100">
            {i.name}
            <button type="button" onClick={() => remove(i.slug)} aria-label={`Remove ${i.name}`} className="ml-0.5 font-bold hover:text-red-600">
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
            <span className="btn-primary pointer-events-none !py-1.5 text-xs opacity-50">Pick at least 2</span>
          )}
        </div>
      </div>
    </div>
  );
}
