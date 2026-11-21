'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useId, useState } from 'react';

/** Global search: submits to /search?q=… (works with Enter; "/" focuses it from anywhere is a nice-to-have). */
export function SearchBox({ onSubmitted, autoFocus }: { onSubmitted?: () => void; autoFocus?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const id = useId(); // the box appears twice on the home page (header + hero): ids must be unique

  return (
    // Real GET form: submitting before hydration (or without JS) still navigates to /search?q=…
    <form
      role="search"
      action="/search"
      method="get"
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
      <input
        id={id}
        name="q"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search models, labs, providers…"
        maxLength={100}
        autoFocus={autoFocus}
        className="input"
      />
    </form>
  );
}
