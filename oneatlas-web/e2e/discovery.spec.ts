import { expect, isMobile, priceValue, test } from './fixtures';

test.describe('Model discovery & search', () => {
  test('home page shows catalogue stats, sections and navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Find the right AI model');
    await expect(page.getByLabel('Catalogue stats')).toContainText('Models');
    await expect(page.getByRole('heading', { name: 'Latest releases' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Top overall (benchmarks)' })).toBeVisible();
    await page.getByRole('link', { name: 'Browse all models' }).click();
    await expect(page).toHaveURL(/\/models$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Models' })).toBeVisible();
  });

  test('global search finds models, labs and providers', async ({ page }, info) => {
    await page.goto('/');
    if (isMobile(info.project.name)) await page.getByRole('button', { name: 'Toggle menu' }).click();
    const box = page.locator('header').getByRole('searchbox');
    await box.fill('llama');
    await box.press('Enter');
    await expect(page).toHaveURL(/\/search\?q=llama/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Results for “llama”');
    await expect(page.getByTestId('search-models')).toContainText('Llama 3.3 70B Instruct');

    await page.goto('/search?q=groq');
    await expect(page.getByRole('link', { name: 'Groq', exact: true })).toBeVisible();
    await page.goto('/search?q=zzzzqqq');
    await expect(page.getByTestId('empty-state')).toContainText('Nothing found');
  });

  test('listing shows specs & pricing and paginates', async ({ page }, info) => {
    await page.goto('/models');
    await expect(page.getByTestId('result-count')).toHaveText(/\d+ models/);
    const total = Number((await page.getByTestId('result-count').innerText()).split(' ')[0]);
    const items = isMobile(info.project.name) ? page.getByTestId('model-cards').locator('li') : page.getByTestId('model-row');
    await expect(items).toHaveCount(Math.min(20, total));
    if (total > 20) {
      await page.getByRole('navigation', { name: 'Pagination' }).getByRole('link', { name: 'Next →' }).click();
      await expect(page).toHaveURL(/page=2/);
      await expect(items).toHaveCount(Math.min(20, total - 20));
    }
  });

  test('filter by company updates the URL and only shows that company', async ({ page }, info) => {
    test.skip(isMobile(info.project.name), 'covered by the mobile layout test');
    await page.goto('/models');
    const panel = page.getByTestId('filter-panel');
    await panel.getByRole('group', { name: 'Company / lab' }).getByLabel(/^OpenAI/).check();
    await expect(page).toHaveURL(/organization=openai/);
    const rows = page.getByTestId('model-row');
    await expect(rows.first()).toBeVisible();
    for (const text of await rows.allInnerTexts()) expect(text).toContain('OpenAI');

    await panel.getByRole('group', { name: 'Model type' }).getByLabel('Reasoning').check();
    await expect(page).toHaveURL(/type=REASONING/);
    await expect(page.getByTestId('result-count')).toHaveText('2 models'); // o1, o3-mini

    await panel.getByRole('button', { name: /Clear all filters/ }).click();
    await expect(page).toHaveURL(/\/models$/);
  });

  test('capability + provider + open weights + context filters combine', async ({ page }) => {
    await page.goto('/models?capability=tool-calling&provider=groq&openWeights=true');
    await expect(page.getByTestId('result-count')).toHaveText(/^[1-9]\d* models?$/);
    await page.goto('/models?minContext=1000000');
    const text = await page.locator('main').innerText();
    expect(text).toContain('Gemini');
    expect(text).not.toContain('Claude 3.5 Sonnet');
  });

  test('sorting by input price orders cheapest first', async ({ page }, info) => {
    test.skip(isMobile(info.project.name), 'table columns are desktop only');
    await page.goto('/models');
    await page.getByTestId('sort-select').selectOption('inputPrice:asc');
    await expect(page).toHaveURL(/sort=inputPrice&order=asc/);
    const prices = (await page.locator('[data-testid=model-row] td:nth-child(3)').allInnerTexts()).map(priceValue);
    expect(prices.length).toBeGreaterThan(5);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  test('free-text search inside the explorer', async ({ page }, info) => {
    await page.goto('/models');
    if (isMobile(info.project.name)) await page.getByTestId('filters-toggle').click();
    await page.getByLabel('Search', { exact: true }).fill('claude');
    await page.getByRole('button', { name: 'Go' }).click();
    await expect(page).toHaveURL(/q=claude/);
    await expect(page.getByTestId('result-count')).toHaveText('4 models');
  });

  test.describe('without JavaScript (also covers clicks before hydration)', () => {
    // reducedMotion: with page JavaScript disabled, Playwright cannot confirm that an element in the middle
    // of a CSS entrance animation has settled (its stability check relies on animation-frame callbacks), so
    // a click during the animation waits forever. Real users are unaffected. Reduced motion (which the site
    // honours) removes the animations, and also exercises that accessibility path.
    test.use({ javaScriptEnabled: false, reducedMotion: 'reduce' });

    test('pages are fully server-rendered with data', async ({ page }) => {
      await page.goto('/models/gpt-4o');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('GPT-4o');
      await expect(page.getByTestId('providers-table')).toContainText('OpenAI Platform');
    });

    test('global search and explorer search work as plain forms, keeping active filters', async ({ page }, info) => {
      test.skip(isMobile(info.project.name), 'header search box is in the JS-driven mobile menu');
      await page.goto('/');
      await page.locator('header').getByRole('searchbox').fill('gemini');
      await page.locator('header').getByRole('searchbox').press('Enter');
      await expect(page).toHaveURL(/\/search\?q=gemini/);
      await expect(page.getByTestId('search-models')).toContainText('Gemini 2.0 Flash');

      await page.goto('/models?openWeights=true');
      await page.getByLabel('Search', { exact: true }).fill('llama');
      await page.getByRole('button', { name: 'Go' }).click();
      await expect(page).toHaveURL(/openWeights=true/);
      await expect(page).toHaveURL(/q=llama/);
      await expect(page.getByTestId('result-count')).toHaveText(/^[1-9]\d* models?$/);
    });
  });

  test('impossible filters show an empty state; invalid URLs show a friendly message', async ({ page }) => {
    await page.goto('/models?maxInputPrice=0.0001&minContext=1000000');
    await expect(page.getByTestId('empty-state')).toContainText('No models match');
    await page.goto('/models?minContext=abc');
    await expect(page.getByTestId('empty-state')).toContainText('Some filters are invalid');
  });
});
