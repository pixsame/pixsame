---
reviewed: false
source: 7b717d4be16dd7ad
---

## Erste Schritte

### Installation

Sie können diese Bibliothek mit dem Paketmanager Ihrer Wahl installieren:

```bash
# npm
npm install --save-dev @pixsame/cypress-plugin-visual-regression-diff

# yarn
yarn add -D @pixsame/cypress-plugin-visual-regression-diff

# pnpm
pnpm add -D @pixsame/cypress-plugin-visual-regression-diff
```

Anschließend müssen Sie die Bibliothek importieren:

- zuerst in Ihrer Support-Datei (standardmäßig unter `cypress/support/index.js`):

```ts
// typescript / ES6
import '@pixsame/cypress-plugin-visual-regression-diff';

// javascript
require('@pixsame/cypress-plugin-visual-regression-diff');
```

- danach in `cypress.config.js` (oder `cypress.config.ts`):

```ts
// typescript / ES6
import { defineConfig } from 'cypress';
import { initPlugin as initVisualRegressionPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';

export default defineConfig({
  // initPlugin muss in dem Abschnitt aufgerufen werden, in dem es verwendet wird: e2e oder component
  e2e: {
    setupNodeEvents(on, config) {
      initVisualRegressionPlugin(on, config);
    },
  },
  component: {
    setupNodeEvents(on, config) {
      initVisualRegressionPlugin(on, config);
    },
  },
});
```

Das war's – wie Sie die Bibliothek verwenden, erfahren Sie im [Abschnitt Verwendung](#usage).

## Verwendung

Nach der Installation können Sie die Bibliothek in Ihrem Test so verwenden:

```ts
cy.get('.an-element-of-your-choice').matchImage();
```

Oder, wenn Sie einen Screenshot des gesamten Dokuments erstellen möchten:

```ts
cy.matchImage();
```

Der Befehl `matchImage` erstellt einen Screenshot und vergleicht ihn mit dem Bild aus einem vorherigen Lauf. Bei einer Regression schlägt der Test fehl und Sie erhalten eine Schaltfläche „See comparison“, über die Sie die Ursache des Problems einsehen können.

## Beispiel

Haben Sie weiterhin Schwierigkeiten bei der Installation? Werfen Sie einen Blick in das [Beispielverzeichnis dieses Repos](https://github.com/pixsame/pixsame/tree/main/examples), um zu sehen, wie dieses Plugin in Ihrem Projekt in einer Cypress-Umgebung für E2E- oder Component-Tests eingesetzt werden kann.

## Automatisches Aufräumen ungenutzter Bilder

Es ist sinnvoll, Screenshots des Visual-Regression-Plugins zu entfernen, die von keinem Test mehr verwendet werden.
Aktivieren Sie diese Funktion über eine Expose-Variable und freuen Sie sich über den frei gewordenen Speicherplatz 🚀:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
# Cypress <15.10 (veraltet seit 15.10, entfernt in 16)
npx cypress run --env "pluginVisualRegressionCleanupUnusedImages=true"
```

## Run-Manifest (CI-Integration)

Ab 1.1 schreibt jeder Lauf ein JSON-Manifest, das jeden `matchImage`-Vergleich auflistet: aus welchem Test er stammt, ob er bestanden hat, fehlgeschlagen ist, seine Baseline erstellt oder aktualisiert hat, das Diff-Verhältnis sowie die projektrelativen Pfade der Baseline-, `.actual.png`- und `.diff.png`-Dateien. Neben den Einträgen hält es fest, wo der Lauf stattgefunden hat (CI-Anbieter, Repository, Commit, Pull Request, Run-ID) und womit er ausgeführt wurde (Browser, Specs, Konfigurationsdatei, Plugin-Optionen), sodass ein Tool, das die Datei liest, zum richtigen PR berichten, das richtige Artefakt herunterladen oder dieselben Vergleiche erneut ausführen kann. Es ist für CI-Tooling gedacht (PR-Kommentare, Review-Dashboards, Approval-Bots), das läuft, nachdem Cypress fertig ist.

Das Format ist ein offener, Runner-unabhängiger Standard, der auf [CTRF](https://ctrf.io) aufbaut und unter [visual-regression.dev/manifest](https://visual-regression.dev/manifest) dokumentiert ist. Das npm-Paket [`visual-regression-manifest`](https://www.npmjs.com/package/visual-regression-manifest) enthält das JSON-Schema, die TypeScript-Typen, einen validierenden Reader, einen Merger für die Manifeste eines ganzen Laufs sowie Konverter für Tools, die kein eigenes Manifest schreiben (Playwrights `toHaveScreenshot`, Vitest, jest-image-snapshot, BackstopJS, CTRF-Reports, einfache Bilddateien). Bauen Sie Ihr Tooling auf diesem Paket auf und nicht auf diesem Plugin.

Standardmäßig landet die Datei neben Ihren anderen Cypress-Artefakten unter `<screenshotsFolder>/visual-regression-manifest.<testingType>.json` (z. B. `cypress/screenshots/visual-regression-manifest.e2e.json`). Laden Sie sie zusammen mit Ihrem Snapshot-Verzeichnis als CI-Artefakt hoch.

```jsonc
{
  "reportFormat": "visual-regression-manifest",
  "specVersion": "1.0.0-beta.1",
  "createdAt": "2026-09-22T10:00:00.000Z",
  "updatedAt": "2026-09-22T10:03:12.481Z",
  "projectRoot": "/home/runner/work/app/app",
  "platform": {
    "osPlatform": "linux",
    "arch": "x64",
    "osRelease": "6.8.0-1021-azure",
  },
  "ci": {
    "provider": "github",
    "repositoryName": "acme/app",
    "repositoryUrl": "https://github.com/acme/app",
    "commit": "0f1e2d…", // bei pull_request-Events: der Merge-Commit
    "ref": "refs/pull/42/merge",
    "branchName": "feat/new-header",
    "pullRequest": {
      "number": 42,
      "headSha": "9a8b7c…",
      "headRef": "feat/new-header",
      "baseRef": "main",
    },
    "event": "pull_request",
    "buildId": "1234567890",
    "buildName": "CI",
    "buildUrl": "https://github.com/acme/app/actions/runs/1234567890/attempts/1",
    "runAttempt": "1",
    "job": "e2e",
    "workspace": "/home/runner/work/app/app",
  },
  "tool": {
    "name": "@pixsame/cypress-plugin-visual-regression-diff",
    "version": "1.1.0",
  }, // was die Datei geschrieben hat
  "options": { "updateImages": "failures-only" }, // globale pluginVisualRegression*-Optionen, ohne Präfix
  "runner": {
    "name": "cypress",
    "version": "16.1.0",
    "testingType": "e2e",
    "mode": "run",
    "configFile": "cypress.config.ts",
    "browser": {
      "name": "chrome",
      "version": "130.0.0.0",
      "family": "chromium",
      "headless": true,
    },
    "specs": ["cypress/e2e/home.cy.ts"],
    "specPattern": "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    "baseUrl": "http://localhost:3000",
    "viewport": { "width": 1280, "height": 720 },
  },
  "summary": {
    "entries": 1,
    "passed": 0,
    "failed": 1,
    "missingBaseline": 0,
    "created": 0,
    "updated": 0,
    "approved": 0,
    "needsHuman": 1,
  },
  "entries": [
    {
      "name": "home page renders_#0",
      "test": {
        "filePath": "cypress/e2e/home.cy.ts",
        "titlePath": ["home page", "renders"],
        "retry": 0,
      },
      "status": "failed",
      "comparison": { "diffRatio": 0.0231, "threshold": 0.01 },
      "images": {
        "baseline": {
          "path": "cypress/e2e/__image_snapshots__/home page renders_#0.png",
          "width": 1280,
          "height": 720,
        },
        "actual": {
          "path": "cypress/e2e/__image_snapshots__/home page renders_#0.actual.png",
          "width": 1280,
          "height": 720,
        },
        "diff": {
          "path": "cypress/e2e/__image_snapshots__/home page renders_#0.diff.png",
        },
      },
      "baselineWritten": false,
      "recordedAt": "2026-09-22T10:03:12.480Z",
      "platform": {
        "osPlatform": "linux",
        "arch": "x64",
        "browser": {
          "name": "chrome",
          "version": "130.0.0.0",
          "family": "chromium",
          "headless": true,
        },
      },
      "viewport": { "width": 1280, "height": 720 },
      "options": {
        "imagesPath": "{spec_path}/__image_snapshots__",
        "maxDiffThreshold": 0.01,
        "diffConfig": {},
        "createMissingImages": true,
        "updateImages": false,
        "forceDeviceScaleFactor": true,
        "screenshotConfig": {},
      },
      "renderer": {
        "backend": "native",
        "browser": "chrome",
        "browserVersion": "130.0.0.0",
      },
      "hashes": {
        "baseline": "3b7e…", // sha256 der unter `images` aufgeführten Dateien, nur für vorhandene Dateien
        "actual": "9d21…",
        "diff": "c0ff…",
      },
      "message": "Image diff factor (2.31%) is bigger than maximum threshold option 1%.",
    },
  ],
}
```

| `status`           | Bedeutung                                                                          | `images.actual.path` | `images.diff.path` |
| ------------------ | ---------------------------------------------------------------------------------- | -------------------- | ------------------ |
| `passed`           | innerhalb des Schwellenwerts                                                       | `null`               | `null`             |
| `failed`           | über dem Schwellenwert, `.actual.png` und `.diff.png` bleiben zur Prüfung erhalten | Pfad                 | Pfad               |
| `missing-baseline` | keine Baseline und `createMissingImages: false`                                    | Pfad                 | `null`             |
| `created`          | keine Baseline, `.actual.png` wurde zur Baseline                                   | `null`               | `null`             |
| `updated`          | Baseline überschrieben (`updateImages: true` oder `'failures-only'`)               | `null`               | `null`             |
| `approved`         | Baseline aus der Review-Oberfläche im Headed-Modus ersetzt („Replace image“)       | `null`               | `null`             |

Felder auf Lauf-Ebene:

| Feld                     | Bedeutung                                                                                                                                                                                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createdAt`, `updatedAt` | wann der Lauf gestartet ist und wann die Datei zuletzt neu geschrieben wurde (ISO 8601)                                                                                                                                                                                            |
| `platform`               | `osPlatform` (`linux`, `darwin`, `win32`), `arch`, das Kernel-`osRelease` und im Run-Modus die menschenlesbare `osVersion` der Maschine, die die Tests ausgeführt hat                                                                                                              |
| `tool`                   | was die Datei geschrieben hat: dieses Plugin und seine Version                                                                                                                                                                                                                     |
| `ci`                     | wird auf GitHub Actions und GitLab CI aus Umgebungsvariablen erkannt; `{ "provider": null }` auf anderen CI-Systemen (nur `CI` ist gesetzt), `null` außerhalb der CI. Es werden ausschließlich die aufgeführten Schlüssel aus der Umgebung übernommen                              |
| `options`                | jede `pluginVisualRegression*`-Option aus `expose`/`env`, ohne Präfix, Werte wie konfiguriert (CLI-Werte bleiben Strings)                                                                                                                                                          |
| `runner`                 | was die Tests ausgeführt hat. `mode` ist `run` oder `open`; `browser` ist der gestartete Browser; `specs` ist nur im Run-Modus bekannt; `configFile` und `specs` sind relativ zu `projectRoot`. Cypress-Cloud-Läufe erhalten zusätzlich `cloud.runUrl`, `group`, `tag`, `parallel` |
| `summary`                | Anzahl der Einträge pro Status; `needsHuman` ist `failed` + `missingBaseline`, sodass ein Consumer entscheiden kann, ohne die Einträge zu lesen                                                                                                                                    |

Hinweise für Consumer:

- Alle Pfade sind relativ zu `projectRoot` und verwenden `/` als Trenner; sie können aus dem Projekt hinausführen (`../…`), wenn `imagesPath` absolut ist. `projectRoot` ist das Cypress-Projekt, nicht zwingend der Repository-Stamm: `ci.workspace` ist das Checkout-Verzeichnis, `relative(ci.workspace, projectRoot)` ergibt also das Pfadpräfix innerhalb des Repositorys.
- `failed` und `missing-baseline` sind die Einträge, die einen Menschen brauchen: Wer `images.actual.path` über `images.baseline.path` kopiert, gibt sie frei.
- `baselineWritten` gibt an, ob sich der Arbeitsbaum für diesen Screenshot geändert hat, unabhängig vom `status`.
- Jeder Eintrag trägt sein eigenes `platform` und `viewport`, sodass sich Einträge aus einer Matrix von Maschinen auch nach dem Zusammenführen mehrerer Manifeste auseinanderhalten lassen. `options` an einem Eintrag ist die exakte `matchImage`-Eingabe (`imagesPath` behält seine Platzhalter unaufgelöst); `comparison` ist das Ergebnis.
- `platform` ist, wo der Test gelaufen ist, `renderer` ist, woher die Pixel stammen. Derzeit wird jeder Screenshot von dem Browser aufgenommen, den Cypress steuert, daher ist `renderer.backend` `native` und `renderer.browser` wiederholt `platform.browser.name`. Das Feld existiert, damit sich ein anderer Renderer als der lokale Browser (ein gepinntes Docker-Image, ein gehosteter Renderer) über `rendererVersion` und `imageDigest` identifizieren kann und damit ein Lauf, der auf den lokalen Browser zurückfallen musste, mit `renderer.fallback: true` markiert werden kann. Behandeln Sie Einträge mit unterschiedlichen Renderern als unterschiedliche Baselines.
- `hashes` enthält den sha256 jeder Datei aus `images`, die auf der Festplatte existiert. Nutzen Sie ihn, um das erneute Hochladen unveränderter Baselines zu überspringen, um zu prüfen, ob ein Artefakt zum Manifest passt, oder um zwei Einträge zu erkennen, die identische Pixel erzeugt haben.
- Zuordnung zu einem Pull Request: Verwenden Sie `ci.repositoryName` und `ci.pullRequest.number`. Bei GitHub-`pull_request`-Events ist `ci.commit` der temporäre Merge-Commit; alles, was auf den PR-Branch pusht, muss daher `ci.pullRequest.headSha` / `headRef` verwenden. Das Workflow-Artefakt finden Sie über `ci.buildId` und `ci.runAttempt`.
- Einen Lauf reproduzieren: `npx cypress run --<runner.testingType> --browser <runner.browser.name> --config-file <runner.configFile> --spec <runner.specs joined with ,>` plus ein `--expose "pluginVisualRegression<Key>=<value>"` pro Eintrag von `options`. Das Manifest speichert diese Angaben als Einzelteile statt als Befehlszeile; Shell-Quoting und Paketmanager bleiben also Ihnen überlassen.
- Die Datei wird nach jedem Vergleich neu geschrieben, sie ist also auch dann vollständig, wenn der Lauf abgebrochen wird. Laufen Specs parallel auf mehreren Maschinen, schreibt jede Maschine ihr eigenes Manifest; `**/visual-regression-manifest{,.*}.json` (`MANIFEST_FILE_GLOB` im Paket) findet sie alle in einem Artefakt, und `readManifestFiles` + `mergeManifests` aus `visual-regression-manifest` machen daraus eine einzige Liste, in der ein späterer CI-Versuch einen früheren überstimmt.
- Nur der `runner`-Block und die Schlüssel von `options` sind Cypress-spezifisch; den Rest des Formats teilen sich alle anderen Writer. `specVersion` folgt semver, und die Major-Version wird nur bei Breaking Changes am Format erhöht; Consumer ignorieren Schlüssel, die sie nicht kennen. Da die Feldnamen CTRF folgen, verwandelt `toCtrf` aus dem Paket ein Manifest in einen [CTRF](https://ctrf.io)-Report für Tooling, das dieses Format liest.
- Die `Manifest*`-Typen werden der Einfachheit halber aus `@pixsame/cypress-plugin-visual-regression-diff/plugins` re-exportiert; es sind dieselben wie in `visual-regression-manifest`.

Das Manifest ist standardmäßig aktiviert. Um es an einem anderen Ort zu schreiben (Pfade werden relativ zum Projektstamm aufgelöst) oder es abzuschalten, verwenden Sie den Schlüssel `pluginVisualRegressionManifestPath` (`false` deaktiviert es, sonst ändert sich nichts):

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionManifestPath=reports/visual-regression.json"
npx cypress run --expose "pluginVisualRegressionManifestPath=false"
# Cypress <15.10 (veraltet seit 15.10, entfernt in 16)
npx cypress run --env "pluginVisualRegressionManifestPath=false"
```

Wenn Sie E2E- und Component-Tests mit einem eigenen Pfad ausführen, nehmen Sie den Testing-Type selbst in den Pfad auf; andernfalls würden sich die Läufe gegenseitig die Datei überschreiben.

## Konfiguration

Konfigurieren Sie das Plugin:

- indem Sie die Konfiguration als Argument an den Befehl `matchImage` übergeben:

```ts
cy.matchImage({
  // Screenshot-Konfiguration, wird direkt an die Screenshot-Methode von Cypress durchgereicht: https://docs.cypress.io/api/cypress-api/screenshot-api#Arguments
  // Standard: { }
  screenshotConfig: {
    blackout: ['.element-to-be-blackouted'],
  },
  // pixelmatch-Optionen, siehe: https://www.npmjs.com/package/pixelmatch#pixelmatchimg1-img2-output-width-height-options
  // Standard: { includeAA: true } (2.0 wechselt zu pixelmatchs eigenem includeAA: false, siehe „Reducing cross-OS rendering noise“ unten)
  diffConfig: {
    threshold: 0.01,
  },
  // ob fehlende Baseline-Bilder automatisch erstellt werden sollen
  // Standard: true
  createMissingImages: false,
  // ob Bilder automatisch aktualisiert werden sollen – nützlich in der CI
  // - true: alle Baseline-Bilder ohne Vergleich überschreiben (am schnellsten)
  // - 'failures-only': zuerst vergleichen, Baseline nur aktualisieren, wenn der Diff den Schwellenwert überschreitet
  // - false: Baseline-Bilder nie automatisch aktualisieren
  // Standard: false
  updateImages: true,
  // Verzeichnispfad, in dem die Screenshots gespeichert werden
  // relative Pfade werden relativ zum Projektstamm aufgelöst
  // absolute Pfade (sowohl unter Unix als auch unter Windows) werden unterstützt
  // Pfadtrenner werden vom Plugin je nach Betriebssystem normalisiert; verwenden Sie immer / als Pfadtrenner, z. B.: C:/my-directory/nested für Windows-Laufwerksnotation
  // Diese Variablen können im Pfad verwendet werden:
  // - {spec_path} – relativer Pfad vom Projektstamm zum Verzeichnis der aktuellen Spec-Datei (z. B. `/src/components/my-tested-component`); muss ein ganzes Pfadsegment sein
  // - {platform} – `{os}-{browser}`, z. B. `linux-chrome`, `darwin-electron`, `win32-firefox`
  // - {os} – Cypress.platform: `linux`, `darwin` oder `win32`
  // - {browser} – der Browser, in dem Cypress die Spec ausführt (Cypress.browser.name): `electron`, sofern `--browser` nichts anderes vorgibt, `chrome`, `firefox`, `edge`, ...
  // {platform}, {os} und {browser} können auch Teil eines Segments sein (`shots-{platform}`); `matchAgainstPath` wird nie expandiert
  // Damit halten Sie die Baselines verschiedener Betriebssysteme/Browser auseinander, siehe „Baselines pro Plattform“ weiter unten
  // Standard: '{spec_path}/__image_snapshots__'
  imagesPath: 'this-might-be-your-custom/maybe-nested-directory',
  // maximaler Schwellenwert, ab dem der Test fehlschlagen soll
  // Standard: 0.01
  maxDiffThreshold: 0.1,
  // erzwingt den Skalierungsfaktor "1"
  // hilft gegen 2x skalierte Screenshots auf hochauflösenden Displays wie Mac Retina
  // gilt für Chrome und Chromium (2.0 erweitert es auf Edge und Firefox, wodurch sich deren Baselines auf hochauflösenden Displays einmalig ändern)
  // Standard: true
  forceDeviceScaleFactor: false,
  // wendet das Preset für deterministisches Rendering an, siehe „Reducing cross-OS rendering noise“ unten
  // pro Aufruf steuert es nur das für den Screenshot in die Seite eingefügte CSS (Caret, Animationen, Scrollbars);
  // die Browser-Schalter gelten prozessweit und folgen der globalen Option pluginVisualRegressionDeterministicRendering
  // Standard: false (2.0 aktiviert es standardmäßig)
  deterministicRendering: true,
  // Titel, der für den Dateinamen des Bildes verwendet wird
  // Standard: Cypress.currentTest.titlePath (der Titel Ihres Tests)
  title: `${Cypress.currentTest.titlePath.join(' ')} (${Cypress.browser.displayName})`,
  // Pfad zu einem eigenen Bild, das für den Vergleich verwendet werden soll,
  // anstatt gegen das Bild aus dem vorherigen Lauf zu prüfen
  // Standard: undefined
  matchAgainstPath: '/path/to/reference-image.png',
});
```

- über die [globale Expose-Konfiguration](https://on.cypress.io/expose) (Cypress 15.10+). Die Konfigurationsschlüssel entsprechen den Schlüsseln des obigen Konfigurationsobjekts, jeweils mit vorangestelltem `pluginVisualRegression`, z. B.:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
# Cypress <15.10 (veraltet seit 15.10, entfernt in 16)
npx cypress run --env "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
```

Übergeben Sie mehrere Optionen kommagetrennt in einem einzigen Flag. Wird `--expose` (oder `--env`) mehrfach angegeben, berücksichtigt Cypress nur das letzte Vorkommen.

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

Weitere Möglichkeiten, Expose-Variablen zu setzen, [finden Sie hier](https://on.cypress.io/expose).

## Baselines pro Plattform

Chrome überlässt die Text-Rasterisierung dem Betriebssystem, daher wird dieselbe Seite unter macOS, Linux und Windows nie Byte für Byte identisch gerendert, und die Browser unterscheiden sich obendrein noch voneinander. Eine auf dem Mac eines Entwicklers aufgenommene Baseline passt deshalb selten zu dem Screenshot, den ein Linux-CI-Job von derselben Seite macht. `imagesPath` versteht drei Platzhalter, die die Baselines verschiedener Plattformen auseinanderhalten, statt sie sich gegenseitig überschreiben zu lassen:

| Platzhalter  | wird ersetzt durch                                                                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{os}`       | `Cypress.platform`: `linux`, `darwin` oder `win32`                                                                                                               |
| `{browser}`  | `Cypress.browser.name`, der Browser, in dem Cypress die Spec ausführt: `electron`, sofern Sie kein `--browser` übergeben, sonst `chrome`, `firefox`, `edge`, ... |
| `{platform}` | `{os}-{browser}`, z. B. `linux-chrome`, `darwin-electron`                                                                                                        |

Jeder Screenshot wird von dem Browser aufgenommen, den Cypress steuert, also ist `{browser}` genau dieser Browser; `cypress run` ohne `--browser` verwendet Electron, weshalb der Ordner `darwin-electron` heißt und nicht `darwin-chrome`, sofern die CI nicht `--browser chrome` übergibt.

Die Platzhalter sind opt-in: Der Standard-`imagesPath` bleibt `{spec_path}/__image_snapshots__`, ein einziger Satz Baselines für alle. Das ist die richtige Struktur, wenn jeder Lauf auf demselben Betriebssystem und Browser stattfindet (etwa in einem Container, siehe FAQ) oder wenn die verbleibende Abweichung unter Ihrem `maxDiffThreshold` bleibt. Um nach Plattform aufzuteilen, fügen Sie den Platzhalter global hinzu:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionImagesPath={spec_path}/__image_snapshots__/{platform}"
# Cypress <15.10 (veraltet seit 15.10, entfernt in 16)
npx cypress run --env "pluginVisualRegressionImagesPath={spec_path}/__image_snapshots__/{platform}"
```

```ts
// cypress.config.ts (Cypress 15.10+; unter Cypress <15.10 `env` statt `expose` verwenden)
export default defineConfig({
  expose: {
    pluginVisualRegressionImagesPath:
      '{spec_path}/__image_snapshots__/{platform}',
  },
});
```

```
cypress/e2e/__image_snapshots__/
├── darwin-electron/   # was `cypress open` auf einem Mac schreibt
│   └── home page renders_#0.png
└── linux-chrome/      # was Ihr CI-Job schreibt
    └── home page renders_#0.png
```

Nach der Aufteilung gibt es ein paar Dinge zu entscheiden:

- **Welche Baselines committet werden.** Die meisten Teams committen nur die CI-Plattform und halten die lokalen Baselines aus Git heraus, sodass jeder Entwickler seinen eigenen Satz bekommt, ohne das Repository zu verunreinigen:

  ```gitignore
  # alle Plattform-Ordner ignorieren, außer dem, den die CI erzeugt
  **/__image_snapshots__/*/
  !**/__image_snapshots__/linux-chrome/
  ```

  Neue CI-Baselines müssen dann in der CI erzeugt und von dort committet werden (oder aus einem PR heraus freigegeben, siehe [Run-Manifest](#run-manifest-ci-integration)).

- **Nur nach Browser oder nur nach Betriebssystem aufteilen.** Verwenden Sie `{browser}` oder `{os}` allein, z. B. `{spec_path}/__image_snapshots__/{browser}`.

- **Das Aufräumen löscht die Baselines der anderen Plattformen.** `pluginVisualRegressionCleanupUnusedImages` durchsucht das gesamte Projekt nach vom Plugin erzeugten PNGs und weiß nichts von Plattformen: Ein Lauf auf `darwin-electron` behandelt jede Datei unter `linux-chrome/` als ungenutzt und löscht sie. Lassen Sie die Option auf Maschinen deaktiviert, die die Ordner mehrerer Plattformen enthalten (ein Entwickler-Checkout mit committeten CI-Baselines ist genau so ein Fall), und aktivieren Sie sie nur dort, wo die Baselines einer einzigen Plattform liegen – typischerweise in dem CI-Job, der sie erzeugt. Falls es doch einmal passiert, holen Sie die gelöschten Ordner mit `git checkout -- <folder>` zurück.

Wohin die Reise geht: Für [#212](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/212) ist ein Renderer geplant, der die Pixel in einem festgelegten Docker-Image erzeugt, egal wo Cypress läuft, sodass lokale und CI-Bilder konstruktionsbedingt nicht mehr auseinanderdriften. `{browser}` bezeichnet dann den Browser des Renderers statt des von Cypress gesteuerten Browsers, und `{platform}` bleibt nützlich, um mehrere gerenderte Browser auseinanderzuhalten – nicht mehr für die Abweichung zwischen lokal und CI. Das Manifest hält bereits beide Seiten fest: `platform` ist, wo der Test gelaufen ist, `renderer` ist, woher die Pixel stammen.

## Batch Review Mode

Mit dem Batch Review Mode können Sie eine komplette Test-Suite ausführen, ohne beim ersten fehlgeschlagenen visuellen Diff anzuhalten. Stattdessen werden alle fehlgeschlagenen Snapshots gesammelt und nach Abschluss der Tests in einer interaktiven Review-Oberfläche angezeigt – so können Sie Änderungen gesammelt übernehmen oder überspringen.

### Zusätzliche Funktionen im Headed-Modus (außerhalb der CI)

Ist der Modus aktiviert, erscheint unten rechts im Cypress-Test-Runner ein Floating Action Button (FAB). Während die Tests laufen:

- Immer wenn ein `matchImage()`-Aufruf den Diff-Schwellenwert überschreitet, wird der Zähler auf dem FAB erhöht, statt sofort einen Fehler zu werfen.
- Sobald alle Tests abgeschlossen sind, wird ein Fehler mit der Gesamtzahl der Fehlschläge geworfen.
- Ein Klick auf den FAB öffnet ein Karussell, in dem Sie jeden fehlgeschlagenen Snapshot im direkten Vergleich (neu vs. alt) prüfen und die Baseline entweder **ersetzen** oder die Änderung **überspringen** können.

![Demo des Batch Review Mode](https://raw.githubusercontent.com/pixsame/pixsame/main/assets/batch-review-mode.gif)

> Hinweis: Der Batch-Modus wird in der nächsten Major-Version zum Standard. Um das bisherige Verhalten beizubehalten, setzen Sie die Konfigurationsoption auf `false` (Details siehe unten).

### Aktivierung

Der Batch Review Mode ist eine globale Option (sie kann nicht direkt an `matchImage` übergeben werden). Aktivieren Sie ihn über den Schlüssel `pluginVisualRegressionBatchReviewMode`:

```bash
# Cypress 15.10+
npx cypress open --expose "pluginVisualRegressionBatchReviewMode=true"
# Cypress <15.10 (veraltet seit 15.10, entfernt in 16)
npx cypress open --env "pluginVisualRegressionBatchReviewMode=true"
```

```ts
// cypress.config.ts (Cypress 15.10+)
import { defineConfig } from 'cypress';

export default defineConfig({
  expose: {
    pluginVisualRegressionBatchReviewMode: true,
  },
});
```

```ts
// cypress.config.ts (Cypress <15.10, in neueren Versionen veraltet)
import { defineConfig } from 'cypress';

export default defineConfig({
  env: {
    pluginVisualRegressionBatchReviewMode: true,
  },
});
```

### Bestandene Bilder prüfen

Bilder, die von der Baseline abweichen, aber innerhalb von `maxDiffThreshold` bleiben, lassen den Test nicht fehlschlagen, werden aber trotzdem gesammelt. Das Karussell bietet eine Checkbox **Show passing**, mit der Sie diese Bilder durchsehen (jedes ist mit dem Badge `passed` markiert) und ebenfalls deren Baseline ersetzen können – etwa um kleine, angesammelte Abweichungen loszuwerden.

Die Checkbox ist standardmäßig nicht aktiviert. Mit dem Schlüssel `pluginVisualRegressionBatchReviewModeShowPassingImages` können Sie sie standardmäßig aktivieren:

```bash
# Cypress 15.10+
npx cypress open --expose "pluginVisualRegressionBatchReviewMode=true" --expose "pluginVisualRegressionBatchReviewModeShowPassingImages=true"
# Cypress <15.10 (veraltet seit 15.10, entfernt in 16)
npx cypress open --env "pluginVisualRegressionBatchReviewMode=true,pluginVisualRegressionBatchReviewModeShowPassingImages=true"
```

```ts
// cypress.config.ts (Cypress 15.10+)
import { defineConfig } from 'cypress';

export default defineConfig({
  expose: {
    pluginVisualRegressionBatchReviewMode: true,
    pluginVisualRegressionBatchReviewModeShowPassingImages: true,
  },
});
```

Das Umschalten der Checkbox im Runner wird im Local Storage des Browsers gespeichert und hat bei späteren Läufen Vorrang vor dem konfigurierten Wert.

## Reducing cross-OS rendering noise

Browser überlassen die Text-Rasterisierung dem Betriebssystem (CoreText unter macOS, DirectWrite unter Windows, FreeType unter Linux). Dieselbe Seite wird daher auf dem Laptop eines Entwicklers und auf einem Linux-CI-Runner nie byte-genau identisch dargestellt. Das Plugin kann das nicht vollständig beseitigen, aber das `deterministicRendering`-Preset entfernt den Teil des Rauschens, der im Browser selbst entsteht.

Das Preset ist unter 1.x optional und standardmäßig deaktiviert. 2.0 aktiviert es standardmäßig. Wenn Sie es jetzt einschalten, erhalten Sie also das Verhalten von 2.0 schon früher, ohne weitere Änderungen.

### How to enable

Die Browser-Schalter gelten prozessweit, daher ist das Preset eine globale Option. Aktivieren Sie es mit dem Schlüssel `pluginVisualRegressionDeterministicRendering`:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionDeterministicRendering=true"
# Cypress <15.10 (veraltet seit 15.10, entfernt in 16)
npx cypress run --env "pluginVisualRegressionDeterministicRendering=true"
```

```ts
// cypress.config.ts (Cypress 15.10+)
import { defineConfig } from 'cypress';

export default defineConfig({
  expose: {
    pluginVisualRegressionDeterministicRendering: true,
  },
});
```

```ts
// cypress.config.ts (Cypress <15.10, in neueren Versionen veraltet)
import { defineConfig } from 'cypress';

export default defineConfig({
  env: {
    pluginVisualRegressionDeterministicRendering: true,
  },
});
```

Rechnen Sie beim ersten Lauf mit kleinen Abweichungen gegenüber Baselines, die ohne das Preset erstellt wurden, weil Text ohne Hinting gerastert wird. Führen Sie einmal einen Lauf mit `pluginVisualRegressionUpdateImages=true` (oder `'failures-only'`) aus oder bestätigen Sie die Änderungen im Batch Review Mode und committen Sie das Ergebnis.

### What it does

- **Chrome, Chromium, Edge** werden mit `--font-render-hinting=none --disable-font-subpixel-positioning --disable-lcd-text --force-color-profile=srgb --disable-gpu` gestartet (Text ohne OS-Hinting und Subpixel-Tricks, ohne Farbmanagement, Rasterisierung auf der CPU), im Headless-Modus zusätzlich mit `--hide-scrollbars`. Die Liste wird als `DETERMINISTIC_RENDERING_CHROMIUM_ARGS` aus `@frsource/cypress-plugin-visual-regression-diff/constants` exportiert.
- **Firefox** erhält die Einstellung `gfx.webrender.software` (Rendering auf der CPU). Firefox hat keinen plattformübergreifenden Schalter für Font-Hinting, daher kann sich Text zwischen Betriebssystemen weiterhin unterscheiden.
- **Jeder Browser**: Für die Dauer eines `matchImage`-Screenshots wird in die getestete Seite ein `<style>`-Element eingefügt, das den Text-Cursor (Caret) ausblendet, CSS-Transitions, Animationen und sanftes Scrollen deaktiviert und Scrollbars ausblendet. Es wird direkt nach dem Screenshot wieder entfernt.

Was das Preset nicht löst: unterschiedliche Schriftdateien und Fallbacks pro Betriebssystem (der klassische Fall Arial vs. Liberation Sans), Emoji-Schriften, die Text-Rasterisierung in WebKit und Firefox sowie mit WebGL gezeichnete Bilder. Behalten Sie dafür pro Plattform eine eigene Baseline (siehe [Baselines pro Plattform](#per-platform-baselines)) oder erzeugen Sie Ihre Baselines in derselben Umgebung, die Ihre CI verwendet.

**Electron** ignoriert von Plugins gesetzte Schalter. Mit Electron fügt das Preset daher nur das CSS ein und gibt beim Browserstart einen Hinweis aus. Übergeben Sie die Schalter stattdessen über die Umgebung:

```bash
ELECTRON_EXTRA_LAUNCH_ARGS="--font-render-hinting=none --disable-font-subpixel-positioning --disable-lcd-text --force-color-profile=srgb --disable-gpu --hide-scrollbars" npx cypress run --expose "pluginVisualRegressionDeterministicRendering=true"
```

**WebGL**: `--disable-gpu` kann dazu führen, dass Seiten, die auf WebGL angewiesen sind, keinen Rendering-Kontext erhalten. Lassen Sie das Preset entweder aus oder fügen Sie in Ihrem eigenen `before:browser:launch`-Handler `--use-gl=angle --use-angle=swiftshader` hinzu (aktuelles Chrome verlangt zusätzlich `--enable-unsafe-swiftshader`) und kombinieren Sie ihn mit dem Handler des Plugins über [`cypress-on-fix`](https://github.com/bahmutov/cypress-on-fix).

**Screenshot hooks**: Das Plugin übergibt bei jedem von ihm aufgenommenen Screenshot eigene `onBeforeScreenshot`- und `onAfterScreenshot`-Hooks. Über `screenshotConfig` übergebene Hooks werden weiterhin aufgerufen, global mit `Cypress.Screenshot.defaults()` gesetzte Hooks dagegen nicht.

### Anti-aliased pixels: the `includeAA: false` companion

Der Vergleich unter 1.x läuft noch mit `pixelmatch` und `includeAA: true`. Dadurch zählt jedes leicht abweichend gerenderte Kantenpixel mit Anti-Aliasing zum Diff-Verhältnis. Das ist die andere Hälfte des Cross-OS-Rauschens, und das Preset ändert daran nichts. Kombinieren Sie es mit `includeAA: false` (der Standardwert von pixelmatch selbst, Anti-Aliasing-Pixel werden erkannt und übersprungen) – 2.0 macht das zum Standard:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionDeterministicRendering=true,pluginVisualRegressionDiffConfig={\"includeAA\":false}"
# Cypress <15.10 (veraltet seit 15.10, entfernt in 16)
npx cypress run --env "pluginVisualRegressionDeterministicRendering=true,pluginVisualRegressionDiffConfig={\"includeAA\":false}"
```

```ts
cy.matchImage({ diffConfig: { includeAA: false } });
```

Damit werden die Diff-Verhältnisse kleiner, sodass manche Vergleiche, die zuvor fehlschlugen, bestehen. Baseline-Bilder sind davon nicht betroffen.

### Per call

Die Option `deterministicRendering` von `matchImage` steuert nur das eingefügte CSS; die Browser-Schalter bleiben so, wie es die globale Option vorgibt. So überspringen Sie das CSS für einen einzelnen Screenshot (z. B. wenn Sie den Endzustand einer Animation erfassen möchten):

```ts
cy.matchImage({ deterministicRendering: false });
```

Oder fügen Sie das CSS nur für einen Screenshot ein, ohne das Preset global zu aktivieren:

```ts
cy.matchImage({ deterministicRendering: true });
```

## FAQ

### Warum entsprechen die Screenshots nicht dem `viewport` aus meiner Cypress-Konfiguration?

Screenshots in Cypress werden standardmäßig nicht an die Viewport-Größe angepasst. Sie können dieses Verhalten ändern:

- global, indem Sie die Standard-Screenshot-Konfiguration anpassen: `Cypress.Screenshot.defaults({ capture: 'viewport' });`
- lokal, indem Sie die Screenshot-Konfiguration direkt an den Befehl `.matchImage` übergeben: `cy.matchImage({ screenshotConfig: { capture: 'viewport' } });`

### Ich habe dieses Plugin aktualisiert und alle meine Baseline-Bilder wurden automatisch neu erzeugt. Warum?

Manchmal müssen wir Breaking Changes an den Algorithmen für Bildvergleich oder Bilderzeugung vornehmen. Um Ihnen den Upgrade-Pfad so einfach wie möglich zu machen, aktualisiert das Plugin Ihre Baseline-Bilder automatisch. Committen Sie sie nach dem Upgrade einfach in Ihr Repository – mehr ist nicht nötig!

### Screenshots sehen zwischen `cypress run` und `cypress open` unterschiedlich aus. Wie behebe ich das?

Die Ursache sind in der Regel unterschiedliche Device-Pixel-Ratios im Headless- und Headed-Modus. Verwenden Sie die Option `forceDeviceScaleFactor`, um den Skalierungsfaktor auf `1` zu normalisieren:

```ts
cy.matchImage({ forceDeviceScaleFactor: true });
```

Oder setzen Sie sie global über eine Expose-Variable:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionForceDeviceScaleFactor=true"
# Cypress <15.10 (veraltet seit 15.10, entfernt in 16)
npx cypress run --env "pluginVisualRegressionForceDeviceScaleFactor=true"
```

Bei anhaltenden Unterschieden in der Viewport-Größe sollten Sie die Fenstergröße des Browsers explizit in `setupNodeEvents` festlegen (kombinieren Sie das mit dem eigenen `before:browser:launch`-Handler des Plugins über [`cypress-on-fix`](https://github.com/bahmutov/cypress-on-fix)):

```ts
on('before:browser:launch', (browser, launchOptions) => {
  if (browser.family === 'chromium' && browser.isHeadless) {
    launchOptions.args.push('--window-size=1280,720');
  }
  return launchOptions;
});
```

Wenn die beiden Läufe auf unterschiedlichen Betriebssystemen stattfinden (macOS-Laptop vs. Linux-CI-Runner), stammen die verbleibenden Unterschiede vom Font-Rendering. Siehe [Reducing cross-OS rendering noise](#reducing-cross-os-rendering-noise).

### Wie verwende ich dieses Plugin zusammen mit anderen Cypress-Plugins, die ebenfalls `setupNodeEvents`-Events registrieren?

Cypress unterstützt nur einen einzigen Handler pro Event. Registrieren mehrere Plugins dasselbe Event (z. B. `after:screenshot`), wird nur das zuletzt registrierte aufgerufen. Um mehrere Plugins sicher zu kombinieren, verwenden Sie [`cypress-on-fix`](https://github.com/bahmutov/cypress-on-fix):

```ts
import { defineConfig } from 'cypress';
import { initPlugin as initVisualRegressionPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';
import fix from 'cypress-on-fix';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      const fixedOn = fix(on);
      initVisualRegressionPlugin(fixedOn, config);
      // weitere Plugins hier über fixedOn registrieren
    },
  },
});
```

### Wie integriere ich mochawesome oder andere Reporter, die Screenshots einbetten?

Das Plugin speichert Baseline-Bilder außerhalb des Standardverzeichnisses `cypress/screenshots/`. Manche Reporter (etwa `cypress-mochawesome-reporter`) erwarten die Screenshots jedoch in genau diesem Ordner.

Über den Task-Hook `processImgPath` steuern Sie, wo die Screenshot-Datei abgelegt wird. Überschreiben Sie ihn in `setupNodeEvents` nach dem Aufruf von `initPlugin`:

```ts
setupNodeEvents(on, config) {
  initVisualRegressionPlugin(on, config);

  // Pfadverarbeitung überschreiben, damit die Screenshots für den Reporter erreichbar bleiben
  on('task', {
    'cp-visual-regression-diff-processImgPath': ({ path }: { path: string }) => {
      // einen neuen Pfad zurückgeben, oder denselben Pfad, um das Standardverhalten beizubehalten
      return path;
    },
  });
}
```

### Wie lasse ich den Test bei jeder noch so kleinen visuellen Abweichung fehlschlagen?

Setzen Sie `maxDiffThreshold` auf `0`:

```ts
cy.matchImage({ maxDiffThreshold: 0 });
```

Oder global über eine Expose-Variable:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionMaxDiffThreshold=0"
# Cypress <15.10 (veraltet seit 15.10, entfernt in 16)
npx cypress run --env "pluginVisualRegressionMaxDiffThreshold=0"
```

### Warum wird der aktuelle Screenshot nach einem erfolgreichen Bildvergleich gelöscht?

Stimmen die Bilder überein, ist die Datei `.actual.png` nur temporär und wird nach dem Vergleich aufgeräumt. Nur das Baseline-Bild (ohne Suffix) bleibt erhalten. So werden keine redundanten Dateien gespeichert.

Stimmen die Bilder nicht überein, bleibt die Datei `.actual.png` erhalten und trägt dieselben Plugin-Metadaten wie ein Baseline-Bild. Sie können sie gefahrlos umbenennen oder über die Baseline kopieren (z. B. in einem CI-Job, der einen Pull Request mit aktualisierten Baselines öffnet) – das Plugin behandelt sie dann als aktuelle Baseline und schreibt sie beim nächsten Lauf nicht neu.

Falls die aktuellen Screenshots für einen Reporter (z. B. `cypress-mochawesome-reporter`) erreichbar bleiben müssen, steuern Sie den Speicherort über den Task-Hook `processImgPath`. Siehe [Wie integriere ich mochawesome oder andere Reporter, die Screenshots einbetten?](#how-do-i-integrate-with-mochawesome-or-other-reporters-that-embed-screenshot-images)

### Wie entferne ich Leerzeichen aus den Screenshot-Dateinamen?

Die Dateinamen der Screenshots werden aus den Cypress-Testtiteln abgeleitet, die Leerzeichen enthalten können. Für einen Dateinamen ohne Leerzeichen übergeben Sie jedem `matchImage`-Aufruf eine eigene `title`-Option:

```ts
cy.matchImage({ title: 'my-screenshot-without-spaces' });
```

Um dies global für alle `matchImage`-Aufrufe anzuwenden, überschreiben Sie den Befehl in Ihrer Support-Datei (`cypress/support/commands.ts`):

```ts
Cypress.Commands.overwrite('matchImage', (originalFn, subject, options = {}) =>
  originalFn(subject, {
    title: Cypress.currentTest.titlePath.join(' ').replace(/\s+/g, '-'),
    ...options,
  }),
);
```

### Wie nehme ich den Browsernamen in die Bilddateinamen auf (für Cross-Browser-Tests)?

Verwenden Sie den Platzhalter `{browser}` in `imagesPath`; er wird durch den Namen des Browsers ersetzt, der den Screenshot gerendert hat (`chrome`, `firefox`, `electron`, ...):

```ts
cy.matchImage({ imagesPath: '{spec_path}/__image_snapshots__/{browser}' });
```

Oder global:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionImagesPath={spec_path}/__image_snapshots__/{browser}"
# Cypress <15.10 (veraltet seit 15.10, entfernt in 16)
npx cypress run --env "pluginVisualRegressionImagesPath={spec_path}/__image_snapshots__/{browser}"
```

So entstehen separate Bildverzeichnisse pro Browser (`__image_snapshots__/chrome/`, `__image_snapshots__/firefox/`). Unter [Baselines pro Plattform](#per-platform-baselines) finden Sie `{platform}` und `{os}`, die zusätzlich nach Betriebssystem aufteilen, welche Ordner committet werden sollten und warum `pluginVisualRegressionCleanupUnusedImages` auf einer Maschine, die die Ordner mehrerer Browser enthält, deaktiviert bleiben muss (sie würde die Baselines der anderen Browser löschen).

### Wie erzeuge ich einen HTML-Report mit Baseline-, Diff- und aktuellem Bild?

Das Plugin bringt ein integriertes Vergleichs-Overlay in der Cypress-Oberfläche mit – ein Klick auf „See comparison“ bei einem fehlgeschlagenen Test zeigt Baseline, Diff und aktuelles Bild nebeneinander.

Für die CI oder teilbare HTML-Reports integrieren Sie einen Reporter wie [`cypress-mochawesome-reporter`](https://www.npmjs.com/package/cypress-mochawesome-reporter). Details zur Einrichtung finden Sie unter [Wie integriere ich mochawesome oder andere Reporter, die Screenshots einbetten?](#how-do-i-integrate-with-mochawesome-or-other-reporters-that-embed-screenshot-images).
