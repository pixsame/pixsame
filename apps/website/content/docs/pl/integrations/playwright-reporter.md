---
title: Plugin dla Playwright
description: Ten sam silnik porównywania i manifest co w pluginie dla Cypress, tym razem dla Playwright.
order: 3
reviewed: false
---

# Plugin dla Playwright

Plugin dla Playwright jest opublikowany jako `@pixsame/playwright-visual-regression-diff`. Korzysta z silnika porównywania pluginu dla Cypress, zapisuje ten sam [manifest](/docs/reference/manifest) i trzyma baseline'y w repozytorium, tuż obok testów. Ma wersję 0.x, więc opcje mogą się jeszcze zmienić przed 1.0.

```bash
npm install --save-dev @pixsame/playwright-visual-regression-diff
```

Należy zaimportować `test` z pakietu i wywołać fixture `matchImage`:

```ts
import { test } from '@pixsame/playwright-visual-regression-diff';

test('home page', async ({ page, matchImage }) => {
  await page.goto('/');
  await matchImage();
});
```

Opcje, baseline'y per przeglądarka oraz zdalna przeglądarka w Dockerze są opisane w [README pakietu](https://github.com/pixsame/pixsame/tree/main/packages/playwright-visual-regression-diff#readme).
