import { afterEach, describe, expect, it } from 'vitest';
import { REMOTE_ENV_KEY, REMOTE_INFO_ENV_KEY } from './constants';
import {
  dockerRunArgs,
  readRemoteInfo,
  readResolvedRemote,
  remoteBrowser,
  RemoteBrowserError,
  resolveRemote,
  startRemoteBrowser,
  stopRemoteBrowser,
} from './remote';

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete process.env[REMOTE_ENV_KEY];
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete process.env[REMOTE_INFO_ENV_KEY];
});

describe('resolveRemote', () => {
  it('derives the image from the detected Playwright version and fixes the endpoint', () => {
    const remote = resolveRemote({}, () => '1.63.0');
    expect(remote).toMatchObject({
      port: 3000,
      host: '127.0.0.1',
      playwrightVersion: '1.63.0',
      image: 'mcr.microsoft.com/playwright:v1.63.0-noble',
      keepAlive: false,
      exposeNetwork: '<loopback>',
      wsEndpoint: 'ws://127.0.0.1:3000/',
      labels: {
        'frsource.visual-renderer': '1',
        'frsource.renderer': 'playwright-remote',
        'frsource.playwright': '1.63.0',
        'frsource.port': '3000',
      },
    });
  });

  it('prefers explicit options', () => {
    const remote = resolveRemote(
      {
        port: 4001,
        playwrightVersion: '1.60.0',
        image: 'my/pw:1',
        exposeNetwork: false,
      },
      () => '1.63.0',
    );
    expect(remote).toMatchObject({
      port: 4001,
      image: 'my/pw:1',
      playwrightVersion: '1.60.0',
      exposeNetwork: false,
      wsEndpoint: 'ws://127.0.0.1:4001/',
    });
  });

  it('fails with a coded error when no Playwright version can be found', () => {
    expect(() => resolveRemote({}, () => undefined)).toThrowError(
      RemoteBrowserError,
    );
    try {
      resolveRemote({}, () => undefined);
    } catch (error) {
      expect((error as RemoteBrowserError).code).toBe(
        'PLAYWRIGHT_VERSION_UNKNOWN',
      );
      expect((error as Error).message).toMatch(/playwrightVersion/);
    }
  });
});

describe('dockerRunArgs', () => {
  it('publishes the port, labels the container and runs run-server of the matching version', () => {
    const args = dockerRunArgs(
      resolveRemote({ dockerArgs: ['--platform=linux/amd64'] }, () => '1.63.0'),
    );
    expect(args.slice(0, 2)).toEqual(['run', '--detach']);
    expect(args).toContain('--publish');
    expect(args[args.indexOf('--publish') + 1]).toBe('127.0.0.1:3000:3000');
    expect(args).toContain('--label=frsource.playwright=1.63.0');
    expect(args).toContain('--platform=linux/amd64');
    expect(args.at(-4)).toBe('mcr.microsoft.com/playwright:v1.63.0-noble');
    expect(args.at(-1)).toBe(
      'npx -y playwright@1.63.0 run-server --port 3000 --host 0.0.0.0',
    );
  });
});

describe('remoteBrowser', () => {
  it('hands the resolved config to the global setup through the environment', () => {
    expect(readResolvedRemote()).toBeUndefined();
    const remote = remoteBrowser({ playwrightVersion: '1.63.0', port: 3123 });
    expect(remote.connectOptions).toEqual({
      wsEndpoint: 'ws://127.0.0.1:3123/',
      exposeNetwork: '<loopback>',
    });
    expect(remote.globalSetup).toMatch(/remote\.global-setup/);
    expect(remote.globalTeardown).toMatch(/remote\.global-teardown/);
    expect(readResolvedRemote()).toMatchObject({
      port: 3123,
      playwrightVersion: '1.63.0',
    });
    expect(
      remoteBrowser({ playwrightVersion: '1.63.0', exposeNetwork: false })
        .connectOptions,
    ).toEqual({ wsEndpoint: 'ws://127.0.0.1:3000/' });
  });

  it('round-trips the container info the workers read', () => {
    expect(readRemoteInfo()).toBeUndefined();
    process.env[REMOTE_INFO_ENV_KEY] = JSON.stringify({
      containerId: 'abc',
      reused: true,
    });
    expect(readRemoteInfo()).toEqual({ containerId: 'abc', reused: true });
  });
});

describe('startRemoteBrowser / stopRemoteBrowser', () => {
  const remote = resolveRemote({ startTimeoutMs: 2000 }, () => '1.63.0');
  type Script = Record<string, string | Error | ((args: string[]) => string)>;
  // a fake docker CLI keyed by the first argument(s), plus a scripted port probe
  const fakeDeps = (script: Script, ports: boolean[] = [true]) => {
    const calls: string[][] = [];
    let clock = 0;
    return {
      calls,
      deps: {
        run: async (args: string[]) => {
          calls.push(args);
          const key = [args[0], args[1]].join(' ');
          const handler = script[key] ?? script[args[0]];
          if (handler === undefined)
            throw new Error(`unexpected docker ${key}`);
          if (handler instanceof Error) throw handler;
          return typeof handler === 'function' ? handler(args) : handler;
        },
        probe: async () => ports.shift() ?? false,
        sleep: async (ms: number) => {
          clock += ms;
        },
        now: () => clock,
      },
    };
  };

  it('starts a container, waits for the port and reports the image digest', async () => {
    const { deps, calls } = fakeDeps(
      {
        version: '28.0.0',
        ps: '',
        run: 'abcdef123456789',
        inspect: 'true',
        'image inspect': 'mcr.microsoft.com/playwright@sha256:feed',
      },
      [false, true],
    );
    const log: string[] = [];
    const info = await startRemoteBrowser(remote, (m) => log.push(m), deps);
    expect(info).toEqual({
      containerId: 'abcdef123456789',
      image: 'mcr.microsoft.com/playwright:v1.63.0-noble',
      imageDigest: 'mcr.microsoft.com/playwright@sha256:feed',
      playwrightVersion: '1.63.0',
      wsEndpoint: 'ws://127.0.0.1:3000/',
      reused: false,
    });
    expect(calls.map((c) => c[0])).toEqual([
      'version',
      'ps',
      'run',
      'inspect',
      'image',
    ]);
    expect(log[0]).toMatch(/Starting mcr\.microsoft\.com/);
    expect(log.at(-1)).toMatch(/ready on ws:/);
  });

  it('reuses a labelled container that is already running', async () => {
    const { deps, calls } = fakeDeps({
      version: '28.0.0',
      ps: 'running123\n',
      'image inspect': new Error('no digest'),
    });
    const info = await startRemoteBrowser(remote, undefined, deps);
    expect(info).toMatchObject({
      containerId: 'running123',
      reused: true,
      imageDigest: undefined,
    });
    expect(calls.find((c) => c[0] === 'ps')?.slice(2)).toEqual([
      '--filter',
      'label=frsource.visual-renderer=1',
      '--filter',
      'label=frsource.renderer=playwright-remote',
      '--filter',
      'label=frsource.playwright=1.63.0',
      '--filter',
      'label=frsource.port=3000',
    ]);
    expect(calls.some((c) => c[0] === 'run')).toBe(false);
  });

  const codeOf = async (p: Promise<unknown>) => {
    try {
      await p;
      return undefined;
    } catch (error) {
      expect(error).toBeInstanceOf(RemoteBrowserError);
      return (error as RemoteBrowserError).code;
    }
  };

  it('reports an unreachable daemon, a failed start, an exited container and a timeout with codes', async () => {
    expect(
      await codeOf(
        startRemoteBrowser(
          remote,
          undefined,
          fakeDeps({ version: new Error('cannot connect') }).deps,
        ),
      ),
    ).toBe('DAEMON_UNREACHABLE');
    expect(
      await codeOf(
        startRemoteBrowser(
          remote,
          undefined,
          fakeDeps({ version: '1', ps: '', run: new Error('port in use') })
            .deps,
        ),
      ),
    ).toBe('CONTAINER_START_FAILED');
    expect(
      await codeOf(
        startRemoteBrowser(
          remote,
          undefined,
          fakeDeps(
            {
              version: '1',
              ps: '',
              run: 'c1',
              inspect: 'false',
              logs: 'npx: boom',
            },
            [false],
          ).deps,
        ),
      ),
    ).toBe('CONTAINER_UNHEALTHY');
    expect(
      await codeOf(
        startRemoteBrowser(
          remote,
          undefined,
          fakeDeps({ version: '1', ps: '', run: 'c1', inspect: 'true' }, [])
            .deps,
        ),
      ),
    ).toBe('CONTAINER_UNHEALTHY');
  });

  it('stops the container and swallows errors of an already gone one', async () => {
    const { deps, calls } = fakeDeps({ stop: new Error('no such container') });
    await expect(
      stopRemoteBrowser({ containerId: 'c1' }, deps),
    ).resolves.toBeUndefined();
    expect(calls).toEqual([['stop', 'c1']]);
  });
});
