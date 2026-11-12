---
title: Instalacja
description: Zainstaluj plugin pixsame dla Cypress i uruchom swój pierwszy test regresji wizualnej.
order: 1
reviewed: false
---

# Instalacja

Ta strona dotyczy pluginu dla Cypress, czyli tej części, którą możesz zainstalować już teraz. Plugin dla Playwright i GitHub App wciąż powstają.

## Dodaj pakiet

```bash
# npm
npm install --save-dev @pixsame/cypress-plugin-visual-regression-diff

# yarn
yarn add -D @pixsame/cypress-plugin-visual-regression-diff

# pnpm
pnpm add -D @pixsame/cypress-plugin-visual-regression-diff
```

## Podepnij plugin

Zaimportuj komendy w pliku support (domyślnie `cypress/support/e2e.ts`):

```ts
import '@pixsame/cypress-plugin-visual-regression-diff';
```

Następnie zarejestruj plugin w `cypress.config.ts`. Jeśli używasz zarówno `e2e`, jak i `component`, wywołaj `initPlugin` w każdej z tych sekcji. Z jednej na drugą się nie przenosi.

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

## Zrób pierwszy snapshot

```ts
cy.get('.an-element-of-your-choice').matchImage();

// albo cały dokument
cy.matchImage();
```

Przy pierwszym uruchomieniu nie ma z czym porównywać, więc `matchImage` po prostu zapisuje zrzut jako baseline. Od tej pory każdy nowy zrzut porównuje z tym plikiem. Gdy różnią się bardziej niż próg, test pada, a przycisk **See comparison** w runnerze Cypress otwiera diff.

## Przechodzisz z `@frsource`?

Pakiet przeniósł się z `@frsource` do `@pixsame`. To zmiana nazwy, w kodzie nic się nie zmieniło. Zobacz [Migracja z @frsource](/docs/getting-started/migrate-from-frsource).
