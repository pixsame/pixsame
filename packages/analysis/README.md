# @pixsame/analysis

Says what changed in a failed screenshot comparison, from the pixels and, when there is one, a snapshot of the page's layout. No model, no network, no dependencies.

A pixel diff gives you one number. This package turns the same comparison into something a person or an agent can act on:

- the changed areas, each with its box and pixel count;
- whether content moved, and by how much ("Content moved down by 12 px." from the pixels, "One element moved down by 40 px. Changed: added div.promo "Free shipping"." with a layout snapshot);
- whether the difference looks like rendering noise;
- one sentence describing it;
- a key that is equal for screenshots that changed in the same way, so one change showing in 14 screenshots is one thing to decide.

It never decides whether a comparison passes. `@pixsame/cypress-plugin-visual-regression-diff` and `@pixsame/playwright-visual-regression-diff` use it out of the box and record the result in the run manifest under `extra.pixsame.analysis`.

## Use it on two images

```ts
import { analyze } from '@pixsame/analysis';

// baseline and actual: { width, height, data } with 8-bit RGBA data, the same size
// mask: Uint8Array with 1 for every pixel your comparison counted as different
const analysis = analyze({ baseline, actual, mask });

analysis.label; // 'content-change' | 'moved' | 'moved-and-changed' | 'noise-like' | 'size-change'
analysis.description; // 'One area changed: 220x40 px at x=40, y=120.'
analysis.regions; // [{ x, y, width, height, area, fillRatio, kind, hash }]
analysis.pixels; // { moves: [{ dx, dy, share }], explained, unexplained } when a move is definite
analysis.layout; // { moves, causes, explained, unexplained } with a layout snapshot
analysis.bundleKey; // equal for entries that changed in the same way
```

With pixelmatch, `maskFromPixelmatchDiff(diffImage, pixelmatchOptions)` reads the mask back from the diff image it drew.

Pass `descriptions` to `analyze` for another language or wording: one function per label.

## Group the entries of a run

```ts
import { bundle } from '@pixsame/analysis';

// entries of a visual-regression-manifest run manifest
for (const { description, entries } of bundle(manifest.entries)) {
  console.log(`${description} (${entries.length} screenshots)`);
}
```

## How it decides

| label               | when                                                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `moved`             | the move explains every differing pixel (with a layout snapshot: elements moved and nothing changed)                       |
| `moved-and-changed` | a move explains most differing pixels and something else changed too; `unexplained` (pixels) or `causes` (layout) say what |
| `size-change`       | the two images had different sizes and no move explains the difference                                                     |
| `noise-like`        | the differing pixels sit in specks of at most 4 px, or are thinly scattered                                                |
| `content-change`    | anything else                                                                                                              |

Differing pixels closer than 8 px form one area, so a changed word is one area and not one per letter.

**Moves from the pixels are only reported when the answer is definite.** The pixel search cuts both images into 8 px blocks, finds where the blocks that hold differing pixels went, and checks every differing pixel at the offsets found, with a tolerance of 3 per colour channel (a moved picture or gradient is redrawn a colour step off). It reports a move only when an offset is supported by at least 3 blocks, the moves explain at least half of the differing pixels, and at most 1% (`moved`) or 25% (`moved-and-changed`) is left unexplained (`DEFINITE` in the package holds the numbers). Content pushed out of the picture, copies of content that stayed, half-pixel moves, images over 4 million pixels and anything else unclear get no claim, so `pixels` is absent and the label is `content-change`. On 40 real renders made for the spike, it found 12 of 17 pure moves and 11 of 13 moves with a change, said "moved" wrongly 0 times, and left all 9 non-moves alone. Those cases were used to set the thresholds, so treat the numbers as optimistic.

## With a layout snapshot of the page

Pixels alone miss most moves: a picture that moves is redrawn a colour step off, and most moves come with a change. If the adapter also takes a snapshot of the page's layout with each screenshot, the analysis matches elements between the two snapshots and checks the answer against the pixels: an element that moved must show the same pixels at its new place, and differing pixels that no element explains turn "only moved" into "moved and changed". The result then has `label: 'moved'` or `'moved-and-changed'`, `layout.moves` (elements per offset, in CSS pixels), `layout.causes` (`added div#promo "Free shipping"`) and `layout.unexplained` (areas the layout cannot account for, such as a redrawn canvas).

```ts
import {
  readLayout,
  snapshotLayout,
  withAnalysis,
  writeLayout,
} from '@pixsame/analysis';

// in the page, after the screenshot; origin is the screenshot's top left in the page
const raw = await page.evaluate(snapshotLayout, [0, 0]);
const layout = { size, scale: png.width / size.width, ...raw };

// keep it in the PNG, so it is there when this screenshot becomes a baseline
const stamped = writeLayout(png, layout);

// later: compare against the baseline's layout
await withAnalysis(() => comparer.compare(input), {
  layout: { baseline: readLayout(baselinePng)!, actual: layout },
});
```

The layout is stored in an `iTXt` chunk of the PNG as columnar JSON, deflated (about 6 to 40 KB for a real page). **The chunk's keyword carries the analysis version**: `pixsame-layout-v1`. `ANALYSIS_VERSION` is raised by any change that makes stored data wrong or unreadable (the snapshot, its encoding, how it is read), so a baseline stamped by an older version is recognised without decoding it and that comparison falls back to the pixels alone. `readLayout` only returns a layout of the current version, `layoutVersionOf` tells a stale one from none, and `writeLayout` drops layouts of any other version.

## Use it in your own `visual-regression-compare` adapter

```ts
import {
  analysisPlugin,
  captureComparison,
  withAnalysis,
} from '@pixsame/analysis';

// 1. register the plugin: createComparer({ ..., plugins: [analysisPlugin()] })
// 2. in your pixelmatch engine, after pixelmatch ran:
//      captureComparison(baseline, actual, { width, height, data: diff }, options);
// 3. wrap each call: await withAnalysis(() => comparer.compare(input));
```

## License

MIT
