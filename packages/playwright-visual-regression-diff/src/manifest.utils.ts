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

/** `visual-regression-manifest.playwright.w<parallelIndex>.json`: one file per worker, merged by the consumer like manifests of several machines. */
export const manifestFileNameFor = (parallelIndex: number) =>
  getManifestFileName(`playwright.w${parallelIndex}`);

/**
 * Resolves where a worker writes its manifest: the configured path relative
 * to `rootDir`, the project's `outputDir` by default, `null` when disabled.
 */
export const manifestPathFor = (
  option: string | false | undefined,
  {
    rootDir,
    outputDir,
    parallelIndex,
  }: { rootDir: string; outputDir: string; parallelIndex: number },
) => {
  if (option === false) return null;
  if (option) return path.resolve(rootDir, option);
  return path.join(outputDir, manifestFileNameFor(parallelIndex));
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
  parallelIndex: number;
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
