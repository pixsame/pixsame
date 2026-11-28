# pixsame on DiffSpot: a benchmark we did not write

[DiffSpot](https://github.com/Tencent/DiffSpot) (Tencent, [arXiv 2605.29615](https://arxiv.org/abs/2605.29615)) is 4,400 pairs of screenshots of real web pages. 3,900 differ by one CSS change (13 kinds, three difficulties), 500 are the same page rendered twice. A model is shown both and asked to list the differences. The best model on its leaderboard finds 40.7% of the changes.

Our own [benchmark](../README.md) uses pages and changes we wrote. This one uses theirs.

## What could be run, and what could not

DiffSpot ships screenshots, not pages. `pixsame snap` needs a page it can load, so it cannot run here, and nothing below says anything about `snap`.

What can run is the part of pixsame that needs no page: the comparison of the pixels of two images. It says where pixels changed and cuts those areas out of both images. It does not know what an element is, so it cannot say "the border radius went from 8px to 4px". The two arms:

| Arm           | The agent is given                                                                         |
| ------------- | ------------------------------------------------------------------------------------------ |
| `screenshots` | `before.png` and `after.png`                                                               |
| `pixels`      | the same two screenshots, `pixsame.txt` (the areas where pixels changed) and a crop of each |

## Result

270 pairs (six of each kind at each difficulty, and 36 unchanged), Claude Sonnet 5.5 in Claude Code, judged by Claude Sonnet 5.5 with DiffSpot's judge prompt:

| What the agent was given               | Changes found (95% interval) | Right on unchanged pairs | Cost per answer |
| -------------------------------------- | ---------------------------- | ------------------------ | --------------- |
| Two screenshots                        | 88% (83–92), 206 of 234      | 36 of 36                 | $0.0183         |
| Two screenshots and pixsame's pixels   | 94% (90–96), 219 of 234      | 36 of 36                 | $0.0212         |

Both arms saw the same pairs. pixsame's output turned 15 misses into finds and 2 finds into misses. The full table is in [`results-test/sonnet/RESULTS.md`](results-test/sonnet/RESULTS.md).

Read it with these in mind:

- **The screenshots alone already score 88%.** That is far above the leaderboard, and it is not a leaderboard number: the judge is a different model (theirs is `gpt-oss-120b`), the model is newer than any on the leaderboard, it runs inside Claude Code, and this is a sample of 270. What it does say is that for this model the benchmark has little room left, so the gain from pixsame is six points, not sixty.
- **Most of the gain is rounded corners** (11 of 18 from screenshots, 17 of 18 with pixsame), then colour, border and opacity. These are changes of a few pixels that the model does not see on a full screenshot and does see once it is told where to look.
- **It costs more, not less.** The agent reads the crops on top of the screenshots. In our own benchmark `snap` is cheaper than screenshots because its text replaces them; here nothing can replace them.
- **Some of what counts as a miss is the answer key.** In several spacing cases the agent described what is on the screen ("the group moved 16 px left, the gaps between the links did not change") and the key says the gaps changed. Others have [reported the same](https://github.com/Tencent/DiffSpot/issues/2). Both arms lose these, so the difference between the arms is not affected.
- **Every unchanged pair in the sample is the same image twice, byte for byte.** A comparison of bytes separates changed from unchanged pairs without a model.

## A second model

The same 270 pairs, given to Gemini 4 Carbon through the Gemini API (every file attached, no agent) and judged by the same judge:

| What the model was given             | Changes found (95% interval) | Right on unchanged pairs | Cost per answer |
| ------------------------------------ | ---------------------------- | ------------------------ | --------------- |
| Two screenshots                      | 85% (80–89), 200 of 234      | 23 of 36                 | $0.0281         |
| Two screenshots and pixsame's pixels | 95% (91–97), 222 of 234      | 36 of 36                 | $0.0233         |

pixsame's output turned 23 misses into finds and 1 find into a miss. The full table is in [`results-test/gemini-4-carbon/RESULTS.md`](results-test/gemini-4-carbon/RESULTS.md).

- **On 13 of 36 pairs that are the same image twice, Gemini listed a difference.** Told by pixsame that no pixel differs, it listed none.
- **The gain is largest on the hard pairs**: 59 of 78 from screenshots, 74 of 78 with pixsame.
- **Here it costs less with pixsame**, although more is sent: Gemini thinks for longer over two bare screenshots, and thinking is billed.
- These answers were asked for once, on pairs that nothing was chosen on with Gemini.

## What pixsame got wrong

In the Claude run, the 15 changes the `pixels` arm missed:

- A crop of a few pixels is too small for the model to say what happened in it: it named the right element and then could not tell rounder from sharper, or which way a gradient turned (6 cases).
- A one pixel border around a box was called "rendering noise" and no area was reported (1 case, and 1 more among the first 88).
- In the rest the agent misread the area, did not open the crops, or described what is on the screen in words the answer key does not accept.

Nothing was changed in pixsame for this run. The first two are worth fixing, and will be tested on pairs not used here.

## How the sample was chosen

Pairs are taken in the order of their ids, which are random, per kind and difficulty. The first two of every cell and the first ten unchanged pairs (88 pairs) were used to try the harness and to choose between two ways of counting pixels. The next six of every cell and the next 36 unchanged pairs are the 270 above; they were run once.

The choice made on the first 88: every pixel whose bytes differ counts (`--mask exact`), which is the rule `pixsame snap` goes by for two captures from one machine. What a visual test counts (`--mask test`: pixelmatch at 0.1 with anti-aliasing left out) said "no change" on 7 of 78 changed pairs, among them one pixel borders with a clearly different colour.

## Run it

It needs what the [benchmark](../README.md#run-it) needs, and the dataset file `test-00000-of-00001.parquet` (533 MB) from [Hugging Face](https://huggingface.co/datasets/tencent/DiffSpot).

```bash
pnpm install && pnpm build        # at the repository root
cd benchmark/diffspot
node extract.mjs --data test-00000-of-00001.parquet --out cases-test --skip 2 --per-cell 6 --no-diff 36
node run.mjs --model sonnet --cases cases-test --out results-test      # 540 answers
node score.mjs --model sonnet --judge sonnet --cases cases-test --out results-test
```

The answers and the judge's verdicts are in [`results-test/sonnet/answers.jsonl`](results-test/sonnet/answers.jsonl); `node ../pack.mjs --out diffspot/results-test --model sonnet --unpack` turns it back into one file per answer. The 540 answers cost about $11 at list prices and judging them about $8. `--model gemini-4-carbon` asks through the Gemini API and needs `GEMINI_API_KEY`.

The question the agent is asked is DiffSpot's own, word for word, after one sentence that says where the files are. [`judge.txt`](judge.txt) is DiffSpot's judge prompt, unchanged, and the counting is theirs: a change is found when the judge calls it "correct", "partial" is a miss, and an unchanged pair is right when the judge lists no invented difference. Both are MIT licensed, © 2026 Tencent.
