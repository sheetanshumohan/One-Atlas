'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MAX_COMPARE } from '@/lib/query';

interface CompareItem {
  slug: string;
  name: string;
}
interface CompareState {
  items: CompareItem[];
  has: (slug: string) => boolean;
  toggle: (item: CompareItem) => void;
  remove: (slug: string) => void;
  clear: () => void;
  full: boolean;
}

const CompareContext = createContext<CompareState | null>(null);
const STORAGE_KEY = 'oneatlas.compare';

/** Compare selection persists in localStorage so it survives navigation and reloads. */
export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CompareItem[];
        if (Array.isArray(parsed)) setItems(parsed.filter((x) => x && typeof x.slug === 'string').slice(0, MAX_COMPARE));
      }
    } catch {
      /* storage unavailable (private mode) — selection simply isn't persisted */
    }
  }, []);

  const persist = useCallback((next: CompareItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<CompareState>(
    () => ({
      items,
      has: (slug) => items.some((i) => i.slug === slug),
      toggle: (item) =>
        persist(items.some((i) => i.slug === item.slug) ? items.filter((i) => i.slug !== item.slug) : items.length >= MAX_COMPARE ? items : [...items, item]),
      remove: (slug) => persist(items.filter((i) => i.slug !== slug)),
      clear: () => persist([]),
      full: items.length >= MAX_COMPARE,
    }),
    [items, persist],
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare(): CompareState {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used inside CompareProvider');
  return ctx;
}
