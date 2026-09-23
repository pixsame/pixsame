// Mirrored from the Cypress plugin's `src/ci.utils.ts`; keep in sync.
import fs from 'fs';
import type { ManifestCi } from './manifest.types';

export type EnvLike = Record<string, string | undefined>;

type EventPayload = {
  number?: number;
  pull_request?: { number?: number; head?: { sha?: string } };
  issue?: { number?: number; pull_request?: unknown };
};

/* c8 ignore start */
const readJsonFile = (file: string): unknown =>
  JSON.parse(fs.readFileSync(file, 'utf8'));
/* c8 ignore stop */

const GITHUB_PR_REF_REGEX = /^refs\/pull\/(\d+)\/merge$/;

// drops `undefined` values so the JSON stays tidy
const compact = <T extends object>(obj: T): T =>
  Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as T;

const readEventPayload = (
  eventPath: string | undefined,
  readJson: (file: string) => unknown,
): EventPayload => {
  if (!eventPath) return {};
  try {
    const payload = readJson(eventPath);
    return payload && typeof payload === 'object' ? payload : {};
  } catch {
    return {};
  }
};

const detectGitHub = (
  env: EnvLike,
  readJson: (file: string) => unknown,
): ManifestCi => {
  const payload = readEventPayload(env.GITHUB_EVENT_PATH, readJson);
  const refMatch = env.GITHUB_REF?.match(GITHUB_PR_REF_REGEX);
  const number =
    (refMatch && parseInt(refMatch[1], 10)) ||
    payload.pull_request?.number ||
    (payload.issue?.pull_request ? payload.issue.number : undefined) ||
    payload.number;
  const pullRequest = number
    ? compact({
        number,
        headSha: payload.pull_request?.head?.sha,
        headRef: env.GITHUB_HEAD_REF || undefined,
        baseRef: env.GITHUB_BASE_REF || undefined,
      })
    : null;
  const serverUrl = env.GITHUB_SERVER_URL || 'https://github.com';
  const url =
    env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID
      ? `${serverUrl}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}${
          env.GITHUB_RUN_ATTEMPT ? `/attempts/${env.GITHUB_RUN_ATTEMPT}` : ''
        }`
      : undefined;

  return compact({
    provider: 'github',
    repository: env.GITHUB_REPOSITORY,
    sha: env.GITHUB_SHA,
    ref: env.GITHUB_REF,
    branch: env.GITHUB_HEAD_REF || env.GITHUB_REF_NAME,
    pullRequest,
    event: env.GITHUB_EVENT_NAME,
    runId: env.GITHUB_RUN_ID,
    runAttempt: env.GITHUB_RUN_ATTEMPT,
    runNumber: env.GITHUB_RUN_NUMBER,
    job: env.GITHUB_JOB,
    workflow: env.GITHUB_WORKFLOW,
    serverUrl,
    url,
    workspace: env.GITHUB_WORKSPACE,
  });
};

const detectGitLab = (env: EnvLike): ManifestCi => {
  const number = env.CI_MERGE_REQUEST_IID
    ? parseInt(env.CI_MERGE_REQUEST_IID, 10)
    : undefined;
  return compact({
    provider: 'gitlab',
    repository: env.CI_PROJECT_PATH,
    sha: env.CI_COMMIT_SHA,
    ref: env.CI_COMMIT_REF_NAME,
    branch: env.CI_COMMIT_BRANCH || env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME,
    pullRequest: number
      ? compact({
          number,
          headSha: env.CI_MERGE_REQUEST_SOURCE_BRANCH_SHA,
          headRef: env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME,
          baseRef: env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME,
        })
      : null,
    event: env.CI_PIPELINE_SOURCE,
    runId: env.CI_PIPELINE_ID,
    job: env.CI_JOB_NAME,
    jobId: env.CI_JOB_ID,
    serverUrl: env.CI_SERVER_URL,
    url: env.CI_JOB_URL,
    workspace: env.CI_PROJECT_DIR,
  });
};

/**
 * Reads CI metadata from environment variables. Only allow-listed keys are
 * ever copied. Returns `null` outside CI and `{ provider: null }` when only a
 * generic `CI` flag is present.
 */
export const detectCi = (
  env: EnvLike = process.env,
  readJson: (file: string) => unknown = readJsonFile,
): ManifestCi | null => {
  if (env.GITHUB_ACTIONS === 'true') return detectGitHub(env, readJson);
  if (env.GITLAB_CI === 'true') return detectGitLab(env);
  if (env.CI && env.CI !== 'false' && env.CI !== '0') return { provider: null };
  return null;
};
