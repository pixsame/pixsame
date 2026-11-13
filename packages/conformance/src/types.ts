import type { ManifestEntry } from 'visual-regression-manifest';

export type RunnerName = 'cypress' | 'playwright';

/** The fixture pages the harness serves; same markup for every runner. */
export type Fixture = 'blue' | 'red' | 'tall';

/** The matchImage options both adapters understand. */
export type CommonOptions = {
  createMissingImages?: boolean;
  updateImages?: boolean | 'failures-only';
  maxDiffThreshold?: number;
};

/** What a run leaves behind, as the harness sees it. */
export type Observed = {
  exitCode: number;
  output: string;
  /** Manifest entries written by this run only. */
  entries: ManifestEntry[];
  /** Absolute paths of the baseline, `.actual` and `.diff` files, when present. */
  files: { baseline?: string; actual?: string; diff?: string };
  /** What the `{platform}` token expands to for this runner. */
  platformToken: string;
};

export type Workspace = {
  dir: string;
  baseUrl: string;
  /** Baseline path as it exists now, or undefined. */
  baseline: () => string | undefined;
};

export type Driver = {
  name: RunnerName;
  create: (baseUrl: string) => Promise<Workspace>;
  run: (
    ws: Workspace,
    run: { fixture: Fixture; options: CommonOptions; imagesPath?: string },
  ) => Promise<Observed>;
};

export type RunExpectation = {
  outcome: 'pass' | 'fail';
  /** Manifest `status` of the run's only entry. */
  status?: string;
  /** `extra.visualRegressionCompare.reason` of that entry. */
  reason?: string | string[];
  message?: RegExp;
  /** `extra.pixsame.analysis` of that entry: its label, and the sentence that must also end the failure message. */
  analysis?: { label: string; description: RegExp };
  files?: { baseline?: boolean; actual?: boolean; diff?: boolean };
  /** Whether the baseline carries the `FRSOURCE_CPVRD_V` marker afterwards. */
  baselineMarked?: boolean;
  /** Whether the baseline bytes are the same as before the run. */
  baselineUnchanged?: boolean;
  /** Expected directory segment of the baseline path, e.g. the `{platform}` value. */
  baselineInPlatformDir?: boolean;
};

export type Run = {
  fixture: Fixture;
  options?: CommonOptions;
  imagesPath?: string;
  /** Mutate the workspace before the run, e.g. strip the marker. */
  before?: (ws: Workspace) => Promise<void> | void;
  expect: RunExpectation;
};

export type Scenario = {
  name: string;
  /** Pixsame-specific scenarios list the runners they apply to. Default: all. */
  runners?: RunnerName[];
  runs: Run[];
};
