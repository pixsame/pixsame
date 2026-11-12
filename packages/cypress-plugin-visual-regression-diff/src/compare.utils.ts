import fs from 'fs';
import path from 'path';
import type pixelmatchType from 'pixelmatch';
import type {
  CompareContext,
  Comparer,
  Messages,
  Plugin,
} from 'visual-regression-compare';
import type { ManifestWriter } from 'visual-regression-manifest';
import { addPNGMetadata, isImageCurrentVersion } from './image.utils';

type PixelmatchOptions = NonNullable<Parameters<typeof pixelmatchType>[5]>;

/** The words `cy.matchImage` users need when there is nothing to compare with: the path and the way out. */
const messages: Partial<Messages> = {
  'missing-baseline': ({ baselinePath }) =>
    `Baseline image is missing at path: "${baselinePath}". Provide a baseline image or enable "createMissingImages" option in plugin configuration.`,
};

/** A baseline of a passed comparison that was not made by this plugin (no marker) is refreshed from the screenshot. */
const isUnstamped = ({ input }: CompareContext) =>
  input.files !== undefined &&
  !isImageCurrentVersion(fs.readFileSync(input.files.baseline));

/**
 * What `cy.matchImage` does differently from the comparer's defaults:
 * - pixelmatch with every one of its options (`alpha`, `aaColor`, `diffColor`,
 *   `diffMask`, ...), not only the `threshold` and `includeAA` of the built-in
 *   engine, and anti-aliased pixels counted unless the options say otherwise;
 *   registered under the built-in's name, so it takes its place;
 * - the `.diff.png` carries the plugin marker, like the screenshot does;
 * - a passed comparison whose baseline lacks the marker refreshes the baseline,
 *   so the file is rewritten once instead of by whoever runs the test next.
 */
const matchImagePlugin = (
  pixelmatch: typeof pixelmatchType,
  config: { testingType?: string },
): Plugin => ({
  name: '@pixsame/cypress-plugin-visual-regression-diff',
  setup: (api) => {
    api.on('beforeWrite', (ctx, { write }) => ({
      write: [
        ...write.map((file) =>
          file.ref.kind === 'diff'
            ? {
                ...file,
                bytes: addPNGMetadata(config, Buffer.from(file.bytes)),
              }
            : file,
        ),
        ...(ctx.decision?.status === 'passed' && isUnstamped(ctx)
          ? [
              {
                ref: { kind: 'baseline' as const, path: 'baseline' },
                bytes: ctx.input.actual,
              },
            ]
          : []),
      ],
    }));
    api.addEngine('pixelmatch', (options) => ({
      name: 'pixelmatch',
      colorMetric: 'yiq',
      colorThreshold:
        typeof options.threshold === 'number' ? options.threshold : 0.1,
      compare(baseline, actual) {
        const { width, height } = baseline;
        const diff = new Uint8ClampedArray(width * height * 4);
        const diffPixels = pixelmatch(
          baseline.data,
          actual.data,
          diff,
          width,
          height,
          // pixelmatch's own default (includeAA: false): anti-aliased edge pixels are not counted
          { ...(options as PixelmatchOptions) },
        );
        return {
          diffPixels,
          diffRatio: width * height === 0 ? 0 : diffPixels / (width * height),
          diff: { width, height, data: diff },
        };
      },
    }));
  },
});

// one comparer per manifest writer: a new run (`resetManifest`) brings a new one
let cached: { writer: ManifestWriter; comparer: Promise<Comparer> } | undefined;

/**
 * The run's comparer, recording into the run's manifest writer. Sizes that
 * differ are padded and compared. `visual-regression-compare` and pixelmatch
 * are ESM, hence the dynamic imports.
 */
export const getComparer = (
  writer: ManifestWriter,
  config: { projectRoot?: string; testingType?: string },
): Promise<Comparer> => {
  if (cached?.writer !== writer) {
    cached = {
      writer,
      comparer: Promise.all([
        import('visual-regression-compare'),
        import('pixelmatch'),
      ]).then(([{ createComparer, fsStore }, { default: pixelmatch }]) =>
        createComparer({
          // every call names its files, so the store is never asked for a path
          store: fsStore({
            baselineDir: config.projectRoot ?? path.resolve('.'),
          }),
          onSizeMismatch: 'pad',
          manifest: { writer },
          messages,
          plugins: [matchImagePlugin(pixelmatch, config)],
        }),
      ),
    };
  }
  return cached.comparer;
};
