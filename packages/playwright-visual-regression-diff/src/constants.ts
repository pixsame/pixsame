export const PLUGIN_NAME = 'pw-visual-regression-diff';

/**
 * Shared with `@frsource/cypress-plugin-visual-regression-diff`, so CI tooling
 * (the GitHub App, review services) finds every manifest of a run with one
 * glob: `**\/*cp-visual-regression-diff-manifest*.json`.
 */
export const MANIFEST_FILE_PREFIX = 'cp-visual-regression-diff-manifest';
/** One manifest per Playwright worker; they are merged by the consumer like manifests of several machines. */
export const getManifestFileName = (workerIndex: number) =>
  `${MANIFEST_FILE_PREFIX}.playwright.w${workerIndex}.json`;
export const MANIFEST_VERSION = 1;

export enum FILE_SUFFIX {
  diff = '.diff',
  actual = '.actual',
}

export const PATH_VARIABLES = {
  specPath: '{spec_path}',
  /** `{os}-{browser}`, e.g. `linux-chromium` */
  platform: '{platform}',
  /** `process.platform`: `linux`, `darwin` or `win32` */
  os: '{os}',
  /** The browser that rendered the screenshot: `chromium`, `firefox` or `webkit` */
  browser: '{browser}',
  unixSystemRootPath: '{unix_system_root_path}',
  winSystemRootPath: '{win_system_root_path}',
} as const;

export const WINDOWS_LIKE_DRIVE_REGEX = /^[A-Z]:$/;

export const DEFAULT_IMAGES_PATH = '{spec_path}/__image_snapshots__';

/**
 * PNG metadata key and image format version, identical to the Cypress
 * plugin's: both tools compare the same way, so a baseline made by one is a
 * valid baseline for the other.
 */
export const METADATA_KEY = 'FRSOURCE_CPVRD_V';
export const DIFF_IMAGES_VERSION = '1';

/** Set by `remoteBrowser()` in `playwright.config`, read by the global setup/teardown. */
export const REMOTE_ENV_KEY = 'FRSOURCE_PW_VRD_REMOTE';
/** Set by the global setup once the container runs, read by every worker for the manifest's `renderer` block. */
export const REMOTE_INFO_ENV_KEY = 'FRSOURCE_PW_VRD_REMOTE_INFO';
