'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MAX_COMPARE } from '@/lib/query';

/** Add/remove models on the compare page; the selection is the URL (?models=a,b,c), so comparisons are shareable. */
export function ComparePicker({ selected, options }: { selected: { slug: string; name: string }[]; options: { slug: string; name: string; org: string }[] }) {
  const router = useRouter();
  const [choice, setChoice] = useState('');
  const go = (slugs: string[]) => router.push(slugs.length ? `/compare?models=${slugs.join(',')}` : '/compare');
  const slugs = selected.map((s) => s.slug);
  const available = options.filter((o) => !slugs.includes(o.slug));

  return (
    <div className="card flex animate-fade-up flex-wrap items-center gap-2 p-4" data-testid="compare-picker">
      {selected.map((s) => (
        <span key={s.slug} className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/15 px-3 py-1.5 text-sm text-brand-300 ring-1 ring-inset ring-brand-400/25">
          {s.name}
          <button type="button" aria-label={`Remove ${s.name}`} className="font-bold text-brand-300/70 transition hover:text-rose-300" onClick={() => go(slugs.filter((x) => x !== s.slug))}>
            ×
          </button>
        </span>
      ))}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (choice) go([...slugs, choice]);
          setChoice('');
        }}
      >
        <label htmlFor="add-model" className="sr-only">
          Add a model
        </label>
        <select id="add-model" className="input !w-64" value={choice} onChange={(e) => setChoice(e.target.value)} disabled={slugs.length >= MAX_COMPARE}>
          <option value="">{slugs.length >= MAX_COMPARE ? 'Maximum 6 models' : 'Add a model…'}</option>
          {available.map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.name} — {o.org}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary" disabled={!choice}>
          Add
        </button>
      </form>
    </div>
  );
}
