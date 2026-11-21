---
title: Give old baselines their layout
description: Add the page layout to baselines saved before pixsame recorded it, so failed comparisons can say what moved.
order: 4
---

# Give old baselines their layout

Your old baselines keep working. New and replaced baselines also record the layout of the page, so a failed comparison can say what moved instead of only listing changed areas. See which baselines still lack it:

```bash
npx pixsame baselines
```

Then let the CLI run your tests once so the runner replaces them. Run it in the directory with your `cypress.config.*` or `playwright.config.*`; it shows the command, asks before running it and asks for anything it can't find on its own (such as the config's directory):

```bash
npx pixsame baselines --update
```

It replaces every baseline in that run, like `pluginVisualRegressionUpdateImages=true`. Add `--failures-only` to replace only the failing ones. Commit the result.
