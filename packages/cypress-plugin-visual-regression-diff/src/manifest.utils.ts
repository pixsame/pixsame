import os from 'os';
import path from 'path';
import {
  ManifestBuilder,
  getManifestFileName,
  toPosix,
  writeManifestFile,
  type EnvLike,
  type ManifestEntryPlatform,
  type ManifestHeader,
  type ManifestViewport,
} from '@frsource/visual-regression-manifest';
import fs from 'fs';
import { FILE_SUFFIX } from './constants';
import type { ImageInfo } from './image.utils';
import { getPluginConfig, supportsExpose } from './version.utils';
import type {
  ManifestBrowser,
  ManifestEntry,
  ManifestEntryOptions,
  ManifestRenderer,
  ManifestRunner,
  ManifestStatus,
} from './types';

export { toPosix };

/**
 * The plugin's side of the run manifest: maps the Cypress config and events
 * onto `ManifestBuilder` from `@frsource/visual-regression-manifest`, which
 * owns the format, and writes the file where the config says.
 */

/** The subset of the Cypress plugin config the manifest needs; everything is optional so unit tests can pass `{}`. */
export type ManifestConfig = Partial<
  Pick<
    Cypress.PluginConfigOptions,
    | 'projectRoot'
    | 'screenshotsFolder'
    | 'testingType'
    | 'version'
    | 'expose'
    | 'env'
    | 'platform'
    | 'arch'
    | 'configFile'
    | 'isTextTerminal'
    | 'isInteractive'
    | 'baseUrl'
    | 'specPattern'
    | 'viewportWidth'
    | 'viewportHeight'
    | 'retries'
  >
>;

/** What `before:run` hands over; typed loosely so unit tests can pass a subset. */
export type ManifestRunDetails = Partial<
  Pick<
    Cypress.BeforeRunDetails,
    | 'browser'
    | 'specs'
    | 'specPattern'
    | 'system'
    | 'runUrl'
    | 'group'
    | 'tag'
    | 'parallel'
    | 'cypressVersion'
  >
>;

export type ManifestBrowserInput = Pick<Cypress.Browser, 'name' | 'version'> &
  Partial<Pick<Cypress.Browser, 'family' | 'isHeadless'>>;

export type ManifestRecordInput = {
  imgNew: string;
  imgOld: string;
  specPath?: string;
  testTitlePath?: string[];
  currentRetryNumber?: number;
  platform?: ManifestEntryPlatform;
  viewport?: ManifestViewport;
  options?: ManifestEntryOptions;
  /** Defaults to a `native` renderer derived from `platform.browser`. */
  renderer?: ManifestRenderer;
  status: ManifestStatus;
  imgDiff: number;
  maxDiffThreshold: number;
  baselineWritten: boolean;
  imgNewSize?: ImageInfo;
  imgOldSize?: ImageInfo;
  message: string;
};

// one manifest per process: Cypress runs the plugin file once per run
let builder: ManifestBuilder | null = null;

const OPTION_KEY = 'pluginVisualRegressionManifestPath';
const OPTION_PREFIX = 'pluginVisualRegression';

/**
 * Resolves where the manifest is written, or `null` when it is disabled
 * (`pluginVisualRegressionManifestPath: false`) or the config is incomplete.
 */
export const getManifestPath = (config: ManifestConfig): string | null => {
  if (!config.projectRoot) return null;
  const option = getPluginConfig(
    config as Cypress.PluginConfigOptions,
    OPTION_KEY,
  );
  if (option === false || option === 'false') return null;
  if (typeof option === 'string' && option) {
    return path.resolve(config.projectRoot, option);
  }
  const dir =
    config.screenshotsFolder ||
    path.join(config.projectRoot, 'cypress', 'screenshots');
  return path.join(dir, getManifestFileName(config.testingType));
};

/**
 * Global plugin options as configured, with the `pluginVisualRegression`
 * prefix stripped (`pluginVisualRegressionUpdateImages` -> `updateImages`).
 * Values are kept verbatim, so CLI-provided ones stay strings.
 */
export const getPluginOptions = (
  config: ManifestConfig,
): Record<string, unknown> => {
  const source =
    (supportsExpose(config.version ?? '') ? config.expose : config.env) ?? {};
  const options: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (key.startsWith(OPTION_PREFIX) && key.length > OPTION_PREFIX.length) {
      const rest = key.slice(OPTION_PREFIX.length);
      options[rest.charAt(0).toLowerCase() + rest.slice(1)] = value;
    }
  }
  return options;
};

const toManifestBrowser = (browser: ManifestBrowserInput): ManifestBrowser => ({
  name: browser.name,
  version: browser.version,
  ...(browser.family !== undefined && { family: browser.family }),
  ...(browser.isHeadless !== undefined && { headless: browser.isHeadless }),
});

const projectRelativeOrUndefined = (
  projectRoot: string | undefined,
  p: string | undefined,
) =>
  p && projectRoot
    ? toPosix(path.relative(projectRoot, path.resolve(p)))
    : undefined;

/**
 * Seeds the run-level manifest data from the Cypress config, the process and
 * the environment. `details` (from `before:run`) adds what is only known in
 * run mode: the spec list, the OS version, Cypress Cloud fields.
 */
export const initManifestRun = (
  config: ManifestConfig,
  details?: ManifestRunDetails,
  env: EnvLike = process.env,
): ManifestHeader => {
  const mode: ManifestRunner['mode'] =
    config.isTextTerminal === true ||
    (config.isTextTerminal === undefined && config.isInteractive === false)
      ? 'run'
      : 'open';
  const runner: ManifestRunner = {
    name: 'cypress',
    version: details?.cypressVersion ?? config.version,
    testingType: config.testingType,
    mode,
    configFile: projectRelativeOrUndefined(
      config.projectRoot,
      config.configFile,
    ),
    browser: details?.browser ? toManifestBrowser(details.browser) : undefined,
    specs: details?.specs?.map((spec) => toPosix(spec.relative)),
    specPattern: details?.specPattern ?? config.specPattern,
    baseUrl: config.baseUrl,
    viewport:
      config.viewportWidth && config.viewportHeight
        ? { width: config.viewportWidth, height: config.viewportHeight }
        : undefined,
    retries: config.retries,
    cloud: details?.runUrl
      ? {
          runUrl: details.runUrl,
          group: details.group,
          tag: details.tag,
          parallel: details.parallel,
        }
      : undefined,
  };
  builder = new ManifestBuilder({
    projectRoot: config.projectRoot as string,
    platform: {
      os: config.platform ?? process.platform,
      arch: config.arch ?? process.arch,
      osVersion: details?.system?.osVersion ?? os.release(),
    },
    env,
    options: getPluginOptions(config),
    runner,
  });
  return builder.header;
};

// `before:run` does not fire in `cypress open`; seed from the config then
const ensureBuilder = (config: ManifestConfig) => {
  if (!builder) initManifestRun(config);
  return builder as ManifestBuilder;
};

const clearBuilder = () => {
  builder = null;
};

const write = (config: ManifestConfig, manifestPath: string) =>
  writeManifestFile(manifestPath, ensureBuilder(config).toJSON());

/**
 * Records the browser Cypress launched (`before:browser:launch`, fires in
 * both `run` and `open` mode). The file is only rewritten when it exists
 * already, i.e. when something was recorded.
 */
export const setManifestBrowser = (
  config: ManifestConfig,
  browser: ManifestBrowserInput,
) => {
  const manifestPath = getManifestPath(config);
  if (!manifestPath) return;
  const current = ensureBuilder(config);
  current.header.runner.browser = toManifestBrowser(browser);
  if (current.size > 0) write(config, manifestPath);
};

/** Records the outcome of one comparison and rewrites the manifest file. */
export const recordManifestEntry = (
  config: ManifestConfig,
  input: ManifestRecordInput,
): ManifestEntry | null => {
  const manifestPath = getManifestPath(config);
  if (!manifestPath) return null;
  const entry = ensureBuilder(config).record({
    actualPath: input.imgNew,
    baselinePath: input.imgOld,
    testFile: input.specPath,
    titlePath: input.testTitlePath,
    retry: input.currentRetryNumber,
    status: input.status,
    diffRatio: input.imgDiff,
    threshold: input.maxDiffThreshold,
    baselineWritten: input.baselineWritten,
    actualSize: input.imgNewSize,
    baselineSize: input.imgOldSize,
    platform: input.platform,
    viewport: input.viewport,
    options: input.options,
    renderer: input.renderer,
    message: input.message,
  });
  write(config, manifestPath);
  return entry;
};

/** Marks a screenshot as approved (baseline replaced by the `.actual.png`) after a headed review. */
export const markManifestEntryApproved = (
  config: ManifestConfig,
  {
    img,
    imgOld,
    specPath,
  }: { img: string; imgOld?: string; specPath?: string },
): ManifestEntry | null => {
  const manifestPath = getManifestPath(config);
  if (!manifestPath) return null;
  const entry = ensureBuilder(config).approve({
    actualPath: img,
    baselinePath: imgOld ?? img.replace(FILE_SUFFIX.actual, ''),
    testFile: specPath,
  });
  write(config, manifestPath);
  return entry;
};

/**
 * Drops the entries of one test file. Called when a spec starts, so that a
 * re-run in `cypress open` (which restarts the screenshot counters) does not
 * leave stale entries behind.
 */
export const dropSpecEntries = (config: ManifestConfig, specPath: string) => {
  const manifestPath = getManifestPath(config);
  if (!manifestPath) return;
  if (ensureBuilder(config).dropTestFile(specPath)) write(config, manifestPath);
};

/**
 * Forgets every entry, removes a manifest left over from a previous run and
 * re-seeds the run-level data (with the `before:run` details when given).
 */
export const resetManifest = (
  config: ManifestConfig,
  details?: ManifestRunDetails,
  env?: EnvLike,
) => {
  // a config without a project root (unit tests) cannot seed a run; the next
  // recording call brings a complete config and seeds it lazily
  clearBuilder();
  if (config.projectRoot) initManifestRun(config, details, env);
  const manifestPath = getManifestPath(config);
  if (manifestPath && fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);
};

/** Current in-memory entries, sorted the way they are written. Intended for tests. */
export const getManifestEntries = (): ManifestEntry[] =>
  builder?.entries() ?? [];
