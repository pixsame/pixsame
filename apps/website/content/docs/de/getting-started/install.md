---
title: Installation
description: Installieren Sie das pixsame-Plugin für Cypress und führen Sie Ihren ersten visuellen Regressionstest aus.
order: 1
reviewed: false
---

# Installation

Diese Seite behandelt das Cypress-Plugin, also den Teil, den Sie jetzt gerade installieren können. Das Playwright-Plugin und die GitHub App sind noch im Bau.

## Paket hinzufügen

```bash
# npm
npm install --save-dev @pixsame/cypress-plugin-visual-regression-diff

# yarn
yarn add -D @pixsame/cypress-plugin-visual-regression-diff

# pnpm
pnpm add -D @pixsame/cypress-plugin-visual-regression-diff
```

## Plugin einbinden

Importieren Sie die Commands in Ihrer Support-Datei (standardmäßig `cypress/support/e2e.ts`):

```ts
import '@pixsame/cypress-plugin-visual-regression-diff';
```

Registrieren Sie das Plugin anschließend in `cypress.config.ts`. Wenn Sie sowohl `e2e` als auch `component` verwenden, rufen Sie `initPlugin` in beiden auf. Es überträgt sich nicht von einem auf das andere.

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

## Ersten Snapshot aufnehmen

```ts
cy.get('.an-element-of-your-choice').matchImage();

// oder das gesamte Dokument
cy.matchImage();
```

Beim ersten Lauf gibt es nichts zum Vergleichen, also speichert `matchImage` den Screenshot einfach als Baseline. Ab dann vergleicht es jeden neuen Screenshot mit dieser Datei. Weichen beide um mehr als den Schwellenwert voneinander ab, schlägt der Test fehl, und ein Button **See comparison** im Cypress-Runner öffnet den Diff.

## Sie kommen von `@frsource`?

Das Paket ist von `@frsource` zu `@pixsame` umgezogen. Es ist eine Umbenennung, am Code hat sich nichts geändert. Siehe [Migration von @frsource](/docs/getting-started/migrate-from-frsource).
