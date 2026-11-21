# pixsame

Command line for [pixsame](https://pixsame.com) visual regression testing. Run it in the directory with your `cypress.config.*` or `playwright.config.*`.

```bash
npx pixsame baselines
```

## `baselines [dir...]`

Finds the baseline screenshots stored before the page layout was recorded in them. New and replaced baselines carry the layout of the page (a small chunk inside the PNG, versioned with `@pixsame/analysis`), which lets a failed comparison say "One element moved down by 40 px" instead of only listing changed areas.

Old baselines keep working: they still compare, and are described from the pixels alone. They get the layout when your tests replace them. The Cypress and Playwright packages tell you once per run when they meet one (in Cypress also in the review carousel, in Playwright also in the HTML report) and point here.

```text
$ npx pixsame baselines
6 of 6 baselines lack the page layout (version 1): 6 without one, 0 from another version.
  cypress/e2e/__image_snapshots__/home_#0.png  no layout
  ...

They still compare. They get the layout when your tests replace them. Let the CLI run them:
  npx pixsame baselines --update

If that does not work, run the command yourself:
  npx cypress run --expose pluginVisualRegressionUpdateImages=true
```

The proposed command is the one for your runner: `--expose` for Cypress 15.10 and later, `--env` before that, and `PIXSAME_UPDATE_IMAGES=true npx playwright test` for Playwright. Cypress takes the option on the command line for a single run; Playwright takes it from the `PIXSAME_UPDATE_IMAGES` environment variable (`true` or `failures-only`), which overrides `updateImages` in your config.

### `--update`

Runs that command for you.

```bash
npx pixsame baselines --update
```

It finds the runner from the config in the current directory, shows the command and asks before running it. It asks for what it can't find:

- no config here: the path of the directory that has it
- both configs here: which runner
- Cypress not installed there: its version

Then it runs the tests, and checks the baselines again. It replaces every baseline in that run, like `updateImages: true`; add `--failures-only` for only the failing ones. Review and commit the changed images.

Without a terminal (CI, an agent) it can't ask, so it stops and names the flag that answers: `--dir <path>`, `--runner cypress|playwright`, `--cypress-version <x.y.z>`, `--yes`.

| Option                  | What it does                                             |
| ----------------------- | -------------------------------------------------------- |
| `--update`              | Run your tests once so the runner replaces the baselines |
| `--failures-only`       | With `--update`: replace only the failing baselines      |
| `--yes`                 | With `--update`: don't ask before running                |
| `--runner <name>`       | `cypress` or `playwright`                                |
| `--dir <path>`          | The directory with the runner config                     |
| `--cypress-version <v>` | Cypress version, when it isn't installed there           |
| `--json`                | Print the report as JSON, for scripts and agents         |

## `review [dir...]`

Opens a page to look at the failed comparisons of the last run and replace baselines, for any run that left a manifest (`visual-regression-manifest*.json`): Playwright, Cypress or `visual-regression-compare`.

```bash
npx pixsame review
```

It finds the manifests below `dir` (default: here), serves the page on `127.0.0.1` and opens it. For each failed comparison the page shows the sentence that says what changed, the baseline, actual and diff images (side by side, as a diff, or with a slider) and a **Replace baseline** button. The button copies the actual image over the baseline, deletes the actual and diff files and marks the entry `approved` in its manifest, like `visual-regression-compare approve`. Review the changed images and commit them. A baseline that changed since the run is not replaced.

The page is reachable only from this machine, at an address with a random token that the command prints, and it is gone when you press Ctrl-C.

| Option              | What it does                                                  |
| ------------------- | ------------------------------------------------------------- |
| `--no-open`         | Print the address, don't open a browser                       |
| `--port <n>`        | Serve on this port (default: a free one)                      |
| `--repo-root <dir>` | The repository the manifests' paths belong to (default: here) |

Run it from the repository root. When the manifest's project is outside the directory you run it in, the page says so and asks for `--repo-root`.

A PNG counts as a baseline when it was written by the plugins, already has a layout, or sits in a `snapshots`, `__screenshots__` or `*-snapshots` folder. Failure artifacts (`*.actual.png`, `*.diff.png`) and `node_modules` are skipped.

The command is the first of the `pixsame` CLI; `init`, `doctor` and the agent skills will live here too.
