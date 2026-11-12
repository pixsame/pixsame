---
title: Playwright plugin
description: The same comparison engine and manifest as the Cypress plugin, for Playwright.
order: 3
---

# Playwright plugin

The Playwright plugin is published as `@pixsame/playwright-visual-regression-diff`. It reuses the Cypress plugin's comparison engine, writes the same [manifest](/docs/reference/manifest), and keeps baselines in your repository next to the tests. It is at 0.x, so options may still change before 1.0.

```bash
npm install --save-dev @pixsame/playwright-visual-regression-diff
```

Import `test` from the package and call the `matchImage` fixture:

```ts
import { test } from '@pixsame/playwright-visual-regression-diff';

test('home page', async ({ page, matchImage }) => {
  await page.goto('/');
  await matchImage();
});
```

The options, baselines per browser and the remote browser in Docker are described in the [package README](https://github.com/pixsame/pixsame/tree/main/packages/playwright-visual-regression-diff#readme).
