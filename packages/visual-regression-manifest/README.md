<h1 align="center">pixsame manifest</h1>
<p align="center">The visual regression run manifest, as a free standard: JSON Schema, TypeScript types, reader, writer, merger and converters. Published as <code>@pixsame/manifest</code>.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@pixsame/manifest">
    <img src="https://img.shields.io/npm/v/@pixsame/manifest.svg" alt="NPM version badge">
  </a>
  <a href="https://github.com/pixsame/cypress-plugin-visual-regression-diff/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/pixsame/cypress-plugin-visual-regression-diff.svg" alt="license MIT badge">
  </a>
</p>

A **run manifest** is one JSON file per test run that lists every screenshot comparison the run made: which test it came from, whether it passed, failed, created or updated its baseline, the diff ratio, and where the baseline, actual and diff images are. Next to the entries it records where the run happened (CI provider, repository, commit, pull request, run id) and what it ran with (runner, browser, options), so a tool that runs _after_ the tests (a PR comment bot, a review dashboard, an approval tool) reads one file instead of parsing logs or walking the snapshots directory.

The format is **runner-agnostic**: the same file is written by [`@frsource/cypress-plugin-visual-regression-diff`](https://www.npmjs.com/package/@frsource/cypress-plugin-visual-regression-diff) (from 4.3 on), by its Playwright sibling (in preparation), and by the converters in this package for tools that write no manifest of their own. Only the `runner` block carries runner vocabulary.

This package has no runtime dependencies.

- [The format](#the-format)
- [Reading manifests](#reading-manifests)
- [Merging the manifests of a run](#merging-the-manifests-of-a-run)
- [Writing manifests](#writing-manifests)
- [Converting other outputs into a manifest](#converting-other-outputs-into-a-manifest)
- [Reference](#reference)

## The format

The normative description is the JSON Schema (draft 2020-12), shipped as `schema.json` (in the package, and in the repository under `src/`) and importable as `@pixsame/manifest/schema.json` or the `manifestSchema` export. The TypeScript types (`Manifest`, `ManifestEntry`, ...) mirror it. A trimmed example:

```jsonc
{
  "version": 1,
  "createdAt": "2026-09-22T10:00:00.000Z",
  "updatedAt": "2026-09-22T10:03:12.481Z",
  "projectRoot": "/home/runner/work/app/app", // every relative path below resolves against it
  "platform": { "os": "linux", "arch": "x64", "osVersion": "6.8.0-1021-azure" },
  "ci": {
    "provider": "github",
    "repository": "acme/app",
    "sha": "0f1e2d…", // on pull_request events: the merge commit
    "pullRequest": {
      "number": 42,
      "headSha": "9a8b7c…",
      "headRef": "feat/new-header",
      "baseRef": "main",
    },
    "runId": "1234567890",
    "runAttempt": "1",
    "url": "https://github.com/acme/app/actions/runs/1234567890/attempts/1",
    "workspace": "/home/runner/work/app/app", // the checkout directory
  },
  "options": { "updateImages": "failures-only" }, // the writer's global options, in its own vocabulary
  "runner": {
    "name": "cypress",
    "version": "16.1.0",
    "testingType": "e2e",
    "mode": "run",
  }, // only `name` is required
  "entries": [
    {
      "name": "home page renders_#0", // the baseline file stem
      "test": {
        "file": "cypress/e2e/home.cy.ts",
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
        "os": "linux",
        "arch": "x64",
        "browser": { "name": "chrome", "version": "130.0.0.0" },
      },
      "viewport": { "width": 1280, "height": 720 },
      "renderer": {
        "backend": "native",
        "browser": "chrome",
        "browserVersion": "130.0.0.0",
      },
      "hashes": { "baseline": "3b7e…", "actual": "9d21…", "diff": "c0ff…" }, // sha256, only for files that exist
      "message": "Image diff factor (2.31%) is bigger than maximum threshold option 1%.",
    },
  ],
}
```

| `status`           | meaning                                                 | `images.actual.path` | `images.diff.path` |
| ------------------ | ------------------------------------------------------- | -------------------- | ------------------ |
| `passed`           | within threshold                                        | `null`               | `null`             |
| `failed`           | above threshold, actual and diff images kept for review | path                 | path (if any)      |
| `missing-baseline` | no baseline and the tool was told not to create one     | path                 | `null`             |
| `created`          | no baseline, the actual image became the baseline       | `null`               | `null`             |
| `updated`          | baseline overwritten on request                         | `null`               | `null`             |
| `approved`         | baseline replaced from a review UI                      | `null`               | `null`             |

Rules every writer and reader follows:

- **Paths** are relative to `projectRoot` with `/` separators and may point outside the project (`../…`). `projectRoot` is the tested project, not necessarily the repository root: `ci.workspace` is the checkout directory.
- **`failed` and `missing-baseline` need a human.** Copying `images.actual.path` over `images.baseline.path` approves them. `baselineWritten` says whether the working tree changed, whatever the status.
- **`platform` is where the test ran, `renderer` is where the pixels came from.** Under `native` the renderer is the test browser itself. Entries with different renderers are different baselines.
- **Browsers are optional.** Desktop and mobile tools leave `platform.browser` out and describe what they captured in the entry's `target` (device, OS version, display density and orientation, locale, theme, app, driver). The run-level `platform` is the host that ran the tests, not necessarily the device. `renderer.backend` is an open string (`native`, `docker`, `cloud`, or your own, e.g. `device`); `renderer.name` names what rendered the pixels.
- **`variant` is the baseline identity you control.** Entries of the same screenshot name with a different `variant` (`iphone-16-ios18-dark`) never overwrite each other when manifests are merged. Without one, identity is `platform.os` + `platform.browser.name` + renderer.
- **Baseline, actual and diff share one image extension** (PNG for every current writer); `.actual` and `.diff` go before it.
- **Every entry is self-sufficient** (its own `platform`, `viewport`, `renderer`), so the entries of several manifests (a matrix of machines, one file per worker, e2e + component) can be merged.
- **One file per writer process**, named `visual-regression-manifest[.<label>].json`, rewritten after every comparison, so it is complete even when the run is aborted. `**/visual-regression-manifest{,.*}.json` (`MANIFEST_FILE_GLOB`) finds all of them in an artifact and nothing named merely alike. Merging warns when one run reports the same screenshot identity twice with different results; give such entries a distinct `variant`.
- **Consumers ignore keys they do not know.** `version` is bumped on breaking changes only.
- On GitHub `pull_request` events `ci.sha` is the temporary merge commit; use `ci.pullRequest.headSha` / `headRef` to write to the branch. `ci.runId` and `ci.runAttempt` locate the workflow artifact.

## Reading manifests

```ts
import {
  readManifestFiles,
  readManifestFile,
  parseManifest,
  ManifestParseError,
} from '@pixsame/manifest';

// every manifest below a directory (an unpacked CI artifact), sorted by path
const found = readManifestFiles('artifacts/test');
// -> [{ file: '.../visual-regression-manifest.e2e.json', manifest: {...} }, ...]

// one file
const manifest = readManifestFile(
  'cypress/screenshots/visual-regression-manifest.e2e.json',
);

// already-parsed JSON from anywhere (a zip entry, an HTTP body)
try {
  const manifest = parseManifest(
    json,
    'test.zip:visual-regression-manifest.e2e.json',
  );
} catch (error) {
  if (error instanceof ManifestParseError)
    console.error(error.message, error.issues);
}
```

`parseManifest` validates against the shipped schema with a small built-in interpreter (cross-checked against Ajv in the test suite); `validateManifest` returns the issues without throwing and `isManifest` is the type guard. Unknown keys pass through untouched.

## Merging the manifests of a run

A run usually produces several manifests. `mergeManifests` concatenates them into one list keyed by screenshot name, test file, platform and renderer, with a later CI attempt winning over an earlier one, and prepares what an approval tool needs:

```ts
import { mergeManifests, selectEntries } from '@pixsame/manifest';

const run = mergeManifests(
  found.map(({ file, manifest }) => ({ manifest, label: file })),
  { headSha: pr.head.sha, runId: workflowRun.id, repository: 'acme/app' },
);

run.counts; // { passed: 40, failed: 2, 'missing-baseline': 1, created: 0, updated: 0, approved: 0 }
run.needsHuman; // the failed and missing-baseline entries
run.warnings; // manifests written for another commit/run/repository, renderer fallbacks, unapprovable project roots
for (const {
  entry,
  repoPaths,
  keyHash,
  unapprovableReason,
  collidesWith,
} of run.needsHuman) {
  // repoPaths: baseline/actual/diff relative to the repository root (`null` when they escape it)
  // keyHash: a short stable id for buttons and commands
  // collidesWith: other entries writing the same baseline file (two platforms, one path)
}

// `/approve-visuals home_#0 "about_#0 (darwin / chrome)"`
const { entries, unknown } = selectEntries(run, { names: ['home_#0'] });
```

Any object with a `manifest` property is a source; extra properties (an artifact id, a zip path) come back on `MergedEntry.source` with their type.

## Writing manifests

Test-runner integrations use `ManifestWriter`: a builder bound to a file that rewrites it atomically on every change. For runs with thousands of screenshots pass `{ writeDelayMs: 200 }` as the third argument to coalesce the rewrites; pending changes are written on `flush()` and when the process exits (not if it is killed outright, which is why the default is `0`). A `passed` entry never lists `.actual` or `.diff` files, even when leftovers of an earlier run sit next to it, and test files are recorded normalised (`./a.spec.ts` and `a.spec.ts` are one file).

```ts
import { ManifestWriter, getManifestFileName } from '@pixsame/manifest';

const writer = new ManifestWriter(
  `output/${getManifestFileName('my-runner')}`,
  {
    projectRoot: process.cwd(),
    runner: { name: 'my-runner', version: '1.0.0' }, // add any runner-specific keys
    options: { threshold: 0.01 }, // your global options, verbatim
    // platform and ci are detected (GitHub Actions, GitLab CI) unless given
  },
);

writer.record({
  actualPath: 'shots/home.actual.png', // also the key: recording it again replaces the entry
  baselinePath: 'shots/home.png',
  // diffPath defaults to the `.diff` sibling; pass `null` when you write none
  testFile: 'e2e/home.spec.ts',
  titlePath: ['home', 'renders'],
  retry: 0, // a retry replaces the entries of the earlier attempts of that test
  status: 'failed',
  diffRatio: 0.02,
  threshold: 0.01,
  baselineWritten: false,
  actualSize: { width: 1280, height: 720 },
  platform: {
    os: process.platform,
    browser: { name: 'chromium', version: '130' },
  },
  message: '2% of pixels differ',
});
writer.approve({ actualPath: 'shots/home.actual.png' }); // after moving the actual over the baseline
writer.dropTestFile('e2e/home.spec.ts'); // before re-running a file in an interactive runner
writer.reset(); // start of a run: forget everything, delete the file
```

`ManifestBuilder` is the same without the file (`toJSON()` gives the manifest), and `writeManifestFile` is the atomic write on its own. The writer computes project-relative paths, `null`s images that do not exist, hashes the ones that do, derives a `native` renderer from `platform` and sorts entries by test file and name.

## Converting other outputs into a manifest

For tools that write no manifest, so that the same CI tooling works for them.

### Playwright's `toHaveScreenshot`

Run with the JSON reporter and convert the report:

```bash
npx playwright test --reporter=json > report.json
```

```ts
import fs from 'fs';
import { fromPlaywrightReport, writeManifestFile } from '@pixsame/manifest';

const manifest = fromPlaywrightReport(
  JSON.parse(fs.readFileSync('report.json', 'utf8')),
  {
    threshold: 0.01, // your maxDiffPixelRatio, the report does not carry it
    // snapshotPathTemplate / snapshotDir: only when changed in playwright.config
    // browsers: { chromium: { name: 'chromium', version: '130' } } for richer `platform` blocks
  },
);
writeManifestFile(
  'test-results/visual-regression-manifest.playwright.json',
  manifest,
);
```

Only comparisons that left files behind can be recovered: `failed` (expected, actual and diff attachments), `missing-baseline` and `created` (actual only). A passing `toHaveScreenshot` leaves no trace in the report, and of a retried test only the last attempt counts. Baseline paths are computed from the snapshot path template because the report only lists the copies in `test-results`; the diff ratio is parsed from the assertion message.

### Plain image files

For any tool that leaves a baseline and, on failure, an actual and a diff image next to it:

```ts
import { fromImageTriples } from '@pixsame/manifest';

const manifest = fromImageTriples({
  projectRoot: process.cwd(),
  runner: { name: 'my-tool' },
  triples: baselines.map((baseline) => ({ baseline })), // actual/diff default to `.actual`/`.diff` siblings
});
```

The status is inferred from which files exist (`inferStatus`), image sizes are read from the PNG headers, and every field can be given explicitly (`actual`, `diff`, `name`, `testFile`, `titlePath`, `status`, `diffRatio`, ...).

## Reference

| export                                                                                     | purpose                                                               |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `manifestSchema`, `./schema.json`                                                          | the JSON Schema                                                       |
| `Manifest`, `ManifestEntry`, `ManifestStatus`, `ManifestCi`, `ManifestRunner`, ...         | the types                                                             |
| `MANIFEST_VERSION`, `getManifestFileName`, `isManifestFileName`, `MANIFEST_FILE_GLOB`      | naming conventions                                                    |
| `MANIFEST_STATUSES`, `NEEDS_HUMAN_STATUSES`, `needsHuman`                                  | status vocabulary                                                     |
| `parseManifest`, `parseManifestJson`, `validateManifest`, `isManifest`                     | validation                                                            |
| `readManifestFile`, `readManifestFiles`, `findManifestFiles`                               | files                                                                 |
| `mergeManifests`, `selectEntries`, `entryKey`, `keyHash`, `platformLabel`, `countByStatus` | merging                                                               |
| `projectDirInRepo`, `toRepoPath`, `isSafeRelativePath`, `toPosix`                          | path helpers for approval tools                                       |
| `ManifestWriter`, `ManifestBuilder`, `writeManifestFile`, `createManifestHeader`           | writing                                                               |
| `detectCi`                                                                                 | the `ci` block from environment variables (GitHub Actions, GitLab CI) |
| `fromPlaywrightReport`, `fromImageTriples`, `inferStatus`                                  | converters                                                            |
| `readPngSize`                                                                              | width and height from a PNG header                                    |

## License

MIT
