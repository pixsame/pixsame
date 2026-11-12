---
title: Configuration
description: Every option of the pixsame Cypress plugin, per call or globally, plus batch review mode.
order: 1
---

# Configuration

Every option works in two places: per call, as an argument to `matchImage`, or once for the whole run. The global keys are the per-call names with `pluginVisualRegression` in front, so `updateImages` becomes `pluginVisualRegressionUpdateImages`.

## Options

- per call, as an argument to `matchImage`. The comments carry the defaults:

```ts
cy.matchImage({
  // screenshot configuration, passed directly to the the Cypress screenshot method: https://docs.cypress.io/api/cypress-api/screenshot-api#Arguments
  // default: { }
  screenshotConfig: {
    blackout: ['.element-to-be-blackouted'],
  },
  // pixelmatch options, see: https://www.npmjs.com/package/pixelmatch#pixelmatchimg1-img2-output-width-height-options
  // default: { includeAA: true }
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
  // default: true
  forceDeviceScaleFactor: false,
  // title used for naming the image file
  // default: Cypress.currentTest.titlePath (your test title)
  title: `${Cypress.currentTest.titlePath.join(' ')} (${Cypress.browser.displayName})`,
  // pass a path to custom image that should be used for comparison
  // instead of checking against the image from previous run
  // default: undefined
  matchAgainstPath: '/path/to/reference-image.png',
});
```

- for the whole run, through Cypress [expose configuration](https://on.cypress.io/expose) (Cypress 15.10+). Same keys as above, prefixed with `pluginVisualRegression`:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
# Cypress <15.10 (deprecated in 15.10, removed in 16)
npx cypress run --env "pluginVisualRegressionUpdateImages=true,pluginVisualRegressionDiffConfig={\"threshold\":0.01}"
```

Several options go in one flag, comma-separated. Don't repeat `--expose` (or `--env`): Cypress keeps only the last one and drops the rest without a word.

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

Cypress documents the other ways to set expose variables [here](https://on.cypress.io/expose).

## Clean up unused images

Rename or delete a test and its baseline stays behind. Run once with this key and the plugin deletes every one of its images that no test touched during that run. Run the full suite when you do, or the baselines of the specs you skipped go too:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
# Cypress <15.10 (deprecated in 15.10, removed in 16)
npx cypress run --env "pluginVisualRegressionCleanupUnusedImages=true"
```

## Batch review mode

Normally a snapshot over the threshold throws right there in the test. Batch review mode lets the suite run to the end instead and collects every failing snapshot, then throws once with the total. In headed mode you get a carousel after the run and go through the failures one by one, replacing or skipping each baseline. It's a global option, so it can't be passed to `matchImage`. Turn it on with `pluginVisualRegressionBatchReviewMode`, and add `pluginVisualRegressionBatchReviewModeShowPassingImages` if you want the passing images in the carousel too:

```bash
# Cypress 15.10+
npx cypress open --expose "pluginVisualRegressionBatchReviewMode=true"
# Cypress <15.10 (deprecated in 15.10, removed in 16)
npx cypress open --env "pluginVisualRegressionBatchReviewMode=true"
```

There's a demo of the review UI in the [batch review mode section](/products/cypress-plugin#batch-review-mode) of the Cypress plugin page.
