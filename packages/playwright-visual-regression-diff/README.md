# @frsource/playwright-visual-regression-diff

Visual regression testing for [Playwright](https://playwright.dev) with the same `matchImage` flow, baseline layout, run manifest and CI tooling as [`@frsource/cypress-plugin-visual-regression-diff`](../cypress-plugin-visual-regression-diff/README.md), plus an optional **remote browser in Docker** so that the pixels you approve locally are the pixels CI produces.

> Status: 0.x, published on the `next` dist-tag: options may still change. The API below is small on purpose and may still move before 1.0.

## Why another Playwright screenshot tool

Playwright ships `toHaveScreenshot()`, and it is good. This package exists for teams that already use the Cypress plugin (or its GitHub App) and want one baseline format, one manifest and one review workflow across both runners:

- **Same comparison.** `pixelmatch` with `includeAA: false`, the same padding for size mismatches, the same `<name>_#n.png` / `.actual.png` / `.diff.png` files, the same PNG marker. A baseline recorded by the Cypress plugin is a valid baseline here and vice versa.
- **Same run manifest.** Every comparison lands in a `visual-regression-manifest.playwright.w<n>.json` next to Playwright's test results, written through [`@frsource/visual-regression-manifest`](https://www.npmjs.com/package/@frsource/visual-regression-manifest), the runner-agnostic standard the GitHub App and other consumers read. Only the `runner` block is Playwright-specific.
- **Drift-free pixels without leaving your machine.** `remoteBrowser()` runs the browser inside the official Playwright image and keeps the test runner, your app and your editor native. Local and CI screenshots then come from the same browser build, fonts and rasteriser.

## Install

```bash
npm i -D @frsource/playwright-visual-regression-diff
```

`@playwright/test` >= 1.40 is a peer dependency. Node.js >= 20.9. Pre-releases are published on the `next` dist-tag: `npm i -D @frsource/playwright-visual-regression-diff@next`.

## Use

```ts
// tests/home.spec.ts
import { test, expect } from '@frsource/playwright-visual-regression-diff';

test('home page', async ({ page, matchImage }) => {
  await page.goto('/');
  await matchImage(); // whole viewport, named after the test
  await matchImage(page.getByRole('navigation'), { title: 'nav' });
});
```

`test` is Playwright's `test` extended with a `matchImage` fixture. If you already extend `test` yourself, merge the fixtures instead:

```ts
import { test as base } from '@playwright/test';
import { visualRegressionFixtures } from '@frsource/playwright-visual-regression-diff';

export const test = base.extend(visualRegressionFixtures);
```

`matchImage(target?, options?)` takes a screenshot of `target` (a `Page` or a `Locator`, the page by default), compares it with the baseline and:

- **passes** when the share of differing pixels is within `maxDiffThreshold`, leaving only the baseline on disk;
- **creates** the baseline from the screenshot when there is none (`createMissingImages`, on by default);
- **fails** the test otherwise, keeps `<name>.actual.png` and `<name>.diff.png` next to the baseline and attaches baseline, actual and diff to the Playwright report.

It resolves to `{ status, message, diffValue, imgPath, imgNewPath, imgDiffPath, img, imgNew, imgDiff }`.

### Options

Per call, or globally through `use` in `playwright.config.ts`:

```ts
export default defineConfig({
  use: {
    visualRegression: {
      maxDiffThreshold: 0.01,
      imagesPath: '{spec_path}/__image_snapshots__',
    },
    // where each worker writes its manifest (relative to rootDir); `false` turns it off
    // default: `<outputDir>/visual-regression-manifest.playwright.w<parallelIndex>.json`
    visualRegressionManifestPath: undefined,
  },
});
```

| option                   | default                             | meaning                                                                                                                                                                                                                                                      |
| ------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `imagesPath`             | `'{spec_path}/__image_snapshots__'` | Where baselines live; relative paths resolve against `rootDir`. Tokens: `{spec_path}` (directory of the test file, whole segment only), `{platform}` (`{os}-{browser}`), `{os}` (`linux`, `darwin`, `win32`), `{browser}` (`chromium`, `firefox`, `webkit`). |
| `maxDiffThreshold`       | `0.01`                              | Maximum share of differing pixels, 0..1.                                                                                                                                                                                                                     |
| `diffConfig`             | `{}`                                | [pixelmatch options](https://github.com/mapbox/pixelmatch#pixelmatchimg1-img2-output-width-height-options); `includeAA: false` unless you say otherwise.                                                                                                     |
| `createMissingImages`    | `true`                              | Create the baseline from the first screenshot instead of failing.                                                                                                                                                                                            |
| `updateImages`           | `false`                             | `true` overwrites every baseline without comparing; `'failures-only'` compares first and overwrites only the ones above the threshold.                                                                                                                       |
| `title`                  | test title path joined by spaces    | Screenshot name; repeated names within a test get `_#0`, `_#1`, ...                                                                                                                                                                                          |
| `matchAgainstPath`       |                                     | Compare against this file instead of the derived baseline path (never token-expanded).                                                                                                                                                                       |
| `screenshotConfig`       | `{}`                                | Passed to `page.screenshot()` / `locator.screenshot()`, e.g. `{ fullPage: true, mask: [...] }`.                                                                                                                                                              |
| `deterministicRendering` | `true`                              | Disables CSS animations and hides the caret for the screenshot (`animations: 'disabled'`, `caret: 'hide'`).                                                                                                                                                  |

Screenshots are taken at the context's `deviceScaleFactor` (1 by default); nothing is rescaled.

### Baselines per browser or platform

Playwright projects commonly run the same test in several browsers. Add `{browser}` (or `{platform}`) to `imagesPath` so each gets its own folder:

```ts
use: {
  visualRegression: {
    imagesPath: '{spec_path}/__image_snapshots__/{browser}';
  }
}
```

## Remote browser in Docker

Chrome hands text rasterisation to the OS, so a macOS screenshot never matches a Linux CI screenshot byte for byte. Playwright can split the runner from the browser, which is the cleanest fix: the tests, your dev server and your editor stay on the host, only the browser runs in a pinned image.

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import { remoteBrowser } from '@frsource/playwright-visual-regression-diff/remote';

const remote = remoteBrowser({ keepAlive: true });

export default defineConfig({
  globalSetup: remote.globalSetup,
  globalTeardown: remote.globalTeardown,
  use: {
    connectOptions: remote.connectOptions,
    baseURL: 'http://localhost:3000',
  },
});
```

What happens: the global setup finds or starts a container from `mcr.microsoft.com/playwright:v<your @playwright/test version>-noble` running `playwright run-server`, waits until it answers, and every test connects to it through Playwright's own `connectOptions`. `exposeNetwork: '<loopback>'` (the default) lets the remote browser reach `localhost` of the machine running the tests, so a dev server needs no changes. All three browsers are in the image, so `browserName` picks the one you want.

| option              | default                                         |                                                                                                     |
| ------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `port`              | `3000`                                          | Host port; fixed because `playwright.config` needs the endpoint before anything runs.               |
| `playwrightVersion` | detected from `node_modules`                    | Has to equal the version your tests run with; the image tag is derived from it.                     |
| `image`             | `mcr.microsoft.com/playwright:v<version>-noble` | Any image that can run `npx playwright run-server`.                                                 |
| `keepAlive`         | `false`                                         | Leave the container running so the next `playwright test` skips the cold start.                     |
| `exposeNetwork`     | `'<loopback>'`                                  | Playwright's `connectOptions.exposeNetwork`; `false` to disable (then use `host.docker.internal`).  |
| `dockerArgs`        | `[]`                                            | Extra `docker run` arguments, e.g. `['--platform=linux/amd64']` for parity with an amd64 CI runner. |
| `startTimeoutMs`    | `600000`                                        | Includes the image pull on first use (about 2 GB).                                                  |

Things to know:

- The first run pulls the image, which takes minutes. `docker pull` it ahead of time or bake it into your CI image.
- Docker is detected, never launched. When the daemon is not reachable the error says so, with the fix; nothing falls back silently. Anything speaking the Docker API works (Docker Desktop, OrbStack, Colima, Podman with the docker CLI, Rancher Desktop).
- Rendering in the container has full fidelity: canvas, WebGL, video frames and cross-origin frames are all real. What you trade is the local browser's fonts and a few hundred milliseconds of connection setup.
- Keep remote baselines apart from native ones, for instance with `imagesPath: '{spec_path}/__image_snapshots__/remote-{browser}'` in the remote config. The manifest records the difference either way (see below).
- For byte-identical CI, run the same image there: on GitHub Actions, `container: { image: mcr.microsoft.com/playwright:v<version>-noble }` on the job, no `remoteBrowser()` needed.

## Run manifest

Each worker writes `<outputDir>/visual-regression-manifest.playwright.w<parallelIndex>.json` (Playwright clears `outputDir` at the start of a run, so there are never stale files). The file is written through [`@frsource/visual-regression-manifest`](https://www.npmjs.com/package/@frsource/visual-regression-manifest), which owns the format: the JSON Schema, the TypeScript types, a validating reader and a merger that treats the files of several workers like the manifests of several machines. Consumers glob `**/*visual-regression-manifest*.json` (`MANIFEST_FILE_GLOB` in that package), so the GitHub App and other tooling built for the Cypress plugin pick these files up unchanged.

Two blocks are worth calling out:

- `runner`: `{ name: 'playwright', version, mode: 'run', configFile, browser, baseUrl, viewport, retries, project, testDir, outputDir, workers, shard, parallelIndex }`.
- `renderer` (per entry): where the pixels came from. `{ backend: 'native', browser, browserVersion }` for a locally installed browser; `{ backend: 'docker', browser, browserVersion, rendererVersion, imageDigest }` when `remoteBrowser()` is in use, where `rendererVersion` is the Playwright version of the image and `imageDigest` its content digest. Entries with different renderers are different baselines; the GitHub App keys and labels them separately.

Every entry records the resolved `matchImage` options in the shared vocabulary (`imagesPath`, `maxDiffThreshold`, `diffConfig`, `createMissingImages`, `updateImages`, `title`, `matchAgainstPath`, `screenshotConfig` without callbacks). `forceDeviceScaleFactor` is always `false` here: Playwright screenshots come at the context's `deviceScaleFactor`.

The `visualRegressionManifest` worker fixture exposes the underlying `ManifestWriter` (`null` when `visualRegressionManifestPath: false`) if you want to record something yourself.

## Relation to the Cypress plugin and what is next

This package is the Playwright adapter from the renderer design that drives v5 of the Cypress plugin. Cypress cannot drive a remote browser, so there the plan is a DOM-snapshot sidecar; Playwright can, so the remote browser came first here. Planned next, in this order:

1. A shared core package for the comparison and the path tokens (today that code is mirrored between the two packages; the manifest is already shared through `@frsource/visual-regression-manifest`).
2. `{browser}` naming the renderer's browser explicitly once several renderers per run are possible.
3. DOM-snapshot capture (`page.evaluate` + `page.on('response')`) for the hosted renderer and for uploading snapshots alongside images.
4. A `toMatchImage()` matcher for people who prefer `expect(page).toMatchImage()` over the fixture.

## Development

```bash
pnpm --filter @frsource/playwright-visual-regression-diff build
pnpm --filter @frsource/playwright-visual-regression-diff test:integration     # unit tests, no browser needed
pnpm --filter @frsource/playwright-visual-regression-diff test:smoke           # needs `npx playwright install chromium`
pnpm --filter @frsource/playwright-visual-regression-diff test:smoke:remote    # needs Docker; pulls the Playwright image
```

The unit and smoke tests import `@frsource/visual-regression-manifest` from the workspace, so build that package first (`pnpm --filter visual-regression-manifest build`). The smoke tests write their baselines to `e2e/__image_snapshots__` (gitignored): the first run creates them, the second compares.
