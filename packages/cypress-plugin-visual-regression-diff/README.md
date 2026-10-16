<p align="center">
  <a href="https://www.npmjs.com/package/@pixsame/cypress-plugin-visual-regression-diff">
    <img src="https://img.shields.io/npm/v/@pixsame/cypress-plugin-visual-regression-diff.svg" alt="NPM version badge">
  </a>
  <a href="https://www.npmjs.com/package/@pixsame/cypress-plugin-visual-regression-diff">
    <img src="https://img.shields.io/npm/dt/@pixsame/cypress-plugin-visual-regression-diff.svg" alt="NPM total downloads badge">
  </a>
  <a href="https://qlty.sh/gh/FRSOURCE/projects/cypress-plugin-visual-regression-diff">
    <img src="https://qlty.sh/gh/FRSOURCE/projects/cypress-plugin-visual-regression-diff/maintainability.svg" alt="Qlty maintainability badge">
  </a>
 <a href="https://qlty.sh/gh/FRSOURCE/projects/cypress-plugin-visual-regression-diff">
    <img src="https://qlty.sh/gh/FRSOURCE/projects/cypress-plugin-visual-regression-diff/coverage.svg" alt="Qlty Code Coverage badge">
  </a>
  <a href="https://github.com/semantic-release/semantic-release">
    <img src="https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg" alt="semantic-relase badge">
  </a>
  <a href="https://github.com/pixsame/pixsame/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/pixsame/pixsame.svg" alt="license MIT badge">
  </a>
</p>

<p align="center">
  <img src="https://github.com/pixsame/pixsame/blob/main/assets/logo.svg" alt="Cypress Plugin Visual Regression Diff logo" height="120px"/>
</p>

<h1 align="center">Plugin for Cypress - Visual Regression Diff</h1>
<p align="center">Perform visual regression test with a nice GUI as help. 💅 <i>Only&nbsp;for&nbsp;Cypress!</i> Both e2e and component-testing compatible 💪</p>

> 📣 **We've just become pixsame, and our ecosystem is growing!** Read the [official announcement](https://github.com/pixsame/pixsame/issues/437) for more details.

<p align="center">
  <a href="#getting-started">Getting Started</a>
  ·
  <a href="#usage">Usage</a>
  ·
  <a href="#faq">FAQ</a>
  ·
  <a href="#migrating-from-frsourcecypress-plugin-visual-regression-diff">Migrating from @frsource</a>
  ·
  <a href="https://github.com/pixsame/pixsame/issues">File an Issue</a>
  ·
  <a href="https://github.com/pixsame/pixsame/discussions">Have a question or an idea?</a>
  <br>
</p>

<p align="center">
  <br>
  <i>Plugin for visual regression testing that provides smooth experience:
    <br>Specify threshold below which the test will fail.
    <br>Quickly preview old &amp; new screenshot directly in the Cypress UI.
    <br>Find visual changes using images diff.
    <br>Published as treeshakeable bundles, separate for JS ES5 or modern bundlers thanks to <a href="https://www.npmjs.com/package/microbundle">microbundle</a>.
    <br>Working with every bundler (tested on webpack, vite, rollup),
    <br>Provides proper typings as is written completely in <a href="https://www.typescriptlang.org">typescript</a>.</i>
  <br>
  <br>
</p>

![frsource-visual-testing-example](https://user-images.githubusercontent.com/10456649/191988386-2be2ea14-7b7a-4048-a14e-0cad8d21e214.gif)

## Getting started

### Installation

You can install this library using your favorite package manager:

```bash
# npm
npm install --save-dev @pixsame/cypress-plugin-visual-regression-diff

# yarn
yarn add -D @pixsame/cypress-plugin-visual-regression-diff

# pnpm
pnpm add -D @pixsame/cypress-plugin-visual-regression-diff
```

Next, you need to import the library:

- first, in your support file (located by default in `cypress/support/index.js`):

```ts
// typescript / ES6
import '@pixsame/cypress-plugin-visual-regression-diff';

// javascript
require('@pixsame/cypress-plugin-visual-regression-diff');
```

- secondly, in `cypress.config.js` (or `cypress.config.ts`):

```ts
// typescript / ES6
import { defineConfig } from 'cypress';
import { initPlugin as initVisualRegressionPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';

export default defineConfig({
  // initPlugin must be called in the section where it is used: e2e or component
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

That's it - now let's see how to use the library in [usage section](#usage).

## Usage

Once installed, the library might be used by writing in your test:

```ts
cy.get('.an-element-of-your-choice').matchImage();
```

Or, if you would like to make a screenshot of whole document:

```ts
cy.matchImage();
```

`matchImage` command will do a screenshot and compare it with image from a previous run. In case of regression the test will fail and you'll get a "See comparison" button to see what's a root of a problem.

## Example

Still got troubles with installation? Have a look at [examples directory of this repo](./examples) to see how this plugin can be used in e2e or component-testing Cypress environment within your project.

## Automatic clean up of unused images

It's useful to remove screenshots generated by the visual regression plugin that are not used by any test anymore.
Enable this feature via expose variable and enjoy freed up storage space 🚀:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
# Cypress <15.10 (deprecated in 15.10, removed in 16)
npx cypress run --env "pluginVisualRegressionCleanupUnusedImages=true"
```

## Configuration

Configure the plugin:

- by passing in configuration as an argument to `matchImage` command:

```ts
cy.matchImage({
  // screenshot configuration, passed directly to the the Cypress screenshot method: https://docs.cypress.io/api/cypress-api/screenshot-api#Arguments
  // default: { }
  screenshotConfig: {
    blackout: ['.element-to-be-blackouted'],
  },
  // pixelmatch options, see: https://www.npmjs.com/package/pixelmatch#pixelmatchimg1-img2-output-width-height-options
  // default: { includeAA: true } (2.0 switches to pixelmatch's own includeAA: false, see "Reducing cross-OS rendering noise" below)
  diffConfig: {
    threshold: 0.01,
  },
  // whether to create missing baseline images automatically
  // default: true
  createMissingImages: false,
  // whether to update images automatically - useful for CI
  // - true: overwrite all baseline images without comparing (fastest)
  // - 'failures-only': compare first, update baseline only when diff exceeds threshold
  // - false: never update baseline images automatically
  // default: false
  updateImages: true,
  // directory path in which screenshot images will be stored
  // relative path are resolved against project root
  // absolute paths (both on unix and windows OS) supported
  // path separators will be normalised by the plugin depending on OS, you should always use / as path separator, e.g.: C:/my-directory/nested for windows-like drive notation
  // There are one special variable available to be used in the path:
  // - {spec_path} - relative path leading from project root to the current spec file directory (e.g. `/src/components/my-tested-component`)
  // default: '{spec_path}/__image_snapshots__'
  imagesPath: 'this-might-be-your-custom/maybe-nested-directory',
  // maximum threshold above which the test should fail
  // default: 0.01
  maxDiffThreshold: 0.1,
  // forces scale factor to be set as value "1"
  // helps with screenshots being scaled 2x on high-density screens like Mac Retina
  // applies to Chrome and Chromium (2.0 extends it to Edge and Firefox, which changes their baselines on high-density screens once)
  // default: true
  forceDeviceScaleFactor: false,
  // applies the deterministic rendering preset, see "Reducing cross-OS rendering noise" below
  // per call it only controls the CSS injected into the page for the screenshot (caret, animations, scrollbars);
  // the browser switches are process-wide and follow the global pluginVisualRegressionDeterministicRendering option
  // default: false (2.0 turns it on by default)
  deterministicRendering: true,
  // title used for naming the image file
  // default: Cypress.currentTest.titlePath (your test title)
  title: `${Cypress.currentTest.titlePath.join(' ')} (${Cypress.browser.displayName})`,
  // pass a path to custom image that should be used for comparison
  // instead of checking against the image from previous run
  // default: undefined
  matchAgainstPath: '/path/to/reference-image.png',
});
```

- via [global expose configuration](https://on.cypress.io/expose) (Cypress 15.10+). Configuration key names are the same as the keys of the configuration object above, but with added `pluginVisualRegression` prefix, e.g.:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
# Cypress <15.10 (deprecated in 15.10, removed in 16)
npx cypress run --env "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
```

Pass several options in one flag, separated by commas. When `--expose` (or `--env`) is repeated, Cypress keeps only the last occurrence.

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
// cypress.config.ts (Cypress <15.10, deprecated in newer versions)
import { defineConfig } from 'cypress';

export default defineConfig({
  env: {
    pluginVisualRegressionUpdateImages: true,
    pluginVisualRegressionDiffConfig: { threshold: 0.01 },
  },
});
```

For more ways of setting expose variables [take a look here](https://on.cypress.io/expose).

## Batch Review Mode

Batch Review Mode lets you run a full test suite without stopping on the first visual diff failure. Instead, all failing snapshots are collected and presented in an interactive review UI after the tests complete — so you can approve or skip changes in bulk.

### Additions in headed mode (non-CI environments)

When enabled, a floating action button (FAB) appears in the bottom-right corner of the Cypress test runner. As tests run:

- Whenever a `matchImage()` call exceeds the diff threshold, the counter badge on the FAB increments instead of immediately throwing an error.
- Once all tests finish, an error is thrown with the total count of failures.
- Clicking the FAB opens a carousel where you can review each failing snapshot side-by-side (new vs. old) and either **replace** the baseline or **skip** the change.

![Batch Review Mode demo](https://raw.githubusercontent.com/pixsame/pixsame/main/assets/batch-review-mode.gif)

> Note: Batch mode will become the default in the next major version. To keep an old behaviour, make sure to set configuration property to `false` (see below for more details).

### How to enable

Batch Review Mode is a global option (it cannot be passed to `matchImage` directly). Enable it with the `pluginVisualRegressionBatchReviewMode` key:

```bash
# Cypress 15.10+
npx cypress open --expose "pluginVisualRegressionBatchReviewMode=true"
# Cypress <15.10 (deprecated in 15.10, removed in 16)
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
// cypress.config.ts (Cypress <15.10, deprecated in newer versions)
import { defineConfig } from 'cypress';

export default defineConfig({
  env: {
    pluginVisualRegressionBatchReviewMode: true,
  },
});
```

### Reviewing passing images

Images that differ from the baseline but stay within `maxDiffThreshold` do not fail the test, yet they are still collected. The carousel has a **Show passing** checkbox that lets you browse them (each is marked with a `passed` badge) and replace their baseline too, e.g. to get rid of small accumulated drift.

The checkbox is unchecked by default. Use the `pluginVisualRegressionBatchReviewModeShowPassingImages` key to make it checked by default:

```bash
# Cypress 15.10+
npx cypress open --expose "pluginVisualRegressionBatchReviewMode=true" --expose "pluginVisualRegressionBatchReviewModeShowPassingImages=true"
# Cypress <15.10 (deprecated in 15.10, removed in 16)
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

Toggling the checkbox in the runner is remembered in the browser's local storage and takes precedence over the configured value on subsequent runs.

## Reducing cross-OS rendering noise

Browsers hand text rasterisation to the operating system (CoreText on macOS, DirectWrite on Windows, FreeType on Linux), so the same page never renders byte-for-byte identical on a developer's laptop and a Linux CI runner. The plugin cannot make that go away entirely, but the `deterministicRendering` preset removes the part of the noise that lives inside the browser.

The preset is opt-in on 1.x and off by default. 2.0 turns it on by default, so enabling it now gets you the 2.0 behaviour early without any other change.

### How to enable

The browser switches are process-wide, so the preset is a global option. Enable it with the `pluginVisualRegressionDeterministicRendering` key:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionDeterministicRendering=true"
# Cypress <15.10 (deprecated in 15.10, removed in 16)
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
// cypress.config.ts (Cypress <15.10, deprecated in newer versions)
import { defineConfig } from 'cypress';

export default defineConfig({
  env: {
    pluginVisualRegressionDeterministicRendering: true,
  },
});
```

Expect small differences against baselines created without the preset on the first run, because text is rasterised without hinting. Run once with `pluginVisualRegressionUpdateImages=true` (or `'failures-only'`), or approve the changes in Batch Review Mode, and commit the result.

### What it does

- **Chrome, Chromium, Edge** are launched with `--font-render-hinting=none --disable-font-subpixel-positioning --disable-lcd-text --force-color-profile=srgb --disable-gpu` (text without OS hinting and subpixel tricks, no colour management, CPU rasterisation), plus `--hide-scrollbars` in headless mode. The list is exported as `DETERMINISTIC_RENDERING_CHROMIUM_ARGS` from `@frsource/cypress-plugin-visual-regression-diff/constants`.
- **Firefox** gets the `gfx.webrender.software` preference (CPU rendering). Firefox has no cross-platform switch for font hinting, so text may still differ between operating systems.
- **Every browser**: for the duration of a `matchImage` screenshot a `<style>` element is injected into the tested page that hides the text caret, disables CSS transitions, animations and smooth scrolling, and hides scrollbars. It is removed right after the screenshot.

What the preset does not solve: different font files and fallbacks per OS (the classic Arial vs. Liberation Sans case), emoji fonts, WebKit and Firefox text rasterisation, and images drawn by WebGL. For those, keep one baseline per platform (see the `title` and `imagesPath` options and the FAQ entry about browser names) or generate your baselines in the same environment your CI uses.

**Electron** ignores switches set by plugins, so with Electron the preset only injects the CSS and prints a reminder on browser launch. Pass the switches through the environment instead:

```bash
ELECTRON_EXTRA_LAUNCH_ARGS="--font-render-hinting=none --disable-font-subpixel-positioning --disable-lcd-text --force-color-profile=srgb --disable-gpu --hide-scrollbars" npx cypress run --expose "pluginVisualRegressionDeterministicRendering=true"
```

**WebGL**: `--disable-gpu` may leave pages that depend on WebGL without a rendering context. Either leave the preset off or add `--use-gl=angle --use-angle=swiftshader` (recent Chrome also wants `--enable-unsafe-swiftshader`) in your own `before:browser:launch` handler, composed with the plugin's one via [`cypress-on-fix`](https://github.com/bahmutov/cypress-on-fix).

**Screenshot hooks**: the plugin passes its own `onBeforeScreenshot` and `onAfterScreenshot` to every screenshot it takes. Hooks given via `screenshotConfig` are still called; hooks set globally with `Cypress.Screenshot.defaults()` are not.

### Anti-aliased pixels: the `includeAA: false` companion

The comparison on 1.x still runs `pixelmatch` with `includeAA: true`, so every anti-aliased edge pixel that renders slightly differently counts towards the diff ratio. That is the other half of the cross-OS noise, and the preset does not touch it. Pair it with `includeAA: false` (pixelmatch's own default, anti-aliased pixels are detected and skipped) - 2.0 makes that the default:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionDeterministicRendering=true,pluginVisualRegressionDiffConfig={\"includeAA\":false}"
# Cypress <15.10 (deprecated in 15.10, removed in 16)
npx cypress run --env "pluginVisualRegressionDeterministicRendering=true,pluginVisualRegressionDiffConfig={\"includeAA\":false}"
```

```ts
cy.matchImage({ diffConfig: { includeAA: false } });
```

Diff ratios get smaller with it, so some comparisons that failed before pass. Baseline images are not affected.

### Per call

The `deterministicRendering` option of `matchImage` only controls the injected CSS; the browser switches stay whatever the global option says. Skip the CSS for a single screenshot (e.g. when an animation's end state is what you want to capture):

```ts
cy.matchImage({ deterministicRendering: false });
```

Or inject just the CSS for one screenshot without enabling the preset globally:

```ts
cy.matchImage({ deterministicRendering: true });
```

## FAQ

<details><summary>Why screenshots doesn't conform to the `viewport` set in my Cypress configuration?</summary>

Screenshots in Cypress do not scale to the viewport size by default. You can change this behavior:

- globally, by changing default screenshot configuration: <code>Cypress.Screenshot.defaults({ capture: 'viewport' });</code>
- locally, by passing screenshot configuration directly to the <code>.matchImage</code> command: <code>cy.matchImage({ screenshotConfig: { capture: 'viewport' } });</code>

</details>

<details><summary>I've upgraded version of this plugin and all on my baseline images has been automatically updated. Why?</summary>

Sometimes we need to do a breaking change in image comparison or image generation algorithms. To provide you with the easiest upgrade path - the plugin updates your baseline images automatically. Just commit them to your repository after the plugin upgrade and you are good to go!

</details>

<details><summary>Screenshots look different between <code>cypress run</code> and <code>cypress open</code>. How do I fix it?</summary>

This is typically caused by device pixel ratio differences between headless and headed modes. Use the `forceDeviceScaleFactor` option to normalize the scale factor to `1`:

```ts
cy.matchImage({ forceDeviceScaleFactor: true });
```

Or set it globally via expose variable:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionForceDeviceScaleFactor=true"
# Cypress <15.10 (deprecated in 15.10, removed in 16)
npx cypress run --env "pluginVisualRegressionForceDeviceScaleFactor=true"
```

For persistent viewport size differences, consider setting the browser window size explicitly in `setupNodeEvents` (compose it with the plugin's own `before:browser:launch` handler via [`cypress-on-fix`](https://github.com/bahmutov/cypress-on-fix)):

```ts
on('before:browser:launch', (browser, launchOptions) => {
  if (browser.family === 'chromium' && browser.isHeadless) {
    launchOptions.args.push('--window-size=1280,720');
  }
  return launchOptions;
});
```

If the two runs happen on different operating systems (a macOS laptop vs. a Linux CI runner), the remaining differences come from font rendering. See [Reducing cross-OS rendering noise](#reducing-cross-os-rendering-noise).

</details>

<details><summary>How do I use this plugin alongside other Cypress plugins that also register <code>setupNodeEvents</code> events?</summary>

Cypress only supports a single handler per event. If multiple plugins register the same event (e.g. `after:screenshot`), only the last one will be called. To compose multiple plugins safely, use [`cypress-on-fix`](https://github.com/bahmutov/cypress-on-fix):

```ts
import { defineConfig } from 'cypress';
import { initPlugin as initVisualRegressionPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';
import fix from 'cypress-on-fix';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      const fixedOn = fix(on);
      initVisualRegressionPlugin(fixedOn, config);
      // register other plugins using fixedOn here
    },
  },
});
```

</details>

<details><summary>How do I integrate with mochawesome or other reporters that embed screenshot images?</summary>

The plugin stores baseline images outside the default `cypress/screenshots/` directory. Some reporters (like `cypress-mochawesome-reporter`) expect screenshots to be in that folder.

Use the `processImgPath` task hook to control where the screenshot file is placed. Override it in `setupNodeEvents` after calling `initPlugin`:

```ts
setupNodeEvents(on, config) {
  initVisualRegressionPlugin(on, config);

  // Override the path processor to keep screenshots accessible to the reporter
  on('task', {
    'cp-visual-regression-diff-processImgPath': ({ path }: { path: string }) => {
      // return a new path, or the same path to keep default behavior
      return path;
    },
  });
}
```

</details>

<details><summary>How to fail on any visual difference, no matter how small?</summary>

Set `maxDiffThreshold` to `0`:

```ts
cy.matchImage({ maxDiffThreshold: 0 });
```

Or globally via an expose variable:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionMaxDiffThreshold=0"
# Cypress <15.10 (deprecated in 15.10, removed in 16)
npx cypress run --env "pluginVisualRegressionMaxDiffThreshold=0"
```

</details>

<details><summary>Why is the actual screenshot deleted after a successful image comparison?</summary>

When images match, the `.actual.png` file is temporary and gets cleaned up after the comparison. Only the baseline image (no suffix) is kept. This avoids storing redundant files.

When images do not match, the `.actual.png` file is kept and carries the same plugin metadata as a baseline image. You can safely rename or copy it over the baseline (e.g. in a CI job that opens a PR with updated baselines) - the plugin will treat it as an up-to-date baseline and won't rewrite it on the next run.

If you need actual screenshots to stay accessible for a reporter (e.g. `cypress-mochawesome-reporter`), use the `processImgPath` task hook to control where screenshots are stored. See [How do I integrate with mochawesome or other reporters that embed screenshot images?](#how-do-i-integrate-with-mochawesome-or-other-reporters-that-embed-screenshot-images)

</details>

<details><summary>How to remove spaces from screenshot filenames?</summary>

Screenshot filenames are derived from Cypress test titles, which may contain spaces. To use a filename without spaces, pass a custom `title` option to each `matchImage` call:

```ts
cy.matchImage({ title: 'my-screenshot-without-spaces' });
```

To apply this globally for all `matchImage` calls, override the command in your support file (`cypress/support/commands.ts`):

```ts
Cypress.Commands.overwrite('matchImage', (originalFn, subject, options = {}) =>
  originalFn(subject, {
    title: Cypress.currentTest.titlePath.join(' ').replace(/\s+/g, '-'),
    ...options,
  }),
);
```

</details>

<details><summary>How to include the browser name in image filenames (for cross-browser testing)?</summary>

Different browsers may render fonts and elements slightly differently. To keep separate baseline images per browser, override `matchImage` in your support file (`cypress/support/commands.ts`) to set a browser-specific `imagesPath`:

```ts
Cypress.Commands.overwrite('matchImage', (originalFn, subject, options = {}) =>
  originalFn(subject, {
    imagesPath: `{spec_path}/__image_snapshots__/${Cypress.browser.name}`,
    ...options,
  }),
);
```

This creates separate image directories per browser (e.g. `__image_snapshots__/chrome/`, `__image_snapshots__/firefox/`).

</details>

<details><summary>How to generate an HTML report showing baseline, diff, and actual images?</summary>

The plugin provides a built-in visual comparison overlay in the Cypress UI — clicking "See comparison" on a failed test shows the baseline, diff, and actual images side by side.

For CI or sharable HTML reports, integrate with a reporter such as [`cypress-mochawesome-reporter`](https://www.npmjs.com/package/cypress-mochawesome-reporter). See [How do I integrate with mochawesome or other reporters that embed screenshot images?](#how-do-i-integrate-with-mochawesome-or-other-reporters-that-embed-screenshot-images) for setup details.

</details>

## Migrating from `@frsource/cypress-plugin-visual-regression-diff`

This plugin used to be published under the `@frsource` npm scope as `@frsource/cypress-plugin-visual-regression-diff`. It now lives in the [pixsame](https://github.com/pixsame) organization and is published as `@pixsame/cypress-plugin-visual-regression-diff`. If you still have the old `@frsource/...` package installed, moving over is just a rename: `@pixsame/cypress-plugin-visual-regression-diff` 1.0.0 is the code of `@frsource/cypress-plugin-visual-regression-diff` 4.2.1 with no behavior change, so your baseline images, configuration and `cy.*` commands keep working as they are. New installs don't need any of this, see [Getting started](#getting-started).

The quickest way to migrate is the built-in command shipped with the last `@frsource` release. It renames the dependency in every `package.json` below the current directory, updates imports and type references in your config and support files, and reinstalls with the package manager it finds:

```bash
npx @frsource/cypress-plugin-visual-regression-diff migrate
```

It lists the files it would change and asks before writing anything. Pass `--dry-run` to only see the list, `--yes` to skip the question (required in CI) and `--no-install` to skip the install step.

Prefer to do it by hand? Swap the package and replace the name in your imports:

```bash
npm uninstall @frsource/cypress-plugin-visual-regression-diff
npm install --save-dev @pixsame/cypress-plugin-visual-regression-diff
```

```diff
-import '@frsource/cypress-plugin-visual-regression-diff';
+import '@pixsame/cypress-plugin-visual-regression-diff';
-import { initPlugin } from '@frsource/cypress-plugin-visual-regression-diff/plugins';
+import { initPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';
```

If you list the package in `compilerOptions.types` of a `tsconfig.json`, rename it there too.

## Commercial support

The plugin is free and MIT-licensed, and it stays that way. It's also maintained by one person in his spare time, so if your team needs more than best-effort answers on the issue tracker, here's what I offer:

- **Setup and migration, fixed price.** I get the plugin (or its GitHub App) running in your CI, sort out the "works on my Mac, fails on Linux" baselines, and hand over a short write-up. Usually one to two days.
- **Priority support, monthly.** A private channel, a response within one business day, and your issues at the top of the pile. Covers the plugin, the manifest tooling and the GitHub App.
- **Feature work and consulting, hourly.** A missing option, an adapter for your runner, or just an hour to look at why your screenshots drift.

Write to [pixsame@frsource.org](mailto:pixsame@frsource.org) with a sentence about your setup and I'll reply with a quote. If you only want to say thanks, the Sponsor button at the top of this repository does that (GitHub Sponsors, Patreon or Buy Me a Coffee), and every sponsor is listed in the release notes.

Security problems have their own path: see [SECURITY.md](https://github.com/pixsame/pixsame/blob/main/SECURITY.md).

## Questions

Don’t hesitate to ask a question directly on the [discussions board](https://github.com/pixsame/pixsame/discussions)!

## Changelog

Changes for every release are documented in the [release notes](https://github.com/pixsame/pixsame/releases) and [CHANGELOG files of every package](https://github.com/pixsame/pixsame/tree/main/packages).

## License

[MIT](https://opensource.org/licenses/MIT)

Copyright (c) 2021-present, Jakub FRS Freisler, [FRSOURCE](https://www.frsource.org/)

<p align="center">
<a href="https://www.frsource.org/" title="Click to visit FRSOURCE page!">
<img src="https://www.frsource.org/logo.jpg" alt="FRSOURCE logo" height="60px"/>
</a>
</p>
