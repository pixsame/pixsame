import { createRequire } from 'module';
import path from 'path';
import type { FullConfig, FullProject } from '@playwright/test';
import {
  ManifestWriter,
  getManifestFileName,
  type ManifestEntryOptions,
  type ManifestRenderer,
  type ManifestRunner,
} from '@frsource/visual-regression-manifest';
import { toPosix } from './fs.utils';
import { readRemoteInfo } from './remote';

/**
 * The Playwright side of the run manifest: maps a worker's config onto
 * `ManifestWriter` from `@frsource/visual-regression-manifest`, which owns
 * the format and the file. Nothing here knows the manifest shape itself.
 */

/**
 * `visual-regression-manifest.playwright.w<workerIndex>.json`: one file per
 * worker process, merged by the consumer like manifests of several machines.
 *
 * The label is `workerIndex`, not `parallelIndex`: Playwright restarts a
 * worker after a test failure, and the new process keeps the `parallelIndex`
 * but gets a fresh `workerIndex`. A file named after `parallelIndex` would be
 * overwritten by the restarted worker, dropping every entry the earlier
 * process recorded, the failed one included.
 */
export const manifestFileNameFor = (workerIndex: number) =>
  getManifestFileName(`playwright.w${workerIndex}`);

/** `reports/run.json` -> `reports/run.w3.json`: a configured path still gets one file per worker process. */
export const withWorkerLabel = (file: string, workerIndex: number) => {
  const ext = path.extname(file);
  return `${file.slice(0, file.length - ext.length)}.w${workerIndex}${ext}`;
};

/**
 * Resolves where a worker writes its manifest: the configured path relative
 * to `rootDir` (with the worker label inserted before the extension), the
 * project's `outputDir` by default, `null` when disabled.
 */
export const manifestPathFor = (
  option: string | false | undefined,
  {
    rootDir,
    outputDir,
    workerIndex,
  }: { rootDir: string; outputDir: string; workerIndex: number },
) => {
  if (option === false) return null;
  if (option)
    return withWorkerLabel(path.resolve(rootDir, option), workerIndex);
  return path.join(outputDir, manifestFileNameFor(workerIndex));
};

/* c8 ignore start */
export const playwrightVersion = (): string | undefined => {
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
 * `remoteBrowser()` when it is in use (`backend: 'docker'`, identified by the
 * Playwright version of the image and its digest), the local browser
 * otherwise (`backend: 'native'`).
 */
export const rendererFor = (
  browserName: string,
  browserVersion: string,
  env: NodeJS.ProcessEnv = process.env,
): ManifestRenderer => {
  const remote = readRemoteInfo(env);
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

/** The resolved `matchImage` options an entry records; the same keys as the Cypress plugin's. */
export type ResolvedMatchImageOptions = {
  imagesPath: string;
  maxDiffThreshold: number;
  /** pixelmatch options. */
  diffConfig: object;
  createMissingImages: boolean;
  updateImages: boolean | 'failures-only';
  title?: string;
  matchAgainstPath?: string;
  /** Playwright's screenshot options; only JSON-serialisable keys are recorded. */
  screenshotConfig: object;
};

export const toManifestOptions = (
  cfg: ResolvedMatchImageOptions,
): ManifestEntryOptions => ({
  imagesPath: cfg.imagesPath,
  ...(cfg.title !== undefined && { title: cfg.title }),
  maxDiffThreshold: cfg.maxDiffThreshold,
  diffConfig: cfg.diffConfig as Record<string, unknown>,
  createMissingImages: cfg.createMissingImages,
  updateImages: cfg.updateImages,
  // Playwright screenshots come at the context's deviceScaleFactor (1 by default); nothing is rescaled
  forceDeviceScaleFactor: false,
  ...(cfg.matchAgainstPath !== undefined && {
    matchAgainstPath: cfg.matchAgainstPath,
  }),
  screenshotConfig: Object.fromEntries(
    Object.entries(cfg.screenshotConfig).filter(
      ([, value]) => typeof value !== 'function',
    ),
  ),
});

export type ManifestWorkerInput = {
  config: Pick<FullConfig, 'rootDir' | 'configFile' | 'workers' | 'shard'>;
  project: Pick<
    FullProject,
    'name' | 'testDir' | 'outputDir' | 'retries' | 'use'
  >;
  /** Slot of the worker, `0..workers - 1`; a restarted worker keeps it. */
  parallelIndex: number;
  /** Unique per worker process for the whole run; a restarted worker gets a new one. */
  workerIndex: number;
  browser: { name: string; version: string; headless: boolean };
  /** Global `matchImage` options as configured in `use`, verbatim. */
  options: Record<string, unknown>;
  env?: NodeJS.ProcessEnv;
};

/** The `runner` block: Playwright's identity and the parts of the config that reproduce the run. */
export const runnerFor = ({
  config,
  project,
  parallelIndex,
  workerIndex,
  browser,
}: ManifestWorkerInput): ManifestRunner => ({
  name: 'playwright',
  version: playwrightVersion(),
  mode: 'run',
  configFile: relativeToRoot(config.rootDir, config.configFile),
  browser,
  baseUrl: project.use.baseURL ?? null,
  viewport: project.use.viewport ?? undefined,
  retries: project.retries,
  project: project.name || undefined,
  testDir: relativeToRoot(config.rootDir, project.testDir),
  outputDir: relativeToRoot(config.rootDir, project.outputDir),
  workers: config.workers,
  shard: config.shard ?? undefined,
  parallelIndex,
  workerIndex,
});

/** A `ManifestWriter` for one worker, with Playwright's `rootDir` as the project root. */
export const createManifestWriter = (
  manifestPath: string,
  input: ManifestWorkerInput,
) =>
  new ManifestWriter(manifestPath, {
    projectRoot: input.config.rootDir,
    options: input.options,
    runner: runnerFor(input),
    ...(input.env && { env: input.env }),
  });
