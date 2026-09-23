import { createRequire } from 'module';
import path from 'path';
import {
  test as base,
  type Fixtures,
  type Locator,
  type LocatorScreenshotOptions,
  type Page,
  type PageScreenshotOptions,
  type PlaywrightTestArgs,
  type PlaywrightTestOptions,
  type PlaywrightWorkerArgs,
  type PlaywrightWorkerOptions,
  type TestInfo,
  type WorkerInfo,
} from '@playwright/test';
import {
  compareImages,
  type CompareStatus,
  type PixelmatchOptions,
} from './compare';
import {
  DEFAULT_IMAGES_PATH,
  FILE_SUFFIX,
  getManifestFileName,
} from './constants';
import { toPosix } from './fs.utils';
import { ManifestWriter } from './manifest';
import type { ManifestEntryOptions, ManifestRenderer } from './manifest.types';
import { readRemoteInfo } from './remote';
import { resolveImagesDir, ScreenshotNamer } from './screenshotPath';

export type MatchImageOptions = {
  /**
   * Where baselines live. Relative paths resolve against Playwright's
   * `rootDir`. Tokens: `{spec_path}` (directory of the test file, whole
   * segment only), `{platform}` (`{os}-{browser}`), `{os}`, `{browser}`.
   * @default '{spec_path}/__image_snapshots__'
   */
  imagesPath?: string;
  /** Maximum share of differing pixels, 0..1. @default 0.01 */
  maxDiffThreshold?: number;
  /** pixelmatch options; `includeAA: false` unless overridden. @default {} */
  diffConfig?: PixelmatchOptions;
  /** Create the baseline from the first screenshot instead of failing. @default true */
  createMissingImages?: boolean;
  /** `true` overwrites every baseline, `'failures-only'` only the ones that failed. @default false */
  updateImages?: boolean | 'failures-only';
  /** Screenshot name; defaults to the test's title path joined with spaces. */
  title?: string;
  /** Compare against this file instead of the derived baseline path (never token-expanded). */
  matchAgainstPath?: string;
  /** Passed to `page.screenshot()` / `locator.screenshot()`. */
  screenshotConfig?: PageScreenshotOptions & LocatorScreenshotOptions;
  /** Disables CSS animations and hides the caret for the screenshot. @default true */
  deterministicRendering?: boolean;
};

export type VisualRegressionOptions = MatchImageOptions;

export type MatchImageResult = {
  status: CompareStatus;
  message: string;
  /** Share of differing pixels, or `undefined` when nothing was compared. */
  diffValue: number | undefined;
  /** Baseline path. */
  imgPath: string;
  /** `.actual.png` path (only exists on disk for failures). */
  imgNewPath: string;
  /** `.diff.png` path (only exists on disk for failures). */
  imgDiffPath: string;
  imgNew: Buffer | undefined;
  img: Buffer | undefined;
  imgDiff: Buffer | undefined;
};

export type MatchImage = (
  target?: Page | Locator,
  options?: MatchImageOptions,
) => Promise<MatchImageResult>;

export type VisualRegressionTestFixtures = {
  /** Global `matchImage` defaults, set through `use` in `playwright.config`. */
  visualRegression: VisualRegressionOptions;
  /** Takes a screenshot of the page (or a locator) and compares it with its baseline. */
  matchImage: MatchImage;
};

export type VisualRegressionWorkerFixtures = {
  /**
   * Where this worker writes its run manifest; `false` disables it.
   * @default '<outputDir>/cp-visual-regression-diff-manifest.playwright.w<index>.json'
   */
  visualRegressionManifestPath: string | false | undefined;
  visualRegressionManifest: ManifestWriter | null;
};

const withDefaults = (
  globals: VisualRegressionOptions,
  options: MatchImageOptions,
) => {
  const merged = { ...globals, ...options };
  return {
    imagesPath: merged.imagesPath ?? DEFAULT_IMAGES_PATH,
    maxDiffThreshold: merged.maxDiffThreshold ?? 0.01,
    diffConfig: merged.diffConfig ?? {},
    createMissingImages: merged.createMissingImages ?? true,
    updateImages: merged.updateImages ?? false,
    title: merged.title,
    matchAgainstPath: merged.matchAgainstPath,
    screenshotConfig: merged.screenshotConfig ?? {},
    deterministicRendering: merged.deterministicRendering ?? true,
  };
};

type ResolvedOptions = ReturnType<typeof withDefaults>;

const toManifestOptions = (cfg: ResolvedOptions): ManifestEntryOptions => ({
  imagesPath: cfg.imagesPath,
  title: cfg.title,
  maxDiffThreshold: cfg.maxDiffThreshold,
  diffConfig: cfg.diffConfig as Record<string, unknown>,
  createMissingImages: cfg.createMissingImages,
  updateImages: cfg.updateImages,
  // Playwright screenshots come at the context's deviceScaleFactor (1 by default)
  forceDeviceScaleFactor: false,
  matchAgainstPath: cfg.matchAgainstPath,
  screenshotConfig: Object.fromEntries(
    Object.entries(cfg.screenshotConfig).filter(
      ([, value]) => typeof value !== 'function',
    ),
  ),
});

/* c8 ignore start */
const playwrightVersion = (): string | undefined => {
  try {
    return (
      createRequire(__filename)('@playwright/test/package.json') as {
        version?: string;
      }
    ).version;
  } catch {
    return undefined;
  }
};
/* c8 ignore stop */

const relativeToRoot = (rootDir: string, p: string | undefined) =>
  p ? toPosix(path.relative(rootDir, p)) || '.' : undefined;

/**
 * Where the pixels came from: the remote Docker browser started by
 * `remoteBrowser()` when it is in use, the local browser otherwise.
 */
const rendererFor = (
  browserName: string,
  browserVersion: string,
): ManifestRenderer => {
  const remote = readRemoteInfo();
  return remote
    ? {
        backend: 'docker',
        browser: browserName,
        browserVersion,
        rendererVersion: remote.playwrightVersion,
        ...(remote.imageDigest && { imageDigest: remote.imageDigest }),
      }
    : { backend: 'native', browser: browserName, browserVersion };
};

const manifestPathFor = (
  option: string | false | undefined,
  workerInfo: WorkerInfo,
) => {
  if (option === false) return null;
  if (option) return path.resolve(workerInfo.config.rootDir, option);
  return path.join(
    workerInfo.project.outputDir,
    getManifestFileName(workerInfo.parallelIndex),
  );
};

export const visualRegressionFixtures: Fixtures<
  VisualRegressionTestFixtures,
  VisualRegressionWorkerFixtures,
  PlaywrightTestArgs & PlaywrightTestOptions,
  PlaywrightWorkerArgs & PlaywrightWorkerOptions
> = {
  visualRegression: [{}, { option: true }],
  visualRegressionManifestPath: [undefined, { option: true, scope: 'worker' }],

  visualRegressionManifest: [
    async (
      { browser, browserName, headless, visualRegressionManifestPath },
      use,
      workerInfo,
    ) => {
      const manifestPath = manifestPathFor(
        visualRegressionManifestPath,
        workerInfo,
      );
      const { config, project } = workerInfo;
      const options = {
        ...((project.use as { visualRegression?: VisualRegressionOptions })
          .visualRegression ?? {}),
        ...(visualRegressionManifestPath !== undefined && {
          manifestPath: visualRegressionManifestPath,
        }),
      };
      const writer = manifestPath
        ? new ManifestWriter(manifestPath, {
            projectRoot: config.rootDir,
            options,
            runner: {
              name: 'playwright',
              version: playwrightVersion(),
              mode: 'run',
              configFile: relativeToRoot(config.rootDir, config.configFile),
              browser: {
                name: browserName,
                version: browser.version(),
                headless,
              },
              baseUrl: project.use.baseURL ?? null,
              viewport: project.use.viewport ?? undefined,
              retries: project.retries,
              project: project.name || undefined,
              testDir: relativeToRoot(config.rootDir, project.testDir),
              outputDir: relativeToRoot(config.rootDir, project.outputDir),
              workers: config.workers,
              shard: config.shard ?? undefined,
              parallelIndex: workerInfo.parallelIndex,
            },
          })
        : null;
      await use(writer);
    },
    { scope: 'worker' },
  ],

  matchImage: async (
    {
      page,
      browser,
      browserName,
      headless,
      visualRegression,
      visualRegressionManifest,
    },
    use,
    testInfo: TestInfo,
  ) => {
    const namer = new ScreenshotNamer();
    const rootDir = testInfo.config.rootDir;
    const specPath = toPosix(path.relative(rootDir, testInfo.file));
    const renderer = rendererFor(browserName, browser.version());

    await use(async (target = page, options = {}) => {
      const cfg = withDefaults(visualRegression, options);
      const dir = resolveImagesDir({
        imagesPath: cfg.imagesPath,
        specPath,
        rootDir,
        pathVariables: { os: process.platform, browser: browserName },
      });
      const title = cfg.title ?? testInfo.titlePath.slice(1).join(' ');
      const name = namer.next(dir, title);
      const actualPath = path.join(dir, `${name}${FILE_SUFFIX.actual}.png`);
      const baselinePath = cfg.matchAgainstPath
        ? path.resolve(rootDir, cfg.matchAgainstPath)
        : path.join(dir, `${name}.png`);

      const imgNew = await target.screenshot({
        ...(cfg.deterministicRendering && {
          animations: 'disabled',
          caret: 'hide',
        }),
        ...cfg.screenshotConfig,
      });
      const result = await compareImages({
        imgNew,
        actualPath,
        baselinePath,
        createMissingImages: cfg.createMissingImages,
        updateImages: cfg.updateImages,
        maxDiffThreshold: cfg.maxDiffThreshold,
        diffConfig: cfg.diffConfig,
      });

      const viewport = page.viewportSize() ?? undefined;
      visualRegressionManifest?.record({
        actualPath,
        baselinePath,
        testFile: testInfo.file,
        titlePath: testInfo.titlePath.slice(1),
        retry: testInfo.retry,
        status: result.status,
        diffRatio: result.diffRatio,
        threshold: result.threshold,
        baselineWritten: result.baselineWritten,
        imgNewSize: result.imgNewSize,
        imgOldSize: result.imgOldSize,
        message: result.message,
        platform: {
          os: process.platform,
          arch: process.arch,
          browser: { name: browserName, version: browser.version(), headless },
        },
        viewport,
        options: toManifestOptions(cfg),
        renderer,
      });

      const matchImageResult: MatchImageResult = {
        status: result.status,
        message: result.message,
        diffValue: result.imgOld ? result.diffRatio : undefined,
        imgPath: baselinePath,
        imgNewPath: actualPath,
        imgDiffPath: result.diffPath,
        imgNew: result.imgNew,
        img: result.imgOld,
        imgDiff: result.imgDiff,
      };

      if (result.error) {
        // the three images land in the HTML report next to the failure
        const attach = (label: string, body: Buffer | undefined) =>
          body &&
          testInfo.attach(`${name} (${label})`, {
            body,
            contentType: 'image/png',
          });
        // one after another, so the report lists them in a stable order
        await attach('baseline', result.imgOld);
        await attach('actual', result.imgNew ?? imgNew);
        await attach('diff', result.imgDiff);
        throw new Error(`[${name}] ${result.message}`);
      }
      return matchImageResult;
    });
  },
};

export const test = base.extend<
  VisualRegressionTestFixtures,
  VisualRegressionWorkerFixtures
>(visualRegressionFixtures);

export { expect } from '@playwright/test';
