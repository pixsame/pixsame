import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import path from 'node:path';
import { findBaselines, type Report } from './baselines';
import { startReview } from './review';
import {
  cypressVersionOf,
  detectRunners,
  show,
  updatePlan,
  type Plan,
  type Runner,
} from './runner';

const HELP = `pixsame <command>

Commands:
  baselines [dir...]   Find baselines that lack the page layout of this version
                       (default: the project directory)
    --update           Run your tests once so the runner replaces them
    --failures-only    With --update: replace only the baselines that fail
    --yes              With --update: do not ask before running
    --runner <name>    cypress or playwright (default: found from the config)
    --dir <path>       The directory with the runner config (default: here)
    --cypress-version  Cypress version, when it is not installed there
    --json             Print the report as JSON

  review [dir...]      Open a page to look at the failed comparisons of the last
                       run (from its manifests below dir, default: here) and
                       replace baselines
    --port <n>         Port to serve on (default: a free one)
    --no-open          Print the address, do not open a browser
    --repo-root <dir>  The repository the manifests' paths belong to (default: here)

Run baselines in the directory with cypress.config.* or playwright.config.*.
`;

export type Io = {
  out: (line: string) => void;
  /** Asks a question; `undefined` when nobody can answer (no terminal). */
  ask?: (question: string) => Promise<string>;
  exec: (plan: Plan) => Promise<number>;
  /** Opens an address in the browser. */
  open: (url: string) => void;
  /** Resolves when the user is done with a running page (Ctrl-C). */
  wait: () => Promise<void>;
  cwd: string;
};

const defaults = (): Io => {
  const interactive = process.stdin.isTTY && process.stdout.isTTY;
  return {
    out: (line) => void process.stdout.write(`${line}\n`),
    ask: interactive
      ? async (question) => {
          const rl = createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          try {
            return (await rl.question(`${question} `)).trim();
          } finally {
            rl.close();
          }
        }
      : undefined,
    exec: (plan) =>
      new Promise((resolve, reject) => {
        const [program, ...args] = plan.command;
        const child = spawn(program, args, {
          cwd: plan.cwd,
          stdio: 'inherit',
          env: { ...process.env, ...plan.env },
          shell: process.platform === 'win32',
        });
        child.on('error', reject);
        child.on('close', (code) => resolve(code ?? 1));
      }),
    open: (url) => {
      const [program, ...args] =
        process.platform === 'darwin'
          ? ['open', url]
          : process.platform === 'win32'
            ? ['cmd', '/c', 'start', '', url]
            : ['xdg-open', url];
      spawn(program, args, { stdio: 'ignore', detached: true })
        .on('error', () => undefined)
        .unref();
    },
    wait: () => new Promise((resolve) => process.once('SIGINT', resolve)),
    cwd: process.cwd(),
  };
};

const lacking = ({ counts }: Report) => counts.missing + counts.outdated;

const text = (report: Report, plan?: Plan) => {
  const { analysisVersion, counts, baselines } = report;
  const stale = baselines.filter(({ status }) => status !== 'current');
  if (baselines.length === 0) return 'No baselines found.';
  if (stale.length === 0)
    return `All ${baselines.length} baselines have the page layout (version ${analysisVersion}).`;
  return [
    `${stale.length} of ${baselines.length} baselines lack the page layout (version ${analysisVersion}): ${counts.missing} without one, ${counts.outdated} from another version.`,
    ...stale.map(
      ({ file, status, version }) =>
        `  ${file}  ${status === 'missing' ? 'no layout' : `layout v${version}`}`,
    ),
    '',
    'They still compare. They get the layout when your tests replace them. Let the CLI run them:',
    '  npx pixsame baselines --update',
    '',
    'If that does not work, run the command yourself:',
    ...(plan
      ? [`  ${show(plan)}`]
      : [
          '  Cypress     npx cypress run --expose pluginVisualRegressionUpdateImages=true  (--env before Cypress 15.10)',
          '  Playwright  PIXSAME_UPDATE_IMAGES=true npx playwright test',
        ]),
  ].join('\n');
};

type Flags = {
  json: boolean;
  update: boolean;
  failuresOnly: boolean;
  yes: boolean;
  runner?: string;
  dir?: string;
  cypressVersion?: string;
  rest: string[];
  unknown?: string;
};

const BOOLEAN = {
  '--json': 'json',
  '--update': 'update',
  '--failures-only': 'failuresOnly',
  '--yes': 'yes',
} as const;
const VALUE = {
  '--runner': 'runner',
  '--dir': 'dir',
  '--cypress-version': 'cypressVersion',
} as const;

const parse = (args: string[]): Flags => {
  const flags: Flags = {
    json: false,
    update: false,
    failuresOnly: false,
    yes: false,
    rest: [],
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg in BOOLEAN) flags[BOOLEAN[arg as keyof typeof BOOLEAN]] = true;
    else if (arg in VALUE) flags[VALUE[arg as keyof typeof VALUE]] = args[++i];
    else if (arg.startsWith('--')) flags.unknown ??= arg;
    else flags.rest.push(arg);
  }
  return flags;
};

class Stop extends Error {
  constructor(
    message: string,
    readonly code = 1,
  ) {
    super(message);
  }
}

/** Where the runner's config is, which runner it is and the Cypress version: found, or asked of the user. */
const resolveTarget = async (flags: Flags, io: Io) => {
  const need = (what: string, flag: string) =>
    new Stop(`${what}. Pass ${flag}, or run this in a terminal.`, 2);
  let dir = path.resolve(io.cwd, flags.dir ?? '.');
  let found = detectRunners(dir);
  while (found.length === 0 && !flags.runner) {
    if (!io.ask)
      throw need(
        `No Cypress or Playwright config in ${dir}`,
        '--dir <path> or --runner',
      );
    const answer = await io.ask(
      `No Cypress or Playwright config in ${dir}.\nPath to the directory that has it (empty to cancel):`,
    );
    if (!answer) throw new Stop('Cancelled.');
    dir = path.resolve(io.cwd, answer);
    found = detectRunners(dir);
  }
  let runner = flags.runner as Runner | undefined;
  if (runner && runner !== 'cypress' && runner !== 'playwright')
    throw new Stop(`Unknown runner "${runner}": use cypress or playwright.`, 2);
  if (!runner) {
    if (found.length === 1) runner = found[0];
    else if (!io.ask)
      throw need(
        'Both a Cypress and a Playwright config are here',
        '--runner <name>',
      );
    else {
      const answer = await io.ask(
        'Both configs are here. Which runner? (cypress/playwright)',
      );
      if (answer !== 'cypress' && answer !== 'playwright')
        throw new Stop('Cancelled.');
      runner = answer;
    }
  }
  let cypressVersion: string | undefined;
  if (runner === 'cypress') {
    cypressVersion = flags.cypressVersion ?? cypressVersionOf(dir);
    if (!cypressVersion) {
      if (!io.ask)
        throw need(
          'Cypress is not installed there, so its version is unknown',
          '--cypress-version <x.y.z>',
        );
      cypressVersion = await io.ask(
        'Cypress is not installed there. Its version (e.g. 15.10.0):',
      );
      if (!/^\d+\.\d+/.test(cypressVersion)) throw new Stop('Cancelled.');
    }
  }
  return { dir, runner, cypressVersion };
};

/** Runs the CLI; returns the exit code. */
export const run = async (
  argv: string[],
  io: Io = defaults(),
): Promise<number> => {
  const [command, ...rest] = argv;
  if (command === 'review') return review(rest, io);
  if (command !== 'baselines') {
    io.out(HELP);
    return command === undefined || command === '--help' || command === '-h'
      ? 0
      : 1;
  }
  const flags = parse(rest);
  if (flags.unknown) {
    io.out(`Unknown option ${flags.unknown}\n\n${HELP}`);
    return 1;
  }
  try {
    // without --update a missing config only means there is no command to propose
    const target = await (flags.update
      ? resolveTarget(flags, io)
      : Promise.resolve(undefined));
    const quiet = !flags.update
      ? await resolveTarget(
          { ...flags, update: true },
          { ...io, ask: undefined },
        ).catch(() => undefined)
      : undefined;
    const known = target ?? quiet;
    const plan =
      known && updatePlan({ ...known, failuresOnly: flags.failuresOnly });
    const roots =
      flags.rest.length > 0
        ? flags.rest
        : [known?.dir ?? path.resolve(io.cwd, flags.dir ?? '.')];
    const report = await findBaselines(roots, io.cwd);
    io.out(flags.json ? JSON.stringify(report, null, 2) : text(report, plan));
    if (flags.update && plan) {
      if (lacking(report) === 0) return 0;
      io.out(
        `\nThis replaces ${flags.failuresOnly ? 'the failing baselines' : 'every baseline'} in the run, not only these ones.`,
      );
      if (!flags.yes) {
        if (!io.ask)
          throw new Stop(
            'Add --yes to run it without a terminal to ask in.',
            2,
          );
        const answer = await io.ask(`Run \`${show(plan)}\` now? [y/N]`);
        if (!/^y(es)?$/i.test(answer)) throw new Stop('Not run.');
      }
      const code = await io.exec(plan);
      if (code !== 0) {
        io.out(`The test run exited with ${code}.`);
        return code;
      }
      const after = await findBaselines(roots, io.cwd);
      io.out(text(after));
      return lacking(after) > 0 ? 1 : 0;
    }
    return 0;
  } catch (error) {
    if (!(error instanceof Stop)) throw error;
    io.out(error.message);
    return error.code;
  }
};

const review = async (args: string[], io: Io): Promise<number> => {
  const roots: string[] = [];
  let port: number | undefined;
  let repoRoot: string | undefined;
  let open = true;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--no-open') open = false;
    else if (arg === '--port') port = Number(args[++i]);
    else if (arg === '--repo-root') repoRoot = args[++i];
    else if (arg.startsWith('--')) {
      io.out(`Unknown option ${arg}\n\n${HELP}`);
      return 1;
    } else roots.push(arg);
  }
  if (port !== undefined && !(port >= 0 && port < 65536)) {
    io.out('--port needs a number from 0 to 65535.');
    return 2;
  }
  try {
    const session = await startReview({
      roots: (roots.length > 0 ? roots : ['.']).map((root) =>
        path.resolve(io.cwd, root),
      ),
      port,
      repoRoot: path.resolve(io.cwd, repoRoot ?? '.'),
    });
    const items = session.items();
    if (items.length === 0) {
      io.out(
        'No failed comparisons found in the manifests below here. Run your tests first, or pass the directory that has the visual-regression-manifest*.json files.',
      );
      await session.close();
      return 0;
    }
    io.out(
      `${items.length} comparison${items.length === 1 ? '' : 's'} to look at: ${session.url}`,
    );
    io.out('Press Ctrl-C to stop.');
    if (open) io.open(session.url);
    await io.wait();
    await session.close();
    return 0;
  } catch (error) {
    io.out(error instanceof Error ? error.message : String(error));
    return 2;
  }
};
