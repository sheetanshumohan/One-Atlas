'use client';

import { useState } from 'react';

/** One filter panel instance: collapsible on mobile, always visible (sticky) on desktop. */
export function FiltersShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card p-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
      <button type="button" className="flex w-full items-center justify-between font-medium lg:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid="filters-toggle">
        Filters <span aria-hidden>{open ? '▴' : '▾'}</span>
      </button>
      <div className={`${open ? 'mt-3 block' : 'hidden'} lg:mt-0 lg:block`}>{children}</div>
    </div>
  );
}
