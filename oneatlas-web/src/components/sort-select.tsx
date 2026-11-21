'use client';

import type { Meta } from '@/lib/types';
import { useUrlState } from './use-url-state';

/** Sort menu built from GET /meta (sortPresets + each field's default direction), so it can't drift from the API. */
export function SortSelect({ presets, sorts }: { presets: Meta['sortPresets']; sorts: Meta['sorts'] }) {
  const url = useUrlState();
  const sort = url.get('sort') ?? presets[0]?.sort ?? 'releaseDate';
  const order = url.get('order') ?? sorts.find((s) => s.value === sort)?.defaultOrder ?? 'desc';
  const value = `${sort}:${order}`;
  const known = presets.some((p) => `${p.sort}:${p.order}` === value);

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-slate-500">Sort</span>
      <select
        className="input !w-auto"
        value={value}
        data-testid="sort-select"
        onChange={(e) => {
          const [s, o] = e.target.value.split(':');
          url.push({ sort: s, order: o });
        }}
      >
        {/* A valid sort from a shared URL that isn't a preset still shows correctly. */}
        {!known && <option value={value}>{`${sorts.find((s) => s.value === sort)?.label ?? sort} (${order})`}</option>}
        {presets.map((p) => (
          <option key={`${p.sort}:${p.order}`} value={`${p.sort}:${p.order}`}>
            {p.label}
          </option>
        ))}
      </select>
    </label>
  );
}
