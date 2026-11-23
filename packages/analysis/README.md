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

analysis.label; // 'content-change' | 'moved' | 'moved-and-changed' | 'noise-like' | 'size-change' | 'cross-os'
analysis.description; // 'One area changed: 220x40 px at x=40, y=120.'
analysis.regions; // [{ x, y, width, height, area, fillRatio, kind, hash }]
analysis.pixels; // { moves: [{ dx, dy, share }], explained, unexplained } when a move is definite
analysis.layout; // { moves, causes, explained, unexplained } with a layout snapshot
analysis.environment; // { baseline, actual }: what rendered each image, when known
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
| `cross-os`          | the baseline and the screenshot came from different operating systems and the layout shows only what that causes           |
| `noise-like`        | the differing pixels sit in specks of at most 4 px, or are thinly scattered                                                |
| `content-change`    | anything else                                                                                                              |

Differing pixels closer than 8 px form one area, so a changed word is one area and not one per letter.

**Moves from the pixels are only reported when the answer is definite.** The pixel search cuts both images into 8 px blocks, finds where the blocks that hold differing pixels went, and checks every differing pixel at the offsets found, with a tolerance of 3 per colour channel (a moved picture or gradient is redrawn a colour step off). It reports a move only when an offset is supported by at least 3 blocks, the moves explain at least half of the differing pixels, and at most 1% (`moved`) or 25% (`moved-and-changed`) is left unexplained (`DEFINITE` in the package holds the numbers). Content pushed out of the picture, copies of content that stayed, half-pixel moves, and anything else unclear get no claim, so `pixels` is absent and the label is `content-change`. An image over 4 million pixels (a 1280x800 screenshot at device scale 2) is searched at a reduced size, and each offset found is checked again at full size; one that full-size pixels do not back, or that has two equally good neighbours, gets no claim, so an odd offset may go unanswered at scale 2. On 40 real renders made for the spike, it found 12 of 17 pure moves and 11 of 13 moves with a change, said "moved" wrongly 0 times, and left all 9 non-moves alone. Those cases were used to set the thresholds, so treat the numbers as optimistic.

## With a layout snapshot of the page

Pixels alone miss most moves: a picture that moves is redrawn a colour step off, and most moves come with a change. If the adapter also takes a snapshot of the page's layout with each screenshot, the analysis matches elements between the two snapshots and checks the answer against the pixels: an element that moved must show the same pixels at its new place, and differing pixels that no element explains turn "only moved" into "moved and changed". The result then has `label: 'moved'` or `'moved-and-changed'`, `layout.moves` (elements per offset, in CSS pixels), `layout.causes` (`added div#promo "Free shipping"`) and `layout.unexplained` (areas the layout cannot account for, such as a redrawn canvas).

```ts
import {
  readLayout,
  snapshotLayout,
  withAnalysis,
  writeLayout,
} from '@pixsame/analysis';

// in the page, after the screenshot; origin is the screenshot's top left in the
// page, area its size in CSS pixels
const raw = await page.evaluate(snapshotLayout, {
  origin: [0, 0],
  area: [size.width, size.height],
});
// env: what renders the screenshot, so a later run on another system can tell
const layout = {
  env: { os: process.platform, browser: 'chromium' },
  size,
  scale: png.width / size.width,
  ...raw,
};

// keep it in the PNG, so it is there when this screenshot becomes a baseline
const stamped = writeLayout(png, layout);

// later: compare against the baseline's layout
await withAnalysis(() => comparer.compare(input), {
  layout: { baseline: readLayout(baselinePng)!, actual: layout },
  environment: { baseline: readLayout(baselinePng)?.env, actual: layout.env },
});
```

The layout is stored in an `iTXt` chunk of the PNG as columnar JSON, deflated (about 6 to 40 KB for a real page). **The chunk's keyword carries the analysis version**: `pixsame-layout-v4`. `ANALYSIS_VERSION` is raised by any change that makes stored data wrong or unreadable (the snapshot, its encoding, how it is read), so a baseline stamped by an older version is recognised without decoding it and that comparison falls back to the pixels alone. `readLayout` only returns a layout of the current version, `layoutVersionOf` tells a stale one from none, and `writeLayout` drops layouts of any other version.

**Large pages.** A snapshot costs about 70 microseconds an element, so a page with more than 3000 elements (`cullAbove`) is snapshotted without the elements that lie outside `area` or outside an ancestor that clips them: the rows of a long list or data grid that are scrolled out of view. They explain no pixel of the screenshot. On a grid of 380,000 elements this takes the snapshot from 27 seconds to 0.2 seconds.

### Style values

Each element of a snapshot also carries the computed values of a fixed list of styles (`STYLE`: font family, size, weight and style, line height, letter spacing, text alignment, case and decoration, colour, background colour and image, opacity, filter, transform, border width, style and colour, the four border radii, box shadow, outline, padding, row and column gap, margin, flex order; a value longer than 160 characters is cut and ends with a hash of the whole). They let a change be named instead of only noticed:

```ts
import { facts, styleChanges } from '@pixsame/analysis';

facts({ baseline, actual, mask, layout });
// [{ type: 'element', element: 'button.checkout "Checkout"',
//    styles: [{ property: 'border-radius', before: '8px', after: '4px' }],
//    text: 'button.checkout "Checkout": border-radius 8px → 4px' }, …]
```

`facts()` returns everything that differs, one fact each: changed elements (one that came or went counts once with all it holds), elements with a style change that shows only around or inside them, moves grouped by offset and named by the outermost element that moved, resizes (a width change named on the outermost element, a height change on the innermost one, whether or not what it holds moved with it) and areas the layout cannot explain. Sides or corners that end up alike are written as one (`padding`, `margin`, `border-radius`, `gap`, `border-width`, `border-style`, `border-color`), the colour of a border or outline that is not drawn is left out, and a style an element only inherited is marked with the ancestor it came from. A shadow or outline counts as part of its element, and so does everything inside an element whose opacity, filter or transform changed; text and boxes without a background are not doubted when what is behind them changed. A transform is also said in words (`rotate(-3deg)`). Given `faint` (every pixel that differs at all, next to the `mask` of those that count), changes the layout names are reported when only such pixels show them, marked `faint`. Given `unseen` (the pixels left out of both masks because they change by themselves), a change the layout names on an element that lies there is reported from the layout alone, marked `unseen`. With `only` (rectangles of the elements that were meant to change) every fact says whether it is `outside` them. The failure description of `analyze()` names the first values in the same way.

A style outside the list still shows as a changed look, through the `paint` hash. The values add about 15% to the stored layout (0.4 to 1.7 KB on the pages measured).

## Screenshots from different systems

Fonts, hinting and anti-aliasing differ between macOS, Linux and Windows, so the same page differs in 1 to 9 percent of its pixels. When the analysis knows what rendered each image (`environment`, or the `env` of each layout) and the operating systems differ, it says so. With a layout it answers `cross-os` when every changed element only has a different font, sits a little differently or shows more of itself, and no differing pixel lies on a picture, canvas, SVG, video or frame, whose redrawn pixels the page's text cannot account for. An added, removed, re-texted or restyled element, or a different picture, keeps its own label and the description ends with "so some differences are expected". A baseline saved before the environment was recorded has no `env`, so nothing is said about systems for it.

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
