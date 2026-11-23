import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import type { Io } from '../io';
import { openBrowser, type Browser } from './capture';
import { snap, targetKey, type SnapResult } from './snap';

const page = (body: string) => `<!doctype html>
<html><head><style>
  body { margin: 0; font: 16px/1.5 Arial, sans-serif; background: #fff; }
  h1 { margin: 20px; font-size: 32px; }
  .card { margin: 20px; width: 300px; height: 80px; background: #1e5ac8; }
  .promo { margin: 20px; width: 300px; height: 40px; background: #f0c800; }
  canvas { margin: 20px; display: block; }
</style></head><body>${body}</body></html>`;

const START = page('<h1>Welcome</h1><div class="card"></div>');

let html = START;
let server: http.Server;
let origin: string;
// one Chrome for the whole file; each run gets it through `open`
let shared: Browser;
let dir: string;
let lines: string[];

const io = (): Io => ({
  out: (line) => void lines.push(line),
  exec: async () => 0,
  open: () => undefined,
  wait: async () => undefined,
  cwd: dir,
});

const run = async (...args: string[]) => {
  lines = [];
  const code = await snap(args, io(), async () => ({
    capture: shared.capture,
    close: async () => undefined,
  }));
  return { code, text: lines.join('\n') };
};

const json = async (...args: string[]) => {
  const { text } = await run(...args, '--json');
  return (JSON.parse(text) as SnapResult[])[0];
};

beforeAll(async () => {
  server = http.createServer((_, response) => {
    response.setHeader('content-type', 'text/html');
    response.end(html);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
  shared = await openBrowser(process.cwd());
}, 60_000);

afterAll(async () => {
  await shared?.close();
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  html = START;
  dir = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'pixsame-snap-')),
  );
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('snap', { timeout: 60_000 }, () => {
  it('saves the first capture and has nothing to compare', async () => {
    const { code, text } = await run(origin);
    expect(code).toBe(0);
    expect(text).toContain('first capture saved');
    const snaps = path.join(dir, '.pixsame', 'snaps');
    expect(fs.readFileSync(path.join(snaps, '.gitignore'), 'utf8')).toBe('*\n');
    expect(
      fs.existsSync(
        path.join(snaps, targetKey(origin), '1280x800', 'before.png'),
      ),
    ).toBe(true);
  });

  it('says nothing changed when nothing did', async () => {
    await run(origin);
    const { code, text } = await run(origin);
    expect(code).toBe(0);
    expect(text).toContain('no change since the first capture.');
  });

  it('names a changed text, an added element and what it pushed down', async () => {
    await run(origin);
    html = page(
      '<h1>Welcome back</h1><div class="promo"></div><div class="card"></div>',
    );
    const { text } = await run(origin);
    expect(text).toContain('3 changes since the first capture');
    expect(text).toContain('text changed on h1: "Welcome" → "Welcome back"');
    expect(text).toContain('added div.promo');
    expect(text).toContain('1 element moved down by 60 px: div.card');
  });

  it('keeps comparing with the first capture, not the last one', async () => {
    await run(origin);
    html = page('<h1>Welcome back</h1><div class="card"></div>');
    await run(origin);
    html = START;
    expect((await run(origin)).text).toContain('no change');
  });

  it('takes a new first capture with --reset', async () => {
    await run(origin);
    html = page('<h1>Welcome back</h1><div class="card"></div>');
    expect((await run(origin, '--reset')).text).toContain(
      'first capture saved',
    );
    expect((await run(origin)).text).toContain('no change');
  });

  it('leaves out what changes by itself and says so', async () => {
    html = page(
      `<h1>Welcome</h1><div class="card"></div><p id="clock" style="margin:20px"></p>
       <script>const tick = () => { document.getElementById('clock').textContent = String(performance.now()); }; tick(); setInterval(tick, 50);</script>`,
    );
    await run(origin);
    const { text } = await run(origin);
    expect(text).toContain('no change since the first capture.');
    expect(text).toContain('Left out, it changes by itself');
  });

  it('writes crops for pixels the layout cannot explain', async () => {
    const canvas = (color: string) =>
      page(
        `<canvas width="100" height="60"></canvas><script>const c = document.querySelector('canvas').getContext('2d'); c.fillStyle = '${color}'; c.fillRect(0, 0, 100, 60);</script>`,
      );
    html = canvas('#c81e1e');
    await run(origin);
    html = canvas('#1ec81e');
    const result = await json(origin);
    expect(result.status).toBe('changed');
    const area = result.facts.find(({ type }) => type === 'area');
    expect(area?.text).toContain('on canvas');
    expect(result.files.crops).toHaveLength(1);
    expect(fs.existsSync(path.join(dir, result.files.crops[0].after))).toBe(
      true,
    );
  });

  it('names styles a screenshot hardly shows, and shadows as part of their element', async () => {
    await run(origin);
    html = page(
      '<h1 style="letter-spacing: 1px; opacity: 0.6">Welcome</h1><div class="card" style="box-shadow: 0 6px 16px rgba(0,0,0,.35)"></div>',
    );
    const { text } = await run(origin);
    expect(text).toContain('2 changes since the first capture');
    expect(text).toContain('letter-spacing normal → 1px');
    expect(text).toContain('opacity 1 → 0.6');
    expect(text).toContain(
      'div.card: box-shadow none → rgba(0, 0, 0, 0.35) 0px 6px 16px 0px',
    );
    expect(text).not.toContain('does not say why');
  });

  it('names a style that only shows on what the element holds, and folds what went with it', async () => {
    html = page(
      '<h1>Welcome</h1><div id="group"><div class="card"></div><div class="promo"></div></div><p id="note" style="margin:20px">Thanks for coming</p><section id="gone" style="margin:20px"><p>One</p><p>Two</p></section>',
    );
    await run(origin);
    html = page(
      '<h1>Welcome</h1><div id="group" style="opacity:0.5"><div class="card"></div><div class="promo"></div></div><p id="note" style="margin:20px;text-align:right">Thanks for coming</p><section id="gone" style="margin:20px;visibility:hidden"><p>One</p><p>Two</p></section>',
    );
    const { text } = await run(origin);
    expect(text).toContain('3 changes since the first capture');
    expect(text).toContain('div#group: opacity 1 → 0.5');
    expect(text).toContain(
      'p#note "Thanks for coming": text-align start → right',
    );
    expect(text).toContain(
      'removed section#gone with the 2 elements inside it',
    );
  });

  it('names a transform once, on the element that has it', async () => {
    await run(origin);
    html = page(
      '<h1>Welcome</h1><div class="card" style="transform: rotate(-3deg)"><p>Inside</p></div>',
    );
    html = html.replace('<div class="card" style', '<div class="card" style');
    const before = page(
      '<h1>Welcome</h1><div class="card"><p>Inside</p></div>',
    );
    const after = html;
    html = before;
    await run(origin, '--reset');
    html = after;
    const { text } = await run(origin);
    expect(text).toContain('1 change since the first capture');
    expect(text).toMatch(/div\.card: transform none → matrix\(/);
  });

  it('reports what the layout names on an element whose pixels flicker', async () => {
    const noisy = (style = '') =>
      page(
        `<h1>Welcome</h1><canvas id="noise" width="200" height="60" style="${style}"></canvas>
         <script>const c = document.getElementById('noise').getContext('2d'); const draw = () => { for (let x = 0; x < 200; x += 4) { c.fillStyle = 'hsl(' + Math.random() * 360 + ' 80% 50%)'; c.fillRect(x, 0, 4, 60); } }; draw(); setInterval(draw, 10);</script>`,
      );
    html = noisy();
    await run(origin);
    expect((await run(origin)).text).toContain(
      'no change since the first capture.',
    );
    html = noisy('opacity: 0.5');
    const { text } = await run(origin);
    expect(text).toContain(
      "canvas#noise: opacity 1 → 0.5 (from the page's layout alone: the pixels there change by themselves)",
    );
    expect(text).toContain('Left out, it changes by itself');
  });

  it('reports a change too faint for a test to count, and says it is', async () => {
    await run(origin);
    // one step of blue: far under any threshold, and still what the edit did
    html = page(
      '<h1>Welcome</h1><div class="card" style="background: #1e5ac9"></div>',
    );
    const { code, text } = await run(origin, '--only', 'h1');
    expect(text).toContain(
      'div.card: background-color rgb(30, 90, 200) → rgb(30, 90, 201) (faint: the pixels differ by less than a test counts)',
    );
    expect(code).toBe(1);
  });

  it('writes crops for a look no style names', async () => {
    await run(origin);
    html = page(
      '<h1>Welcome</h1><div class="card" style="clip-path: circle(40%)"></div>',
    );
    const result = await json(origin);
    expect(result.facts.map((fact) => fact.text)).toEqual([
      'look changed on div.card',
    ]);
    expect(result.files.crops).toHaveLength(1);
    expect(fs.existsSync(path.join(dir, result.files.crops[0].before))).toBe(
      true,
    );
    expect((await run(origin)).text).toMatch(
      /look changed on div\.card; see .*area-1\.before\.png and .*area-1\.after\.png/,
    );
  });

  it('captures one element with --selector', async () => {
    await run(origin, '--selector', '.card');
    html = page('<h1>Welcome back</h1><div class="card"></div>');
    // the heading is outside the element
    expect((await run(origin, '--selector', '.card')).text).toContain(
      'no change',
    );
    html = page(
      '<h1>Welcome</h1><div class="card" style="background:#c81e1e"></div>',
    );
    expect((await run(origin, '--selector', '.card')).text).toContain(
      'div.card: background-color rgb(30, 90, 200) → rgb(200, 30, 30)',
    );
  });

  it('captures each --viewport on its own', async () => {
    const { text } = await run(
      origin,
      '--viewport',
      '400x600',
      '--viewport',
      '800x600',
    );
    expect(text).toContain('at 400x600: first capture');
    expect(text).toContain('at 800x600: first capture');
  });

  it('prints the first 100 changes unless --all', async () => {
    const spans = (word: string) =>
      page(
        Array.from(
          { length: 120 },
          (_, i) =>
            `<p style="display:inline-block;width:100px;margin:0">${word} ${i}</p>`,
        ).join(''),
      );
    html = spans('a');
    await run(origin);
    html = spans('b');
    const capped = (await run(origin)).text;
    expect(capped).toContain('120 changes');
    expect(capped).toContain('20 more, use --all');
    expect(capped.split('\n').filter((l) => l.startsWith('  - '))).toHaveLength(
      100,
    );
    expect((await run(origin, '--all')).text).not.toContain('more, use --all');
  });

  it('starts over when the commit changed', async () => {
    const git = (...args: string[]) =>
      execFileSync(
        'git',
        [
          '-c',
          'user.name=t',
          '-c',
          'user.email=t@t.t',
          '-c',
          'commit.gpgsign=false',
          ...args,
        ],
        { cwd: dir, stdio: 'ignore' },
      );
    git('init');
    git('commit', '--allow-empty', '-m', 'one');
    expect((await run(origin)).text).toContain('first capture saved');
    expect((await run(origin)).text).toMatch(
      /no change since the first capture on commit [0-9a-f]{7}\./,
    );
    git('commit', '--allow-empty', '-m', 'two');
    const { text } = await run(origin);
    expect(text).toContain('The commit changed');
    expect(text).toContain('first capture saved');
  });

  it('says what is wrong with the command', async () => {
    expect(await run()).toMatchObject({ code: 2 });
    expect((await run('localhost:3000')).text).toContain('is not an address');
    expect((await run(origin, '--viewport', 'big')).text).toContain(
      '--viewport needs a size',
    );
    expect((await run(origin, '--nope')).text).toContain('Unknown option');
    expect((await run(origin, '--selector')).text).toContain('needs a value');
    expect(
      (await run(origin, '--storage-state', path.join(dir, 'none.json'))).text,
    ).toContain('No storage state file');
  });

  it('says when the selector matches nothing or the page is not there', async () => {
    const missing = await run(origin, '--selector', '.nope');
    expect(missing.code).toBe(2);
    expect(missing.text).toContain('matches .nope');
    const down = await run('http://127.0.0.1:9/');
    expect(down.code).toBe(2);
    expect(down.text).toContain('Is the dev server running?');
  });
  describe('--only', () => {
    const shop = (promoHeight: number, heading = 'Welcome', margin = 20) =>
      page(
        `<h1 style="margin-bottom:${margin}px">${heading}</h1><div class="promo" style="height:${promoHeight}px"></div><div class="card"></div>`,
      );

    it('exits with 0 when only that element changed, and what it pushed', async () => {
      html = shop(40);
      await run(origin);
      html = shop(80);
      const { code, text } = await run(origin, '--only', '.promo');
      expect(text).toContain('all on .promo or caused by it');
      expect(text).toContain('1 element moved down by 40 px: div.card');
      expect(text).not.toContain('OUTSIDE');
      expect(code).toBe(0);
    });

    it('exits with 1 and names what else changed, first', async () => {
      html = shop(40);
      await run(origin);
      html = shop(80, 'Welcome back');
      const { code, text } = await run(origin, '--only', '.promo');
      expect(code).toBe(1);
      expect(text).toContain('1 of them NOT on .promo');
      expect(text.split('\n')[1]).toBe(
        '  - OUTSIDE: text changed on h1: "Welcome" → "Welcome back"',
      );
      expect((await json(origin, '--only', '.promo')).outside).toBe(1);
    });

    it('exits with 1 when something else moved the element', async () => {
      html = shop(40);
      await run(origin);
      html = shop(40, 'Welcome', 36);
      const { code, text } = await run(origin, '--only', '.promo');
      expect(code).toBe(1);
      expect(text).toContain(
        'OUTSIDE: h1 "Welcome": margin-bottom 20px → 36px',
      );
      expect(text).toContain('OUTSIDE: 2 elements moved down by 16 px');
    });

    it('exits with 0 when the element moved by its own margin', async () => {
      const own = (margin: number) =>
        page(
          `<h1>Welcome</h1><div class="promo" style="margin-top:${margin}px"></div><div class="card"></div>`,
        );
      html = own(20);
      await run(origin);
      html = own(44);
      const { code, text } = await run(origin, '--only', '.promo');
      expect(text).toContain('div.promo: margin-top 20px → 44px');
      expect(text).toContain('2 elements moved down by 24 px');
      expect(text).not.toContain('OUTSIDE');
      expect(code).toBe(0);
    });

    it('needs the element to be there', async () => {
      await run(origin);
      const { code, text } = await run(origin, '--only', '.nope');
      expect(code).toBe(2);
      expect(text).toContain('matches .nope');
    });
  });
  describe('--report and --keep', () => {
    it('reports every captured page as Markdown, what was not meant first', async () => {
      const shop = (promoHeight: number, heading = 'Welcome') =>
        page(
          `<h1>${heading}</h1><div class="promo" style="height:${promoHeight}px"></div><div class="card"></div>`,
        );
      html = shop(40);
      await run(origin);
      await run(origin, '--selector', '.card');
      html = shop(80, 'Welcome back');
      await run(origin, '--only', '.promo');
      await run(origin, '--selector', '.card');
      const { code, text } = await run('--report');
      expect(code).toBe(0);
      expect(text).toContain('### Visual check');
      expect(text).toContain(
        `- \`${origin}\` at 1280x800: 3 changes, 1 of them not on \`.promo\``,
      );
      const lines = text.split('\n');
      expect(
        lines[lines.findIndex((line) => line.includes('3 changes')) + 1],
      ).toBe(
        '  - **Elsewhere:** text changed on h1: "Welcome" → "Welcome back"',
      );
      expect(text).toContain(
        `- \`${origin}\` \`.card\` at 1280x800: no change.`,
      );
    });

    it('says so when nothing was captured', async () => {
      expect((await run('--report')).text).toContain('No page was captured.');
      expect((await run('--report', origin)).code).toBe(2);
    });

    it('lists what --keep marked, also after a commit', async () => {
      const git = (...args: string[]) =>
        execFileSync(
          'git',
          [
            '-c',
            'user.name=t',
            '-c',
            'user.email=t@t.t',
            '-c',
            'commit.gpgsign=false',
            ...args,
          ],
          { cwd: dir, stdio: 'ignore' },
        );
      git('init');
      git('commit', '--allow-empty', '-m', 'one');
      expect(
        (await run(origin, '--selector', '.card', '--keep')).text,
      ).toContain('Marked to become a test');
      await run(origin, '--selector', '.card', '--keep');
      git('commit', '--allow-empty', '-m', 'two');
      await run(origin);
      const { text } = await run('--report', '--json');
      expect(JSON.parse(text)).toMatchObject({
        kept: [
          {
            url: origin,
            selector: '.card',
            viewports: [{ width: 1280, height: 800 }],
          },
        ],
        results: [{ url: origin, status: 'first' }],
      });
      expect((await run('--report')).text).toContain('Marked to become tests:');
    });
  });
  describe('--check', () => {
    const changed = page('<h1>Welcome back</h1><div class="card"></div>');

    it('has nothing to say when nothing was captured or nothing is new', async () => {
      expect(await run('--check')).toMatchObject({
        code: 0,
        text: 'No page was captured since the last commit.',
      });
      await run(origin);
      expect(await run('--check')).toMatchObject({
        code: 0,
        text: '1 of 1 capture checked: nothing new.',
      });
    });

    it('reports a change nobody captured, once', async () => {
      await run(origin);
      await run(origin, '--selector', '.card');
      html = changed;
      const first = await run('--check');
      expect(first.code).toBe(1);
      expect(first.text).toContain('Changed since last captured:');
      expect(first.text).toContain('text changed on h1');
      // the element capture did not change
      expect(first.text).not.toContain('.card at');
      expect(await run('--check')).toMatchObject({ code: 0 });
    });

    it('stays quiet about a change that was already shown', async () => {
      await run(origin);
      html = changed;
      await run(origin);
      expect(await run('--check')).toMatchObject({ code: 0 });
    });

    it('checks with the options of the last capture', async () => {
      html = page('<h1>Welcome</h1><div class="promo"></div>');
      await run(origin, '--only', '.promo');
      html = page('<h1>Welcome back</h1><div class="promo"></div>');
      expect((await run('--check')).text).toContain(
        'OUTSIDE: text changed on h1',
      );
    });

    it('answers as a Claude Code Stop hook', async () => {
      await run(origin);
      expect(await run('--check', '--hook', 'claude')).toEqual({
        code: 0,
        text: '',
      });
      html = changed;
      const { code, text } = await run('--check', '--hook', 'claude');
      expect(code).toBe(0);
      const answer = JSON.parse(text) as { decision: string; reason: string };
      expect(answer.decision).toBe('block');
      expect(answer.reason).toContain('text changed on h1');
      expect(await run('--check', '--hook', 'claude')).toEqual({
        code: 0,
        text: '',
      });
    });

    it('never holds the agent up when the page cannot be opened', async () => {
      const gone = 'http://127.0.0.1:9/';
      const snaps = path.join(dir, '.pixsame', 'snaps');
      const at = path.join(snaps, targetKey(gone), '1280x800');
      fs.mkdirSync(at, { recursive: true });
      fs.writeFileSync(
        path.join(snaps, 'session.json'),
        JSON.stringify({ commit: null }),
      );
      fs.writeFileSync(
        path.join(at, 'result.json'),
        JSON.stringify({
          url: gone,
          viewport: { width: 1280, height: 800 },
          status: 'first',
          commit: null,
          facts: [],
          unstable: [],
          files: { before: 'before.png', crops: [] },
        }),
      );
      expect(await run('--check', '--hook', 'claude')).toEqual({
        code: 0,
        text: '',
      });
      const plain = await run('--check');
      expect(plain.code).toBe(2);
      expect(plain.text).toContain('Is the dev server running?');
    });

    it('says what is wrong with the options', async () => {
      expect((await run('--check', origin)).text).toContain(
        '--check takes no address',
      );
      expect((await run(origin, '--hook', 'claude')).text).toContain(
        '--hook goes with --check',
      );
      expect((await run('--check', '--hook', 'other')).code).toBe(2);
    });
  });
});
