/** Slugs are lowercase alphanumerics separated by single '-' or '.' (e.g. "gpt-4.1", "claude-3.5-sonnet"). */
export const SLUG_PATTERN = /^[a-z0-9]+(?:[-.][a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 100;

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-') // anything else becomes a dash
    .replace(/\.{2,}/g, '.')
    .replace(/-+/g, '-')
    .replace(/(^[-.]+)|([-.]+$)/g, '')
    .replace(/-\.|\.-/g, '-')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/[-.]+$/g, '');
}

export function isValidSlug(value: string): boolean {
  return value.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(value);
}
