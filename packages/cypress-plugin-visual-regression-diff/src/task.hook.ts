import fs from 'fs';
import pixelmatch from 'pixelmatch';

type PixelmatchOptions = NonNullable<Parameters<typeof pixelmatch>[5]>;
import { moveFile } from 'move-file';
import path from 'path';
import { readPngSize } from 'visual-regression-manifest';
import { FILE_SUFFIX, TASK, type PathVariables } from './constants';
import { getPluginConfig } from './version.utils';
import {
  cleanupUnused,
  decodePNG,
  encodePNG,
  getImageSize,
  scaleImage,
  isImageCurrentVersion,
  addPNGMetadata,
  type ImageInfo,
} from './image.utils';
import {
  dropSpecEntries,
  markManifestEntryApproved,
  recordManifestEntry,
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
  ManifestStatus,
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

const round = (n: number) => Math.ceil(n * 1000) / 1000;

const unlinkSyncSafe = (path: string) =>
  fs.existsSync(path) && fs.unlinkSync(path);

// `.diff.png` sibling of an `.actual.png`; null when the name has no `.actual`
// suffix (only happens with hand-picked paths), so nothing else gets deleted
const diffPathFor = (actualPath: string) => {
  const diffPath = actualPath.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff);
  return diffPath === actualPath ? null : diffPath;
};

const removeStaleDiff = (actualPath: string) => {
  const diffPath = diffPathFor(actualPath);
  if (diffPath) unlinkSyncSafe(diffPath);
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

export const compareImagesTask = async (
  cypressConfig: ManifestConfig,
  cfg: CompareImagesCfg,
): Promise<CompareImagesTaskReturn> => {
  const messages = [] as string[];
  // Stamp the screenshot with plugin metadata exactly once, so that every file
  // derived from it (baseline via moveFile, kept .actual.png, manual rename)
  // carries FRSOURCE_CPVRD_V and won't be silently rewritten on the next run.
  const rawImgNewBuffer = addPNGMetadata(
    cypressConfig,
    await scaleImage(fs.readFileSync(cfg.imgNew), cfg.scaleFactor),
  );
  fs.writeFileSync(cfg.imgNew, rawImgNewBuffer);
  // from the PNG header, so the size is known even when nothing gets decoded
  let imgNewSize: ImageInfo | undefined = readPngSize(cfg.imgNew);
  let imgOldSize: ImageInfo | undefined;
  let imgDiff: number;
  let imgNewBase64: string, imgOldBase64: string, imgDiffBase64: string;
  let error = false;
  let status: ManifestStatus;
  let baselineWritten = false;

  if (fs.existsSync(cfg.imgOld) && cfg.updateImages !== true) {
    const rawImgOldBuffer = fs.readFileSync(cfg.imgOld);
    const [newSize, oldSize] = await Promise.all([
      getImageSize(rawImgNewBuffer),
      getImageSize(rawImgOldBuffer),
    ]);
    imgNewSize = newSize;
    imgOldSize = oldSize;
    const isImgSizeDifferent =
      newSize.height !== oldSize.height || newSize.width !== oldSize.width;

    const size = {
      width: Math.max(newSize.width, oldSize.width),
      height: Math.max(newSize.height, oldSize.height),
    };
    const { width, height } = size;

    // both images are decoded straight to the common size, so the same-size
    // case is just a decode and the mismatch case pads in the same pass
    const [imgNew, imgOld] = await Promise.all([
      decodePNG(rawImgNewBuffer, newSize, size),
      decodePNG(rawImgOldBuffer, oldSize, size),
    ]);

    const diff = Buffer.alloc(width * height * 4);
    // pixelmatch's own default: anti-aliased edge pixels are detected and not
    // counted, which removes most of the cross-OS text rendering noise
    const diffConfig = Object.assign({ includeAA: false }, cfg.diffConfig);

    const diffPixels = pixelmatch(
      imgNew,
      imgOld,
      diff,
      width,
      height,
      diffConfig,
    );
    imgDiff = diffPixels / (width * height);

    if (isImgSizeDifferent) {
      messages.push(
        `Warning: Images size mismatch - new screenshot is ${newSize.width}px by ${newSize.height}px while old one is ${oldSize.width}px by ${oldSize.height} (width x height).`,
      );
    }

    if (imgDiff > cfg.maxDiffThreshold) {
      messages.unshift(
        `Image diff factor (${round(
          imgDiff * 100,
        )}%) is bigger than maximum threshold option ${round(cfg.maxDiffThreshold * 100)}%.`,
      );
      error = true;
    }

    const diffBuffer = await encodePNG(diff, size);
    // the images only need re-encoding when they were padded - otherwise the
    // PNG bytes already in hand are exactly the compared image
    const [imgNewPNG, imgOldPNG] = isImgSizeDifferent
      ? await Promise.all([encodePNG(imgNew, size), encodePNG(imgOld, size)])
      : [rawImgNewBuffer, rawImgOldBuffer];
    imgNewBase64 = imgNewPNG.toString('base64');
    imgDiffBase64 = diffBuffer.toString('base64');
    imgOldBase64 = imgOldPNG.toString('base64');

    if (error && cfg.updateImages === 'failures-only') {
      await moveFile(cfg.imgNew, cfg.imgOld);
      // a diff image left by an earlier failed attempt is stale now
      removeStaleDiff(cfg.imgNew);
      error = false;
      status = 'updated';
      baselineWritten = true;
      messages[0] = messages[0].replace(
        'is bigger than maximum threshold option',
        'was bigger than maximum threshold option (baseline updated):',
      );
    } else if (error) {
      fs.writeFileSync(
        cfg.imgNew.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff),
        addPNGMetadata(cypressConfig, diffBuffer),
      );
      status = 'failed';
    } else {
      status = 'passed';
      removeStaleDiff(cfg.imgNew);
      if (!isImageCurrentVersion(rawImgOldBuffer)) {
        await moveFile(cfg.imgNew, cfg.imgOld);
        baselineWritten = true;
      } else {
        // don't overwrite file if it's the same (imgDiff < cfg.maxDiffThreshold && !isImgSizeDifferent)
        fs.unlinkSync(cfg.imgNew);
      }
    }
  } else {
    // there is no "old screenshot" or screenshots should be immediately updated
    imgDiff = 0;
    imgNewBase64 = '';
    imgDiffBase64 = '';
    imgOldBase64 = '';
    const baselineExisted = fs.existsSync(cfg.imgOld);
    if (cfg.createMissingImages) {
      await moveFile(cfg.imgNew, cfg.imgOld);
      removeStaleDiff(cfg.imgNew);
      baselineWritten = true;
      status = baselineExisted ? 'updated' : 'created';
    } else {
      error = true;
      status = 'missing-baseline';
      messages.unshift(
        `Baseline image is missing at path: "${cfg.imgOld}". Provide a baseline image or enable "createMissingImages" option in plugin configuration.`,
      );
    }
  }

  if (!error) {
    messages.unshift(
      `Image diff factor (${round(
        imgDiff * 100,
      )}%) is within boundaries of maximum threshold option ${round(cfg.maxDiffThreshold * 100)}%.`,
    );
  }
  const message = messages.join('\n');

  recordManifestEntry(cypressConfig, {
    imgNew: cfg.imgNew,
    imgOld: cfg.imgOld,
    specPath: cfg.specPath,
    testTitlePath: cfg.testTitlePath,
    currentRetryNumber: cfg.currentRetryNumber,
    platform: cfg.platform,
    viewport: cfg.viewport,
    options: cfg.options,
    renderer: cfg.renderer,
    status,
    imgDiff,
    maxDiffThreshold: cfg.maxDiffThreshold,
    baselineWritten,
    imgNewSize,
    imgOldSize,
    message,
  });

  return {
    error,
    message,
    imgDiff,
    imgNewBase64,
    imgDiffBase64,
    imgOldBase64,
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
