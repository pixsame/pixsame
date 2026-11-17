import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeLayout, type Layout } from '@pixsame/analysis';
import { run, type Io } from './cli';
import { png } from './test-utils';
import {
  cypressVersionOf,
  detectRunners,
  supportsExpose,
  updatePlan,
} from './runner';

const layout: Layout = {
  size: { width: 10, height: 10 },
  scale: 1,
  count: 1,
  root: { tag: 'html', rect: [0, 0, 10, 10], kids: [] },
};

let dir: string;
const put = async (file: string, bytes: Uint8Array | string = '') => {
  await mkdir(path.dirname(path.join(dir, file)), { recursive: true });
  await writeFile(path.join(dir, file), bytes);
};

/** A fake terminal: scripted answers, recorded output, and a run that "refreshes" the baselines. */
const session = (
  answers: string[] | undefined,
  onExec?: () => Promise<void>,
) => {
  const out: string[] = [];
  const asked: string[] = [];
  const ran: Parameters<Io['exec']>[0][] = [];
  const io: Io = {
    cwd: dir,
    out: (line) => void out.push(line),
    ask: answers && (async (q) => (asked.push(q), answers.shift() ?? '')),
    exec: async (plan) => (ran.push(plan), await onExec?.(), 0),
  };
  return { io, out, asked, ran, text: () => out.join('\n') };
};

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'pixsame-cli-'));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

describe('runner helpers', () => {
  it('finds the configs in a directory', async () => {
    expect(detectRunners(dir)).toEqual([]);
    await put('cypress.config.ts');
    await put('playwright.config.mts');
    expect(detectRunners(dir)).toEqual(['cypress', 'playwright']);
  });

  it('uses --expose from Cypress 15.10 and --env before it', () => {
    expect(supportsExpose('15.10.0')).toBe(true);
    expect(supportsExpose('16.0.1')).toBe(true);
    expect(supportsExpose('15.9.3')).toBe(false);
    const args = (cypressVersion: string) =>
      updatePlan({
        runner: 'cypress',
        dir,
        failuresOnly: false,
        cypressVersion,
      }).command;
    expect(args('15.10.0').slice(-3)).toEqual([
      'run',
      '--expose',
      'pluginVisualRegressionUpdateImages=true',
    ]);
    expect(args('13.6.0').slice(-3)).toEqual([
      'run',
      '--env',
      'pluginVisualRegressionUpdateImages=true',
    ]);
  });

  it('uses the package manager of the lockfile and the environment for Playwright', async () => {
    await put('pnpm-lock.yaml');
    const plan = updatePlan({ runner: 'playwright', dir, failuresOnly: true });
    expect(plan.command).toEqual(['pnpm', 'exec', 'playwright', 'test']);
    expect(plan.env).toEqual({ PIXSAME_UPDATE_IMAGES: 'failures-only' });
  });

  it('reads the installed Cypress version', async () => {
    expect(cypressVersionOf(dir)).toBeUndefined();
    await put('node_modules/cypress/package.json', '{"version":"15.11.2"}');
    expect(cypressVersionOf(dir)).toBe('15.11.2');
  });
});

describe('pixsame baselines', () => {
  it('lists what lacks a layout and proposes the command for the runner it found', async () => {
    await put('cypress.config.ts');
    await put('node_modules/cypress/package.json', '{"version":"15.10.0"}');
    await put('cypress/snapshots/a.png', png());
    const s = session(undefined);
    expect(await run(['baselines'], s.io)).toBe(0);
    expect(s.text()).toContain('1 of 1 baselines lack the page layout');
    expect(s.text()).toContain(
      'npx cypress run --expose pluginVisualRegressionUpdateImages=true',
    );
    expect(s.ran).toEqual([]);
  });

  it('exits 1 with --check only while something lacks a layout', async () => {
    await put('snapshots/a.png', png());
    expect(await run(['baselines', '--check'], session(undefined).io)).toBe(1);
    await put('snapshots/a.png', writeLayout(png(), layout));
    const s = session(undefined);
    expect(await run(['baselines', '--check'], s.io)).toBe(0);
    expect(s.out[0]).toMatch(/^All 1 baselines have the page layout/);
  });

  it('prints JSON and says so when there are no baselines', async () => {
    await put('snapshots/a.png', png());
    const json = session(undefined);
    await run(['baselines', '--json'], json.io);
    expect(JSON.parse(json.out[0]).counts.missing).toBe(1);
    const none = session(undefined);
    await rm(path.join(dir, 'snapshots'), { recursive: true });
    await run(['baselines'], none.io);
    expect(none.out[0]).toBe('No baselines found.');
  });

  it('shows help, and fails on an unknown command or option', async () => {
    expect(await run([], session(undefined).io)).toBe(0);
    expect(await run(['bogus'], session(undefined).io)).toBe(1);
    expect(await run(['baselines', '--bogus'], session(undefined).io)).toBe(1);
  });
});

describe('pixsame baselines --update', () => {
  const refresh = () => put('snapshots/a.png', writeLayout(png(), layout));

  it('asks, runs the command in the config directory, then checks again', async () => {
    await put('playwright.config.ts');
    await put('snapshots/a.png', png());
    const s = session(['y'], refresh);
    expect(await run(['baselines', '--update'], s.io)).toBe(0);
    expect(s.ran).toHaveLength(1);
    expect(s.ran[0].cwd).toBe(dir);
    expect(s.ran[0].env).toEqual({ PIXSAME_UPDATE_IMAGES: 'true' });
    expect(s.text()).toContain('replaces every baseline');
    expect(s.text()).toMatch(/All 1 baselines have the page layout/);
  });

  it('does not run when the answer is no', async () => {
    await put('playwright.config.ts');
    await put('snapshots/a.png', png());
    const s = session(['n']);
    expect(await run(['baselines', '--update'], s.io)).toBe(1);
    expect(s.ran).toEqual([]);
  });

  it('skips the question with --yes and passes --failures-only on', async () => {
    await put('playwright.config.ts');
    await put('snapshots/a.png', png());
    const s = session(undefined, refresh);
    expect(
      await run(['baselines', '--update', '--yes', '--failures-only'], s.io),
    ).toBe(0);
    expect(s.ran[0].env).toEqual({ PIXSAME_UPDATE_IMAGES: 'failures-only' });
  });

  it('asks for the directory when the config is not here', async () => {
    await put('app/playwright.config.ts');
    await put('app/snapshots/a.png', png());
    const s = session(['app', 'y'], () =>
      put('app/snapshots/a.png', writeLayout(png(), layout)),
    );
    expect(await run(['baselines', '--update'], s.io)).toBe(0);
    expect(s.asked[0]).toContain('No Cypress or Playwright config');
    expect(s.ran[0].cwd).toBe(path.join(dir, 'app'));
  });

  it('asks which runner when both configs are here, and for the Cypress version when it is unknown', async () => {
    await put('cypress.config.ts');
    await put('playwright.config.ts');
    await put('snapshots/a.png', png());
    const s = session(['cypress', '15.9.0', 'y']);
    await run(['baselines', '--update'], s.io);
    expect(s.asked[0]).toContain('Which runner');
    expect(s.ran[0].command.slice(-2)).toEqual([
      '--env',
      'pluginVisualRegressionUpdateImages=true',
    ]);
  });

  it('without a terminal it says which flag answers each question', async () => {
    await put('snapshots/a.png', png());
    const none = session(undefined);
    expect(await run(['baselines', '--update'], none.io)).toBe(2);
    expect(none.text()).toContain('--dir <path>');
    await put('cypress.config.ts');
    const noVersion = session(undefined);
    expect(await run(['baselines', '--update', '--yes'], noVersion.io)).toBe(2);
    expect(noVersion.text()).toContain('--cypress-version');
    const noYes = session(undefined);
    expect(
      await run(
        ['baselines', '--update', '--cypress-version', '15.10.0'],
        noYes.io,
      ),
    ).toBe(2);
    expect(noYes.text()).toContain('--yes');
    expect(noYes.ran).toEqual([]);
  });

  it('cancels on an empty answer and rejects an unknown runner', async () => {
    expect(await run(['baselines', '--update'], session(['']).io)).toBe(1);
    expect(
      await run(
        ['baselines', '--update', '--runner', 'jest'],
        session(undefined).io,
      ),
    ).toBe(2);
  });

  it('does nothing when no baseline lacks a layout', async () => {
    await put('playwright.config.ts');
    await put('snapshots/a.png', writeLayout(png(), layout));
    const s = session(undefined);
    expect(await run(['baselines', '--update'], s.io)).toBe(0);
    expect(s.ran).toEqual([]);
  });

  it('passes on a failing test run', async () => {
    await put('playwright.config.ts');
    await put('snapshots/a.png', png());
    const s = session(['y']);
    s.io.exec = async () => 3;
    expect(await run(['baselines', '--update'], s.io)).toBe(3);
  });
});

describe('pixsame baselines without a known runner', () => {
  it('points at --update and lists the command for each runner', async () => {
    await put('snapshots/a.png', png());
    const s = session(undefined);
    await run(['baselines'], s.io);
    expect(s.text()).toContain('npx pixsame baselines --update');
    expect(s.text()).toContain(
      'PIXSAME_UPDATE_IMAGES=true npx playwright test',
    );
    expect(s.text()).toContain('npx cypress run --expose');
  });
});
