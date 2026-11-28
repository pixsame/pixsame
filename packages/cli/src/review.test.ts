import { createHash } from 'node:crypto';
import http from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeLayout, type Layout } from '@pixsame/analysis';
import { run, type Io } from './cli';
import { reviewReport, startReview, type Review } from './review';
import { png } from './test-utils';

const template = await readFile(
  path.join(__dirname, '..', '__tests__', 'fixtures', 'manifest.json'),
  'utf8',
);
const layout: Layout = {
  size: { width: 10, height: 10 },
  scale: 1,
  count: 1,
  root: { tag: 'html', rect: [0, 0, 10, 10], kids: [] },
};
const sha = (bytes: Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');

let dir: string;
let review: Review | undefined;
const baselineBytes = png();
const actualBytes = writeLayout(png('FRSOURCE_CPVRD_V'), layout);

/** A finished run: a manifest, and the baseline, actual and diff it points at. */
const project = async ({
  hashes = true,
  analysis = {} as Record<string, unknown>,
} = {}) => {
  await mkdir(path.join(dir, 'shots'), { recursive: true });
  await writeFile(path.join(dir, 'shots', 'home_#0.png'), baselineBytes);
  await writeFile(path.join(dir, 'shots', 'home_#0.actual.png'), actualBytes);
  await writeFile(path.join(dir, 'shots', 'home_#0.diff.png'), png());
  const manifest = JSON.parse(template.replace('__PROJECT_ROOT__', dir));
  Object.assign(manifest.entries[0].extra.pixsame.analysis, analysis);
  if (hashes)
    manifest.entries[0].hashes = {
      baseline: sha(baselineBytes),
      actual: sha(actualBytes),
    };
  await writeFile(
    path.join(dir, 'visual-regression-manifest.test.json'),
    JSON.stringify(manifest),
  );
};

const start = async () => {
  review = await startReview({ roots: [dir], repoRoot: dir });
  return review;
};
const get = (url: string, init?: RequestInit) => fetch(url, init);

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'pixsame-review-'));
});
afterEach(async () => {
  await review?.close();
  review = undefined;
  await rm(dir, { recursive: true, force: true });
});

describe('review server', () => {
  it('lists the failed comparisons with what the analysis said', async () => {
    await project();
    const { url, items } = await start();
    expect(items()).toHaveLength(1);
    const list = (await (await get(`${url}api/items`)).json()) as ReturnType<
      Review['items']
    >;
    expect(list[0]).toMatchObject({
      name: 'home_#0',
      test: 'home.spec.ts › home › shows the banner',
      status: 'failed',
      label: 'moved-and-changed',
      description:
        '3 elements moved down by 40 px. Changed: added div.promo "Free shipping".',
      // the fixture's analysis has no facts
      pins: [],
      rest: [],
      // the baseline fixture has no layout
      oldBaseline: true,
      approved: false,
      images: ['baseline', 'actual', 'diff'],
    });
  });

  it('gives each change of the analysis a place on the image', async () => {
    await project({
      analysis: {
        scale: 2,
        factsOmitted: 2,
        facts: [
          {
            type: 'element',
            kinds: ['added'],
            element: 'div.promo',
            rect: [1, 2, 3, 4],
            text: 'added div.promo',
          },
          { type: 'pixels', label: 'x', text: 'no place for this one' },
        ],
      },
    });
    const { items } = await start();
    expect(items()[0]).toMatchObject({
      pins: [
        {
          number: 1,
          kind: 'added',
          side: 'actual',
          boxes: [{ x: 2, y: 4, width: 6, height: 8 }],
          text: 'added div.promo',
        },
      ],
      rest: ['no place for this one', '2 more changes are not shown.'],
    });
  });

  it('writes the page as one file that asks no server for anything', async () => {
    await project({
      analysis: {
        facts: [
          {
            type: 'element',
            kinds: ['added'],
            element: 'div.promo',
            rect: [1, 2, 3, 4],
            text: 'added </script><b>div.promo',
          },
        ],
      },
    });
    const { html, count } = reviewReport([dir]);
    expect(count).toBe(1);
    expect(html).toContain('<title>pixsame report</title>');
    expect(html).toContain(
      `data:image/png;base64,${Buffer.from(actualBytes).toString('base64')}`,
    );
    // a text from the page cannot end the script it is embedded in
    expect(html).toContain('added \\u003c/script>\\u003cb>div.promo');
    expect(html.match(/<\/script>/g)).toHaveLength(1);

    const lines: string[] = [];
    const code = await run(['review', dir, '--out', 'out/report.html'], {
      out: (line) => void lines.push(line),
      exec: async () => 0,
      open: () => undefined,
      wait: async () => undefined,
      cwd: dir,
    });
    expect(code).toBe(0);
    expect(lines).toEqual(['1 failed comparison written to out/report.html']);
    expect(await readFile(path.join(dir, 'out', 'report.html'), 'utf8')).toBe(
      html,
    );
  });

  it('serves the page and the images, but only at the secret address', async () => {
    await project();
    const { url } = await start();
    const page = await get(url);
    expect(page.headers.get('content-type')).toContain('text/html');
    expect(await page.text()).toContain('pixsame review');
    const image = await get(`${url}img/0/actual`);
    expect(image.headers.get('content-type')).toBe('image/png');
    expect(Buffer.from(await image.arrayBuffer()).equals(actualBytes)).toBe(
      true,
    );

    const origin = new URL(url).origin;
    expect((await get(`${origin}/`)).status).toBe(404);
    expect((await get(`${origin}/nope/api/items`)).status).toBe(404);
    expect((await get(`${url}img/9/actual`)).status).toBe(404);
    // another site cannot reach it by a name that resolves here
    const { port } = new URL(url);
    const status = await new Promise<number | undefined>((resolve) => {
      http
        .get(
          {
            host: '127.0.0.1',
            port,
            path: new URL(url).pathname + 'api/items',
            headers: { host: 'evil.example' },
          },
          (res) => (res.resume(), resolve(res.statusCode)),
        )
        .on('error', () => resolve(undefined));
    });
    expect(status).toBe(403);
  });

  it('replaces the baseline with the actual image and marks the entry approved', async () => {
    await project();
    const { url, items } = await start();
    const res = await get(`${url}api/replace/0`, { method: 'POST' });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      approved: true,
      status: 'approved',
    });
    expect(items()[0].approved).toBe(true);
    expect(await readFile(path.join(dir, 'shots', 'home_#0.png'))).toEqual(
      actualBytes,
    );
    expect(existsSync(path.join(dir, 'shots', 'home_#0.actual.png'))).toBe(
      false,
    );
    const manifest = JSON.parse(
      await readFile(
        path.join(dir, 'visual-regression-manifest.test.json'),
        'utf8',
      ),
    );
    expect(manifest.entries[0].status).toBe('approved');
    // a second click changes nothing
    expect((await get(`${url}api/replace/0`, { method: 'POST' })).status).toBe(
      200,
    );
  });

  it('refuses to replace a baseline that changed since the run', async () => {
    await project();
    await writeFile(path.join(dir, 'shots', 'home_#0.png'), png('changed'));
    const { url } = await start();
    const res = await get(`${url}api/replace/0`, { method: 'POST' });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: string }).error).toMatch(
      /changed since the run/,
    );
    expect(await readFile(path.join(dir, 'shots', 'home_#0.png'))).toEqual(
      png('changed'),
    );
  });

  it('does not accept GET for replace or an unknown entry', async () => {
    await project();
    const { url } = await start();
    expect((await get(`${url}api/replace/0`)).status).toBe(404);
    expect((await get(`${url}api/replace/5`, { method: 'POST' })).status).toBe(
      404,
    );
  });
});

describe('pixsame review', () => {
  const session = () => {
    const out: string[] = [];
    const opened: string[] = [];
    const io: Io = {
      cwd: dir,
      out: (line) => void out.push(line),
      exec: async () => 0,
      open: (url) => void opened.push(url),
      wait: async () => undefined,
    };
    return { io, out, opened, text: () => out.join('\n') };
  };

  it('prints the address, opens it and stops when told to', async () => {
    await project();
    const s = session();
    expect(await run(['review'], s.io)).toBe(0);
    expect(s.text()).toMatch(
      /1 comparison to look at: http:\/\/127\.0\.0\.1:\d+\/[0-9a-f]{32}\//,
    );
    expect(s.opened).toHaveLength(1);
  });

  it('does not open a browser with --no-open', async () => {
    await project();
    const s = session();
    await run(['review', '--no-open'], s.io);
    expect(s.opened).toEqual([]);
  });

  it('says so when no run left failures, and rejects bad options', async () => {
    const none = session();
    expect(await run(['review'], none.io)).toBe(0);
    expect(none.text()).toContain('No failed comparisons found');
    expect(none.opened).toEqual([]);
    expect(await run(['review', '--bogus'], session().io)).toBe(1);
    expect(await run(['review', '--port', 'x'], session().io)).toBe(2);
  });
});
