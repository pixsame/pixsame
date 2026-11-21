import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

export type Runner = 'cypress' | 'playwright';

const CONFIG = {
  cypress: ['ts', 'js', 'mjs', 'cjs'].map((ext) => `cypress.config.${ext}`),
  playwright: ['ts', 'js', 'mjs', 'cjs', 'mts', 'cts'].map(
    (ext) => `playwright.config.${ext}`,
  ),
};

/** The runners that have a config file directly in `dir`. */
export const detectRunners = (dir: string): Runner[] =>
  (Object.keys(CONFIG) as Runner[]).filter((runner) =>
    CONFIG[runner].some((file) => existsSync(path.join(dir, file))),
  );

/** How to run a package's binary with the project's package manager, from its lockfile. */
export const execPrefix = (dir: string): string[] => {
  for (let at = path.resolve(dir); ; at = path.dirname(at)) {
    if (existsSync(path.join(at, 'pnpm-lock.yaml'))) return ['pnpm', 'exec'];
    if (existsSync(path.join(at, 'yarn.lock'))) return ['yarn'];
    if (
      existsSync(path.join(at, 'bun.lock')) ||
      existsSync(path.join(at, 'bun.lockb'))
    )
      return ['bunx'];
    if (path.dirname(at) === at) return ['npx'];
  }
};

/** The version of the Cypress installed for `dir`, or `undefined` when it cannot be found. */
export const cypressVersionOf = (dir: string): string | undefined => {
  try {
    const file = createRequire(path.join(path.resolve(dir), 'x.js')).resolve(
      'cypress/package.json',
    );
    return (JSON.parse(readFileSync(file, 'utf8')) as { version?: string })
      .version;
  } catch {
    return undefined;
  }
};

/** Cypress 15.10 added `--expose`; older versions take the same keys through `--env`. */
export const supportsExpose = (version: string): boolean => {
  const [major, minor] = version.split('.').map(Number);
  return major > 15 || (major === 15 && minor >= 10);
};

export type Plan = {
  /** The program and its arguments, to run in `cwd`. */
  command: string[];
  /** Variables to add to the environment (Playwright has no command line switch for this). */
  env: Record<string, string>;
  cwd: string;
};

/** The one-run command that makes the runner replace baselines, so they get a page layout. */
export const updatePlan = ({
  runner,
  dir,
  failuresOnly,
  cypressVersion,
}: {
  runner: Runner;
  dir: string;
  failuresOnly: boolean;
  cypressVersion?: string;
}): Plan => {
  const value = failuresOnly ? 'failures-only' : 'true';
  const prefix = execPrefix(dir);
  if (runner === 'playwright')
    return {
      command: [...prefix, 'playwright', 'test'],
      env: { PIXSAME_UPDATE_IMAGES: value },
      cwd: dir,
    };
  const flag =
    cypressVersion && supportsExpose(cypressVersion) ? '--expose' : '--env';
  return {
    command: [
      ...prefix,
      'cypress',
      'run',
      flag,
      `pluginVisualRegressionUpdateImages=${value}`,
    ],
    env: {},
    cwd: dir,
  };
};

const quote = (arg: string) =>
  /^[\w@%+=:,./-]+$/.test(arg) ? arg : `'${arg}'`;

/** The plan as one line to read or paste in a shell. */
export const show = ({ command, env }: Plan) =>
  [
    ...Object.entries(env).map(([key, value]) => `${key}=${value}`),
    ...command.map(quote),
  ].join(' ');
