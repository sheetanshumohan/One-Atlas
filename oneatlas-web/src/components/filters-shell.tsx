'use client';

import { useState } from 'react';

/** One filter panel instance: collapsible on mobile, always visible (sticky) on desktop. */
export function FiltersShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card animate-fade-up p-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
      <button type="button" className="flex w-full items-center justify-between font-medium text-white lg:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid="filters-toggle">
        Filters <span aria-hidden className={`transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      <div className={`${open ? 'mt-4 block' : 'hidden'} lg:mt-0 lg:block`}>{children}</div>
    </div>
  );
}
