# pixsame

Command line for [pixsame](https://pixsame.com) visual regression testing. Run it in the directory with your `cypress.config.*` or `playwright.config.*`.

```bash
npx pixsame baselines
```

## `baselines [dir...]`

Finds the baseline screenshots stored before the page layout was recorded in them. New and replaced baselines carry the layout of the page (a small chunk inside the PNG, versioned with `@pixsame/analysis`), which lets a failed comparison say "One element moved down by 40 px" instead of only listing changed areas.

Old baselines keep working: they still compare, and are described from the pixels alone. They get the layout when your tests replace them.

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
| `--check`               | Exit with 1 when any baseline lacks the layout           |

`--check` is for after the migration: it fails until every baseline has been replaced once, so don't add it to CI before that.

A PNG counts as a baseline when it was written by the plugins, already has a layout, or sits in a `snapshots`, `__screenshots__` or `*-snapshots` folder. Failure artifacts (`*.actual.png`, `*.diff.png`) and `node_modules` are skipped.

The command is the first of the `pixsame` CLI; `init`, `doctor` and the agent skills will live here too.
