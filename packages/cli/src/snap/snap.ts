import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  readLayout,
  writeLayout,
  type Fact,
  type Region,
} from '@pixsame/analysis';
import { git, projectRoot } from '../git';
import type { Io } from '../io';
import {
  CaptureError,
  openBrowser,
  type Browser,
  type Viewport,
} from './capture';
import {
  compareShots,
  decodeUnstable,
  encodeUnstable,
  hasCrop,
  unstableAreas,
  unstableBetween,
  type Unstable,
} from './compare';

export const SNAP_HELP = `  snap <url>           Say what changed on a page since its first capture after
                       the last commit (kept in .pixsame/snaps, not committed)
    --selector <css>   Capture one element instead of the window
    --viewport <WxH>   Window size, repeatable (default: 1280x800)
    --storage-state <file>
                       A Playwright storage state, for pages behind a login
    --only <css>       The element you meant to change, repeatable: exit with 1
                       when something else changed (what it pushed aside is
                       not something else)
    --keep             Also mark this page to become a test (see --report)
    --report           No capture: print what this session's captures found, as
                       Markdown for a pull request; with --json, as data
    --check            No address: capture every page of this session again and
                       print what changed since each was last captured; exit
                       with 1 when something did
    --hook claude      With --check: answer as a Claude Code Stop hook, so the
                       agent is told before it finishes
    --reset            Forget the first capture of this page and take a new one
    --no-stable        Do not capture twice to leave out what changes by itself
    --all              Print every change (default: the first 100)
    --json             Print the result as JSON`;

/** Lines of changes printed without `--all`. */
const LINE_CAP = 100;
const DEFAULT_VIEWPORT: Viewport = { width: 1280, height: 800 };

export type SnapResult = {
  url: string;
  selector?: string;
  viewport: Viewport;
  /** `first`: nothing to compare with yet. */
  status: 'first' | 'same' | 'changed';
  /** The commit the first capture was taken on; `null` outside a git repository. */
  commit: string | null;
  facts: Fact[];
  /** The `--storage-state` file of this capture. */
  storageState?: string;
  /** The `--only` selectors of this capture. */
  only?: string[];
  /** With `--only`: how many of `facts` are outside those elements. */
  outside?: number;
  /** Areas left out because they change by themselves, largest first. */
  unstable: Region[];
  files: {
    before: string;
    after?: string;
    /** For each fact of type `area`, in order. */
    crops: { before: string; after: string }[];
  };
};

type Flags = {
  url?: string;
  selector?: string;
  viewports: Viewport[];
  storageState?: string;
  only: string[];
  keep: boolean;
  report: boolean;
  check: boolean;
  hook?: string;
  reset: boolean;
  stable: boolean;
  all: boolean;
  json: boolean;
};

class Usage extends Error {}

const parse = (args: string[]): Flags => {
  const flags: Flags = {
    viewports: [],
    only: [],
    keep: false,
    report: false,
    check: false,
    reset: false,
    stable: true,
    all: false,
    json: false,
  };
  const value = (flag: string, at: number) => {
    const next = args[at];
    if (next === undefined || next.startsWith('--'))
      throw new Usage(`${flag} needs a value.`);
    return next;
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--reset') flags.reset = true;
    else if (arg === '--keep') flags.keep = true;
    else if (arg === '--report') flags.report = true;
    else if (arg === '--check') flags.check = true;
    else if (arg === '--hook') flags.hook = value(arg, ++i);
    else if (arg === '--no-stable') flags.stable = false;
    else if (arg === '--all') flags.all = true;
    else if (arg === '--json') flags.json = true;
    else if (arg === '--selector') flags.selector = value(arg, ++i);
    else if (arg === '--only') flags.only.push(value(arg, ++i));
    else if (arg === '--storage-state') flags.storageState = value(arg, ++i);
    else if (arg === '--viewport') {
      const match = /^(\d+)x(\d+)$/.exec(value(arg, ++i));
      if (!match || match[1] === '0' || match[2] === '0')
        throw new Usage('--viewport needs a size like 1280x800.');
      flags.viewports.push({
        width: Number(match[1]),
        height: Number(match[2]),
      });
    } else if (arg.startsWith('--')) throw new Usage(`Unknown option ${arg}`);
    else if (flags.url === undefined) flags.url = arg;
    else throw new Usage(`One address at a time: got ${flags.url} and ${arg}.`);
  }
  if (flags.viewports.length === 0) flags.viewports.push(DEFAULT_VIEWPORT);
  return flags;
};

const slug = (text: string) =>
  text
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);

/** The directory name of a target: readable, and unique through the hash. */
export const targetKey = (url: string, selector?: string) =>
  `${[slug(url), ...(selector ? [slug(selector)] : [])].filter(Boolean).join('--')}-${createHash(
    'sha1',
  )
    .update(`${url}\n${selector ?? ''}`)
    .digest('hex')
    .slice(0, 8)}`;

const readIf = (file: string) =>
  fs.existsSync(file) ? fs.readFileSync(file) : undefined;

const rootOf = (cwd: string) =>
  path.join(projectRoot(cwd), '.pixsame', 'snaps');

const json = <T>(file: string): T | undefined => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return undefined;
  }
};

/** The commit the captures in `root` were taken on; `undefined` when there are none. */
const savedCommit = (root: string) =>
  json<{ commit?: string | null }>(path.join(root, 'session.json'))?.commit;

/** A page marked with `--keep`: one that should get a test. */
export type Kept = { url: string; selector?: string; viewports: Viewport[] };

const readKept = (root: string) =>
  json<Kept[]>(path.join(root, 'keep.json')) ?? [];

const writeKept = (root: string, kept: Kept[]) =>
  fs.writeFileSync(
    path.join(root, 'keep.json'),
    `${JSON.stringify(kept, null, 2)}\n`,
  );

const keep = (root: string, { url, selector, viewports }: Kept) => {
  const kept = readKept(root).filter(
    (one) => one.url !== url || one.selector !== selector,
  );
  writeKept(root, [...kept, { url, ...(selector && { selector }), viewports }]);
};

/** Every capture's last result, in the order of their directories. */
const savedResults = (root: string): SnapResult[] => {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((target) =>
      fs
        .readdirSync(path.join(root, target.name), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .flatMap((viewport) => {
          const result = json<SnapResult>(
            path.join(root, target.name, viewport.name, 'result.json'),
          );
          return result ? [result] : [];
        }),
    );
};

/** Changes listed for one page in a report. */
const REPORT_CAP = 20;

const name = ({ url, selector, viewport }: SnapResult) =>
  `\`${url}\`${selector ? ` \`${selector}\`` : ''} at ${viewport.width}x${viewport.height}`;

/** What this session's captures found, for a pull request description. */
const markdown = (
  commit: string | null | undefined,
  results: SnapResult[],
  kept: Kept[],
): string => {
  const lines = [
    '### Visual check',
    '',
    `Checked with \`pixsame snap\`: each page as it is now against its first capture${commit ? ` on commit ${commit.slice(0, 7)}` : ''}.`,
    '',
  ];
  if (results.length === 0) lines.push('No page was captured.');
  for (const result of results) {
    const { status, facts, outside, only, unstable } = result;
    if (status === 'first') {
      lines.push(`- ${name(result)}: captured once, not compared.`);
      continue;
    }
    if (status === 'same') {
      lines.push(`- ${name(result)}: no change.`);
      continue;
    }
    const scope =
      outside === undefined || !only
        ? ''
        : outside === 0
          ? `, all on \`${only.join('`, `')}\` or caused by it; nothing else changed`
          : `, ${outside} of them not on \`${only.join('`, `')}\``;
    lines.push(
      `- ${name(result)}: ${facts.length} ${facts.length === 1 ? 'change' : 'changes'}${scope}`,
    );
    const ordered = [
      ...facts.filter((fact) => fact.outside),
      ...facts.filter((fact) => !fact.outside),
    ];
    for (const fact of ordered.slice(0, REPORT_CAP)) {
      lines.push(`  - ${fact.outside ? '**Elsewhere:** ' : ''}${fact.text}`);
    }
    if (ordered.length > REPORT_CAP)
      lines.push(`  - and ${ordered.length - REPORT_CAP} more`);
    if (unstable.length > 0)
      lines.push(
        `  - Left out: ${unstable.length === 1 ? '1 area that changes' : `${unstable.length} areas that change`} by ${unstable.length === 1 ? 'itself' : 'themselves'}`,
      );
  }
  if (kept.length > 0) {
    lines.push('', 'Marked to become tests:');
    for (const { url, selector } of kept)
      lines.push(`- \`${url}\`${selector ? ` \`${selector}\`` : ''}`);
  }
  return lines.join('\n');
};

const report = (flags: Flags, io: Io): number => {
  const root = rootOf(io.cwd);
  const commit = savedCommit(root);
  const results = savedResults(root);
  const kept = readKept(root);
  io.out(
    flags.json
      ? JSON.stringify({ commit: commit ?? null, results, kept }, null, 2)
      : markdown(commit, results, kept),
  );
  return 0;
};

/**
 * Where the captures are, emptied when the commit is no longer the one they
 * were taken on. The directory ignores itself, so nothing in it is committed.
 */
const openStore = (cwd: string) => {
  const root = rootOf(cwd);
  const commit = git(cwd, 'rev-parse', 'HEAD') ?? null;
  const sessionFile = path.join(root, 'session.json');
  let startedOver = false;
  if (fs.existsSync(sessionFile) && savedCommit(root) !== commit) {
    // what was marked to become a test outlives the commit
    const kept = readKept(root);
    fs.rmSync(root, { recursive: true, force: true });
    fs.mkdirSync(root, { recursive: true });
    if (kept.length > 0) writeKept(root, kept);
    startedOver = true;
  }
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, '.gitignore'), '*\n');
  fs.writeFileSync(sessionFile, `${JSON.stringify({ commit }, null, 2)}\n`);
  return { root, commit, startedOver };
};

const snapOne = async ({
  browser,
  flags,
  url,
  viewport,
  dir,
  commit,
  cwd,
}: {
  browser: Browser;
  flags: Flags;
  url: string;
  viewport: Viewport;
  dir: string;
  commit: string | null;
  cwd: string;
}): Promise<SnapResult> => {
  const shots = await browser.capture({
    url,
    selector: flags.selector,
    viewport,
    storageState: flags.storageState,
    twice: flags.stable,
    marks: flags.only,
  });
  const shot = shots[shots.length - 1];
  const unstableNow =
    shots.length > 1
      ? await unstableBetween(shots[0].png, shot.png, [
          shots[0].layout,
          shot.layout,
        ])
      : undefined;
  const png = shot.layout ? writeLayout(shot.png, shot.layout) : shot.png;
  fs.mkdirSync(dir, { recursive: true });
  const file = (name: string) => path.join(dir, name);
  const shown = (name: string) => path.relative(cwd, file(name)) || name;
  const base = {
    url,
    ...(flags.selector && { selector: flags.selector }),
    viewport,
    commit,
    ...(flags.storageState && { storageState: flags.storageState }),
    ...(flags.only.length > 0 && { only: flags.only }),
  };
  const before = readIf(file('before.png'));
  if (!before) {
    fs.writeFileSync(file('before.png'), png);
    if (unstableNow)
      fs.writeFileSync(
        file('before.unstable.png'),
        await encodeUnstable(unstableNow),
      );
    return {
      ...base,
      status: 'first',
      facts: [],
      unstable: unstableNow ? unstableAreas(unstableNow) : [],
      files: { before: shown('before.png'), crops: [] },
    };
  }
  const savedUnstable = readIf(file('before.unstable.png'));
  const unstable: Unstable[] = [
    ...(savedUnstable ? [await decodeUnstable(savedUnstable)] : []),
    ...(unstableNow ? [unstableNow] : []),
  ];
  const missing = flags.only.find((mark) => !shot.marks?.[mark]?.length);
  if (missing)
    throw new CaptureError(
      `Nothing on ${url} matches ${missing}, so --only cannot tell what is outside it.`,
    );
  const compared = await compareShots({
    before: { png: before, layout: readLayout(before) },
    after: { png: shot.png, layout: shot.layout },
    unstable,
    ...(shots.length > 1 && { twin: shots[0].layout }),
    ...(flags.only.length > 0 && {
      only: flags.only.flatMap((mark) => shot.marks?.[mark] ?? []),
    }),
  });
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('area-')) fs.rmSync(file(name));
  }
  fs.writeFileSync(file('after.png'), png);
  const crops = compared.crops.map((crop, i) => {
    const names = {
      before: `area-${i + 1}.before.png`,
      after: `area-${i + 1}.after.png`,
    };
    fs.writeFileSync(file(names.before), crop.before);
    fs.writeFileSync(file(names.after), crop.after);
    return { before: shown(names.before), after: shown(names.after) };
  });
  return {
    ...base,
    status: compared.facts.length > 0 ? 'changed' : 'same',
    facts: compared.facts,
    ...(flags.only.length > 0 && {
      outside: compared.facts.filter(({ outside }) => outside).length,
    }),
    unstable: unstable.flatMap(unstableAreas),
    files: { before: shown('before.png'), after: shown('after.png'), crops },
  };
};

const text = (result: SnapResult, all: boolean, only: string[]): string[] => {
  const { url, selector, viewport, status, commit, unstable } = result;
  const what = `${url}${selector ? ` ${selector}` : ''} at ${viewport.width}x${viewport.height}`;
  const since = `since the first capture${commit ? ` on commit ${commit.slice(0, 7)}` : ''}`;
  const lines: string[] = [];
  if (status === 'first') {
    lines.push(
      `${what}: first capture saved, nothing to compare yet. Run this again after the edit.`,
    );
  } else if (status === 'same') {
    lines.push(`${what}: no change ${since}.`);
  } else {
    const count = result.facts.length;
    const { outside } = result;
    const where =
      outside === undefined
        ? ''
        : outside === 0
          ? `, all on ${only.join(', ')} or caused by it`
          : `, ${outside} of them NOT on ${only.join(', ')}`;
    lines.push(
      `${what}: ${count} ${count === 1 ? 'change' : 'changes'} ${since}${where}:`,
    );
    let crop = 0;
    const withFiles = result.facts.map((fact) => {
      const mark = fact.outside ? 'OUTSIDE: ' : '';
      if (!hasCrop(fact)) return { fact, line: `  - ${mark}${fact.text}` };
      const files = result.files.crops[crop++];
      return {
        fact,
        line: `  - ${mark}${fact.text}${files ? `; see ${files.before} and ${files.after}` : ''}`,
      };
    });
    // what was not meant comes first: it must not fall under the cap
    const factLines = [
      ...withFiles.filter(({ fact }) => fact.outside),
      ...withFiles.filter(({ fact }) => !fact.outside),
    ].map(({ line }) => line);
    const printed = all ? factLines : factLines.slice(0, LINE_CAP);
    lines.push(...printed);
    if (printed.length < factLines.length)
      lines.push(`  ${factLines.length - printed.length} more, use --all`);
  }
  if (unstable.length > 0) {
    const [largest] = unstable;
    lines.push(
      `  Left out, it changes by itself: ${unstable.length === 1 ? '1 area' : `${unstable.length} areas, the largest`} ${largest.width}x${largest.height} px at x=${largest.x}, y=${largest.y}.`,
    );
  }
  return lines;
};

/** The same facts give the same string: for telling a new change from one already shown. */
const fingerprint = ({ facts }: SnapResult) =>
  facts
    .map((fact) => `${fact.outside ? '!' : ''}${fact.text}`)
    .sort()
    .join('\n');

const saveResult = (dir: string, result: SnapResult) =>
  fs.writeFileSync(
    path.join(dir, 'result.json'),
    `${JSON.stringify(result, null, 2)}\n`,
  );

/**
 * Captures every page of the session again, with the options it was last
 * captured with, and reports those whose changes are not the ones last shown.
 * What it reports counts as shown, so the same change is reported once.
 *
 * As a hook it must never trap the agent: with nothing new, or when a page
 * cannot be captured (the dev server is down), it says nothing and exits 0.
 */
const check = async (
  flags: Flags,
  io: Io,
  open: (cwd: string) => Promise<Browser>,
): Promise<number> => {
  const hook = flags.hook !== undefined;
  const store = openStore(io.cwd);
  const saved = savedResults(store.root);
  if (saved.length === 0) {
    if (!hook) io.out('No page was captured since the last commit.');
    return 0;
  }
  let browser: Browser | undefined;
  try {
    browser = await open(io.cwd);
    const fresh: SnapResult[] = [];
    const failed: string[] = [];
    for (const old of saved) {
      const { url, selector, viewport, storageState, only = [] } = old;
      const dir = path.join(
        store.root,
        targetKey(url, selector),
        `${viewport.width}x${viewport.height}`,
      );
      try {
        const result = await snapOne({
          browser,
          flags: { ...flags, selector, storageState, only, stable: true },
          url,
          viewport,
          dir,
          commit: store.commit,
          cwd: io.cwd,
        });
        saveResult(dir, result);
        if (fingerprint(result) !== fingerprint(old)) fresh.push(result);
      } catch (error) {
        if (!(error instanceof CaptureError)) throw error;
        failed.push(error.message);
      }
    }
    const body = fresh
      .flatMap((result) => text(result, flags.all, result.only ?? []))
      .join('\n');
    if (hook) {
      if (fresh.length > 0)
        io.out(
          JSON.stringify({
            decision: 'block',
            reason: `pixsame: the page is not as it was when you last captured it.\n\n${body}\n\nIf these changes are what you meant, say so in your summary. If not, fix them and run \`pixsame snap\` again. This is shown once per change.`,
          }),
        );
      return 0;
    }
    if (failed.length > 0) io.out(failed.join('\n'));
    io.out(
      fresh.length > 0
        ? `Changed since last captured:\n${body}`
        : `${saved.length - failed.length} of ${saved.length} ${saved.length === 1 ? 'capture' : 'captures'} checked: nothing new.`,
    );
    return failed.length > 0 ? 2 : fresh.length > 0 ? 1 : 0;
  } catch (error) {
    if (!(error instanceof CaptureError)) throw error;
    if (hook) return 0;
    io.out(error.message);
    return 2;
  } finally {
    await browser?.close();
  }
};

/** `pixsame snap`; returns the exit code. `open` is the browser, replaceable in tests. */
export const snap = async (
  args: string[],
  io: Io,
  open: (cwd: string) => Promise<Browser> = openBrowser,
): Promise<number> => {
  let flags: Flags;
  try {
    flags = parse(args);
    if (flags.report) {
      if (flags.url) throw new Usage('--report takes no address.');
      return report(flags, io);
    }
    if (flags.hook !== undefined && (!flags.check || flags.hook !== 'claude'))
      throw new Usage('--hook goes with --check, and takes: claude');
    if (flags.check) {
      if (flags.url) throw new Usage('--check takes no address.');
      return await check(flags, io, open);
    }
    if (!flags.url)
      throw new Usage('snap needs an address: pixsame snap <url>');
    if (!/^(https?|file):\/\//.test(flags.url))
      throw new Usage(
        `${flags.url} is not an address. Give the full one, like http://localhost:3000/cart`,
      );
    if (flags.storageState && !fs.existsSync(flags.storageState))
      throw new Usage(`No storage state file at ${flags.storageState}.`);
  } catch (error) {
    if (!(error instanceof Usage)) throw error;
    io.out(`${error.message}\n\n${SNAP_HELP}`);
    return 2;
  }
  const url = flags.url;
  const store = openStore(io.cwd);
  const target = path.join(store.root, targetKey(url, flags.selector));
  if (flags.reset) fs.rmSync(target, { recursive: true, force: true });
  let browser: Browser | undefined;
  try {
    browser = await open(io.cwd);
    const results: SnapResult[] = [];
    for (const viewport of flags.viewports) {
      const dir = path.join(target, `${viewport.width}x${viewport.height}`);
      const result = await snapOne({
        browser,
        flags,
        url,
        viewport,
        dir,
        commit: store.commit,
        cwd: io.cwd,
      });
      saveResult(dir, result);
      results.push(result);
    }
    if (flags.keep)
      keep(store.root, {
        url,
        selector: flags.selector,
        viewports: flags.viewports,
      });
    if (flags.json) io.out(JSON.stringify(results, null, 2));
    else {
      if (store.startedOver)
        io.out('The commit changed, so earlier captures were dropped.');
      io.out(
        results
          .flatMap((result) => text(result, flags.all, flags.only))
          .join('\n'),
      );
      if (flags.keep)
        io.out(
          'Marked to become a test: `pixsame snap --report --json` lists it under "kept".',
        );
    }
    return results.some(({ outside }) => outside) ? 1 : 0;
  } catch (error) {
    if (!(error instanceof CaptureError)) throw error;
    io.out(error.message);
    return 2;
  } finally {
    await browser?.close();
  }
};
