import fs from 'fs';
import type pixelmatch from 'pixelmatch';

type PixelmatchOptions = NonNullable<Parameters<typeof pixelmatch>[5]>;
import { moveFile } from 'move-file';
import path from 'path';
import { FILE_SUFFIX, TASK } from './constants';
import { getPluginConfig } from './version.utils';
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

export type CompareImagesCfg = {
  scaleFactor: number;
  title: string;
  imgNew: string;
  imgOld: string;
  createMissingImages: boolean;
  updateImages: boolean | 'failures-only';
  maxDiffThreshold: number;
  diffConfig: PixelmatchOptions;
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

export const compareImagesTask = async (
  cypressConfig: ManifestConfig,
  cfg: CompareImagesCfg,
): Promise<CompareImagesTaskReturn> => {
  // Stamp the screenshot with plugin metadata exactly once, so that every file
  // derived from it (baseline, kept .actual.png, manual rename) carries
  // FRSOURCE_CPVRD_V and won't be silently rewritten on the next run.
  const stampedImgNew = addPNGMetadata(
    cypressConfig,
    await scaleImage(fs.readFileSync(cfg.imgNew), cfg.scaleFactor),
  );
  const comparer = await getComparer(
    getManifestWriter(cypressConfig),
    cypressConfig,
  );
  const { entry, images } = await comparer.compare(
    {
      name: path.basename(cfg.imgNew).replace(`${FILE_SUFFIX.actual}.png`, ''),
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
