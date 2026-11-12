---
title: Playwright-Plugin
description: Dieselbe Vergleichs-Engine und dasselbe Manifest wie beim Cypress-Plugin, für Playwright.
order: 3
reviewed: false
---

# Playwright-Plugin

Das Playwright-Plugin ist als `@pixsame/playwright-visual-regression-diff` veröffentlicht. Es verwendet die Vergleichs-Engine des Cypress-Plugins wieder, schreibt dasselbe [Manifest](/docs/reference/manifest) und hält Baselines in Ihrem Repository, direkt neben den Tests. Es steht bei 0.x, die Optionen können sich also vor 1.0 noch ändern.

```bash
npm install --save-dev @pixsame/playwright-visual-regression-diff
```

Importieren Sie `test` aus dem Paket und rufen Sie die Fixture `matchImage` auf:

```ts
import { test } from '@pixsame/playwright-visual-regression-diff';

test('home page', async ({ page, matchImage }) => {
  await page.goto('/');
  await matchImage();
});
```

Die Optionen, Baselines pro Browser und der Remote-Browser in Docker sind im [README des Pakets](https://github.com/pixsame/pixsame/tree/main/packages/playwright-visual-regression-diff#readme) beschrieben.
