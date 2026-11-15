# @pixsame/analysis

Says what changed in a failed screenshot comparison, from the pixels alone. No model, no network, no dependencies.

A pixel diff gives you one number. This package turns the same comparison into something a person or an agent can act on:

- the changed areas, each with its box and pixel count;
- whether the content only moved, as a whole ("Everything below y=340 moved down by 12 px.") or one area ("One area moved right by 12 px: 52x16 px at x=130, y=250.");
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

analysis.label; // 'content-change' | 'moved' | 'noise-like' | 'size-change'
analysis.description; // 'One area changed: 220x40 px at x=40, y=120.'
analysis.regions; // [{ x, y, width, height, area, fillRatio, kind, hash, moved }]
analysis.shift; // { fromX, fromY, dx, dy, coverage } or null
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

| label            | when                                                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `size-change`    | the two images had different sizes                                                                                          |
| `moved`          | at least 90% of the changed lines equal a baseline line a fixed distance away, for the whole page or for every changed area |
| `noise-like`     | the differing pixels sit in specks of at most 4 px, or are thinly scattered                                                 |
| `content-change` | anything else                                                                                                               |

Differing pixels closer than 8 px form one area, so a changed word is one area and not one per letter. Moves are searched up, down, left and right, up to 64 px, one direction at a time: first for the page as a whole (everything below a row or right of a column), then for each changed area on its own, which gets `moved: { dx, dy }`. A move is only recognised when the moved pixels are identical, so content that was re-rendered with different anti-aliasing counts as a content change.

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
