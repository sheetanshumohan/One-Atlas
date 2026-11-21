'use client';

import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-md animate-fade-up py-24 text-center" role="alert">
      <div aria-hidden className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/10 text-2xl text-rose-300 ring-1 ring-rose-400/25">
        !
      </div>
      <h1 className="mt-5 text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-slate-400">We couldn&apos;t load this page. The API may be waking up or temporarily unavailable.</p>
      <button type="button" onClick={reset} className="btn-primary mt-8">
        Try again
      </button>
    </div>
  );
}
