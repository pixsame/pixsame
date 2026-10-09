---
title: Install
description: Install the pixsame plugin for Cypress and run your first visual regression test.
order: 1
---

# Install

The Cypress plugin is available today. The Playwright plugin and the GitHub App are coming soon.

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

Then register the plugin in `cypress.config.ts`. Call `initPlugin` in each section you use, `e2e` or `component`:

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

`matchImage` takes a screenshot and compares it with the one from the previous run. When something regresses the test fails and a **See comparison** button opens the diff right in the Cypress runner.

## Coming from `@frsource`?

The package was renamed. Run the migrate command from the plugin to move your project over, see [Usage](/docs/usage).
