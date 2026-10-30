import path from 'path';
import {
  FILE_SUFFIX,
  IMAGE_SNAPSHOT_PREFIX,
  PATH_VARIABLES,
  WINDOWS_LIKE_DRIVE_REGEX,
  type PathVariables,
} from './constants';
import sanitize from 'sanitize-filename';

// highest `_#n` index handed out per screenshot path during the current spec
const nameCacheCounter: Record<string, number> = {};
// counters as they were before the current test attempt started, for every
// path the attempt touched - a retry restores them so the regenerated
// screenshots get the same names again
const countersBeforeAttempt: Record<string, number> = {};
let currentAttempt: { testId: string; retry: number } | undefined;

const resetMap = (map: Record<string, unknown>) => {
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  for (const key in map) delete map[key];
};

// a token value becomes a directory name (or part of one), so it must be safe
// as a file name; only custom browser names can be anything unusual. The
// values cross the `cy.task` JSON bridge, so a missing one must not throw here
const toPathToken = (value: string | undefined) =>
  sanitize(String(value ?? '')) || 'unknown';

// every occurrence, without needing the es2021 lib for `replaceAll`
const replaceToken = (text: string, token: string, value: string) =>
  text.split(token).join(value);

/**
 * Expands `{platform}`, `{os}` and `{browser}` anywhere inside a path
 * segment (`shots-{platform}` works too). Unknown `{...}` stay literal.
 */
export const expandPathVariables = (
  pathPart: string,
  { os, browser }: PathVariables,
) => {
  const osToken = toPathToken(os);
  const browserToken = toPathToken(browser);
  return [
    [PATH_VARIABLES.platform, `${osToken}-${browserToken}`],
    [PATH_VARIABLES.os, osToken],
    [PATH_VARIABLES.browser, browserToken],
  ].reduce(
    (result, [token, value]) => replaceToken(result, token, value),
    pathPart,
  );
};

const parsePathPartVariables = (
  specPath: string,
  pathVariables: PathVariables,
  pathPart: string,
  i: number,
) => {
  // `{spec_path}` expands to several segments, so it has to be a whole one
  if (pathPart === PATH_VARIABLES.specPath) {
    return path.dirname(specPath);
  } else if (i === 0 && !pathPart) {
    // when unix-like absolute path
    return PATH_VARIABLES.unixSystemRootPath;
  } else if (i === 0 && WINDOWS_LIKE_DRIVE_REGEX.test(pathPart)) {
    // when win-like absolute path
    return path.join(PATH_VARIABLES.winSystemRootPath, pathPart[0]);
  }

  return expandPathVariables(pathPart, pathVariables);
};

const startAttempt = (testId: string, retry: number) => {
  const isSameTest = currentAttempt?.testId === testId;
  if (isSameTest && currentAttempt && retry > currentAttempt.retry) {
    for (const screenshotPath in countersBeforeAttempt) {
      nameCacheCounter[screenshotPath] = countersBeforeAttempt[screenshotPath];
    }
  }
  if (!isSameTest || (currentAttempt && retry !== currentAttempt.retry)) {
    resetMap(countersBeforeAttempt);
  }
  currentAttempt = { testId, retry };
};

export const generateScreenshotPath = ({
  titleFromOptions,
  imagesPath,
  specPath,
  pathVariables,
  currentRetryNumber,
  testId,
}: {
  titleFromOptions: string;
  imagesPath: string;
  specPath: string;
  /** What `{platform}`, `{os}` and `{browser}` in `imagesPath` expand to. */
  pathVariables: PathVariables;
  currentRetryNumber: number;
  /** Stable id of the test being run; used to tell a retry from the next test. */
  testId: string;
}) => {
  const screenshotPath = path.join(
    ...imagesPath
      .split('/')
      .map(parsePathPartVariables.bind(void 0, specPath, pathVariables)),
    sanitize(titleFromOptions),
  );

  startAttempt(testId, currentRetryNumber);

  if (typeof nameCacheCounter[screenshotPath] === 'undefined') {
    nameCacheCounter[screenshotPath] = -1;
  }
  if (!(screenshotPath in countersBeforeAttempt)) {
    countersBeforeAttempt[screenshotPath] = nameCacheCounter[screenshotPath];
  }

  return path.join(
    IMAGE_SNAPSHOT_PREFIX,
    `${screenshotPath}_#${++nameCacheCounter[screenshotPath]}${FILE_SUFFIX.actual}.png`,
  );
};

const screenshotPathRegex = new RegExp(
  `^([\\s\\S]+?)_#([0-9]+)(?:(?:\\${FILE_SUFFIX.diff})|(?:\\${FILE_SUFFIX.actual}))?\\.(?:png|PNG)$`,
);
export const wasScreenshotUsed = (imagePath: string) => {
  const matched = imagePath.match(screenshotPathRegex);
  /* c8 ignore next */ if (!matched) return false;
  const [, screenshotPath, numString] = matched;
  const num = parseInt(numString);
  /* c8 ignore next */ if (!screenshotPath || isNaN(num)) return false;
  return (
    screenshotPath in nameCacheCounter &&
    num <= nameCacheCounter[screenshotPath]
  );
};

export const resetScreenshotNameCache = () => {
  currentAttempt = undefined;
  resetMap(nameCacheCounter);
  resetMap(countersBeforeAttempt);
};
