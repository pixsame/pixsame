import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = ['/', '/product/', '/pricing/', '/docs/install/', '/docs/manifest/', '/changelog/', '/github-app/', '/playwright/', '/platform/', '/privacy/', '/pl/', '/de/pricing/', '/zh/', '/zh-tw/'];

for (const scheme of ['light', 'dark'] as const) {
  for (const route of routes) {
    test(`axe: ${route} (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
    });
  }
}
