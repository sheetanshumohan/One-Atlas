import { expect, isMobile, test } from './fixtures';

test.describe('Model detail, comparison, rankings, directories', () => {
  test('model detail page shows specs, providers (cheapest first), capabilities and benchmarks', async ({ page }) => {
    await page.goto('/models/llama-3.3-70b-instruct');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Llama 3.3 70B Instruct');
    await expect(page.getByLabel('Key facts')).toContainText('128K');
    await expect(page.getByText('Specifications')).toBeVisible();
    const providerRows = page.getByTestId('providers-table').locator('tbody tr');
    expect(await providerRows.count()).toBeGreaterThanOrEqual(5);
    const inputPrices = (await page.locator('[data-testid=providers-table] tbody td:nth-child(2)').allInnerTexts()).map((t) => Number(t.replace('$', '')));
    expect([...inputPrices].sort((a, b) => a - b)).toEqual(inputPrices);
    await expect(page.getByTestId('benchmarks-table')).toContainText('MMLU-Pro');
    // capability chip deep-links into the filtered explorer
    await page.getByRole('link', { name: 'Tool calling' }).click();
    await expect(page).toHaveURL(/\/models\?capability=tool-calling/);
  });

  test('unavailable offerings and lower-is-better benchmarks are labelled', async ({ page }) => {
    await page.goto('/models/claude-3-opus');
    await expect(page.getByTestId('providers-table')).toContainText('Unavailable');
    await expect(page.getByTestId('benchmarks-table')).toContainText('(lower is better)');
  });

  test('unknown model renders the 404 page with a 404 status', async ({ page }) => {
    const res = await page.goto('/models/not-a-real-model');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });

  test('compare flow: pick models from the list, open comparison, edit selection, persists across reloads', async ({ page }) => {
    await page.goto('/models?q=gpt-4o');
    await page.getByTestId('compare-gpt-4o').filter({ visible: true }).click();
    await page.goto('/models?q=sonnet');
    await page.getByTestId('compare-claude-3.5-sonnet').filter({ visible: true }).click();
    const tray = page.getByTestId('compare-tray');
    await expect(tray).toContainText('Compare (2/6)');
    await page.reload();
    await expect(tray).toContainText('Compare (2/6)'); // persisted in localStorage
    await tray.getByRole('link', { name: 'Compare now →' }).click();
    await expect(page).toHaveURL(/\/compare\?models=gpt-4o,claude-3.5-sonnet/);

    const table = page.getByTestId('compare-table');
    await expect(table).toContainText('GPT-4o');
    await expect(table).toContainText('Claude 3.5 Sonnet');
    await expect(table.locator('[data-best]').first()).toBeVisible(); // ★ winners highlighted
    await expect(table).toContainText('Context window');
    await expect(table).toContainText('MMLU-Pro');

    // add a third model through the picker, then remove one
    await page.getByLabel('Add a model').selectOption('gemini-2.0-flash');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page).toHaveURL(/models=gpt-4o,claude-3.5-sonnet,gemini-2.0-flash/);
    await expect(table).toContainText('Gemini 2.0 Flash');
    await page.getByTestId('compare-picker').getByRole('button', { name: 'Remove GPT-4o' }).click();
    await expect(page).toHaveURL(/models=claude-3.5-sonnet,gemini-2.0-flash/);
  });

  test('compare handles empty and invalid selections', async ({ page }) => {
    await page.goto('/compare');
    await expect(page.getByTestId('empty-state')).toContainText(/Pick at least \d+ models/);
    await page.goto('/compare?models=gpt-4o,ghost-model');
    await expect(page.getByTestId('empty-state')).toContainText("Couldn't compare");
  });

  test('rankings: overall, by category and by single benchmark', async ({ page }) => {
    await page.goto('/rankings');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Overall leaderboard');
    await expect(page.getByTestId('leaderboard-row').first()).toContainText('🥇');

    await page.getByTestId('scope-select').selectOption('c:CODING');
    await expect(page).toHaveURL(/category=CODING/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Coding leaderboard');

    await page.getByTestId('scope-select').selectOption('b:hallucination-rate');
    await expect(page).toHaveURL(/benchmark=hallucination-rate/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hallucination Rate leaderboard');
    await expect(page.getByText('Lower raw scores are better')).toBeVisible();
    // rank 1 has the lowest raw error rate
    const raw = (await page.locator('[data-testid=leaderboard-row] td:nth-child(4)').allInnerTexts()).map((t) => parseFloat(t));
    expect(raw[0]).toBe(Math.min(...raw));
  });

  test('rankings filters: open weights only', async ({ page }) => {
    await page.goto('/rankings?openWeights=true');
    const rows = page.getByTestId('leaderboard-row');
    await expect(rows.first()).toBeVisible();
    for (const t of await rows.allInnerTexts()) expect(t).toContain('Open');
  });

  test('AI labs directory → lab profile with release timeline', async ({ page }) => {
    await page.goto('/labs');
    await page.getByTestId('labs-grid').getByRole('link', { name: /Anthropic/ }).click();
    await expect(page).toHaveURL(/\/labs\/anthropic/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Anthropic');
    await expect(page.getByLabel('Release timeline')).toContainText('2025');
    await expect(page.getByLabel('Release timeline')).toContainText('Claude 3.7 Sonnet');
  });

  test('providers directory → provider profile with supported models and pricing', async ({ page }) => {
    await page.goto('/providers');
    await page.getByTestId('providers-grid').getByRole('link', { name: /Groq/ }).click();
    await expect(page).toHaveURL(/\/providers\/groq/);
    await expect(page.getByTestId('provider-models')).toContainText('Llama 3.1 8B Instruct');
    await expect(page.getByTestId('provider-models')).toContainText('Unavailable'); // Mixtral on Groq
  });

  test('navigation highlights the current section', async ({ page }, info) => {
    test.skip(isMobile(info.project.name), 'desktop nav');
    await page.goto('/rankings');
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Rankings' })).toHaveAttribute('aria-current', 'page');
  });
});
