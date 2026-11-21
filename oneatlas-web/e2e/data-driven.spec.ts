import { expect, isMobile, test } from './fixtures';

/**
 * Proves the UI holds no catalogue data of its own: every option, label and count on screen must match
 * what the API serves (GET /api/v1/meta). If someone hard-codes a list in the frontend, these fail.
 */
const API = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

type Facets = {
  totalModels: number;
  modelTypes: { value: string; label: string; count: number }[];
  statuses: { value: string; label: string; count: number }[];
  organizations: { slug: string; name: string; count: number }[];
  providers: { slug: string; name: string; count: number }[];
  capabilities: { slug: string; name: string; count: number }[];
  inputModalities: { value: string; label: string; count: number }[];
  contextWindows: { min: number; label: string; count: number }[];
  benchmarkCategories: { value: string; label: string }[];
};

test.describe('UI is driven by the API (no hard-coded catalogue data)', () => {
  let meta: { facets: Facets; sortPresets: { sort: string; order: string; label: string }[]; limits: { compare: { max: number } } };

  test.beforeAll(async ({ request }) => {
    const res = await request.get(`${API}/api/v1/meta`);
    expect(res.ok()).toBeTruthy();
    meta = await res.json();
  });

  test('every filter group lists exactly the API facets, with the API counts', async ({ page }, info) => {
    await page.goto('/models');
    if (isMobile(info.project.name)) await page.getByTestId('filters-toggle').click();
    const panel = page.getByTestId('filter-panel');
    const groupRows = async (name: string) =>
      (await panel.getByRole('group', { name }).locator('label').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());

    const expectGroup = async (name: string, items: { label: string; count: number }[]) => {
      expect(await groupRows(name)).toEqual(items.map((i) => `${i.label} ${i.count}`));
    };
    await expectGroup('Model type', meta.facets.modelTypes);
    await expectGroup('Status', meta.facets.statuses);
    await expectGroup('Input modalities (all of)', meta.facets.inputModalities);
    await expectGroup('Company / lab', meta.facets.organizations.map((o) => ({ label: o.name, count: o.count })));
    await expectGroup('Available on', meta.facets.providers.map((p) => ({ label: p.name, count: p.count })));
    await expectGroup('Capabilities (all of)', meta.facets.capabilities.map((c) => ({ label: c.name, count: c.count })));

    const ctxOptions = await panel.locator('#minContext option').allInnerTexts();
    expect(ctxOptions).toEqual([`Any (${meta.facets.totalModels})`, ...meta.facets.contextWindows.map((b) => `${b.label} (${b.count})`)]);
  });

  test('a facet count matches the number of results after applying it', async ({ page }) => {
    const busiest = [...meta.facets.organizations].sort((a, b) => b.count - a.count)[0];
    await page.goto(`/models?organization=${busiest.slug}`);
    await expect(page.getByTestId('result-count')).toHaveText(`${busiest.count} ${busiest.count === 1 ? 'model' : 'models'}`);
  });

  test('sort menu options are the API sort presets', async ({ page }) => {
    await page.goto('/models');
    const options = await page.getByTestId('sort-select').locator('option').allInnerTexts();
    expect(options).toEqual(meta.sortPresets.map((p) => p.label));
  });

  test('rankings scope and type options come from the API', async ({ page }) => {
    await page.goto('/rankings');
    const categoryOptions = await page.getByTestId('scope-select').locator('optgroup[label="By category"] option').allInnerTexts();
    expect(categoryOptions).toEqual(meta.facets.benchmarkCategories.map((c) => c.label));
    const typeOptions = await page.getByTestId('rankings-controls').locator('select').nth(1).locator('option').allInnerTexts();
    expect(typeOptions).toEqual(['All types', ...meta.facets.modelTypes.map((t) => t.label)]);
  });

  test('home page quick links are built from live data and every one leads to results', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('section').first();
    const hrefs = await hero.locator('a[href^="/models?"], a[href^="/rankings?"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
    expect(hrefs.length).toBeGreaterThanOrEqual(3);
    for (const href of hrefs) {
      await page.goto(href);
      await expect(page.getByTestId('empty-state')).toHaveCount(0); // never a dead link
    }
  });

  test('compare limit comes from the API, and the example uses the live leaderboard', async ({ page }) => {
    await page.goto('/compare');
    await expect(page.getByTestId('empty-state')).toContainText(/Pick at least \d+ models/);
    await page.getByRole('link', { name: /Try the current top \d+/ }).click();
    await expect(page).toHaveURL(/\/compare\?models=/);
    await expect(page.getByTestId('compare-table')).toBeVisible();
    await page.goto('/models');
    await page.getByTestId(/^compare-/).filter({ visible: true }).first().click();
    await expect(page.getByTestId('compare-tray')).toContainText(`(1/${meta.limits.compare.max})`);
  });

  test('model page shows the price history recorded by the API', async ({ page, request }) => {
    const api = await (await request.get(`${API}/api/v1/models/gpt-4o/price-history?pageSize=20`)).json();
    await page.goto('/models/gpt-4o');
    const rows = page.getByTestId('price-history').locator('tbody tr');
    await expect(rows).toHaveCount(api.data.length);
    await expect(page.getByTestId('price-history')).toContainText('Price changed'); // GPT-4o's real price cut is in the seed history
  });
});
