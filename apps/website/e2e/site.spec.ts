import { expect, test, type Page } from '@playwright/test';

// Turnstile keeps polling Cloudflare, so the page never goes network-idle. Tests never need the real captcha.
test.beforeEach(async ({ page }) => {
  await page.route('https://challenges.cloudflare.com/**', (route) =>
    route.abort(),
  );
});

// A stand-in for Turnstile's api.js. The app renders the widget lazily, so `loads` shows whether
// anything was requested from Cloudflare; `reset` hands out a second token, like the real widget.
const stubTurnstile = async (page: Page) => {
  const state = { loads: 0 };
  await page.route(
    'https://challenges.cloudflare.com/turnstile/v0/api.js*',
    (route) => {
      state.loads += 1;
      return route.fulfill({
        contentType: 'application/javascript',
        body: `window.turnstile = {
        render(el, opts) { window.__tsCallback = opts.callback; const f = document.createElement('iframe'); f.title = 'turnstile-stub'; el.append(f); setTimeout(() => opts.callback('stub-token'), 0); return 'w'; },
        reset() { setTimeout(() => window.__tsCallback('stub-token-2'), 0); },
        remove() {},
      };
      window.pxTurnstileLoad && window.pxTurnstileLoad();`,
      });
    },
  );
  return state;
};

// Static pages are interactive only after Vue hydrates: an earlier click is lost, or submits the form natively.
const hydrated = (page: Page) =>
  page.waitForFunction(() => {
    const nuxt = (window as { useNuxtApp?: () => { isHydrating?: boolean } })
      .useNuxtApp;
    return nuxt !== undefined && nuxt().isHydrating === false;
  });

test('landing page renders the hero and the key sections', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Visual regression that agrees with itself.',
  );
  await expect(page).toHaveTitle(/pixsame/);
  await expect(
    page.getByRole('heading', {
      name: 'Free where it matters. Paid where it scales.',
    }),
  ).toBeVisible();
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
  await expect(
    page.getByRole('button', { name: 'Switch to light mode' }),
  ).toBeVisible();
});

test('follows the system theme until the visitor chooses', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('language switcher navigates and sets lang, hreflang and canonical', async ({
  page,
}) => {
  await page.goto('/');
  // the page is prerendered: clicking before hydration attaches the handler does nothing, so retry
  await expect(async () => {
    await page.getByRole('button', { name: 'Language' }).click();
    await expect(page.getByRole('dialog', { name: 'Language' })).toBeVisible({
      timeout: 1000,
    });
  }).toPass();
  await page.getByRole('link', { name: 'Deutsch' }).click();
  await expect(page).toHaveURL(/\/de\/?$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Visuelle Regression',
  );
  const hreflangs = await page
    .locator('link[rel="alternate"][hreflang]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('hreflang')));
  expect(hreflangs).toEqual(
    expect.arrayContaining(['en', 'pl', 'de', 'zh-CN', 'zh-TW', 'x-default']),
  );
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
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'npm i -D @pixsame/cypress-plugin-visual-regression-diff',
  );
});

test('mobile menu exposes the navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(async () => {
    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible({
      timeout: 1000,
    });
  }).toPass();
  await page.getByRole('dialog').getByRole('link', { name: 'Pricing' }).click();
  await expect(page).toHaveURL(/\/pricing\/?$/);
});

test('waitlist form needs consent, then posts to the Apps Script endpoint', async ({
  page,
}) => {
  await stubTurnstile(page);
  let sent: Record<string, unknown> | undefined;
  await page.route('https://script.google.com/**', async (route) => {
    sent = Object.fromEntries(new URL(route.request().url()).searchParams);
    await route.fulfill({ json: { result: 'success' } });
  });
  await page.goto('/github-app/');
  await hydrated(page);
  await page.getByLabel('Email address').fill('dana@example.com');
  await page.getByRole('button', { name: 'Notify me' }).click();
  await expect(page.getByRole('alert')).toContainText('tick the box');
  expect(sent).toBeUndefined();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Notify me' }).click();
  await expect(page.getByRole('status')).toContainText('Thanks');
  expect(sent).toMatchObject({
    email: 'dana@example.com',
    product: 'github-app',
    locale: 'en',
    consent: 'yes',
    website: '',
    token: 'stub-token',
  });
});

test('contact form validates, needs consent and posts', async ({ page }) => {
  await stubTurnstile(page);
  let sent: Record<string, unknown> | undefined;
  await page.route('https://script.google.com/**', async (route) => {
    sent = Object.fromEntries(new URL(route.request().url()).searchParams);
    await route.fulfill({ json: { result: 'success' } });
  });
  await page.goto('/contact/');
  await hydrated(page);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('Please fill in this field.')).toHaveCount(3);
  await page.getByLabel('Name').fill('Dana');
  await page.getByLabel('Email address').fill('dana@example.com');
  await page.getByRole('textbox', { name: 'Message' }).fill('Hello');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('status')).toContainText('Thanks');
  expect(sent).toMatchObject({
    name: 'Dana',
    message: 'Hello',
    consent: 'yes',
  });
});

test('turnstile loads only when a form is started, and its token is sent', async ({
  page,
}) => {
  const turnstile = await stubTurnstile(page);
  let sent: Record<string, unknown> | undefined;
  await page.route('https://script.google.com/**', async (route) => {
    sent = Object.fromEntries(new URL(route.request().url()).searchParams);
    await route.fulfill({ json: { result: 'success' } });
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle'); // hydrated: the next click is a client-side navigation
  await page.evaluate(() => {
    (window as unknown as { marker: number }).marker = 1;
  });
  await page
    .getByRole('banner')
    .getByRole('navigation')
    .getByRole('link', { name: 'Contact' })
    .click();
  await expect(page).toHaveURL(/\/contact\/?$/);
  expect(
    await page.evaluate(
      () => (window as unknown as { marker?: number }).marker,
    ),
  ).toBe(1); // no full reload
  // Only reading the page: nothing is requested from Cloudflare, no widget exists.
  await expect(page.getByLabel('Name')).toBeVisible();
  expect(turnstile.loads).toBe(0);
  await expect(page.locator('form iframe[title="turnstile-stub"]')).toHaveCount(
    0,
  );
  // The first interaction with the form starts the check.
  await page.getByLabel('Name').fill('Dana');
  await expect(page.locator('form iframe[title="turnstile-stub"]')).toHaveCount(
    1,
  );
  expect(turnstile.loads).toBe(1);
  await page.getByLabel('Email address').fill('dana@example.com');
  await page.getByRole('textbox', { name: 'Message' }).fill('Hello');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('status')).toContainText('Thanks');
  expect(sent?.token).toBe('stub-token');
});

test('a failed submission gets a fresh turnstile token for the retry', async ({
  page,
}) => {
  await stubTurnstile(page);
  const tokens: unknown[] = [];
  await page.route('https://script.google.com/**', async (route) => {
    tokens.push(new URL(route.request().url()).searchParams.get('token'));
    await route.fulfill({
      json: { result: tokens.length === 1 ? 'error' : 'success' },
    });
  });
  await page.goto('/contact/');
  await hydrated(page);
  await page.getByLabel('Name').fill('Dana');
  await page.getByLabel('Email address').fill('dana@example.com');
  await page.getByRole('textbox', { name: 'Message' }).fill('Hello');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('status')).toContainText('Thanks');
  expect(tokens).toEqual(['stub-token', 'stub-token-2']); // a token works once
});

test('translated docs are indexable, in their language, and flagged as unreviewed drafts', async ({
  page,
}) => {
  await page.goto('/docs/getting-started/install/');
  await expect(
    page.locator('meta[name="robots"][content*="noindex"]'),
  ).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('machine translation');
  await page.goto('/pl/docs/getting-started/install/');
  await expect(
    page.locator('meta[name="robots"][content*="noindex"]'),
  ).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Instalacja',
  );
  await expect(page.locator('body')).toContainText('tłumaczenie maszynowe');
  // links inside markdown stay in the visitor's locale
  await page
    .getByRole('link', { name: /Migracja z @frsource/ })
    .first()
    .click();
  await expect(page).toHaveURL(
    /\/pl\/docs\/getting-started\/migrate-from-frsource\/?$/,
  );
});

test('the Cypress plugin page renders the package README without the GitHub-only parts', async ({
  page,
}) => {
  await page.goto('/products/cypress-plugin/');
  await expect(
    page.getByRole('heading', { name: 'Getting started' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'FAQ' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Commercial support');
  await expect(page.locator('body')).not.toContainText('Cypress <10');
  await expect(page.locator('details')).toHaveCount(0);
  const sections = await page.locator('article h2').count();
  // the translated README from the plugin package: flagged as a draft, same structure, indexable
  await page.goto('/pl/products/cypress-plugin/');
  await expect(page.locator('body')).toContainText('tłumaczenie maszynowe');
  await expect(page.locator('body')).not.toContainText('Getting started');
  await expect(page.locator('article h2')).toHaveCount(sections);
  await expect(
    page.locator('meta[name="robots"][content*="noindex"]'),
  ).toHaveCount(0);
});

test('unknown routes show the 404 page', async ({ page }) => {
  const res = await page.goto('/definitely-not-here/');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Page not found',
  );
});

test('machine-readable files are published', async ({ request }) => {
  expect((await request.get('/llms.txt')).ok()).toBe(true);
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap');
  expect((await request.get('/sitemap_index.xml')).ok()).toBe(true);
});

test('the brand page shows the rules and its downloads exist', async ({
  page,
  request,
}) => {
  await page.goto('/brand/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Brand');
  await expect(
    page.getByRole('heading', { name: 'You may not, without a written' }),
  ).toBeVisible();
  for (const file of [
    'pixsame-lockup-light.svg',
    'pixsame-signet-dark.svg',
    'pixsame-lockup-dark.svg',
  ]) {
    expect((await request.get(`/brand/${file}`)).ok()).toBe(true);
  }
});

test('the privacy policy and the terms are the full English texts, with a notice in other languages', async ({
  page,
}) => {
  await page.goto('/privacy/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Privacy Policy' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Who processes it for us' }),
  ).toBeVisible();
  await expect(page.getByText('Mailjet').first()).toBeVisible();
  await expect(page.getByRole('note')).toHaveCount(0);
  await page.goto('/terms/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Terms' }),
  ).toBeVisible();
  await page.goto('/pl/privacy/');
  await expect(page.getByRole('note')).toContainText('po angielsku');
  await expect(
    page.getByRole('heading', { name: 'Who processes it for us' }),
  ).toBeVisible();
});
