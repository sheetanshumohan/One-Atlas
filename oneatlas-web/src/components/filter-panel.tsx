'use client';

import { useEffect, useState } from 'react';
import { MODEL_TYPE_LABEL } from '@/lib/format';
import { toggle } from '@/lib/query';
import type { ModelType } from '@/lib/types';
import { useUrlState } from './use-url-state';

export interface FilterOptions {
  organizations: { slug: string; name: string; count: number }[];
  providers: { slug: string; name: string; count: number }[];
  capabilities: { slug: string; name: string; count: number }[];
}

const TYPES = Object.keys(MODEL_TYPE_LABEL) as ModelType[];
const MODALITIES = ['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'FILE'];
const CONTEXT_OPTIONS = [
  ['', 'Any'], ['32000', '≥ 32K'], ['128000', '≥ 128K'], ['200000', '≥ 200K'], ['1000000', '≥ 1M'],
] as const;

/** Every change updates the URL (page reset to 1); the server component re-renders with fresh API data. */
export function FilterPanel({ options }: { options: FilterOptions }) {
  const url = useUrlState();
  const { list, pending } = url;
  const apply = (updates: Record<string, string | string[] | undefined>) => url.push(updates);

  // Text inputs are edited locally and committed on submit; re-sync when the URL changes (back/forward, clear).
  const urlQ = url.get('q') ?? '';
  const urlMaxPrice = url.get('maxInputPrice') ?? '';
  const [q, setQ] = useState(urlQ);
  const [maxPrice, setMaxPrice] = useState(urlMaxPrice);
  useEffect(() => setQ(urlQ), [urlQ]);
  useEffect(() => setMaxPrice(urlMaxPrice), [urlMaxPrice]);

  const activeCount = ['q', 'organization', 'provider', 'capability', 'type', 'inputModality', 'openWeights', 'minContext', 'maxInputPrice', 'status'].filter((k) => url.get(k)).length;

  // Progressive enhancement: the text forms are real GET forms (action + names + hidden current filters),
  // so submitting before hydration — or without JavaScript — still applies the query instead of losing it.
  const keepOtherParams = (except: string) =>
    url.entries
      .filter(([k]) => k !== except && k !== 'page')
      .map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />);

  const checkboxGroup = (key: string, title: string, items: { value: string; label: string; count?: number }[]) => (
    <fieldset className="border-t border-white/[0.06] py-4">
      <legend className="eyebrow mb-2.5">{title}</legend>
      <div className="max-h-52 space-y-0.5 overflow-y-auto pr-1">
        {items.map((it) => (
          <label key={it.value} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 text-sm text-slate-300 transition hover:bg-white/[0.04] hover:text-white">
            <input type="checkbox" className="checkbox" checked={list(key).includes(it.value)} onChange={() => apply({ [key]: toggle(list(key), it.value) })} />
            <span className="flex-1 truncate">{it.label}</span>
            {it.count !== undefined && <span className="rounded-md bg-white/[0.05] px-1.5 text-[11px] tabular-nums text-slate-500">{it.count}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <aside aria-label="Filters" className={`transition-opacity ${pending ? 'opacity-50' : ''}`} data-testid="filter-panel">
      <form
        action={url.pathname}
        method="get"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q: q.trim() || [] });
        }}
        className="pb-4"
      >
        {keepOtherParams('q')}
        <label htmlFor="model-q" className="eyebrow mb-2 block">
          Search
        </label>
        <div className="flex gap-2">
          <input id="model-q" name="q" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, lab, description…" maxLength={100} />
          <button className="btn-primary" type="submit">
            Go
          </button>
        </div>
      </form>

      {checkboxGroup('type', 'Model type', TYPES.map((t) => ({ value: t, label: MODEL_TYPE_LABEL[t] })).slice(0, 7))}
      {checkboxGroup('organization', 'Company / lab', options.organizations.map((o) => ({ value: o.slug, label: o.name, count: o.count })))}
      {checkboxGroup('provider', 'Available on', options.providers.map((o) => ({ value: o.slug, label: o.name, count: o.count })))}
      {checkboxGroup('capability', 'Capabilities (all of)', options.capabilities.map((o) => ({ value: o.slug, label: o.name, count: o.count })))}
      {checkboxGroup('inputModality', 'Input modalities (all of)', MODALITIES.map((m) => ({ value: m, label: m[0] + m.slice(1).toLowerCase() })))}

      <div className="space-y-4 border-t border-white/[0.06] py-4">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-300">
          <input type="checkbox" className="checkbox" checked={url.get('openWeights') === 'true'} onChange={(e) => apply({ openWeights: e.target.checked ? 'true' : [] })} />
          Open weights only
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-300">
          <input type="checkbox" className="checkbox" checked={url.get('status') === 'PREVIEW,ACTIVE'} onChange={(e) => apply({ status: e.target.checked ? 'PREVIEW,ACTIVE' : [] })} />
          Hide deprecated
        </label>
        <div>
          <label htmlFor="minContext" className="eyebrow mb-2 block">
            Context window
          </label>
          <select id="minContext" className="input" value={url.get('minContext') ?? ''} onChange={(e) => apply({ minContext: e.target.value || [] })}>
            {CONTEXT_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <form
          action={url.pathname}
          method="get"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(maxPrice);
            apply({ maxInputPrice: maxPrice.trim() !== '' && Number.isFinite(n) && n >= 0 ? String(n) : [] });
          }}
        >
          {keepOtherParams('maxInputPrice')}
          <label htmlFor="maxInputPrice" className="eyebrow mb-2 block">
            Max input price ($/1M)
          </label>
          <div className="flex gap-2">
            <input id="maxInputPrice" name="maxInputPrice" className="input" type="number" min="0" step="0.01" inputMode="decimal" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="e.g. 1" />
            <button className="btn-secondary" type="submit">
              Apply
            </button>
          </div>
        </form>
      </div>

      {activeCount > 0 && (
        <button type="button" className="btn-secondary mt-2 w-full" onClick={url.clear}>
          Clear all filters ({activeCount})
        </button>
      )}
    </aside>
  );
}

