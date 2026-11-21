import { expect, test as base } from '@playwright/test';

/** Fails any test whose page logs a console error or throws an uncaught exception. */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error' && !/404 \(Not Found\)/.test(m.text())) errors.push(m.text());
      });
      page.on('pageerror', (e) => errors.push(String(e)));
      await use(errors);
      expect(errors, 'browser console errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export const isMobile = (projectName: string) => projectName === 'mobile';

/** Parses "$2.50" / "Free" / "—" back into numbers for ordering assertions. */
export function priceValue(text: string): number {
  const t = text.trim();
  if (t === 'Free') return 0;
  if (t === '—') return Number.POSITIVE_INFINITY;
  return Number(t.replace('$', ''));
}
