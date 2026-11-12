---
title: Install
description: Install the pixsame plugin for Cypress and run your first visual regression test.
order: 1
---

# Install

This page covers the Cypress plugin, which is the part you can install right now. The Playwright plugin and the GitHub App are still being built.

## Add the package

```bash
# npm
npm install --save-dev @pixsame/cypress-plugin-visual-regression-diff

# yarn
yarn add -D @pixsame/cypress-plugin-visual-regression-diff

# pnpm
pnpm add -D @pixsame/cypress-plugin-visual-regression-diff
```

## Wire it up

Import the commands in your support file (`cypress/support/e2e.ts` by default):

```ts
import '@pixsame/cypress-plugin-visual-regression-diff';
```

Then register the plugin in `cypress.config.ts`. If you use both `e2e` and `component`, call `initPlugin` in each of them. It doesn't carry over from one to the other.

```ts
import { defineConfig } from 'cypress';
import { initPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      initPlugin(on, config);
    },
  },
});
```

## Take your first snapshot

```ts
cy.get('.an-element-of-your-choice').matchImage();

// or the whole document
cy.matchImage();
```

The first run has nothing to compare against, so `matchImage` just saves the screenshot as the baseline. From then on it compares each new screenshot with that file. When they differ by more than the threshold the test fails, and a **See comparison** button in the Cypress runner opens the diff.

## Coming from `@frsource`?

The package moved from `@frsource` to `@pixsame`. It's a rename, nothing in the code changed. See [Migrate from @frsource](/docs/getting-started/migrate-from-frsource).
