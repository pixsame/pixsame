# pixsame benchmark: can a coding agent tell what changed on a page?

A coding agent that edits a component has three ways to check the result: look at screenshots, read the browser tool's accessibility snapshot, or run [`pixsame snap`](../packages/cli/README.md#snap-url). This benchmark gives the same agent each of the three, on the same pages and the same changes, and counts how often it names the change that was made, how often it invents one that was not, and what it costs.

Everything needed to run it again is here: the pages, the changes, the harness and the raw answers.

## In short

Two models, two sets of pages. The first set is ours (290 changed pages, 29 kinds of change), the second is [DiffSpot](diffspot/README.md), a benchmark of real web pages we did not write (234 changed pairs). Each cell is the number of changes the model did **not** find:

| Model             | Our pages: two screenshots | Our pages: `pixsame snap` | DiffSpot: two screenshots | DiffSpot: with pixsame |
| ----------------- | -------------------------- | ------------------------- | ------------------------- | ---------------------- |
| Claude Sonnet 5.5 | 18 missed (94% found)      | 3 missed (99%)            | 28 missed (88%)           | 15 missed (94%)        |
| Gemini 4 Carbon   | 24 missed (92% found)      | 0 missed (100%)           | 34 missed (85%)           | 12 missed (95%)        |

- **Both models miss far fewer changes with pixsame**, on our pages and on pages we had no hand in.
- **`snap` output is also the cheapest thing to read**: a third of the cost of two screenshots for Claude ($0.0049 against $0.0158 per answer), under a fifth for Gemini ($0.0032 against $0.0178).
- **It stops invented differences.** On DiffSpot's unchanged pairs Gemini listed a difference on 13 of 36 from the screenshots, and on none once pixsame said that no pixel differs. Claude invented none either way.
- The two DiffSpot columns are not `snap`: DiffSpot ships screenshots and no pages, so only pixsame's comparison of pixels can run there.
- Claude's row on our pages is the frozen run; Gemini was run later, on the same pages with the code as it is [after the fixes](#after-the-final-run), where Claude misses 17 and 0.

The rest of this page is how these numbers were reached and what they do not show.

## Result

On ten pages the tool was never adjusted to, with 29 kinds of change (290 changed pages and 30 unchanged ones per arm), Claude Sonnet 5.5 in Claude Code:

| What the agent was given    | Changes found (95% interval) | Invented a difference | Cost per answer |
| --------------------------- | ---------------------------- | --------------------- | --------------- |
| Two screenshots             | 94% (90–96)                  | 0 of 30               | $0.0158         |
| Two accessibility snapshots | 7% (5–10)                    | 0 of 30               | $0.0090         |
| `pixsame snap` output       | 99% (97–100)                 | 0 of 30               | $0.0049         |

The full table, by kind of change, is in [`results-final/sonnet/RESULTS.md`](results-final/sonnet/RESULTS.md). Read it with these in mind:

- Screenshots are good. The gap is fifteen cases in 290, and most of it is two kinds: line height (1 of 10 from screenshots, 10 of 10 from `snap`) and padding (7 against 10).
- `snap` missed three. In two a box got taller and `snap` printed what moved inside and below it without naming the box. In the third the benchmark's own answer key was wrong: the edit made the letter spacing narrower, `snap` and the agent said so, and the key said "wider". The score counts it as a miss in both arms. All three are fixed since; see [After the final run](#after-the-final-run).
- The accessibility snapshot only sees an element that comes or goes.
- No arm ever reported a difference on an unchanged page.

## How the result was reached

The first run (the pilot, [`results/sonnet`](results/sonnet)) went the other way: 87% from screenshots, 77% from `pixsame snap`. `snap` could not name letter spacing, opacity or a border width, and said "no change" when the pixels differed by less than a test counts. It was changed, and then tested on pages it had not seen, three times:

| Set     | Pages  | Kinds of change | `snap` found | What was changed in `snap` afterwards                                                    |
| ------- | ------ | --------------- | ------------ | ---------------------------------------------------------------------------------------- |
| pilot   | 10     | 14              | 77%          | more styles named, faint changes reported, shadows and text on a changed background      |
| round 1 | 10 new | 22              | 94%          | transforms, opacity on a wrapper, alignment, a narrower box named once                   |
| round 2 | 6 new  | 29              | 100%         | filters, flex order, outline offset, see-through boxes, moves named by the outer element |
| final   | 10 new | 29              | 99%          | nothing                                                                                  |

Only the final set counts as a result: its pages were written before round 2 was scored, no case was built from them until the code was frozen, and nothing in `snap` was changed afterwards. The new kinds of change of each round were chosen before `snap` was run on them. Rounds 1 and 2 ran the `snap` arm only.

One page of the final set (the portfolio) had no bordered box for the border colour change, and got one when the build stopped there. Its first fourteen cases were built before that and show the page without the border.

## After the final run

What `snap` got wrong was then fixed:

- A box that only got taller is named (`div#jb-2 resized 1000x108.1 → 1000x132`), whatever moved inside it.
- A change on an element whose pixels flicker between two captures is reported from the page's layout. In round 1 a rotated box was drawn a little differently each time, `snap` left its pixels out and said "no change". It now prints the `transform` and says that it comes from the layout alone.
- The answer key says "narrower" when letter spacing got narrower.

The final set, run again with that code ([`results-final-fix/sonnet/RESULTS.md`](results-final-fix/sonnet/RESULTS.md)):

| What the agent was given    | Changes found (95% interval) | Invented a difference | Cost per answer |
| --------------------------- | ---------------------------- | --------------------- | --------------- |
| Two screenshots             | 94% (91–96), 273 of 290      | 0 of 30               | $0.0159         |
| Two accessibility snapshots | 7% (5–10), 20 of 290         | 0 of 30               | $0.0090         |
| `pixsame snap` output       | 100% (99–100), 290 of 290    | 0 of 30               | $0.0050         |

Read this one as a check that the fixes work and broke nothing, not as a second result: the two cases `snap` gained are the ones the fix was written for. The table above it is the one measured on pages nothing was fitted to.

- Every `snap` answer is new. The screenshots and accessibility snapshots of a case did not change, so their answers are those of the final run, with two exceptions: the fourteen portfolio cases built before the border were asked again in every arm, and the letter spacing case was judged again against the corrected key.
- Rounds 1 and 2, run again the same way (`snap` arm only): 220 of 220 and 174 of 174, with no difference reported on an unchanged page ([`results-round1-fix`](results-round1-fix), [`results-round2-fix`](results-round2-fix)).

## A second model

The same 320 cases, with the same `snap` output, given to Gemini 4 Carbon and judged by the same judge ([`results-final-fix/gemini-4-carbon/RESULTS.md`](results-final-fix/gemini-4-carbon/RESULTS.md)):

| What the model was given    | Changes found (95% interval) | Invented a difference | Cost per answer |
| --------------------------- | ---------------------------- | --------------------- | --------------- |
| Two screenshots             | 92% (88–94), 266 of 290      | 1 of 30               | $0.0178         |
| Two accessibility snapshots | 7% (5–10), 20 of 290         | 0 of 30               | $0.0064         |
| `pixsame snap` output       | 100% (99–100), 290 of 290    | 0 of 30               | $0.0032         |

- `snap` was never run against Gemini before this, and nothing was changed for it. The answers were asked for once.
- From screenshots it misses the same kinds as Claude does: line height (1 of 10), letter spacing (5), font size and margin (7 each).
- Gemini is not run as an agent here. It is asked through the Gemini API with every file of the case attached, so its tokens and cost have no agent overhead in them and do not compare with the Claude rows. The share of changes found does.

## What is measured

**The pages**: small self-contained pages of the kinds agents edit, each set with its own stylesheet and its own kinds of page: [`pages.mjs`](pages.mjs) (pilot), [`pages-round1.mjs`](pages-round1.mjs), [`pages-round2.mjs`](pages-round2.mjs), [`pages-final.mjs`](pages-final.mjs). No network, web fonts or scripts, so a page renders the same every time.

**The changes** ([`mutations.mjs`](mutations.mjs)): one CSS edit each, applied to one named element. The pilot's fourteen: colour, background colour, font size, font weight, line height, letter spacing, border radius, padding, margin, width, opacity, border width, box shadow, and a move; the thirteen CSS kinds are modelled on the change types of [DiffSpot](https://arxiv.org/abs/2605.29615), the pages and the edits are our own. Round 1 added border colour, text decoration, text alignment, font family, gap, background image, transform and `visibility: hidden`; round 2 added font style, text transform, height, `display: none`, flex order, filter and outline. Each page gets every kind once, on an element that differs per kind and per page. A change with no visible effect is not used.

**Unchanged pages**: each page three times with nothing changed. They measure invented differences.

**The three arms**, the same task with different material:

| Arm           | The agent is given                                                                                 |
| ------------- | -------------------------------------------------------------------------------------------------- |
| `screenshots` | `before.png` and `after.png`, 1280x800                                                             |
| `aria`        | the accessibility snapshot of the page before and after, as Playwright's `ariaSnapshot()` gives it |
| `facts`       | the text `pixsame snap` printed after the change, and the crops it points to                       |

The task, word for word in [`run.mjs`](run.mjs): list every visual difference, one per line, with the direction or the values; reply `NO DIFFERENCE` if there is none.

**The agent** is Claude Code in headless mode with only the Read tool, started in an empty directory that holds that arm's files and nothing else, with no project instructions, skills, hooks or MCP servers, at its default effort. That is a real agent, not a bare model call, so each call also carries Claude Code's own instructions. They are the same in every arm; the table says how large they are. Gemini is the exception: it is a bare model call through the Gemini API, with the arm's files attached to the question.

**Scoring** ([`score.mjs`](score.mjs)):

- On a changed page the answer is a hit when it names the element that was changed and the change that was made, in the right direction. A judge model decides from the truth and the answer alone, without knowing the arm. "It changed" without saying how is a miss. Extra lines do not void a hit, because a change has side effects and naming them is right.
- On an unchanged page the answer is right only when it is exactly `NO DIFFERENCE`. This is checked without a judge.

## What it does not show

- **Two models, one agent.** The answers come from Claude Sonnet 5.5 through Claude Code and from Gemini 4 Carbon through its API. Nothing here says how other models do, or how Gemini does inside an agent of its own.
- **Small pages.** Forty to eighty elements each. A real application page is larger, which makes screenshots harder to compare and accessibility snapshots longer. Neither is measured.
- **Single edits.** One property on one element. A real change touches several.
- **Our pages, our tool.** We wrote both, and the tool was changed after the pilot and after rounds 1 and 2 (see above). The final pages are the only ones it was not changed for; what it gets wrong there stays in the results. For screenshots of real pages from a benchmark we did not write, see [`diffspot/`](diffspot/README.md): it ships no pages, so only pixsame's comparison of pixels runs there, not `snap`.
- **One CSS property at a time.** Every kind of change here is one the tool can now name or point to. A change made another way (new markup, a script, an image) is not measured.
- **The accessibility arm cannot see styles.** A snapshot of roles and text holds no colours or sizes, so it is expected to find almost none of these changes. It is here because agents do verify with it.
- **A judge model can be wrong.** The verdicts are saved in the result files for anyone to check.

## Run it

It needs Node 20.9 or later, Google Chrome, and [Claude Code](https://claude.com/claude-code) signed in (a subscription or an API key; the answers count against it). The judge runs through Claude Code too, whichever model answers.

```bash
pnpm install && pnpm build        # at the repository root
cd benchmark
node generate.mjs --set final     # builds cases-final/ (no model involved); also pilot, round1, round2
node run.mjs --model sonnet --cases cases-final --out results-final     # 960 answers; run again to continue after an interruption
node score.mjs --model sonnet --judge sonnet --cases cases-final --out results-final
```

`--pages landing,pricing` limits any step to some pages, `--part 1/3` makes `generate.mjs` build every third page so that three runs can share the work, `--limit 20` stops `run.mjs` after twenty answers, `--judge` picks the judge model (default `haiku`). A `--model` that starts with `gemini` (`gemini-4-carbon`) is asked through the Gemini API and needs `GEMINI_API_KEY`. At list prices a full run costs about what `RESULTS.md` shows per answer times the number of answers (about $10 for the final set, three arms).

## Results

One folder per set and model: [`results/`](results) (pilot), [`results-round1/`](results-round1), [`results-round2/`](results-round2) and [`results-final/`](results-final), and the runs after the last fixes in [`results-final-fix/`](results-final-fix), [`results-round1-fix/`](results-round1-fix) and [`results-round2-fix/`](results-round2-fix), each with `RESULTS.md`, `summary.json` and `answers.jsonl`: one line per answer, with its token usage and verdict. `node pack.mjs --out results-final --model sonnet --unpack` turns that file back into the one file per answer that `run.mjs` and `score.mjs` work with, and without `--unpack` it packs them again.
