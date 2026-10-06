import fs from 'fs';
import path from 'path';
import { ManifestBuilder } from '../builder';
import type { EnvLike } from '../ci';
import { readPngSize } from '../png';
import type {
  Manifest,
  ManifestBrowser,
  ManifestCi,
  ManifestPlatform,
  ManifestStatus,
} from '../types';

/**
 * The subset of Playwright's JSON reporter output (`--reporter=json`) the
 * converter reads. Paths in the report are POSIX and absolute.
 */
export type PlaywrightJsonReport = {
  config?: {
    rootDir?: string;
    version?: string;
    projects?: PlaywrightProject[];
  };
  suites?: PlaywrightSuite[];
};

export type PlaywrightProject = {
  id?: string;
  name?: string;
  testDir?: string;
  outputDir?: string;
};

export type PlaywrightSuite = {
  title: string;
  file: string;
  specs?: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
};

export type PlaywrightSpec = {
  title: string;
  file: string;
  tests?: PlaywrightTest[];
};

export type PlaywrightTest = {
  projectId?: string;
  projectName?: string;
  results?: PlaywrightResult[];
};

export type PlaywrightResult = {
  status?: string;
  retry?: number;
  startTime?: string;
  error?: { message?: string };
  errors?: { message?: string }[];
  attachments?: PlaywrightAttachment[];
};

export type PlaywrightAttachment = {
  name: string;
  contentType?: string;
  path?: string;
};

export type FromPlaywrightReportOptions = {
  /** Defaults to `config.rootDir` of the report. */
  projectRoot?: string;
  /**
   * `snapshotPathTemplate` of the Playwright config, when changed from the
   * default `{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{-snapshotSuffix}{ext}`.
   * Needed to locate the baseline files, which the report does not mention.
   */
  snapshotPathTemplate?: string;
  /** `snapshotDir` of the Playwright config; defaults to each project's `testDir`, like Playwright. */
  snapshotDir?: string;
  /** The OS the tests ran on (`{snapshotSuffix}` / `{platform}` of the template); defaults to this machine's. */
  platform?: string;
  /** `maxDiffPixelRatio` the tests used, recorded as `comparison.threshold`; the report does not carry it. */
  threshold?: number;
  /** Browser per Playwright project name, for the entries' `platform.browser`; defaults to the project name. */
  browsers?: Record<string, ManifestBrowser>;
  /** Run-level `platform`; defaults to this machine's. */
  hostPlatform?: ManifestPlatform;
  /** `null` for "not on CI"; when absent, detected from `env`. */
  ci?: ManifestCi | null;
  env?: EnvLike;
  options?: Record<string, unknown>;
  createdAt?: string;
};

export const DEFAULT_SNAPSHOT_PATH_TEMPLATE =
  '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{-snapshotSuffix}{ext}';

type AttachmentKind = 'expected' | 'actual' | 'diff' | 'previous';
type ImageGroup = Partial<Record<AttachmentKind, string>> & {
  /** Snapshot name without suffix and extension, `home` for `home-actual.png`. */
  arg: string;
  ext: string;
};

const DIFF_RATIO_REGEX =
  /(\d+) pixels \(ratio ([\d.]+) of all image pixels\) are different/;

// mirrors Playwright's `sanitizeForFilePath`: everything but alphanumerics, `_` and `.` becomes `-`
const sanitizeForFilePath = (s: string) =>
  // eslint-disable-next-line no-control-regex
  s.replace(/[\x00-\x2C\x2E-\x2F\x3A-\x40\x5B-\x60\x7B-\x7F]+/g, '-');

const posix = (p: string) => p.replace(/\\/g, '/');

/** Groups a result's image attachments by snapshot: `home-actual.png`, `home-expected.png`, `home-diff.png` -> `home`. */
const groupAttachments = (attachments: PlaywrightAttachment[]) => {
  const groups = new Map<string, ImageGroup>();
  for (const attachment of attachments) {
    if (!attachment.path) continue;
    const ext = path.posix.extname(attachment.name);
    const stem = attachment.name.slice(0, ext ? -ext.length : undefined);
    const match = stem.match(/^(.*)-(expected|actual|diff|previous)$/);
    if (!match) continue;
    const [, arg, kind] = match;
    const group = groups.get(arg) ?? { arg, ext };
    group[kind as AttachmentKind] = attachment.path;
    groups.set(arg, group);
  }
  return [...groups.values()];
};

const resolveSnapshotPath = (
  template: string,
  tokens: {
    testDir: string;
    snapshotDir: string;
    snapshotSuffix: string;
    testFile: string;
    projectName: string;
    testName: string;
    arg: string;
    ext: string;
  },
) => {
  const relativeTestFile = path.posix.relative(tokens.testDir, tokens.testFile);
  const parsed = path.posix.parse(relativeTestFile);
  const projectSegment = sanitizeForFilePath(tokens.projectName);
  return template
    .replace(/\{(.)?testDir\}/g, `$1${tokens.testDir}`)
    .replace(/\{(.)?snapshotDir\}/g, `$1${tokens.snapshotDir}`)
    .replace(/\{(.)?snapshotSuffix\}/g, (_, sep = '') =>
      tokens.snapshotSuffix ? `${sep}${tokens.snapshotSuffix}` : '',
    )
    .replace(/\{(.)?testFileDir\}/g, `$1${parsed.dir}`)
    .replace(/\{(.)?platform\}/g, `$1${tokens.snapshotSuffix}`)
    .replace(/\{(.)?projectName\}/g, (_, sep = '') =>
      projectSegment ? `${sep}${projectSegment}` : '',
    )
    .replace(/\{(.)?testName\}/g, `$1${tokens.testName}`)
    .replace(/\{(.)?testFileName\}/g, `$1${parsed.base}`)
    .replace(/\{(.)?testFilePath\}/g, `$1${relativeTestFile}`)
    .replace(/\{(.)?arg\}/g, `$1${tokens.arg}`)
    .replace(/\{(.)?ext\}/g, (_, sep = '') =>
      tokens.ext ? `${sep}${tokens.ext}` : '',
    );
};

const errorMessages = (result: PlaywrightResult) =>
  [...(result.errors ?? []), ...(result.error ? [result.error] : [])]
    .map((e) => e.message ?? '')
    .filter(Boolean);

/** The error message about one snapshot: the one naming its actual or baseline file, else the only one there is. */
const messageFor = (
  messages: string[],
  group: ImageGroup,
  baselinePath: string,
) => {
  const names = [group.actual, baselinePath]
    .filter((p): p is string => !!p)
    .map((p) => path.posix.basename(p));
  const own = messages.find((m) => names.some((name) => m.includes(name)));
  return own ?? (messages.length === 1 ? messages[0] : undefined) ?? '';
};

const statusOf = (group: ImageGroup, message: string): ManifestStatus => {
  if (group.expected) return 'failed';
  return /writing actual/i.test(message) ? 'created' : 'missing-baseline';
};

/**
 * Converts Playwright's JSON report (`npx playwright test --reporter=json`)
 * into a manifest, for teams using `toHaveScreenshot` without a visual
 * regression package. Only comparisons that left files behind can be
 * recovered (`failed`, `missing-baseline`, `created`): a passing
 * `toHaveScreenshot` leaves no trace in the report. Of a retried test only
 * the last attempt counts. Baseline paths are computed from the snapshot path
 * template, as the report only lists the copies in the output directory.
 */
export const fromPlaywrightReport = (
  report: PlaywrightJsonReport,
  opts: FromPlaywrightReportOptions = {},
): Manifest => {
  if (!report || !Array.isArray(report.suites)) {
    throw new TypeError(
      'Not a Playwright JSON report: expected an object with a `suites` array',
    );
  }
  // test files in the report are relative to Playwright's rootDir; the
  // manifest's paths are relative to the (possibly different) projectRoot
  const rootDir = posix(
    report.config?.rootDir ?? opts.projectRoot ?? process.cwd(),
  );
  const projectRoot = opts.projectRoot ?? rootDir;
  const projects = report.config?.projects ?? [];
  const projectByName = new Map(projects.map((p) => [p.name ?? '', p]));
  const template = opts.snapshotPathTemplate ?? DEFAULT_SNAPSHOT_PATH_TEMPLATE;
  const snapshotSuffix = opts.platform ?? process.platform;

  const builder = new ManifestBuilder({
    projectRoot,
    runner: {
      name: 'playwright',
      version: report.config?.version,
      mode: 'run',
      projects: projects.map((p) => p.name ?? ''),
    },
    options: opts.options,
    platform: opts.hostPlatform,
    ci: opts.ci,
    env: opts.env,
    createdAt: opts.createdAt,
  });

  const visitSpec = (spec: PlaywrightSpec, describes: string[]) => {
    const testFileAbs = path.posix.resolve(rootDir, posix(spec.file));
    const titlePath = [...describes, spec.title];
    for (const test of spec.tests ?? []) {
      const projectName = test.projectName ?? '';
      const project = projectByName.get(projectName);
      const testDir = posix(project?.testDir ?? rootDir);
      const snapshotDir = opts.snapshotDir
        ? path.posix.resolve(rootDir, posix(opts.snapshotDir))
        : testDir;
      const result = test.results?.at(-1);
      if (!result) continue;
      const messages = errorMessages(result);
      for (const group of groupAttachments(result.attachments ?? [])) {
        if (!group.actual) continue;
        const baselinePath = resolveSnapshotPath(template, {
          testDir,
          snapshotDir,
          snapshotSuffix,
          testFile: testFileAbs,
          projectName,
          testName: sanitizeForFilePath(titlePath.join(' ')),
          arg: group.arg,
          ext: group.ext,
        });
        const message = messageFor(messages, group, baselinePath);
        const status = statusOf(group, message);
        const browser =
          opts.browsers?.[projectName] ??
          (projectName ? { name: projectName } : undefined);
        const ratio = message.match(DIFF_RATIO_REGEX);
        builder.record({
          actualPath: group.actual,
          baselinePath,
          diffPath: group.diff ?? null,
          name: path.posix.basename(baselinePath, group.ext),
          testFile: testFileAbs,
          titlePath,
          retry: result.retry ?? 0,
          status,
          diffRatio: ratio ? Number(ratio[2]) : 0,
          threshold: opts.threshold ?? 0,
          baselineWritten: status === 'created',
          message: message.split('\n')[0]?.trim() ?? '',
          baselineSize: fs.existsSync(baselinePath)
            ? readPngSize(baselinePath)
            : readPngSize(group.expected ?? ''),
          actualSize: readPngSize(group.actual),
          platform: browser && { os: snapshotSuffix, browser },
          recordedAt: result.startTime,
        });
      }
    }
  };

  const visitSuite = (suite: PlaywrightSuite, describes: string[]) => {
    for (const spec of suite.specs ?? []) visitSpec(spec, describes);
    for (const child of suite.suites ?? []) {
      visitSuite(child, [...describes, child.title]);
    }
  };
  for (const fileSuite of report.suites) visitSuite(fileSuite, []);

  return builder.toJSON();
};
