'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';

/**
 * Global search → /search?q=…  A real GET form, so it also works before hydration / without JS.
 * Press "/" anywhere to focus the (first visible) search box.
 */
export function SearchBox({ onSubmitted, autoFocus, compact, large }: { onSubmitted?: () => void; autoFocus?: boolean; compact?: boolean; large?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const id = useId(); // the box appears twice on the home page (header + hero): ids must be unique
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!compact) return; // one global shortcut handler (the header box)
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key !== '/' || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      const visible = [...document.querySelectorAll<HTMLInputElement>('input[type=search]')].find((el) => el.offsetParent !== null);
      if (visible) {
        e.preventDefault();
        visible.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [compact]);

  return (
    <form
      role="search"
      action="/search"
      method="get"
      className="group relative"
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        if (!query) return;
        router.push(`/search?q=${encodeURIComponent(query)}`);
        onSubmitted?.();
      }}
    >
      <label htmlFor={id} className="sr-only">
        Search models, labs, providers
      </label>
      <svg aria-hidden viewBox="0 0 20 20" className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition group-focus-within:text-brand-300 ${large ? 'h-5 w-5' : 'h-4 w-4'}`} fill="currentColor">
        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 3.4 9.83l3.13 3.14a.75.75 0 1 0 1.06-1.06l-3.13-3.14A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" clipRule="evenodd" />
      </svg>
      <input
        ref={ref}
        id={id}
        name="q"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search models, labs, providers…"
        maxLength={100}
        autoFocus={autoFocus}
        className={`input !pl-10 ${large ? '!rounded-2xl !py-4 !text-base' : ''} ${compact ? 'pr-10' : ''}`}
      />
      {compact && (
        <kbd aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
          /
        </kbd>
      )}
    </form>
  );
}
