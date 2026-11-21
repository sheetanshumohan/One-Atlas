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
    <div className={`card flex animate-fade-up flex-wrap items-end gap-4 p-5 transition-opacity ${url.pending ? 'opacity-70' : ''}`} data-testid="rankings-controls">
      <label className="w-full text-sm sm:w-auto">
        <span className="eyebrow mb-2 block">Leaderboard</span>
        <select
          className="input sm:!w-72"
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
      <label className="w-full text-sm sm:w-auto">
        <span className="eyebrow mb-2 block">Model type</span>
        <select className="input sm:!w-44" value={sp.get('type') ?? ''} onChange={(e) => go({ type: e.target.value || [] })}>
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      {!sp.get('benchmark') && (
        <label className="w-full text-sm sm:w-auto">
          <span className="eyebrow mb-2 block">Min. benchmarks</span>
          <select className="input sm:!w-32" value={sp.get('minBenchmarks') ?? '1'} onChange={(e) => go({ minBenchmarks: e.target.value === '1' ? [] : e.target.value })}>
            {[1, 2, 3, 5].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex cursor-pointer items-center gap-2.5 pb-3 text-sm text-slate-300">
        <input type="checkbox" className="checkbox" checked={sp.get('openWeights') === 'true'} onChange={(e) => go({ openWeights: e.target.checked ? 'true' : [] })} />
        Open weights only
      </label>
    </div>
  );
}
