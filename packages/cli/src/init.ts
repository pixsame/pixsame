import fs from 'node:fs';
import path from 'node:path';
import { projectRoot } from './git';
import type { Io } from './io';

export const INIT_HELP = `  init                 Set a project up for coding agents: copy the pixsame agent
                       skills into it (setting up the test runner is not part
                       of this command yet)
    --hook             Also add a Claude Code Stop hook: before the agent
                       finishes it is told what changed on the pages it
                       captured and has not looked at since
    --skills-dir <dir> Where the skills go, repeatable (default: .claude/skills
                       at the top of the repository)
    --yes              Do not ask before writing`;

/** Seconds the hook may take: it opens a browser and captures every page of the session twice. */
const HOOK_TIMEOUT = 120;
const HOOK_ARGS = 'snap --check --hook claude';

/** The skills shipped with the package: `skills/` next to `dist/`, or the repository's when run from source. */
const shippedSkills = (): string | undefined =>
  [
    path.join(__dirname, '..', 'skills'),
    path.join(__dirname, '..', '..', '..', 'skills'),
  ].find((dir) => fs.existsSync(dir));

const filesBelow = (dir: string, prefix = ''): string[] =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? filesBelow(path.join(dir, entry.name), path.join(prefix, entry.name))
        : [path.join(prefix, entry.name)],
    );

type Write = {
  file: string;
  content: Buffer | string;
  state: 'new' | 'changed';
};

const plan = (file: string, content: Buffer | string): Write[] => {
  if (!fs.existsSync(file)) return [{ file, content, state: 'new' }];
  return Buffer.from(content).equals(fs.readFileSync(file))
    ? []
    : [{ file, content, state: 'changed' }];
};

type Settings = {
  hooks?: {
    Stop?: { hooks?: { type?: string; command?: string }[] }[];
    [event: string]: unknown;
  };
  [key: string]: unknown;
};

/**
 * `settings.json` with the Stop hook added; `undefined` when it is there
 * already. The hook runs where pixsame is installed, whatever directory the
 * agent is in at that moment.
 */
const withHook = (
  text: string | undefined,
  from: string,
): string | undefined => {
  const settings = (text ? JSON.parse(text) : {}) as Settings;
  const groups = settings.hooks?.Stop ?? [];
  const there = groups.some((group) =>
    group.hooks?.some(({ command }) => command?.includes(HOOK_ARGS)),
  );
  if (there) return undefined;
  const where = from
    ? `"$CLAUDE_PROJECT_DIR/${from}"`
    : '"$CLAUDE_PROJECT_DIR"';
  return `${JSON.stringify(
    {
      ...settings,
      hooks: {
        ...settings.hooks,
        Stop: [
          ...groups,
          {
            hooks: [
              {
                type: 'command',
                command: `cd ${where} && npx pixsame ${HOOK_ARGS}`,
                timeout: HOOK_TIMEOUT,
              },
            ],
          },
        ],
      },
    },
    null,
    2,
  )}\n`;
};

/** `pixsame init`; returns the exit code. */
export const init = async (args: string[], io: Io): Promise<number> => {
  let hook = false;
  let yes = false;
  const dirs: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--hook') hook = true;
    else if (arg === '--yes') yes = true;
    else if (
      arg === '--skills-dir' &&
      args[i + 1] &&
      !args[i + 1].startsWith('--')
    )
      dirs.push(args[++i]);
    else {
      io.out(
        `${arg === '--skills-dir' ? '--skills-dir needs a directory.' : `Unknown option ${arg}`}\n\n${INIT_HELP}`,
      );
      return 2;
    }
  }
  const source = shippedSkills();
  if (!source) {
    io.out('The skills are missing from this installation of pixsame.');
    return 2;
  }
  const top = projectRoot(io.cwd);
  const targets =
    dirs.length > 0
      ? dirs.map((dir) => path.resolve(io.cwd, dir))
      : [path.join(top, '.claude', 'skills')];
  const writes: Write[] = targets.flatMap((target) =>
    filesBelow(source).flatMap((file) =>
      plan(path.join(target, file), fs.readFileSync(path.join(source, file))),
    ),
  );
  const settingsFile = path.join(top, '.claude', 'settings.json');
  if (hook) {
    let settings: string | undefined;
    try {
      settings = withHook(
        fs.existsSync(settingsFile)
          ? fs.readFileSync(settingsFile, 'utf8')
          : undefined,
        path.relative(top, io.cwd).split(path.sep).join('/'),
      );
    } catch {
      io.out(
        `${path.relative(io.cwd, settingsFile)} is not valid JSON, so the hook cannot be added to it.`,
      );
      return 2;
    }
    if (settings !== undefined) writes.push(...plan(settingsFile, settings));
  }
  const shown = (file: string) => path.relative(io.cwd, file) || file;
  if (writes.length === 0) {
    io.out(
      `Nothing to do: the skills${hook ? ' and the hook' : ''} are in place.`,
    );
    return 0;
  }
  io.out(
    [
      'This will write:',
      ...writes.map(
        ({ file, state }) =>
          `  ${shown(file)}${state === 'changed' ? '  (replaces the one there)' : ''}`,
      ),
    ].join('\n'),
  );
  if (!yes) {
    if (!io.ask) {
      io.out('Add --yes to write them without a terminal to ask in.');
      return 2;
    }
    if (!/^(y(es)?)?$/i.test(await io.ask('Write them? [Y/n]'))) {
      io.out('Nothing written.');
      return 1;
    }
  }
  for (const { file, content } of writes) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  io.out(
    [
      `Done. Your agent now has: ${fs.readdirSync(source).join(', ')}.`,
      ...(hook
        ? []
        : [
            'Run `pixsame init --hook` to also have Claude Code told, before it finishes, what changed on the pages it captured.',
          ]),
    ].join('\n'),
  );
  return 0;
};
