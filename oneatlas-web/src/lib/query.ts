/**
 * URL state helpers. Every filter, sort and page lives in the URL, so views are shareable, bookmarkable,
 * work with the back button and render on the server.
 */
export type SearchParams = Record<string, string | string[] | undefined>;

/** Reads a param that may be comma-separated or repeated into a clean, de-duplicated list. */
export function readList(sp: SearchParams, key: string): string[] {
  const raw = sp[key];
  const values = (Array.isArray(raw) ? raw : raw ? [raw] : []).flatMap((v) => v.split(','));
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

export function readString(sp: SearchParams, key: string): string | undefined {
  const raw = sp[key];
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v && v.trim() ? v.trim() : undefined;
}

export function readPage(sp: SearchParams): number {
  const n = Number(readString(sp, 'page'));
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** Returns a new query string with `updates` applied (undefined / [] / '' removes the key). */
export function withParams(current: SearchParams, updates: Record<string, string | string[] | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    if (k in updates) continue;
    const list = Array.isArray(v) ? v : v ? [v] : [];
    if (list.length) qs.set(k, list.join(','));
  }
  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined) continue;
    const list = Array.isArray(v) ? v : [v];
    const clean = list.filter((x) => x !== '');
    if (clean.length) qs.set(k, clean.join(','));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

/** Adds the value if absent, removes it if present. */
export function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export const MAX_COMPARE = 6;
