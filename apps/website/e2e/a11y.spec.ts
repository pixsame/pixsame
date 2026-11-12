import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = [
  '/',
  '/products/',
  '/pricing/',
  '/docs/getting-started/install/',
  '/docs/reference/manifest/',
  '/products/cypress-plugin/',
  '/changelog/',
  '/products/cypress-plugin/changelog/',
  '/vitest/',
  '/docs/getting-started/migrate-from-frsource/',
  '/docs/reference/configuration/',
  '/github-app/',
  '/playwright/',
  '/platform/',
  '/privacy/',
  '/contact/',
  '/pl/',
  '/de/pricing/',
  '/zh/',
  '/zh-tw/',
];

// Turnstile keeps polling Cloudflare, so the page never goes network-idle. Tests never need the real captcha.
test.beforeEach(async ({ page }) => {
  await page.route('https://challenges.cloudflare.com/**', (route) =>
    route.abort(),
  );
});

for (const scheme of ['light', 'dark'] as const) {
  for (const route of routes) {
    test(`axe: ${route} (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        violations.map(
          (v) =>
            `${v.id}: ${v.nodes
              .map((n) => n.target.join(' '))
              .slice(0, 3)
              .join(' | ')}`,
        ),
      ).toEqual([]);
    });
  }
}
