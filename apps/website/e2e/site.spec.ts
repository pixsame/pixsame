import { expect, test } from '@playwright/test';

test('landing page renders the hero and the key sections', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Visual regression that agrees with itself.');
  await expect(page).toHaveTitle(/pixsame/);
  await expect(page.getByRole('heading', { name: 'Free where it matters. Paid where it scales.' })).toBeVisible();
  await expect(page.getByText('AI auto-evaluator').first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText('auto-approve');
});

test('theme toggle switches and persists without a flash', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/light/);
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  // the inline color-mode script sets the class before hydration
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
});

test('follows the system theme until the visitor chooses', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('language switcher navigates and sets lang, hreflang and canonical', async ({ page }) => {
  await page.goto('/');
  // the page is prerendered: selecting before hydration attaches the handler does nothing, so retry
  await expect(async () => {
    await page.getByLabel('Language').selectOption('de');
    await expect(page).toHaveURL(/\/de\/?$/, { timeout: 1000 });
  }).toPass();
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Visuelle Regression');
  const hreflangs = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((els) => els.map((e) => e.getAttribute('hreflang')));
  expect(hreflangs).toEqual(expect.arrayContaining(['en', 'pl', 'de', 'zh-CN', 'zh-TW', 'x-default']));
});

test('chinese locales use their own language tags', async ({ page }) => {
  await page.goto('/zh/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await page.goto('/zh-tw/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
});

test('install command can be copied', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByRole('button', { name: 'COPY' }).click();
  await expect(page.getByRole('button', { name: 'COPIED' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('npm i -D @pixsame/cypress-plugin-visual-regression-diff');
});

test('mobile menu exposes the navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByText('Menu', { exact: true }).click();
  await page.getByRole('navigation', { name: 'Main' }).last().getByRole('link', { name: 'Pricing' }).click();
  await expect(page).toHaveURL(/\/pricing\/?$/);
});

test('waitlist form submits to the API', async ({ page }) => {
  let body: unknown;
  await page.route('**/api/waitlist', async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto('/github-app/');
  await page.getByLabel('Email address').fill('dana@example.com');
  await page.getByRole('button', { name: 'Notify me' }).click();
  await expect(page.getByRole('status')).toContainText('Thanks');
  expect(body).toMatchObject({ email: 'dana@example.com', product: 'github-app', locale: 'en' });
});

test('docs in other locales are noindex, English is indexable', async ({ page }) => {
  await page.goto('/docs/install/');
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
  await page.goto('/pl/docs/install/');
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1);
});

test('unknown routes show the 404 page', async ({ page }) => {
  const res = await page.goto('/definitely-not-here/');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
});

test('machine-readable files are published', async ({ request }) => {
  expect((await request.get('/llms.txt')).ok()).toBe(true);
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap');
  expect((await request.get('/sitemap_index.xml')).ok()).toBe(true);
});
