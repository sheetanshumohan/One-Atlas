import { Transform } from 'class-transformer';

/** Accepts `?a=x,y` and `?a=x&a=y` (and mixes); trims, drops empties, de-duplicates. */
export function toStringArray(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  const parts = (Array.isArray(value) ? value : [value]).flatMap((v) =>
    typeof v === 'string' ? v.split(',') : [v],
  );
  const cleaned = parts.map((p) => (typeof p === 'string' ? p.trim() : p)).filter((p) => p !== '');
  return [...new Set(cleaned)];
}

/** Strict boolean parsing: only true/false/1/0 are accepted; anything else is left for @IsBoolean to reject. */
export function toBoolean(value: unknown): unknown {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
  }
  return value;
}

/** Strict numeric parsing for query strings: '' and non-numeric strings are left as-is so validators reject them. */
export function toNumber(value: unknown): unknown {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
  return value;
}

export function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export function upper(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((v) => (typeof v === 'string' ? v.toUpperCase() : v));
  return typeof value === 'string' ? value.toUpperCase() : value;
}

export const ToStringArray = () => Transform(({ value }) => toStringArray(value));
export const ToUpperStringArray = () => Transform(({ value }) => upper(toStringArray(value)));
export const ToBoolean = () => Transform(({ value }) => toBoolean(value));
export const ToNumber = () => Transform(({ value }) => toNumber(value));
export const Trim = () => Transform(({ value }) => trimString(value));
export const ToLowerTrim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));
