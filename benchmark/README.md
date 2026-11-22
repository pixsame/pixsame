# pixsame benchmark: can a coding agent tell what changed on a page?

A coding agent that edits a component has three ways to check the result: look at screenshots, read the browser tool's accessibility snapshot, or run [`pixsame snap`](../packages/cli/README.md#snap-url). This benchmark gives the same agent each of the three, on the same pages and the same changes, and counts how often it names the change that was made, how often it invents one that was not, and what it costs.

Everything needed to run it again is here: the pages, the changes, the harness and the raw answers.

## What is measured

**The pages** ([`pages.mjs`](pages.mjs)): ten small self-contained pages of the kinds agents edit: a landing page, a pricing table, a product list, an article, a dashboard, a form, a docs page, a cart, profile settings and a data table. No network, web fonts or scripts, so a page renders the same every time.

**The changes** ([`mutations.mjs`](mutations.mjs)): fourteen kinds, one CSS edit each, applied to one named element: colour, background colour, font size, font weight, line height, letter spacing, border radius, padding, margin, width, opacity, border width, box shadow, and a move. The thirteen CSS kinds are modelled on the change types of [DiffSpot](https://arxiv.org/abs/2605.29615); the pages and the edits are our own. Each page gets every kind once, on an element that differs per kind and per page, which makes 140 changed pages. A change with no visible effect is not used.

**Unchanged pages**: each page three times with nothing changed, 30 in all. They measure invented differences.

**The three arms**, the same task with different material:

| Arm           | The agent is given                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------- |
| `screenshots` | `before.png` and `after.png`, 1280x800                                                             |
| `aria`        | the accessibility snapshot of the page before and after, as Playwright's `ariaSnapshot()` gives it |
| `facts`       | the text `pixsame snap` printed after the change, and the crops it points to                       |

The task, word for word in [`run.mjs`](run.mjs): list every visual difference, one per line, with the direction or the values; reply `NO DIFFERENCE` if there is none.

**The agent** is Claude Code in headless mode with only the Read tool, started in an empty directory that holds that arm's files and nothing else, with no project instructions, skills, hooks or MCP servers, at its default effort. That is a real agent, not a bare model call, so each call also carries Claude Code's own instructions. They are the same in every arm; the table says how large they are.

**Scoring** ([`score.mjs`](score.mjs)):

- On a changed page the answer is a hit when it names the element that was changed and the change that was made, in the right direction. A judge model decides from the truth and the answer alone, without knowing the arm. "It changed" without saying how is a miss. Extra lines do not void a hit, because a change has side effects and naming them is right.
- On an unchanged page the answer is right only when it is exactly `NO DIFFERENCE`. This is checked without a judge.

## What it does not show

- **One agent family.** The answers so far come from Claude models through Claude Code. Nothing here says how other agents do.
- **Small pages.** Forty to eighty elements each. A real application page is larger, which makes screenshots harder to compare and accessibility snapshots longer. Neither is measured.
- **Single edits.** One property on one element. A real change touches several.
- **Our pages, our tool.** We wrote both. The pages were written for this benchmark after the analysis rules, and the rules were not changed to fit them; what the tool gets wrong here stays in the results. The cases `pixsame snap` itself reports as "no change" although the page changed are listed by `generate.mjs` when it runs.
- **The accessibility arm cannot see styles.** A snapshot of roles and text holds no colours or sizes, so it is expected to find almost none of these changes. It is here because agents do verify with it.
- **A judge model can be wrong.** The verdicts are saved in the result files for anyone to check.

## Run it

It needs Node 20.9 or later, Google Chrome, and [Claude Code](https://claude.com/claude-code) signed in (a subscription or an API key; the answers count against it).

```bash
pnpm install && pnpm build        # at the repository root
cd benchmark
node generate.mjs                 # builds cases/ (no model involved)
node run.mjs --model sonnet       # 510 answers; run again to continue after an interruption
node score.mjs --model sonnet     # judges them and writes results/sonnet/RESULTS.md
```

`--pages landing,pricing` limits any step to some pages, `--limit 20` stops `run.mjs` after twenty answers, `--judge` picks the judge model (default `haiku`). At list prices one full run cost about what `results/<model>/RESULTS.md` shows per answer times 510.

## Results

One folder per model under [`results/`](results), with `RESULTS.md`, `summary.json` and every answer with its token usage and verdict.
