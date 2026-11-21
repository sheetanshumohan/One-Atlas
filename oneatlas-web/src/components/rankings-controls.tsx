'use client';

import { useUrlState } from './use-url-state';

interface Props {
  categories: { value: string; label: string }[];
  benchmarks: { slug: string; name: string; category: string }[];
  types: { value: string; label: string }[];
}

/** Scope selector (overall / category / single benchmark) plus model filters, all stored in the URL. */
export function RankingsControls({ categories, benchmarks, types }: Props) {
  const url = useUrlState();
  const sp = { get: url.get };
  const go = (u: Record<string, string | string[] | undefined>) => url.push(u);
  const scope = sp.get('benchmark') ? `b:${sp.get('benchmark')}` : sp.get('category') ? `c:${sp.get('category')}` : '';

  return (
    <div className={`card flex flex-wrap items-end gap-3 p-4 ${url.pending ? 'opacity-70' : ''}`} data-testid="rankings-controls">
      <label className="text-sm">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Leaderboard</span>
        <select
          className="input !w-72"
          value={scope}
          data-testid="scope-select"
          onChange={(e) => {
            const v = e.target.value;
            go({ benchmark: v.startsWith('b:') ? v.slice(2) : [], category: v.startsWith('c:') ? v.slice(2) : [] });
          }}
        >
          <option value="">Overall (all benchmarks)</option>
          <optgroup label="By category">
            {categories.map((c) => (
              <option key={c.value} value={`c:${c.value}`}>
                {c.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Single benchmark">
            {benchmarks.map((b) => (
              <option key={b.slug} value={`b:${b.slug}`}>
                {b.name}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Model type</span>
        <select className="input !w-44" value={sp.get('type') ?? ''} onChange={(e) => go({ type: e.target.value || [] })}>
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      {!sp.get('benchmark') && (
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Min. benchmarks</span>
          <select className="input !w-32" value={sp.get('minBenchmarks') ?? '1'} onChange={(e) => go({ minBenchmarks: e.target.value === '1' ? [] : e.target.value })}>
            {[1, 2, 3, 5].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={sp.get('openWeights') === 'true'} onChange={(e) => go({ openWeights: e.target.checked ? 'true' : [] })} />
        Open weights only
      </label>
    </div>
  );
}
