'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useOptimistic, useTransition } from 'react';
import { withParams, type SearchParams } from '@/lib/query';

/**
 * URL-backed UI state with optimistic updates: controls reflect a change immediately while the server
 * component re-renders with fresh data, then settle on the real URL. Any change resets pagination.
 */
export function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [optimisticQs, setOptimisticQs] = useOptimistic(searchParams.toString());

  const params = new URLSearchParams(optimisticQs);
  const current: SearchParams = {};
  params.forEach((v, k) => (current[k] = v));

  const push = (updates: Record<string, string | string[] | undefined>, { resetPage = true } = {}) => {
    const qs = withParams(current, resetPage ? { ...updates, page: [] } : updates);
    startTransition(() => {
      setOptimisticQs(qs.replace(/^\?/, ''));
      router.push(`${pathname}${qs}`, { scroll: false });
    });
  };

  const clear = () =>
    startTransition(() => {
      setOptimisticQs('');
      router.push(pathname, { scroll: false });
    });

  return {
    pending,
    pathname,
    /** Current params, e.g. to render hidden inputs so forms also work before JavaScript loads. */
    entries: [...params.entries()],
    get: (key: string) => params.get(key),
    list: (key: string) => (params.get(key) ?? '').split(',').filter(Boolean),
    push,
    clear,
  };
}
