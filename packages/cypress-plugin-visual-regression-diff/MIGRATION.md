# Migration Guide

## 4.x -> 5.x

### Batch Review Mode is enabled by default

[Batch Review Mode](./README.md#batch-review-mode) (introduced as opt-in in 4.2) is now the default.
`matchImage()` no longer throws on the first mismatch. Instead, every failing snapshot is collected,
a single error listing the number of failures is thrown once the spec finishes, and in headed mode
the failures can be reviewed and approved in bulk from the plugin's floating button.

- If you already had `pluginVisualRegressionBatchReviewMode: true` in your config, you can remove it.
- To keep the 4.x behaviour (fail immediately on the first mismatch), set the option explicitly to `false`:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionBatchReviewMode=false"
# Cypress <15.10
npx cypress run --env "pluginVisualRegressionBatchReviewMode=false"
```

```ts
// cypress.config.ts (Cypress 15.10+; use `env` instead of `expose` on Cypress <15.10)
export default defineConfig({
  expose: {
    pluginVisualRegressionBatchReviewMode: false,
  },
});
```

### Anti-aliased pixels no longer count as differences

The comparison used to run `pixelmatch` with `includeAA: true`, so every anti-aliased edge pixel that
rendered slightly differently counted towards the diff ratio. This is the main reason the same page
"failed" between macOS and Linux. The plugin now uses pixelmatch's own default, `includeAA: false`:
anti-aliased pixels are detected and ignored.

- Diff ratios get smaller, so some comparisons that failed before now pass. Nothing else changes:
  baseline images are neither affected nor regenerated.
- To keep the 4.x behaviour, set `includeAA` explicitly, globally or per call:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionDiffConfig={\"includeAA\":true}"
# Cypress <15.10
npx cypress run --env "pluginVisualRegressionDiffConfig={\"includeAA\":true}"
```

```ts
// cypress.config.ts (Cypress 15.10+; use `env` instead of `expose` on Cypress <15.10)
export default defineConfig({
  expose: {
    pluginVisualRegressionDiffConfig: { includeAA: true },
  },
});
```

```ts
cy.matchImage({ diffConfig: { includeAA: true } });
```

### Deterministic rendering preset is enabled

The plugin now launches Chrome, Chromium and Edge with switches that make text rendering independent
of the operating system (`--font-render-hinting=none`, `--disable-font-subpixel-positioning`,
`--disable-lcd-text`, `--force-color-profile=srgb`, `--disable-gpu`, plus `--hide-scrollbars` in
headless mode), sets `gfx.webrender.software` for Firefox, and injects a stylesheet into the tested
page for the duration of every screenshot (hidden caret, no transitions/animations, no scrollbars).
See [Reducing cross-OS rendering noise](./README.md#reducing-cross-os-rendering-noise).

- Expect small differences against baselines created with 4.x on the first run, because text is now
  rasterised without hinting. Run once with `pluginVisualRegressionUpdateImages=true` (or
  `'failures-only'`), or approve the changes in Batch Review Mode, and commit the result.
- Edge now also receives the `forceDeviceScaleFactor` switches; 4.x only handled `chrome` and
  `chromium`. Electron is unchanged (Cypress does not let plugins pass switches to it) - use
  `ELECTRON_EXTRA_LAUNCH_ARGS` as described in the README.
- `pluginVisualRegressionForceDeviceScaleFactor=false` passed on the CLI (the string `'false'`) now
  disables the preset like the boolean does.
- To turn the preset off:

```bash
# Cypress 15.10+
npx cypress run --expose "pluginVisualRegressionDeterministicRendering=false"
# Cypress <15.10
npx cypress run --env "pluginVisualRegressionDeterministicRendering=false"
```

```ts
// cypress.config.ts (Cypress 15.10+; use `env` instead of `expose` on Cypress <15.10)
export default defineConfig({
  expose: {
    pluginVisualRegressionDeterministicRendering: false,
  },
});
```

### Node.js 20.9+ required

The declared minimum Node.js version is now `>=20.9.0`. This only makes the requirement of `sharp`
(a dependency since v4) explicit - older Node.js versions could not install the plugin before either.

### PNG files are now written by sharp (libvips)

Decoding, padding and encoding of screenshots during comparison moved from `pngjs` (pure JavaScript)
to `sharp`, which is many times faster and produces smaller files. Consequences:

- **No action is needed.** Baseline images created by 4.x are still read and compared exactly as
  before; the comparison algorithm (`pixelmatch`) and the plugin metadata stored in the images are unchanged.
- PNG files written by the plugin (baselines, `.actual.png`, `.diff.png`) now have different bytes
  than 4.x would have produced, while the pixels are identical. Expect existing baselines to show up
  as modified in git the next time they get updated by the plugin.
- When compared screenshots have different sizes, the smaller one is padded with translucent black
  (`rgba(0, 0, 0, 64)`) as before; the padding now also covers the very first padded row and column,
  which 4.x left transparent.
- `pngjs` is no longer a dependency of the plugin. If your project used `pngjs` without declaring it
  (relying on hoisting), add it to your own `package.json`.

## 4.0.x -> 4.1.x

### Migrating to Cypress 16 (`Cypress.expose` API)

Cypress 16 removes `Cypress.env()` in favor of the new `Cypress.expose()` API (introduced in Cypress 15.10.0).
This plugin supports both APIs automatically based on the detected Cypress version:

- **Cypress ≥ 15.10** – reads plugin options via `Cypress.expose()` / `config.expose`
- **Cypress < 15.10** – reads plugin options via `Cypress.env()` / `config.env` (legacy)

No code change is required inside your tests. You only need to update **how you supply plugin options**.

### What changed

| Location            | Before (all Cypress versions) | After (Cypress ≥ 15.10)                     |
| ------------------- | ----------------------------- | ------------------------------------------- |
| CLI flag            | `--env "key=value"`           | `--expose "key=value"`                      |
| `cypress.config.ts` | `env: { key: value }`         | `expose: { key: value }`                    |
| `cypress.env.json`  | `{ "key": "value" }`          | use `expose` in `cypress.config.ts` instead |

### Plugin option names

All option names stay the same — they are prefixed with `pluginVisualRegression`:

| Option                   | Config key                                     |
| ------------------------ | ---------------------------------------------- |
| `updateImages`           | `pluginVisualRegressionUpdateImages`           |
| `cleanupUnusedImages`    | `pluginVisualRegressionCleanupUnusedImages`    |
| `diffConfig`             | `pluginVisualRegressionDiffConfig`             |
| `forceDeviceScaleFactor` | `pluginVisualRegressionForceDeviceScaleFactor` |
| `maxDiffThreshold`       | `pluginVisualRegressionMaxDiffThreshold`       |

### CLI

```bash
# Before (deprecated in 15.10, removed in 16)
npx cypress run --env "pluginVisualRegressionUpdateImages=true"

# After (Cypress ≥ 15.10)
npx cypress run --expose "pluginVisualRegressionUpdateImages=true"
```

### cypress.config.ts

```ts
// Before
export default defineConfig({
  env: {
    pluginVisualRegressionUpdateImages: true,
    pluginVisualRegressionDiffConfig: { threshold: 0.01 },
  },
});

// After (Cypress ≥ 15.10)
export default defineConfig({
  expose: {
    pluginVisualRegressionUpdateImages: true,
    pluginVisualRegressionDiffConfig: { threshold: 0.01 },
  },
});
```

### cypress.env.json

`cypress.env.json` only works with `Cypress.env()` and is not supported by the `expose` API.
Migrate any plugin options from `cypress.env.json` into the `expose` block of `cypress.config.ts`.

```jsonc
// cypress.env.json — REMOVE these plugin keys:
{
  // "pluginVisualRegressionUpdateImages": true,  ← move to cypress.config.ts expose block
}
```

### Supporting both Cypress 15.x and 16.x simultaneously

If you need your config to work on both Cypress 15.9 and below **and** 15.10+, you can supply the
option in both places — the plugin will prefer `expose` on newer Cypress and fall back to `env` on
older ones:

```ts
export default defineConfig({
  expose: {
    pluginVisualRegressionUpdateImages: true,
  },
  env: {
    pluginVisualRegressionUpdateImages: true, // fallback for Cypress < 15.10
  },
});
```

### References

- [Cypress `Cypress.env()` migration guide](https://docs.cypress.io/app/references/migration-guide#Migrating-away-from-Cypressenv)
- [Cypress `expose` API docs](https://on.cypress.io/expose)
- [Issue #375](https://github.com/pixsame/pixsame/issues/375)
