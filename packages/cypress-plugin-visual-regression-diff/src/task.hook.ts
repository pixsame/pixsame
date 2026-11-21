import fs from 'fs';
import type pixelmatch from 'pixelmatch';

type PixelmatchOptions = NonNullable<Parameters<typeof pixelmatch>[5]>;
import { moveFile } from 'move-file';
import path from 'path';
import { FILE_SUFFIX, TASK, type PathVariables } from './constants';
import { getPluginConfig } from './version.utils';
import {
  analysisOf,
  OLD_BASELINES_NOTICE,
  pngSize,
  readLayout,
  withAnalysis,
  writeLayout,
  type Layout,
} from '@pixsame/analysis';
import type { LayoutPayload } from './layout.utils';
import { getComparer } from './compare.utils';
import { cleanupUnused, scaleImage, addPNGMetadata } from './image.utils';
import {
  dropSpecEntries,
  getManifestWriter,
  markManifestEntryApproved,
  type ManifestConfig,
} from './manifest.utils';
import {
  generateScreenshotPath,
  resetScreenshotNameCache,
} from './screenshotPath.utils';
import type {
  CompareImagesTaskReturn,
  ManifestEntry,
  ManifestEntryOptions,
  ManifestRenderer,
  PendingDiffRecord,
} from './types';

let pendingDiffs: PendingDiffRecord[] = [];

let toldAboutOldBaselines = false;
/** Says once per run, in the terminal, that a baseline has no page layout. */
const noteOldBaseline = () => {
  if (toldAboutOldBaselines) return;
  toldAboutOldBaselines = true;
  process.stderr.write(`[pixsame] ${OLD_BASELINES_NOTICE}\n`);
};
/** Lets the next run tell again; for tests. */
export const resetOldBaselineNotice = () => {
  toldAboutOldBaselines = false;
};

export type CompareImagesCfg = {
  scaleFactor: number;
  title: string;
  imgNew: string;
  imgOld: string;
  createMissingImages: boolean;
  updateImages: boolean | 'failures-only';
  maxDiffThreshold: number;
  diffConfig: PixelmatchOptions;
  /** Describe what changed when the comparison finds differences. Default `true`. */
  analysis?: boolean;
  /** The page as the screenshot was taken, from the browser. */
  layout?: LayoutPayload;
  // test context, only used for the run manifest
  specPath?: string;
  testTitlePath?: string[];
  currentRetryNumber?: number;
  platform?: ManifestEntry['platform'];
  viewport?: ManifestEntry['viewport'];
  options?: ManifestEntryOptions;
  /** Where the pixels of `imgNew` came from; a `native` renderer is derived from `platform` when omitted. */
  renderer?: ManifestRenderer;
};

const unlinkSyncSafe = (path: string) =>
  fs.existsSync(path) && fs.unlinkSync(path);

// `.diff.png` sibling of an `.actual.png`; null when the name has no `.actual`
// suffix (only happens with hand-picked paths), so nothing else gets deleted
const diffPathFor = (actualPath: string) => {
  const diffPath = actualPath.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff);
  return diffPath === actualPath ? null : diffPath;
};

export const getScreenshotPathInfoTask = (cfg: {
  titleFromOptions: string;
  imagesPath: string;
  specPath: string;
  pathVariables: PathVariables;
  currentRetryNumber: number;
  testId: string;
}) => {
  const screenshotPath = generateScreenshotPath(cfg);

  return { screenshotPath, title: path.basename(screenshotPath, '.png') };
};

export const cleanupImagesTask = (
  config: Cypress.PluginConfigOptions,
  { specPath }: { specPath?: string } = {},
) => {
  if (getPluginConfig(config, 'pluginVisualRegressionCleanupUnusedImages')) {
    cleanupUnused(config);
  }

  resetScreenshotNameCache();
  if (specPath) dropSpecEntries(config, specPath);

  return null;
};

export const approveImageTask = async (
  config: ManifestConfig,
  {
    img,
    imgOld,
    specPath,
  }: {
    img: string;
    imgOld?: string;
    specPath?: string;
  },
) => {
  const oldImg = imgOld ?? img.replace(FILE_SUFFIX.actual, '');
  unlinkSyncSafe(oldImg);

  const diffImg = img.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff);
  unlinkSyncSafe(diffImg);

  await moveFile(img, oldImg);
  markManifestEntryApproved(config, { img, imgOld: oldImg, specPath });

  return null;
};

/**
 * The layout from the browser with the scale of the image that was really
 * written: device scale, a forced scale factor and cropping all show up in it,
 * so it is measured, never assumed.
 */
const layoutOf = (
  payload: LayoutPayload | undefined,
  png: Uint8Array,
): Layout | undefined => {
  const image = pngSize(png);
  if (!payload || !image || payload.size.width <= 0) return;
  const scale = image.width / payload.size.width;
  return {
    size: { width: payload.size.width, height: image.height / scale },
    scale,
    count: payload.count,
    root: payload.root,
  };
};

export const compareImagesTask = async (
  cypressConfig: ManifestConfig,
  cfg: CompareImagesCfg,
): Promise<CompareImagesTaskReturn> => {
  // Stamp the screenshot with plugin metadata exactly once, so that every file
  // derived from it (baseline, kept .actual.png, manual rename) carries
  // FRSOURCE_CPVRD_V and won't be silently rewritten on the next run.
  const scaledImgNew = await scaleImage(
    fs.readFileSync(cfg.imgNew),
    cfg.scaleFactor,
  );
  const layout =
    cfg.analysis === false ? undefined : layoutOf(cfg.layout, scaledImgNew);
  const markedImgNew = addPNGMetadata(cypressConfig, scaledImgNew);
  // the layout goes into the PNG, so it is there when this screenshot becomes a baseline
  const stampedImgNew = layout
    ? Buffer.from(writeLayout(markedImgNew, layout))
    : markedImgNew;
  const baselineBytes =
    layout && fs.existsSync(cfg.imgOld)
      ? fs.readFileSync(cfg.imgOld)
      : undefined;
  const baselineLayout = baselineBytes ? readLayout(baselineBytes) : undefined;
  // a baseline that exists but carries no layout of this version
  const hadNoLayout = baselineBytes !== undefined && !baselineLayout;
  const comparer = await getComparer(
    getManifestWriter(cypressConfig),
    cypressConfig,
  );
  const compare = () =>
    comparer.compare(
      {
        name: path
          .basename(cfg.imgNew)
          .replace(`${FILE_SUFFIX.actual}.png`, ''),
        actual: stampedImgNew,
        files: {
          baseline: cfg.imgOld,
          actual: cfg.imgNew,
          diff: diffPathFor(cfg.imgNew) ?? undefined,
        },
        test: {
          filePath: cfg.specPath ?? '',
          titlePath: cfg.testTitlePath ?? [],
          retry: cfg.currentRetryNumber ?? 0,
        },
        platform: cfg.platform,
        viewport: cfg.viewport,
        entry: { options: cfg.options, renderer: cfg.renderer },
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
  const { entry, images } = await (cfg.analysis === false
    ? compare()
    : withAnalysis(compare, {
        layout:
          layout && baselineLayout
            ? { baseline: baselineLayout, actual: layout }
            : undefined,
      }));

  // a replaced baseline got its layout just now
  const oldBaseline = hadNoLayout && entry.status !== 'updated';
  if (oldBaseline) noteOldBaseline();

  // the images of a comparison that ran; a created or replaced baseline has none to show
  const base64 = (bytes?: Uint8Array) =>
    bytes && images.baseline ? Buffer.from(bytes).toString('base64') : '';
  return {
    error: entry.status === 'failed' || entry.status === 'missing-baseline',
    message: entry.message ?? '',
    imgDiff: entry.comparison.diffRatio,
    imgNewBase64: base64(images.actual),
    imgDiffBase64: base64(images.diff),
    imgOldBase64: base64(images.baseline),
    maxDiffThreshold: cfg.maxDiffThreshold,
    description: analysisOf(entry)?.description,
    ...(oldBaseline && { oldBaseline }),
  };
};

export const doesFileExistTask = ({ path }: { path: string }) =>
  fs.existsSync(path);

export const processImgPathTask = ({ path }: { path: string }) => path;

export const recordPendingDiffTask = (record: PendingDiffRecord): number => {
  pendingDiffs.push(record);
  return pendingDiffs.filter((d) => !d.passed).length;
};

export const getPendingDiffsTask = (): PendingDiffRecord[] => [...pendingDiffs];

export const clearPendingDiffsTask = (): null => {
  pendingDiffs = [];
  return null;
};

/* c8 ignore start */
export const initTaskHook = (config: Cypress.PluginConfigOptions) => ({
  [TASK.getScreenshotPathInfo]: getScreenshotPathInfoTask,
  [TASK.cleanupImages]: cleanupImagesTask.bind(undefined, config),
  [TASK.doesFileExist]: doesFileExistTask,
  [TASK.approveImage]: approveImageTask.bind(undefined, config),
  [TASK.compareImages]: compareImagesTask.bind(undefined, config),
  [TASK.processImgPath]: processImgPathTask,
  [TASK.recordPendingDiff]: recordPendingDiffTask,
  [TASK.getPendingDiffs]: getPendingDiffsTask,
  [TASK.clearPendingDiffs]: clearPendingDiffsTask,
});
/* c8 ignore stop */
