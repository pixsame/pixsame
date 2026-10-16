---
reviewed: false
source: 2c9b39af16bde9aa
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
  // Im Pfad steht eine spezielle Variable zur Verfügung:
  // - {spec_path} – relativer Pfad vom Projektstamm zum Verzeichnis der aktuellen Spec-Datei (z. B. `/src/components/my-tested-component`)
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

Was das Preset nicht löst: unterschiedliche Schriftdateien und Fallbacks pro Betriebssystem (der klassische Fall Arial vs. Liberation Sans), Emoji-Schriften, die Text-Rasterisierung in WebKit und Firefox sowie mit WebGL gezeichnete Bilder. Behalten Sie dafür pro Plattform eine eigene Baseline (siehe die Optionen `title` und `imagesPath` sowie den FAQ-Eintrag zu Browsernamen) oder erzeugen Sie Ihre Baselines in derselben Umgebung, die Ihre CI verwendet.

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

Verschiedene Browser rendern Schriften und Elemente mitunter leicht unterschiedlich. Um pro Browser separate Baseline-Bilder zu führen, überschreiben Sie `matchImage` in Ihrer Support-Datei (`cypress/support/commands.ts`) und setzen einen browserspezifischen `imagesPath`:

```ts
Cypress.Commands.overwrite('matchImage', (originalFn, subject, options = {}) =>
  originalFn(subject, {
    imagesPath: `{spec_path}/__image_snapshots__/${Cypress.browser.name}`,
    ...options,
  }),
);
```

So entstehen separate Bildverzeichnisse pro Browser (z. B. `__image_snapshots__/chrome/`, `__image_snapshots__/firefox/`).

### Wie erzeuge ich einen HTML-Report mit Baseline-, Diff- und aktuellem Bild?

Das Plugin bringt ein integriertes Vergleichs-Overlay in der Cypress-Oberfläche mit – ein Klick auf „See comparison“ bei einem fehlgeschlagenen Test zeigt Baseline, Diff und aktuelles Bild nebeneinander.

Für die CI oder teilbare HTML-Reports integrieren Sie einen Reporter wie [`cypress-mochawesome-reporter`](https://www.npmjs.com/package/cypress-mochawesome-reporter). Details zur Einrichtung finden Sie unter [Wie integriere ich mochawesome oder andere Reporter, die Screenshots einbetten?](#how-do-i-integrate-with-mochawesome-or-other-reporters-that-embed-screenshot-images).
