# pixsame

Command line for [pixsame](https://pixsame.com) visual regression testing.

```bash
npx pixsame baselines
```

## `baselines [dir...]`

Finds the baseline screenshots stored before the page layout was recorded in them. New and replaced baselines carry the layout of the page (a small chunk inside the PNG, versioned with `@pixsame/analysis`), which lets a failed comparison say "One element moved down by 40 px" instead of only listing changed areas.

Old baselines keep working: they still compare, and are described from the pixels alone. They get the layout when your update option replaces them:

| Runner     | How                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| Cypress    | `pluginVisualRegressionUpdateImages=true` replaces every baseline, `'failures-only'` only the ones that fail |
| Playwright | `--update-snapshots`                                                                                         |

```text
$ npx pixsame baselines
6 of 6 baselines lack the page layout (version 1): 6 without one, 0 from another version.
  cypress/e2e/__image_snapshots__/home_#0.png  no layout
  ...
```

| Option    | What it does                                      |
| --------- | ------------------------------------------------- |
| `--json`  | Prints the report as JSON, for scripts and agents |
| `--check` | Exits with 1 when any baseline lacks the layout   |

A PNG counts as a baseline when it was written by the plugins, already has a layout, or sits in a `snapshots`, `__screenshots__` or `*-snapshots` folder. Failure artifacts (`*.actual.png`, `*.diff.png`) and `node_modules` are skipped. Run it on your folders or from the project root.

The command is the first of the `pixsame` CLI; `init`, `doctor` and the agent skills will live here too.
