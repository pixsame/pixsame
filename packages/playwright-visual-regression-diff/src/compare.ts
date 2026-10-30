import fs from 'fs';
import type pixelmatchType from 'pixelmatch' with {
  'resolution-mode': 'import',
};
import { FILE_SUFFIX } from './constants';
import { moveFile, unlinkSafe, writeFileEnsuringDir } from './fs.utils';
import {
  addPNGMetadata,
  decodePNG,
  encodePNG,
  getImageSize,
  isImageCurrentVersion,
  type ImageInfo,
} from './image.utils';

export type PixelmatchOptions = NonNullable<
  Parameters<typeof pixelmatchType>[5]
>;

// pixelmatch 7 is ESM-only; a dynamic import keeps this package usable from a
// CommonJS `playwright.config` on every supported Node version
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
};

export type CompareResult = {
  status: CompareStatus;
  /** `true` when the test should fail. */
  error: boolean;
  message: string;
  /** Share of differing pixels, 0..1; `0` when no comparison ran. */
  diffRatio: number;
  threshold: number;
  imgNewSize: ImageInfo;
  imgOldSize?: ImageInfo;
  /** `true` whenever the baseline file was (re)written. */
  baselineWritten: boolean;
  /** Path of the `.diff.png` sibling of `actualPath`. */
  diffPath: string;
  /** The compared images (padded to a common size when they differed in size); absent when no comparison ran. */
  imgNew?: Buffer;
  imgOld?: Buffer;
  imgDiff?: Buffer;
};

const round = (n: number) => Math.ceil(n * 1000) / 1000;
const percent = (ratio: number) => `${round(ratio * 100)}%`;

export const diffPathFor = (actualPath: string) =>
  actualPath.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff);

/**
 * The comparison of the Cypress plugin's `compareImagesTask`, without the
 * runner: writes the stamped screenshot to `actualPath`, compares it with the
 * baseline and leaves the files on disk the way the manifest contract
 * describes (`.actual.png` and `.diff.png` only for failures).
 */
export const compareImages = async (
  cfg: CompareInput,
): Promise<CompareResult> => {
  const messages: string[] = [];
  const diffPath = diffPathFor(cfg.actualPath);
  // stamped once, so every file derived from it carries the plugin marker
  const rawImgNew = addPNGMetadata(cfg.imgNew);
  writeFileEnsuringDir(cfg.actualPath, rawImgNew);
  const imgNewSize = await getImageSize(rawImgNew);

  let status: CompareStatus;
  let error = false;
  let baselineWritten = false;
  let diffRatio = 0;
  let imgOldSize: ImageInfo | undefined;
  let images: Pick<CompareResult, 'imgNew' | 'imgOld' | 'imgDiff'> = {};

  if (fs.existsSync(cfg.baselinePath) && cfg.updateImages !== true) {
    const rawImgOld = fs.readFileSync(cfg.baselinePath);
    imgOldSize = await getImageSize(rawImgOld);
    const isSizeDifferent =
      imgNewSize.width !== imgOldSize.width ||
      imgNewSize.height !== imgOldSize.height;
    const size = {
      width: Math.max(imgNewSize.width, imgOldSize.width),
      height: Math.max(imgNewSize.height, imgOldSize.height),
    };

    const [imgNew, imgOld, pixelmatch] = await Promise.all([
      decodePNG(rawImgNew, imgNewSize, size),
      decodePNG(rawImgOld, imgOldSize, size),
      loadPixelmatch(),
    ]);
    const diff = Buffer.alloc(size.width * size.height * 4);
    // anti-aliased edge pixels are not counted, like in the Cypress plugin
    const diffPixels = pixelmatch(
      imgNew,
      imgOld,
      diff,
      size.width,
      size.height,
      { includeAA: false, ...cfg.diffConfig },
    );
    diffRatio = diffPixels / (size.width * size.height);

    if (isSizeDifferent) {
      messages.push(
        `Warning: Images size mismatch - new screenshot is ${imgNewSize.width}px by ${imgNewSize.height}px while old one is ${imgOldSize.width}px by ${imgOldSize.height} (width x height).`,
      );
    }
    if (diffRatio > cfg.maxDiffThreshold) {
      messages.unshift(
        `Image diff factor (${percent(diffRatio)}) is bigger than maximum threshold option ${percent(cfg.maxDiffThreshold)}.`,
      );
      error = true;
    }

    const imgDiff = await encodePNG(diff, size);
    const [imgNewPNG, imgOldPNG] = isSizeDifferent
      ? await Promise.all([encodePNG(imgNew, size), encodePNG(imgOld, size)])
      : [rawImgNew, rawImgOld];
    images = { imgNew: imgNewPNG, imgOld: imgOldPNG, imgDiff };

    if (error && cfg.updateImages === 'failures-only') {
      moveFile(cfg.actualPath, cfg.baselinePath);
      unlinkSafe(diffPath);
      error = false;
      status = 'updated';
      baselineWritten = true;
      messages[0] = messages[0].replace(
        'is bigger than maximum threshold option',
        'was bigger than maximum threshold option (baseline updated):',
      );
    } else if (error) {
      writeFileEnsuringDir(diffPath, addPNGMetadata(imgDiff));
      status = 'failed';
    } else {
      status = 'passed';
      unlinkSafe(diffPath);
      if (!isImageCurrentVersion(rawImgOld)) {
        // a baseline without the plugin marker (or from an older format) is refreshed silently
        moveFile(cfg.actualPath, cfg.baselinePath);
        baselineWritten = true;
      } else {
        fs.unlinkSync(cfg.actualPath);
      }
    }
  } else {
    const baselineExisted = fs.existsSync(cfg.baselinePath);
    if (cfg.createMissingImages) {
      moveFile(cfg.actualPath, cfg.baselinePath);
      unlinkSafe(diffPath);
      baselineWritten = true;
      status = baselineExisted ? 'updated' : 'created';
    } else {
      error = true;
      status = 'missing-baseline';
      messages.unshift(
        `Baseline image is missing at path: "${cfg.baselinePath}". Provide a baseline image or enable "createMissingImages" option in plugin configuration.`,
      );
    }
  }

  if (!error) {
    messages.unshift(
      `Image diff factor (${percent(diffRatio)}) is within boundaries of maximum threshold option ${percent(cfg.maxDiffThreshold)}.`,
    );
  }

  return {
    status,
    error,
    message: messages.join('\n'),
    diffRatio,
    threshold: cfg.maxDiffThreshold,
    imgNewSize,
    imgOldSize,
    baselineWritten,
    diffPath,
    ...images,
  };
};
