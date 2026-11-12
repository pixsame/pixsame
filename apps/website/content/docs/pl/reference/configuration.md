---
title: Konfiguracja
description: Wszystkie opcje pluginu pixsame dla Cypress, per wywołanie albo globalnie, plus tryb batch review.
order: 1
reviewed: false
---

# Konfiguracja

Każda opcja działa w dwóch miejscach: per wywołanie, jako argument `matchImage`, albo raz dla całego uruchomienia. Klucze globalne to nazwy per wywołanie z `pluginVisualRegression` z przodu, więc `updateImages` staje się `pluginVisualRegressionUpdateImages`.

## Opcje

- per wywołanie, jako argument `matchImage`. Wartości domyślne są w komentarzach:

```ts
cy.matchImage({
  // konfiguracja zrzutu ekranu, przekazywana bezpośrednio do metody screenshot Cypress: https://docs.cypress.io/api/cypress-api/screenshot-api#Arguments
  // domyślnie: { }
  screenshotConfig: {
    blackout: ['.element-to-be-blackouted'],
  },
  // opcje pixelmatch, zobacz: https://www.npmjs.com/package/pixelmatch#pixelmatchimg1-img2-output-width-height-options
  // domyślnie: { includeAA: true }
  diffConfig: {
    threshold: 0.01,
  },
  // czy automatycznie tworzyć brakujące obrazy baseline
  // domyślnie: true
  createMissingImages: false,
  // czy automatycznie aktualizować obrazy - przydatne w CI
  // - true: nadpisuj wszystkie obrazy baseline bez porównywania (najszybsze)
  // - 'failures-only': najpierw porównaj, aktualizuj baseline tylko gdy diff przekroczy próg
  // - false: nigdy nie aktualizuj obrazów baseline automatycznie
  // domyślnie: false
  updateImages: true,
  // ścieżka katalogu, w którym będą zapisywane zrzuty ekranu
  // ścieżki względne są rozwiązywane względem katalogu głównego projektu
  // ścieżki bezwzględne (zarówno na unixie, jak i na windowsie) są obsługiwane
  // separatory ścieżek plugin normalizuje w zależności od systemu; zawsze używaj / jako separatora, np.: C:/my-directory/nested dla notacji dysków windowsowych
  // w ścieżce dostępna jest jedna specjalna zmienna:
  // - {spec_path} - ścieżka względna od katalogu głównego projektu do katalogu bieżącego pliku spec (np. `/src/components/my-tested-component`)
  // domyślnie: '{spec_path}/__image_snapshots__'
  imagesPath: 'this-might-be-your-custom/maybe-nested-directory',
  // maksymalny próg, po przekroczeniu którego test ma się nie powieść
  // domyślnie: 0.01
  maxDiffThreshold: 0.1,
  // wymusza ustawienie współczynnika skalowania na wartość "1"
  // pomaga, gdy zrzuty ekranu są skalowane 2x na ekranach o wysokiej gęstości, np. Mac Retina
  // domyślnie: true
  forceDeviceScaleFactor: false,
  // tytuł używany do nazwania pliku obrazu
  // domyślnie: Cypress.currentTest.titlePath (tytuł twojego testu)
  title: `${Cypress.currentTest.titlePath.join(' ')} (${Cypress.browser.displayName})`,
  // ścieżka do własnego obrazu, który ma zostać użyty do porównania
  // zamiast obrazu z poprzedniego uruchomienia
  // domyślnie: undefined
  matchAgainstPath: '/path/to/reference-image.png',
});
```

- dla całego uruchomienia, przez [konfigurację expose](https://on.cypress.io/expose) Cypressa (Cypress 15.10+). Te same klucze co wyżej, z prefiksem `pluginVisualRegression`:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
# Cypress <15.10 (przestarzałe od 15.10, usunięte w 16)
npx cypress run --env "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
```

Kilka opcji wrzucasz do jednej flagi, po przecinku. Nie powtarzaj `--expose` (ani `--env`): Cypress bierze tylko ostatnią flagę, a resztę po cichu gubi.

```ts
// cypress.config.ts (Cypress 15.10+)
import { defineConfig } from 'cypress';

export default defineConfig({
  expose: {
    pluginVisualRegressionUpdateImages: true,
    pluginVisualRegressionDiffConfig: { threshold: 0.01 },
  },
});
```

```ts
// cypress.config.ts (Cypress <15.10, przestarzałe w nowszych wersjach)
import { defineConfig } from 'cypress';

export default defineConfig({
  env: {
    pluginVisualRegressionUpdateImages: true,
    pluginVisualRegressionDiffConfig: { threshold: 0.01 },
  },
});
```

Pozostałe sposoby ustawiania zmiennych expose Cypress opisuje [tutaj](https://on.cypress.io/expose).

## Usuń nieużywane obrazy

Zmienisz nazwę testu albo go usuniesz, a jego baseline zostaje. Uruchom raz z tym kluczem, a plugin skasuje każdy swój obraz, którego żaden test nie dotknął w tym uruchomieniu. Odpal wtedy cały zestaw testów, bo inaczej polecą też baseline'y pominiętych speców:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
# Cypress <15.10 (przestarzałe od 15.10, usunięte w 16)
npx cypress run --env "pluginVisualRegressionCleanupUnusedImages=true"
```

## Tryb batch review

Normalnie snapshot powyżej progu rzuca błędem od razu, w środku testu. Tryb batch review pozwala zestawowi dojechać do końca, zbiera po drodze każdy niepowodzony snapshot i rzuca raz, z łączną liczbą. W trybie headed po uruchomieniu dostajesz karuzelę i przechodzisz przez niepowodzenia jedno po drugim, podmieniając albo pomijając każdy baseline. To opcja globalna, więc nie da się jej przekazać do `matchImage`. Włączasz ją kluczem `pluginVisualRegressionBatchReviewMode`, a jeśli chcesz mieć w karuzeli także obrazy, które przeszły, dodaj `pluginVisualRegressionBatchReviewModeShowPassingImages`:

```bash
# Cypress 15.10+
npx cypress open --expose "pluginVisualRegressionBatchReviewMode=true"
# Cypress <15.10 (przestarzałe od 15.10, usunięte w 16)
npx cypress open --env "pluginVisualRegressionBatchReviewMode=true"
```

Demo interfejsu review znajdziesz w [sekcji o trybie batch review](/products/cypress-plugin#batch-review-mode) na stronie pluginu dla Cypress.
