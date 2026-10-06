import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import readline from 'readline';
import { detect, resolveCommand } from 'package-manager-detector';
import type { Agent } from 'package-manager-detector';

export const OLD_PACKAGE_NAME =
  '@frsource/cypress-plugin-visual-regression-diff';
export const NEW_PACKAGE_NAME =
  '@pixsame/cypress-plugin-visual-regression-diff';
export const NEW_PACKAGE_RANGE = '^1.0.0';

const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;
const SOURCE_EXTENSIONS = /\.(?:[cm]?[jt]sx?|json|jsonc)$/;
const SKIPPED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.yarn',
  'dist',
  'build',
  'coverage',
  'screenshots',
  'videos',
]);
export type PackageManager = Agent;

export interface FileEdit {
  file: string;
  replacements: number;
  content: string;
}

export interface Io {
  stdout: (line: string) => void;
  stderr: (line: string) => void;
  isInteractive: boolean;
  confirm: (question: string) => Promise<boolean>;
  install: (pm: PackageManager, cwd: string) => number;
}

// Not followed by a word character or `-`, so `…-diff-foo` is left alone.
const oldNameRegex = () =>
  new RegExp(`${OLD_PACKAGE_NAME.replace(/[/-]/g, '\\$&')}(?![\\w-])`, 'g');

export async function detectPackageManager(
  cwd: string,
): Promise<PackageManager> {
  return (await detect({ cwd }))?.agent ?? 'npm';
}

function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) {
        yield* walk(path.join(dir, entry.name));
      }
    } else if (entry.isFile() && SOURCE_EXTENSIONS.test(entry.name)) {
      yield path.join(dir, entry.name);
    }
  }
}

function indentOf(json: string) {
  return /^([ \t]+)"/m.exec(json)?.[1] ?? 2;
}

function sortKeys(record: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
}

function migratePackageJson(source: string): FileEdit['content'] | null {
  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(source);
  } catch {
    return null;
  }

  let changed = false;
  for (const field of DEPENDENCY_FIELDS) {
    const deps = pkg[field] as Record<string, string> | undefined;
    if (!deps || !(OLD_PACKAGE_NAME in deps)) continue;
    // Keep an existing new-name entry; the old one only duplicates it.
    const others = Object.entries(deps).filter(([n]) => n !== OLD_PACKAGE_NAME);
    pkg[field] = sortKeys({
      [NEW_PACKAGE_NAME]: NEW_PACKAGE_RANGE,
      ...Object.fromEntries(others),
    });
    changed = true;
  }
  if (!changed) return null;

  const eol = source.endsWith('\n') ? '\n' : '';
  return JSON.stringify(pkg, null, indentOf(source)) + eol;
}

/** Reads the tree below `cwd` and returns the edits, writes nothing. */
export function planMigration(cwd: string): FileEdit[] {
  const edits: FileEdit[] = [];
  for (const file of walk(cwd)) {
    const source = fs.readFileSync(file, 'utf8');
    if (!source.includes(OLD_PACKAGE_NAME)) continue;

    const replacements = (source.match(oldNameRegex()) ?? []).length;
    if (!replacements) continue;

    const content =
      path.basename(file) === 'package.json'
        ? migratePackageJson(source)
        : source.replace(oldNameRegex(), NEW_PACKAGE_NAME);
    if (content === null || content === source) continue;

    edits.push({ file, replacements, content });
  }
  return edits;
}

export function applyMigration(edits: FileEdit[]) {
  for (const { file, content } of edits) fs.writeFileSync(file, content);
}

const HELP = `Usage: cypress-plugin-visual-regression-diff migrate [options]

Migration tool from ${OLD_PACKAGE_NAME}
to ${NEW_PACKAGE_NAME}. Moves a project from ${OLD_PACKAGE_NAME}
to ${NEW_PACKAGE_NAME}: renames the dependency in package.json,
updates imports and type references, then reinstalls.

Options:
  --dry-run       Only list the files that would change
  --yes, -y       Do not ask for confirmation (required without a terminal)
  --no-install    Do not run the package manager afterwards
  --cwd <dir>     Project directory (default: current directory)
  --help, -h      Show this help
`;

export async function main(argv: string[], io: Io = defaultIo()) {
  const [command, ...rest] = argv;
  const wantsHelp =
    !command ||
    ['--help', '-h'].includes(command) ||
    rest.includes('--help') ||
    rest.includes('-h');
  if (command !== 'migrate' && !wantsHelp) {
    io.stderr(`Unknown command: ${command}\n\n${HELP}`);
    return 1;
  }
  if (wantsHelp) {
    io.stdout(HELP);
    return 0;
  }

  const dryRun = rest.includes('--dry-run');
  const yes = rest.includes('--yes') || rest.includes('-y');
  const install = !rest.includes('--no-install');
  const cwdFlag = rest.indexOf('--cwd');
  const cwd = path.resolve(cwdFlag === -1 ? '.' : (rest[cwdFlag + 1] ?? ''));
  if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) {
    io.stderr(`Not a directory: ${cwd}`);
    return 1;
  }

  const edits = planMigration(cwd);
  if (!edits.length) {
    io.stdout(`Nothing to migrate: no reference to ${OLD_PACKAGE_NAME} found.`);
    return 0;
  }

  io.stdout(
    [
      `Migration tool: ${OLD_PACKAGE_NAME} → ${NEW_PACKAGE_NAME}`,
      '',
      `Found usages of ${OLD_PACKAGE_NAME} in these files, they will be updated by the migration (number of occurrences in parentheses):`,
      '',
    ].join('\n'),
  );
  for (const { file, replacements } of edits) {
    io.stdout(`  • ${path.relative(cwd, file)} (${replacements})`);
  }
  if (dryRun) {
    io.stdout('\nDry run, nothing was written.');
    return 0;
  }

  if (!yes) {
    if (!io.isInteractive) {
      io.stderr(
        '\nNo terminal to ask for confirmation, nothing was written. Re-run with --yes to apply.',
      );
      return 1;
    }
    if (!(await io.confirm('\nApply these changes? (y/N) '))) {
      io.stdout('Aborted, nothing was written.');
      return 1;
    }
  }

  applyMigration(edits);
  io.stdout(
    `\n✔ Updated ${edits.length} file${edits.length === 1 ? '' : 's'}. Review the changes with \`git diff\`.`,
  );

  if (!install) return 0;
  const pm = await detectPackageManager(cwd);
  io.stdout(`\nRunning \`${pm} install\` to refresh the lockfile…\n`);
  const status = io.install(pm, cwd);
  if (status !== 0) {
    io.stderr(`\`${pm} install\` failed (exit ${status}). Run it yourself.`);
    return 1;
  }
  return 0;
}

/* c8 ignore start */
/* eslint-disable no-console */
function defaultIo(): Io {
  return {
    stdout: (line) => console.log(line),
    stderr: (line) => console.error(line),
    isInteractive: !!process.stdin.isTTY && !process.env.CI,
    confirm: (question) =>
      new Promise((resolve) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        rl.question(question, (answer) => {
          rl.close();
          resolve(/^y(es)?$/i.test(answer.trim()));
        });
      }),
    install: (pm, cwd) => {
      const resolved = resolveCommand(pm, 'install', []);
      if (!resolved) return 1;
      const { command, args } = resolved;
      return (
        spawnSync(command, args, {
          cwd,
          stdio: 'inherit',
          shell: process.platform === 'win32',
        }).status ?? 1
      );
    },
  };
}
/* c8 ignore stop */
