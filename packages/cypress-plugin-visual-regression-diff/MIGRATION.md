# Migration Guide

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
