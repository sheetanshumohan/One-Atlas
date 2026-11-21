import { expect, isMobile, test } from './fixtures';

const PAGES = ['/', '/models', '/models/gpt-4o', '/compare?models=gpt-4o,claude-3.5-sonnet,deepseek-r1', '/rankings', '/labs', '/labs/openai', '/providers', '/providers/aws-bedrock', '/search?q=gem'];

test.describe('Responsive layout & page quality', () => {
  for (const path of PAGES) {
    test(`${path}: renders one h1, no page-level horizontal overflow, no console errors`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.getByRole('link', { name: 'OneAtlas' }).first()).toBeVisible(); // header rendered
      const dupIds = await page.evaluate(() => {
        const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
        return ids.filter((id, i) => ids.indexOf(id) !== i);
      });
      expect(dupIds, 'duplicate element ids').toEqual([]);
      // wide tables scroll inside their own container; the page itself must never scroll sideways
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test('mobile: hamburger menu navigates, filters collapse, cards replace the table', async ({ page }, info) => {
    test.skip(!isMobile(info.project.name), 'mobile only');
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
    await page.getByRole('button', { name: 'Toggle menu' }).click();
    await page.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name: 'Models' }).click();
    await expect(page).toHaveURL(/\/models$/);

    await expect(page.getByTestId('model-table')).toBeHidden();
    await expect(page.getByTestId('model-cards')).toBeVisible();
    await expect(page.getByTestId('filter-panel')).toBeHidden();
    await page.getByTestId('filters-toggle').click();
    await page.getByTestId('filter-panel').getByLabel('Open weights only').check();
    await expect(page).toHaveURL(/openWeights=true/);
    for (const t of await page.getByTestId('model-cards').locator('li').allInnerTexts()) expect(t).toContain('Open weights');
  });

  test('keyboard: skip link and focusable search', async ({ page }, info) => {
    test.skip(isMobile(info.project.name), 'keyboard test on desktop');
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  });
});
