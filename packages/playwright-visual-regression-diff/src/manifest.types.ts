/**
 * The run manifest contract, mirrored from
 * `@frsource/cypress-plugin-visual-regression-diff/plugins` (`src/types.ts`).
 * Both packages write the same shape; only the `runner` block differs. Keep
 * the two files in sync until they move into a shared package.
 */

/**
 * Run manifest: a machine-readable record of every comparison made during a run,
 * meant for CI consumers (GitHub Action, review services). The shape is
 * runner-agnostic - everything Cypress-specific lives in `Manifest.runner`.
 *
 * Per-entry data is self-sufficient for approving a screenshot (paths) and for
 * telling entries of different machines apart (`platform`, `viewport`) once the
 * `entries` arrays of several manifests get concatenated. Run-level data
 * locates the run (`ci`) and describes how to reproduce it (`runner`,
 * `platform`, `options`).
 */
export type ManifestStatus =
  'passed' | 'failed' | 'missing-baseline' | 'created' | 'updated' | 'approved';

export type ManifestImage = {
  /** Path relative to `Manifest.projectRoot` with `/` separators; `null` when the file no longer exists. */
  path: string | null;
  width?: number;
  height?: number;
};

export type ManifestBrowser = {
  name: string;
  version: string;
  family?: string;
  headless?: boolean;
};

/** Where the run happened. `os` uses Node's `process.platform` names (`linux`, `darwin`, `win32`). */
export type ManifestPlatform = {
  os: string;
  arch: string;
  osVersion?: string;
};

/**
 * The `matchImage` options a comparison was made with, exactly as configured
 * (`imagesPath` keeps its `{spec_path}`-style tokens unexpanded). Plugin
 * vocabulary, not runner vocabulary - a Playwright client writes the same keys.
 */
export type ManifestEntryOptions = {
  imagesPath: string;
  title?: string;
  maxDiffThreshold: number;
  diffConfig: Record<string, unknown>;
  createMissingImages: boolean;
  updateImages: boolean | 'failures-only';
  forceDeviceScaleFactor: boolean;
  matchAgainstPath?: string;
  /** Only JSON-serialisable keys; callbacks are dropped. */
  screenshotConfig: Record<string, unknown>;
};

/** Which kind of renderer produced the compared pixels. */
export type ManifestRendererBackend = 'native' | 'docker' | 'cloud';

/**
 * Where the pixels of a screenshot came from, as opposed to `platform`, which
 * is where the test ran. Under `native` (a screenshot taken by the test
 * runner's own browser) `browser` repeats `platform.browser.name`; a Docker
 * or cloud renderer additionally reports its own version and image digest,
 * which together identify the renderer that produced a baseline.
 */
export type ManifestRenderer = {
  backend: ManifestRendererBackend;
  browser: string;
  browserVersion?: string;
  /** Version of the renderer image; absent under `native`. */
  rendererVersion?: string;
  /** Content digest of the renderer image; absent under `native`. */
  imageDigest?: string;
  /** `true` when an `auto` renderer degraded to `native`, so CI consumers can flag the run. */
  fallback?: boolean;
};

/** sha256 (hex) of the image files as they are on disk, for dedupe and cross-referencing. */
export type ManifestHashes = {
  baseline?: string;
  actual?: string;
  diff?: string;
};

export type ManifestEntry = {
  /** Screenshot name, equal to the baseline file stem. Unique within a run. */
  name: string;
  test: {
    /** Test file path relative to `Manifest.projectRoot` with `/` separators. */
    file: string;
    titlePath: string[];
    retry: number;
  };
  status: ManifestStatus;
  comparison: {
    /** Share of differing pixels, 0..1. `0` when no comparison ran. */
    diffRatio: number;
    threshold: number;
  };
  images: {
    baseline: ManifestImage & { path: string };
    actual: ManifestImage;
    diff: Pick<ManifestImage, 'path'>;
  };
  /** `true` whenever the baseline file was (re)written during this run. */
  baselineWritten: boolean;
  /** ISO 8601 timestamp of when the entry was (last) written. */
  recordedAt: string;
  /** Where this particular screenshot was taken; kept per entry because manifests of several machines get merged. */
  platform?: { os: string; arch?: string; browser: ManifestBrowser };
  viewport?: { width: number; height: number };
  /** Absent on entries created by the review UI without a preceding comparison. */
  options?: ManifestEntryOptions;
  /** Where the pixels came from; absent only on entries created by the review UI without a preceding comparison. */
  renderer?: ManifestRenderer;
  /** Hashes of the files listed in `images`; a key is present only when the file exists. */
  hashes?: ManifestHashes;
  /** Human-readable summary, informational only. */
  message: string;
};

/** Where the images and snapshots of a run were uploaded to, when an upload service was used. */
export type ManifestUpload = {
  buildId: string;
  url: string;
  level: 'images' | 'images+snapshot';
};

/**
 * CI metadata detected from environment variables. `null` outside CI;
 * `provider: null` when only a generic `CI` flag is set.
 *
 * On GitHub `pull_request` events `sha` is the synthetic merge commit; tools
 * that write to the PR branch must use `pullRequest.headSha` / `headRef`.
 */
export type ManifestCi = {
  provider: 'github' | 'gitlab' | null;
  /** `owner/repo` (GitHub) or `group/project` (GitLab). */
  repository?: string;
  sha?: string;
  ref?: string;
  /** Source branch when known. */
  branch?: string;
  pullRequest?: {
    number: number;
    headSha?: string;
    headRef?: string;
    baseRef?: string;
  } | null;
  event?: string;
  runId?: string;
  runAttempt?: string;
  runNumber?: string;
  job?: string;
  jobId?: string;
  workflow?: string;
  serverUrl?: string;
  /** Link to the run/job page. */
  url?: string;
  /** Absolute path of the checked-out repository on the CI machine. */
  workspace?: string;
};

export type ManifestRunner = {
  name: string;
  version?: string;
  /** Cypress: `e2e` or `component`. */
  testingType?: string;
  /** `run` for a headless CLI run, `open` for the interactive app. */
  mode?: 'run' | 'open';
  /** Config file path relative to `Manifest.projectRoot` with `/` separators. */
  configFile?: string;
  browser?: ManifestBrowser;
  /** Spec files of the run relative to `Manifest.projectRoot`; only known in `run` mode. */
  specs?: string[];
  specPattern?: string | string[];
  baseUrl?: string | null;
  viewport?: { width: number; height: number };
  retries?: unknown;
  /** Cypress Cloud details, when recording. */
  cloud?: {
    runUrl?: string;
    group?: string;
    tag?: string;
    parallel?: boolean;
  };
  [runnerSpecific: string]: unknown;
};

export type Manifest = {
  version: 1;
  /** ISO 8601, when the run started (manifest was reset). */
  createdAt: string;
  /** ISO 8601, when the file was last written. */
  updatedAt: string;
  /** Absolute path all relative paths in the manifest resolve against. */
  projectRoot: string;
  platform: ManifestPlatform;
  ci: ManifestCi | null;
  /** Global plugin options as configured (`pluginVisualRegression` prefix stripped, values verbatim). */
  options: Record<string, unknown>;
  runner: ManifestRunner;
  /** Reserved for the upload service integration; never written by the plugin today. */
  upload?: ManifestUpload;
  entries: ManifestEntry[];
};
