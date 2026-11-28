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

It finds the manifests below `dir` (default: here), serves the page on `127.0.0.1` and opens it. For each failed comparison the page shows the sentence that says what changed, the baseline, actual and diff images (side by side, as a diff, or with a slider) and a **Replace baseline** button. When the run recorded what changed element by element, each change is a numbered pin on the images and a line in a list above them: hover either one to see the element outlined. Changes that start at the same corner share one pin. Changes with no place on the image are under "Other findings". The button copies the actual image over the baseline, deletes the actual and diff files and marks the entry `approved` in its manifest, like `visual-regression-compare approve`. Review the changed images and commit them. A baseline that changed since the run is not replaced.

The page is reachable only from this machine, at an address with a random token that the command prints, and it is gone when you press Ctrl-C.

| Option              | What it does                                                  |
| ------------------- | ------------------------------------------------------------- |
| `--no-open`         | Print the address, don't open a browser                       |
| `--out <file>`      | Write the page as one HTML file instead of serving it         |
| `--port <n>`        | Serve on this port (default: a free one)                      |
| `--repo-root <dir>` | The repository the manifests' paths belong to (default: here) |

`npx pixsame review --out report.html` writes the same page as one file with the images inside it: a report of the failed comparisons to keep or to upload from CI, for a Playwright or a Cypress run alike. It shows the pins and the lists, and has no **Replace baseline** button.

Run it from the repository root. When the manifest's project is outside the directory you run it in, the page says so and asks for `--repo-root`.

## `snap <url>`

Says what changed on a page since you started editing, without a test. Made for coding agents and for a quick check by hand.

```bash
npx pixsame snap http://localhost:3000/cart   # before the edit: saves the first capture
# ...edit...
npx pixsame snap http://localhost:3000/cart   # after: says what is different
```

```
http://localhost:3000/cart at 1280x800: 2 changes since the first capture on commit 25b0fb7:
  - button.checkout "Checkout": border-radius 8px → 4px, padding 12px → 16px; resized 80.3x39 → 88.3x47
  - 1 element moved down by 8 px: p "Total: 24.99"
```

Each line is one fact: an element that was added, removed or changed its text or look (named by property where it is one of font, letter spacing, text alignment, decoration or case, colour, background colour or image, opacity, filter, transform, border, border radius, shadow, outline, padding, gap, margin or flex order: `border-radius 8px → 4px`), an element with such a change that shows only on what is around or inside it (a margin, an opacity on a wrapper), a group of elements that moved by the same offset (the outermost one is named: a row, not the icon in it), an element that changed size (a narrower box is named once, with how many elements narrowed with it), or an area where pixels changed and the page's layout does not say why (a canvas, a picture). An element that came or went is one line however much it holds (`removed div.card with the 8 elements inside it`). For such an area, and for a look that changed in a way none of those properties names (a clip path, a blend mode), the command writes a before and an after crop and prints their paths.

Both captures come from the same browser on the same machine, so `snap` reports a change even when its pixels differ by less than a test would count, and marks the line `(faint: the pixels differ by less than a test counts)`. "No change" means the layout names no change that any pixel shows.

Some things are drawn a little differently every time (a rotated box, a canvas). `snap` leaves those pixels out, and still reports a change the page's layout names on such an element, when both captures of the page as it is now agree on it. The line ends with `(from the page's layout alone: the pixels there change by themselves)`. A clock or a counter differs between the two captures in the layout too, so it stays left out.

How it works:

- The first capture of an address after the last commit is what later captures are compared with. A new commit starts over; `--reset` does it by hand.
- Every capture is taken twice. What differs between the two (a clock, a carousel) is left out of the comparison, and the output says so.
- Captures live in `.pixsame/snaps/`, which ignores itself in git. Nothing is committed.
- It uses the Chrome installed on your machine, in Cypress projects too. Nothing is downloaded.

| Option                   | What it does                                                                                             |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `--selector <css>`       | Capture one element instead of the window                                                                |
| `--viewport <WxH>`       | Window size, repeatable (default: `1280x800`)                                                            |
| `--storage-state <file>` | A Playwright storage state, for pages behind a login                                                     |
| `--only <css>`           | The element you meant to change, repeatable; see below                                                   |
| `--keep`                 | Also mark this page to become a test; `--report` lists it                                                |
| `--report`               | No capture: print what the captures found, as Markdown for a pull request                                |
| `--check`                | No address: capture every page of this session again and print what changed since each was last captured |
| `--hook claude`          | With `--check`: answer as a Claude Code Stop hook                                                        |
| `--reset`                | Forget the first capture of this page and take a new one                                                 |
| `--no-stable`            | Capture once: do not look for what changes by itself                                                     |
| `--all`                  | Print every change (default: the first 100)                                                              |
| `--json`                 | Print the result as JSON: the facts as data, the files, the commit                                       |

### `--only`: did anything else change?

Name the element you meant to change and the command checks the rest for you:

```bash
npx pixsame snap http://localhost:3000/cart --only '.checkout-button'
```

```
http://localhost:3000/cart at 1280x800: 3 changes since the first capture on commit 25b0fb7, 1 of them NOT on .checkout-button:
  - OUTSIDE: text changed on h1: "Cart" → "Basket"
  - button.checkout "Checkout": border-radius 8px → 4px, padding 12px → 16px; resized 80.3x39 → 88.3x47
  - 1 element moved down by 8 px: p "Total: 24.99"
```

A change is inside when it is on that element or on something in it, or when it is a move the element caused: the element is new or changed size, and what moved started at or below its top edge (at or right of its left edge). Everything else is marked `OUTSIDE:`, printed first, and makes the command exit with 1.

When the named element itself sits elsewhere and nothing about it changed, something else moved it, and that counts as outside too. A change to its own margin, padding or gap is a change of its own, so what that pushes aside counts as inside.

### Exit codes

| Code | Meaning                                                                                    |
| ---- | ------------------------------------------------------------------------------------------ |
| 0    | The capture worked: first capture, no change, or changes (all inside `--only`, when given) |
| 1    | With `--only`: something outside the named elements changed                                |
| 2    | The command or the setup is wrong; the message says what to do                             |

### `--check`: what changed that nobody looked at?

```bash
npx pixsame snap --check
```

Captures every page of the session again, each with the options it was last captured with, and prints those whose changes are not the ones the last capture showed. It exits with 1 when it printed something. What it prints counts as shown, so the same change is reported once.

It is what the Stop hook runs (see `init --hook` below): an agent that captured a page, edited and never looked again is told before it finishes.

### For coding agents

The [`pixsame-verify`](../../skills/pixsame-verify) skill, shipped in this package under `skills/`, teaches an agent the loop: capture before editing, edit, capture with `--only`, fix what is marked `OUTSIDE:`, and paste `pixsame snap --report` into the pull request. `pixsame init` installs it.

How much this helps is measured in the [benchmark](../../benchmark/README.md): on ten pages `snap` was never adjusted to, Claude Sonnet 5.5 in Claude Code found 94% of single-property changes from two screenshots and 99% from the `snap` output, at a third of the cost per check. Screenshots mostly missed line height and padding. Gemini 4 Carbon, asked later about the same pages, found 92% and 100%. It is two models and one kind of change (a single CSS property), so read it as that.

## `init`

Sets a project up for coding agents. Setting up the test runner is not part of this command yet.

```bash
npx pixsame init          # copy the agent skills into .claude/skills
npx pixsame init --hook   # and add the Stop hook for Claude Code
```

It lists the files it will write, asks once, and writes them. Run it again after updating pixsame to get the current skills; it replaces only files that differ and says which.

| Option               | What it does                                                                      |
| -------------------- | --------------------------------------------------------------------------------- |
| `--hook`             | Also add a Stop hook to `.claude/settings.json`, next to what is there            |
| `--skills-dir <dir>` | Where the skills go, repeatable (default: `.claude/skills` at the repository top) |
| `--yes`              | Do not ask before writing                                                         |

Skills follow the [Agent Skills](https://agentskills.io) format, which other agents read too. Point `--skills-dir` at the directory your agent reads.

### The Stop hook

With `--hook`, Claude Code runs `pixsame snap --check --hook claude` each time the agent is about to finish. When a page the agent captured has changed in a way no capture has shown yet, the agent is held back once and given the changes, so it either confirms they were meant or fixes them. Otherwise the hook says nothing.

It never traps the agent: when nothing was captured, when the dev server is down or when a page cannot be opened, it lets the agent finish. It costs nothing in a session that never ran `pixsame snap`. In a session that did, it opens Chrome and captures each page again, which takes a few seconds per page; the hook's time limit is 120 seconds.

A PNG counts as a baseline when it was written by the plugins, already has a layout, or sits in a `snapshots`, `__screenshots__` or `*-snapshots` folder. Failure artifacts (`*.actual.png`, `*.diff.png`) and `node_modules` are skipped.

The command is the first of the `pixsame` CLI; `init`, `doctor` and the agent skills will live here too.
