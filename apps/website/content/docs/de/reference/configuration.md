---
title: Konfiguration
description: Alle Optionen des pixsame Cypress-Plugins, pro Aufruf oder global, plus Batch Review Mode.
order: 1
reviewed: false
---

# Konfiguration

Jede Option funktioniert an zwei Stellen: pro Aufruf, als Argument an `matchImage`, oder einmal für den ganzen Lauf. Die globalen Schlüssel sind die Namen pro Aufruf mit `pluginVisualRegression` davor, aus `updateImages` wird also `pluginVisualRegressionUpdateImages`.

## Optionen

- pro Aufruf, als Argument an `matchImage`. Die Kommentare nennen die Standardwerte:

```ts
cy.matchImage({
  // Screenshot-Konfiguration, wird direkt an die Screenshot-Methode von Cypress weitergereicht: https://docs.cypress.io/api/cypress-api/screenshot-api#Arguments
  // Standard: { }
  screenshotConfig: {
    blackout: ['.element-to-be-blackouted'],
  },
  // pixelmatch-Optionen, siehe: https://www.npmjs.com/package/pixelmatch#pixelmatchimg1-img2-output-width-height-options
  // Standard: { includeAA: true }
  diffConfig: {
    threshold: 0.01,
  },
  // ob fehlende Baseline-Bilder automatisch angelegt werden sollen
  // Standard: true
  createMissingImages: false,
  // ob Bilder automatisch aktualisiert werden sollen - nützlich in CI
  // - true: alle Baseline-Bilder ohne Vergleich überschreiben (am schnellsten)
  // - 'failures-only': erst vergleichen, Baseline nur aktualisieren, wenn der Diff den Schwellenwert überschreitet
  // - false: Baseline-Bilder nie automatisch aktualisieren
  // Standard: false
  updateImages: true,
  // Verzeichnis, in dem die Screenshots abgelegt werden
  // relative Pfade werden relativ zum Projektstamm aufgelöst
  // absolute Pfade (unter Unix wie unter Windows) werden unterstützt
  // Pfadtrenner werden vom Plugin je nach Betriebssystem normalisiert; verwenden Sie immer / als Pfadtrenner, z. B.: C:/my-directory/nested für die Windows-Laufwerksnotation
  // Im Pfad steht eine spezielle Variable zur Verfügung:
  // - {spec_path} - relativer Pfad vom Projektstamm zum Verzeichnis der aktuellen Spec-Datei (z. B. `/src/components/my-tested-component`)
  // Standard: '{spec_path}/__image_snapshots__'
  imagesPath: 'this-might-be-your-custom/maybe-nested-directory',
  // maximaler Schwellenwert, ab dem der Test fehlschlagen soll
  // Standard: 0.01
  maxDiffThreshold: 0.1,
  // erzwingt den Skalierungsfaktor "1"
  // hilft gegen 2x skalierte Screenshots auf hochauflösenden Displays wie Mac Retina
  // Standard: true
  forceDeviceScaleFactor: false,
  // Titel, aus dem der Dateiname des Bildes gebildet wird
  // Standard: Cypress.currentTest.titlePath (Ihr Testtitel)
  title: `${Cypress.currentTest.titlePath.join(' ')} (${Cypress.browser.displayName})`,
  // Pfad zu einem eigenen Bild, das für den Vergleich verwendet werden soll
  // statt gegen das Bild aus dem vorherigen Lauf zu prüfen
  // Standard: undefined
  matchAgainstPath: '/path/to/reference-image.png',
});
```

- für den ganzen Lauf, über die [Expose-Konfiguration](https://on.cypress.io/expose) von Cypress (Cypress 15.10+). Dieselben Schlüssel wie oben, mit dem Präfix `pluginVisualRegression`:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
# Cypress <15.10 (seit 15.10 veraltet, in 16 entfernt)
npx cypress run --env "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
```

Mehrere Optionen kommen in ein Flag, durch Kommas getrennt. Wiederholen Sie `--expose` (oder `--env`) nicht: Cypress behält nur das letzte und lässt den Rest kommentarlos fallen.

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
// cypress.config.ts (Cypress <15.10, in neueren Versionen veraltet)
import { defineConfig } from 'cypress';

export default defineConfig({
  env: {
    pluginVisualRegressionUpdateImages: true,
    pluginVisualRegressionDiffConfig: { threshold: 0.01 },
  },
});
```

Die übrigen Wege, Expose-Variablen zu setzen, dokumentiert Cypress [hier](https://on.cypress.io/expose).

## Ungenutzte Bilder aufräumen

Benennen Sie einen Test um oder löschen ihn, bleibt seine Baseline liegen. Lassen Sie einmal mit diesem Schlüssel laufen, und das Plugin löscht jedes seiner Bilder, das in diesem Lauf kein Test angefasst hat. Lassen Sie dabei die komplette Suite laufen, sonst sind die Baselines der übersprungenen Specs auch weg:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
# Cypress <15.10 (seit 15.10 veraltet, in 16 entfernt)
npx cypress run --env "pluginVisualRegressionCleanupUnusedImages=true"
```

## Batch-Review-Modus

Normalerweise wirft ein Snapshot über dem Schwellenwert sofort im Test einen Fehler. Im Batch-Review-Modus läuft die Suite stattdessen bis zum Ende durch, sammelt jeden fehlgeschlagenen Snapshot und wirft am Schluss einmal mit der Gesamtzahl. Im Headed-Modus bekommen Sie nach dem Lauf ein Karussell und gehen die Fehlschläge einen nach dem anderen durch, wobei Sie jede Baseline ersetzen oder überspringen. Es ist eine globale Option, sie lässt sich also nicht an `matchImage` übergeben. Einschalten mit `pluginVisualRegressionBatchReviewMode`, und dazu `pluginVisualRegressionBatchReviewModeShowPassingImages`, wenn Sie die bestandenen Bilder auch im Karussell haben möchten:

```bash
# Cypress 15.10+
npx cypress open --expose "pluginVisualRegressionBatchReviewMode=true"
# Cypress <15.10 (seit 15.10 veraltet, in 16 entfernt)
npx cypress open --env "pluginVisualRegressionBatchReviewMode=true"
```

Eine Demo der Review-Oberfläche gibt es im [Abschnitt zum Batch-Review-Modus](/products/cypress-plugin#batch-review-mode) auf der Cypress-Plugin-Seite.
