'use client';

import { useUrlState } from './use-url-state';

export const SORT_OPTIONS = [
  ['releaseDate:desc', 'Newest'],
  ['releaseDate:asc', 'Oldest'],
  ['inputPrice:asc', 'Input price: low → high'],
  ['inputPrice:desc', 'Input price: high → low'],
  ['outputPrice:asc', 'Output price: low → high'],
  ['contextWindow:desc', 'Context window: largest'],
  ['providerCount:desc', 'Most providers'],
  ['name:asc', 'Name A → Z'],
] as const;

export function SortSelect() {
  const url = useUrlState();
  const sort = url.get('sort') ?? 'releaseDate';
  const value = `${sort}:${url.get('order') ?? (sort === 'inputPrice' || sort === 'outputPrice' || sort === 'name' ? 'asc' : 'desc')}`;

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-slate-500">Sort</span>
      <select
        className="input !w-auto"
        value={value}
        data-testid="sort-select"
        onChange={(e) => {
          const [sort, order] = e.target.value.split(':');
          url.push({ sort, order });
        }}
      >
        {SORT_OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
