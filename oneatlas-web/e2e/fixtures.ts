import { expect, test as base } from '@playwright/test';

/** Fails any test whose page logs a console error or throws an uncaught exception. */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (m) => {
        if (m.type() !== 'error') return;
        // A page that is *meant* to 404 (the not-found tests) makes the browser log its own document's 404.
        // Allow only that: a 404 for any other resource (a missing JS chunk, image, …) still fails the test.
        // Match the status code, not the reason phrase — HTTP/2 hosts such as Vercel send none ("404 ()").
        const isOwnDocument404 = /status of 404\b/.test(m.text()) && m.location().url === page.url();
        if (!isOwnDocument404) errors.push(m.text());
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
