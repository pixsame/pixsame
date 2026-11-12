---
title: Usage
description: Configure matchImage and keep your baselines tidy.
order: 2
---

# Usage

The plugin adds a single command, `matchImage`. That's the whole API on the test side.

## Compare an element or the page

```ts
cy.get('.an-element-of-your-choice').matchImage();

// or the whole document
cy.matchImage();
```

## Configure a comparison

Options go in per call. The full list, with defaults, is on the [Configuration](/docs/reference/configuration) page. These are the ones people reach for first:

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

Baselines pile up when tests get renamed or deleted. This run removes every plugin image that no test touched:

```bash
npx cypress run --expose "pluginVisualRegressionCleanupUnusedImages=true"
```

Run the full suite when you do this. If you filter to a few specs, the baselines of the specs you skipped count as unused too.

On Cypress older than 15.10 there is no `--expose` yet. Pass the same key with `--env` instead.

## More

Everything else is on the [Configuration](/docs/reference/configuration) page. If something is unclear or you've got an idea, [GitHub discussions](https://github.com/pixsame/pixsame/discussions) is where we talk about it.
