import { execFile } from 'child_process';
import http from 'http';
import { createRequire } from 'module';
import path from 'path';
import { promisify } from 'util';
import { REMOTE_ENV_KEY, REMOTE_INFO_ENV_KEY } from './constants';

const exec = promisify(execFile);

export type RemoteBrowserOptions = {
  /** Host port the container publishes `playwright run-server` on. Fixed, because `playwright.config` needs the endpoint before anything runs. @default 3000 */
  port?: number;
  /** Interface the port is published on. @default '127.0.0.1' */
  host?: string;
  /** Must match the `@playwright/test` version of the project exactly; detected from `node_modules` by default. */
  playwrightVersion?: string;
  /** @default `mcr.microsoft.com/playwright:v<playwrightVersion>-noble` */
  image?: string;
  /** Leave the container running after the run so the next `playwright test` reuses it. @default false */
  keepAlive?: boolean;
  /**
   * Lets the remote browser reach hosts that only the machine running the
   * tests can see, e.g. your dev server on `localhost`. `false` turns it off
   * (then use `host.docker.internal` in `baseURL`). @default '<loopback>'
   */
  exposeNetwork?: string | false;
  /** Extra `docker run` arguments, e.g. `['--platform=linux/amd64']`. */
  dockerArgs?: string[];
  /** How long to wait for the container (including the image pull on first use). @default 600_000 */
  startTimeoutMs?: number;
};

export type ResolvedRemote = Required<RemoteBrowserOptions> & {
  wsEndpoint: string;
  labels: Record<string, string>;
};

/** What the global setup learned about the running container; every worker reads it for the manifest. */
export type RemoteInfo = {
  containerId: string;
  image: string;
  imageDigest?: string;
  playwrightVersion: string;
  wsEndpoint: string;
  /** `true` when a container from an earlier run was picked up. */
  reused: boolean;
};

export type RemoteErrorCode =
  | 'DAEMON_UNREACHABLE'
  | 'PLAYWRIGHT_VERSION_UNKNOWN'
  | 'CONTAINER_START_FAILED'
  | 'CONTAINER_UNHEALTHY'
  | 'NOT_CONFIGURED';

/** Every failure has a stable code, a cause and a fix, printed verbatim. */
export class RemoteBrowserError extends Error {
  constructor(
    readonly code: RemoteErrorCode,
    reason: string,
    fix: string,
    options?: { cause?: unknown },
  ) {
    super(`${code}: ${reason}\n${fix}`, options);
    this.name = 'RemoteBrowserError';
  }
}

export const LABELS = {
  renderer: 'frsource.visual-renderer',
  kind: 'frsource.renderer',
  version: 'frsource.playwright',
  port: 'frsource.port',
} as const;

/* c8 ignore start */
export const detectPlaywrightVersion = (
  from: string = process.cwd(),
): string | undefined => {
  const req = createRequire(path.join(from, 'package.json'));
  for (const pkg of ['@playwright/test', 'playwright', 'playwright-core']) {
    try {
      const { version } = req(`${pkg}/package.json`) as { version?: string };
      if (version) return version;
    } catch {
      // try the next one
    }
  }
  return undefined;
};
/* c8 ignore stop */

export const resolveRemote = (
  options: RemoteBrowserOptions = {},
  detectVersion: () => string | undefined = detectPlaywrightVersion,
): ResolvedRemote => {
  const playwrightVersion = options.playwrightVersion ?? detectVersion();
  if (!playwrightVersion) {
    throw new RemoteBrowserError(
      'PLAYWRIGHT_VERSION_UNKNOWN',
      'Could not find @playwright/test in node_modules to pick a matching image.',
      'Pass `playwrightVersion` to remoteBrowser(); it has to equal the version your tests run with.',
    );
  }
  const port = options.port ?? 3000;
  const host = options.host ?? '127.0.0.1';
  return {
    port,
    host,
    playwrightVersion,
    image:
      options.image ??
      `mcr.microsoft.com/playwright:v${playwrightVersion}-noble`,
    keepAlive: options.keepAlive ?? false,
    exposeNetwork: options.exposeNetwork ?? '<loopback>',
    dockerArgs: options.dockerArgs ?? [],
    startTimeoutMs: options.startTimeoutMs ?? 600_000,
    wsEndpoint: `ws://${host}:${port}/`,
    labels: {
      [LABELS.renderer]: '1',
      [LABELS.kind]: 'playwright-remote',
      [LABELS.version]: playwrightVersion,
      [LABELS.port]: String(port),
    },
  };
};

/** The `docker run` arguments for a resolved configuration (exported for tests and `doctor`-style output). */
export const dockerRunArgs = (remote: ResolvedRemote): string[] => [
  'run',
  '--detach',
  '--rm',
  '--init',
  '--ipc=host',
  '--user',
  'pwuser',
  '--workdir',
  '/home/pwuser',
  '--publish',
  `${remote.host}:${remote.port}:${remote.port}`,
  '--add-host=host.docker.internal:host-gateway',
  ...Object.entries(remote.labels).map(([k, v]) => `--label=${k}=${v}`),
  ...remote.dockerArgs,
  remote.image,
  '/bin/sh',
  '-c',
  `npx -y playwright@${remote.playwrightVersion} run-server --port ${remote.port} --host 0.0.0.0`,
];

/** The side effects the lifecycle code needs; swapped out in unit tests. */
export type RemoteDeps = {
  /** Runs `docker <args>`; resolves with trimmed stdout, rejects with the CLI's stderr. */
  run: (args: string[]) => Promise<string>;
  /** `true` once `run-server` answers HTTP on host:port (a bare TCP connect is not enough: Docker's port proxy accepts before anything listens inside). */
  probe: (host: string, port: number) => Promise<boolean>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
};

/* c8 ignore start */
export const defaultDeps: RemoteDeps = {
  run: async (args) => {
    try {
      const { stdout } = await exec('docker', args, {
        maxBuffer: 16 * 1024 * 1024,
      });
      return stdout.trim();
    } catch (error) {
      const err = error as NodeJS.ErrnoException & { stderr?: string };
      if (err.code === 'ENOENT') {
        throw new RemoteBrowserError(
          'DAEMON_UNREACHABLE',
          'The `docker` CLI is not on PATH.',
          'Install Docker Desktop, OrbStack, Colima, Podman (with the docker CLI shim) or Rancher Desktop, or switch the tests back to a local browser.',
          { cause: error },
        );
      }
      throw new Error(err.stderr?.trim() || err.message, { cause: error });
    }
  },
  probe: (host, port) =>
    new Promise<boolean>((resolve) => {
      // any HTTP answer (run-server replies 400/426 to a plain GET) means the
      // server is up; a reset or hang-up means only docker-proxy is there
      const request = http.get(
        { host, port, path: '/', timeout: 2000 },
        (res) => {
          res.resume();
          resolve(true);
        },
      );
      request.once('timeout', () => request.destroy());
      request.once('error', () => resolve(false));
    }),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  now: () => Date.now(),
};
/* c8 ignore stop */

const assertDaemon = async ({ run }: RemoteDeps) => {
  try {
    await run(['version', '--format', '{{.Server.Version}}']);
  } catch (error) {
    if (error instanceof RemoteBrowserError) throw error;
    const where = process.env.DOCKER_HOST
      ? `DOCKER_HOST=${process.env.DOCKER_HOST}`
      : 'the default socket';
    throw new RemoteBrowserError(
      'DAEMON_UNREACHABLE',
      `Docker daemon not reachable at ${where}: ${(error as Error).message}`,
      'Start Docker Desktop (or your Docker-compatible runtime), or remove `remoteBrowser()` from playwright.config to use a local browser.',
      { cause: error },
    );
  }
};

const findRunningContainer = async (
  remote: ResolvedRemote,
  { run }: RemoteDeps,
) => {
  const filters = Object.entries(remote.labels).flatMap(([k, v]) => [
    '--filter',
    `label=${k}=${v}`,
  ]);
  const id = await run(['ps', '--quiet', ...filters]);
  return id.split('\n')[0] || undefined;
};

const waitForPort = async (
  remote: ResolvedRemote,
  containerId: string,
  deps: RemoteDeps,
) => {
  const deadline = deps.now() + remote.startTimeoutMs;
  while (deps.now() < deadline) {
    if (await deps.probe(remote.host, remote.port)) return;
    const running = await deps
      .run(['inspect', '--format', '{{.State.Running}}', containerId])
      .catch(() => 'false');
    if (running !== 'true') {
      const logs = await deps
        .run(['logs', '--tail', '20', containerId])
        .catch(() => '');
      throw new RemoteBrowserError(
        'CONTAINER_UNHEALTHY',
        `The remote browser container exited before it started listening on ${remote.wsEndpoint}.${logs ? `\n${logs}` : ''}`,
        `Run \`docker run --rm -it ${remote.image} npx -y playwright@${remote.playwrightVersion} --version\` to check the image, and make sure port ${remote.port} is free.`,
      );
    }
    await deps.sleep(500);
  }
  throw new RemoteBrowserError(
    'CONTAINER_UNHEALTHY',
    `The remote browser did not start listening on ${remote.wsEndpoint} within ${remote.startTimeoutMs} ms.`,
    `A first run pulls a ~2 GB image; run \`docker pull ${remote.image}\` ahead of time or raise \`startTimeoutMs\`.`,
  );
};

const imageDigest = async (image: string, { run }: RemoteDeps) => {
  const digest = await run([
    'image',
    'inspect',
    '--format',
    '{{index .RepoDigests 0}}',
    image,
  ]).catch(() => '');
  return digest || undefined;
};

/**
 * Starts (or reuses) the container running `playwright run-server` and waits
 * until it accepts connections. Idempotent: a container with the same labels
 * is picked up instead of started again.
 */
export const startRemoteBrowser = async (
  remote: ResolvedRemote,
  log: (message: string) => void = () => undefined,
  deps: RemoteDeps = defaultDeps,
): Promise<RemoteInfo> => {
  await assertDaemon(deps);
  const existing = await findRunningContainer(remote, deps);
  let containerId = existing;
  if (containerId) {
    log(
      `Reusing remote browser container ${containerId.slice(0, 12)} on ${remote.wsEndpoint}`,
    );
  } else {
    log(
      `Starting ${remote.image} (first use pulls the image, which can take a few minutes)`,
    );
    try {
      containerId = await deps.run(dockerRunArgs(remote));
    } catch (error) {
      if (error instanceof RemoteBrowserError) throw error;
      throw new RemoteBrowserError(
        'CONTAINER_START_FAILED',
        `docker run failed: ${(error as Error).message}`,
        `Check that the image ${remote.image} exists (the tag has to match your @playwright/test version) and that port ${remote.port} is free.`,
        { cause: error },
      );
    }
  }
  await waitForPort(remote, containerId, deps);
  log(`Remote browser ready on ${remote.wsEndpoint}`);
  return {
    containerId,
    image: remote.image,
    imageDigest: await imageDigest(remote.image, deps),
    playwrightVersion: remote.playwrightVersion,
    wsEndpoint: remote.wsEndpoint,
    reused: !!existing,
  };
};

export const stopRemoteBrowser = async (
  info: Pick<RemoteInfo, 'containerId'>,
  deps: RemoteDeps = defaultDeps,
) => {
  await deps.run(['stop', info.containerId]).catch(() => undefined);
};

export const readResolvedRemote = (
  env: NodeJS.ProcessEnv = process.env,
): ResolvedRemote | undefined => {
  const raw = env[REMOTE_ENV_KEY];
  return raw ? (JSON.parse(raw) as ResolvedRemote) : undefined;
};

export const readRemoteInfo = (
  env: NodeJS.ProcessEnv = process.env,
): RemoteInfo | undefined => {
  const raw = env[REMOTE_INFO_ENV_KEY];
  return raw ? (JSON.parse(raw) as RemoteInfo) : undefined;
};

const sibling = (name: string) =>
  path.join(__dirname, `${name}${path.extname(__filename)}`);

export type RemoteBrowser = ResolvedRemote & {
  /** Put this under `use` in `playwright.config`. */
  connectOptions: { wsEndpoint: string; exposeNetwork?: string };
  /** Module paths for `globalSetup` / `globalTeardown` in `playwright.config`. */
  globalSetup: string;
  globalTeardown: string;
  start: (log?: (message: string) => void) => Promise<RemoteInfo>;
  stop: (info: Pick<RemoteInfo, 'containerId'>) => Promise<void>;
};

/**
 * Runs the tests against a browser inside the official Playwright Docker
 * image instead of the one installed locally. The runner, the test code and
 * your app stay on the host; only the browser is containerised, so
 * screenshots have full fidelity and are byte-identical to the ones the same
 * image produces in CI.
 *
 * ```ts
 * // playwright.config.ts
 * import { remoteBrowser } from '@frsource/playwright-visual-regression-diff/remote';
 * const remote = remoteBrowser();
 * export default defineConfig({
 *   globalSetup: remote.globalSetup,
 *   globalTeardown: remote.globalTeardown,
 *   use: { connectOptions: remote.connectOptions },
 * });
 * ```
 */
export const remoteBrowser = (
  options: RemoteBrowserOptions = {},
): RemoteBrowser => {
  const resolved = resolveRemote(options);
  // the config module is evaluated in the same process that runs the global
  // setup, and env is inherited by the workers - the cheapest way to hand the
  // resolved options over without a second config file
  process.env[REMOTE_ENV_KEY] = JSON.stringify(resolved);
  return {
    ...resolved,
    connectOptions: {
      wsEndpoint: resolved.wsEndpoint,
      ...(resolved.exposeNetwork && { exposeNetwork: resolved.exposeNetwork }),
    },
    // sibling modules with this file's extension: `.js` in dist, `.ts` under vitest
    globalSetup: sibling('remote.global-setup'),
    globalTeardown: sibling('remote.global-teardown'),
    start: (log) => startRemoteBrowser(resolved, log),
    stop: (info) => stopRemoteBrowser(info),
  };
};
