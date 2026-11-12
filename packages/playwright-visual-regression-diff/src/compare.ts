import path from 'path';
import type pixelmatchType from 'pixelmatch' with {
  'resolution-mode': 'import',
};
import type { Comparer, Plugin } from 'visual-regression-compare' with {
  'resolution-mode': 'import',
};
import {
  ManifestWriter,
  type ManifestEntry,
  type ManifestEntryInput,
  type ManifestEntryPlatform,
  type ManifestViewport,
} from 'visual-regression-manifest';
import { FILE_SUFFIX } from './constants';
import { addPNGMetadata } from './image.utils';

export type PixelmatchOptions = NonNullable<
  Parameters<typeof pixelmatchType>[5]
>;

// pixelmatch 7 and visual-regression-compare are ESM-only; a dynamic import
// keeps this package usable from a CommonJS `playwright.config` on every
// supported Node version
let pixelmatchPromise: Promise<typeof pixelmatchType> | undefined;
const loadPixelmatch = () =>
  (pixelmatchPromise ??= import('pixelmatch').then((m) => m.default));

export type CompareStatus =
  'passed' | 'failed' | 'missing-baseline' | 'created' | 'updated';

export type CompareInput = {
  /** Raw screenshot bytes as returned by Playwright. */
  imgNew: Buffer;
  /** Where the `.actual.png` is written (and kept when the comparison fails). */
  actualPath: string;
  /** The baseline to compare against and to create/update. */
  baselinePath: string;
  createMissingImages: boolean;
  updateImages: boolean | 'failures-only';
  maxDiffThreshold: number;
  diffConfig: PixelmatchOptions;
  /** Screenshot name recorded on the manifest entry; defaults to the baseline's file name. */
  name?: string;
  /** The test the screenshot belongs to, recorded on the manifest entry. */
  test?: { filePath: string; titlePath: string[]; retry: number };
  platform?: ManifestEntryPlatform;
  viewport?: ManifestViewport;
  /** Entry fields the comparer cannot know: the resolved `options` and the `renderer`. */
  entry?: Pick<ManifestEntryInput, 'options' | 'renderer'>;
};

export type CompareResult = {
  status: CompareStatus;
  /** `true` when the test should fail. */
  error: boolean;
  message: string;
  /** Share of differing pixels, 0..1; `0` when no comparison ran. */
  diffRatio: number;
  threshold: number;
  /** `true` whenever the baseline file was (re)written. */
  baselineWritten: boolean;
  /** Path of the `.diff.png` sibling of `actualPath`. */
  diffPath: string;
  /** The compared images (padded to a common size when they differed in size); absent when no comparison ran. */
  imgNew?: Buffer;
  imgOld?: Buffer;
  imgDiff?: Buffer;
  /** What the comparer recorded in the manifest. */
  entry: ManifestEntry;
};

export const diffPathFor = (actualPath: string) =>
  actualPath.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff);

/**
 * Two things of the comparer's defaults that `matchImage` does differently:
 * pixelmatch with every one of its options (`alpha`, `aaColor`, `diffColor`,
 * `diffMask`, ...), not only the `threshold` and `includeAA` of the built-in
 * engine, and anti-aliased pixels not counted unless asked for. Registered
 * under the built-in's name, so it takes its place.
 */
const pixelmatchPlugin = (pixelmatch: typeof pixelmatchType): Plugin => ({
  name: '@pixsame/playwright/pixelmatch',
  setup: (api) => {
    // the path and the way out: what `matchImage` users need when it fails
    api.on('decide', (ctx, decision) =>
      decision.status === 'missing-baseline'
        ? {
            ...decision,
            message: `Baseline image is missing at path: "${ctx.input.files?.baseline}". Provide a baseline image or enable "createMissingImages" option in plugin configuration.`,
          }
        : decision,
    );
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
          { includeAA: false, ...options },
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

/** A manifest writer that keeps its entries in memory: for a run with the manifest turned off. */
class MemoryManifestWriter extends ManifestWriter {
  override write() {}
  override flush() {}
}

/**
 * The comparer of one worker, recording into `writer` (or, with the manifest
 * disabled, into memory). Sizes that differ are padded and compared, as the
 * Cypress plugin does.
 */
export const createComparison = async (
  writer: ManifestWriter | null,
  { rootDir }: { rootDir: string },
): Promise<Comparer> => {
  const [{ createComparer, fsStore }, pixelmatch] = await Promise.all([
    import('visual-regression-compare'),
    loadPixelmatch(),
  ]);
  return createComparer({
    // every call names its files, so the store is never asked for a path
    store: fsStore({ baselineDir: rootDir }),
    onSizeMismatch: 'pad',
    manifest: {
      writer:
        writer ??
        new MemoryManifestWriter(path.join(rootDir, 'unused.json'), {
          projectRoot: rootDir,
          runner: { name: 'playwright' },
        }),
    },
    plugins: [pixelmatchPlugin(pixelmatch)],
  });
};

/**
 * Stamps the screenshot with the package marker, compares it with the
 * baseline and leaves the files on disk the way the manifest contract
 * describes (`.actual.png` and `.diff.png` only for failures). The comparison
 * itself is `visual-regression-compare`'s; this maps `matchImage`'s options
 * onto it.
 */
export const compareImages = async (
  cfg: CompareInput,
  comparer: Comparer,
): Promise<CompareResult> => {
  const diffPath = diffPathFor(cfg.actualPath);
  const { entry, images } = await comparer.compare(
    {
      name: cfg.name ?? path.basename(cfg.baselinePath, '.png'),
      // stamped once, so every file derived from it carries the package marker
      actual: addPNGMetadata(cfg.imgNew),
      files: {
        baseline: cfg.baselinePath,
        actual: cfg.actualPath,
        diff: diffPath,
      },
      test: cfg.test,
      platform: cfg.platform,
      viewport: cfg.viewport,
      entry: cfg.entry,
      options: {
        limits: { maxDiffRatio: cfg.maxDiffThreshold },
        engineOptions: { ...cfg.diffConfig },
        update:
          cfg.updateImages === true
            ? 'all'
            : cfg.updateImages === 'failures-only'
              ? 'failures-only'
              : 'none',
        onMissingBaseline: cfg.createMissingImages ? 'create' : 'fail',
      },
    },
    { include: ['baseline', 'actual', 'diff'] },
  );
  const status = entry.status as CompareStatus;
  const buffer = (bytes?: Uint8Array) =>
    bytes ? Buffer.from(bytes) : undefined;
  return {
    status,
    error: status === 'failed' || status === 'missing-baseline',
    message: entry.message ?? '',
    diffRatio: entry.comparison.diffRatio,
    threshold: cfg.maxDiffThreshold,
    baselineWritten: entry.baselineWritten,
    diffPath,
    imgNew: buffer(images.actual),
    imgOld: buffer(images.baseline),
    imgDiff: buffer(images.diff),
    entry,
  };
};
