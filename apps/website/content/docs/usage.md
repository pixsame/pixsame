---
title: Usage
description: Configure matchImage and keep your baselines tidy.
order: 2
---

# Usage

## Configure a comparison

Pass options to `matchImage` per call:

```ts
cy.matchImage({
  // forwarded to the Cypress screenshot API
  screenshotConfig: { blackout: ['.element-to-be-blackouted'] },
  // pixelmatch options
  diffConfig: { threshold: 0.01 },
  // create baselines that do not exist yet (default: true)
  createMissingImages: false,
  // overwrite baselines: true | 'failures-only' | false (default: false)
  updateImages: false,
});
```

## Clean up unused images

Remove baselines that no test uses anymore:

```bash
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
```

On Cypress older than 15.10 pass the same key with `--env` instead.

## More

The plugin README lists every option. Questions and ideas are welcome in [GitHub discussions](https://github.com/pixsame/pixsame/discussions).
