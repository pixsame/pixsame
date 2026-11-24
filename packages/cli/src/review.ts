import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import {
  ANALYSIS_VERSION,
  layoutVersionOf,
  pinsOf,
  type Analysis,
  type Pin,
} from '@pixsame/analysis';
import type { approve as Approve } from 'visual-regression-compare' with {
  'resolution-mode': 'import',
};
import {
  findManifestFiles,
  readManifestFile,
  type ManifestEntry,
} from 'visual-regression-manifest';
import { reviewPage } from './review.page';

type Kind = 'baseline' | 'actual' | 'diff';

/** One comparison that needs a look, as the page shows it. */
export type Item = {
  id: string;
  name: string;
  /** The test it came from, e.g. `home.spec.ts › shows the banner`. */
  test: string;
  status: string;
  message: string;
  /** The analysis label and sentence, when the run recorded them. */
  label?: string;
  description?: string;
  /** The changes that have a place on the screenshot, numbered. */
  pins: Pin[];
  /** The changes that have none, and how many more there were, in words. */
  rest: string[];
  /** The baseline has no page layout of this version, so the description came from pixels. */
  oldBaseline: boolean;
  approved: boolean;
  images: Kind[];
};

type Source = {
  item: Item;
  manifest: string;
  entry: ManifestEntry;
  files: Partial<Record<Kind, string>>;
};

const NEEDS_LOOK = new Set(['failed', 'missing-baseline', 'approved']);
const IGNORED_DIRS = ['node_modules', '.git', '.next', 'dist'];

/** Every manifest entry that failed (or was approved from this page) below `roots`. */
export const loadItems = (roots: string[]): Source[] => {
  const sources: Source[] = [];
  const files = [
    ...new Set(
      roots.flatMap((root) =>
        findManifestFiles(root, { ignore: IGNORED_DIRS }),
      ),
    ),
  ];
  for (const manifestFile of files) {
    const manifest = readManifestFile(manifestFile);
    for (const entry of manifest.entries) {
      if (!NEEDS_LOOK.has(entry.status)) continue;
      const files: Source['files'] = {};
      for (const kind of ['baseline', 'actual', 'diff'] as const) {
        const rel = entry.images[kind]?.path;
        if (rel) files[kind] = path.resolve(manifest.projectRoot ?? '.', rel);
      }
      const analysis = (
        entry.extra as
          { pixsame?: { analysis?: Partial<Analysis> } } | undefined
      )?.pixsame?.analysis;
      const { pins, rest } = pinsOf(
        Array.isArray(analysis?.facts) ? (analysis as Analysis) : {},
      );
      const baselineBytes =
        files.baseline && fs.existsSync(files.baseline)
          ? fs.readFileSync(files.baseline)
          : undefined;
      sources.push({
        manifest: manifestFile,
        entry,
        files,
        item: {
          id: String(sources.length),
          name: entry.name,
          test: [entry.test?.filePath, ...(entry.test?.titlePath ?? [])]
            .filter(Boolean)
            .join(' › '),
          status: entry.status,
          message: entry.message ?? '',
          label: analysis?.label,
          description: analysis?.description,
          pins,
          rest,
          oldBaseline:
            baselineBytes !== undefined &&
            layoutVersionOf(baselineBytes) !== ANALYSIS_VERSION,
          approved: entry.status === 'approved',
          images: (['baseline', 'actual', 'diff'] as const).filter(
            (kind) => files[kind] && fs.existsSync(files[kind] as string),
          ),
        },
      });
    }
  }
  return sources;
};

// visual-regression-compare is ESM-only; a dynamic import keeps this CommonJS
const approve = async (options: Parameters<typeof Approve>[0]) =>
  (await import('visual-regression-compare')).approve(options);

const send = (
  res: http.ServerResponse,
  status: number,
  body: string | Buffer,
  type = 'text/plain; charset=utf-8',
) => {
  res.writeHead(status, {
    'content-type': type,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
  });
  res.end(body);
};

/**
 * The review page as one file to keep or to attach to a CI run: the failed
 * comparisons below `roots` with their images inside it. It shows the same
 * pins and lists; it cannot replace a baseline.
 */
export const reviewReport = (
  roots: string[],
): { html: string; count: number } => {
  const sources = loadItems(roots.map((root) => path.resolve(root)));
  const embedded = sources.map(({ item, files }) => ({
    ...item,
    data: Object.fromEntries(
      item.images.map((kind) => [
        kind,
        `data:image/png;base64,${fs.readFileSync(files[kind] as string).toString('base64')}`,
      ]),
    ),
  }));
  return { html: reviewPage('', embedded), count: sources.length };
};

export type Review = {
  url: string;
  items: () => Item[];
  close: () => Promise<void>;
};

/**
 * Serves the review page for the manifests below `roots` on this machine only.
 * Every address carries a random token, and a request must name the server's
 * own host, so a page in another tab cannot read the images or replace anything.
 */
export const startReview = async ({
  roots,
  port = 0,
  repoRoot = process.cwd(),
}: {
  roots: string[];
  port?: number;
  repoRoot?: string;
}): Promise<Review> => {
  const sources = loadItems(roots.map((root) => path.resolve(root)));
  const token = randomBytes(16).toString('hex');
  const base = `/${token}`;

  const server = http.createServer(async (req, res) => {
    const host = req.headers.host ?? '';
    const { port: actualPort } = server.address() as AddressInfo;
    if (
      host !== `127.0.0.1:${actualPort}` &&
      host !== `localhost:${actualPort}`
    )
      return send(res, 403, 'Forbidden');
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (!url.pathname.startsWith(`${base}/`) && url.pathname !== base)
      return send(res, 404, 'Not found');
    const route = url.pathname.slice(base.length) || '/';

    if (req.method === 'GET' && route === '/')
      return send(res, 200, reviewPage(base), 'text/html; charset=utf-8');
    if (req.method === 'GET' && route === '/api/items')
      return send(
        res,
        200,
        JSON.stringify(sources.map(({ item }) => item)),
        'application/json',
      );

    const image = /^\/img\/(\d+)\/(baseline|actual|diff)$/.exec(route);
    if (req.method === 'GET' && image) {
      const file = sources[Number(image[1])]?.files[image[2] as Kind];
      if (!file || !fs.existsSync(file)) return send(res, 404, 'Not found');
      return send(res, 200, fs.readFileSync(file), 'image/png');
    }

    const replace = /^\/api\/replace\/(\d+)$/.exec(route);
    if (req.method === 'POST' && replace) {
      const source = sources[Number(replace[1])];
      if (!source) return send(res, 404, 'Not found');
      if (source.item.approved)
        return send(res, 200, JSON.stringify(source.item), 'application/json');
      try {
        const result = await approve({
          manifests: [source.manifest],
          repoRoot,
          names: [source.entry.name],
          testFile: source.entry.test?.filePath,
        });
        const skipped = result.skipped.find(
          (s) => s.entry.name === source.entry.name,
        );
        if (skipped || result.approved.length === 0)
          return send(
            res,
            409,
            JSON.stringify({
              error: skipped?.reason ?? 'Nothing was replaced.',
            }),
            'application/json',
          );
        source.item.approved = true;
        source.item.status = 'approved';
        source.item.images = source.item.images.filter(
          (kind) => kind === 'baseline',
        );
        return send(res, 200, JSON.stringify(source.item), 'application/json');
      } catch (error) {
        return send(
          res,
          500,
          JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
          'application/json',
        );
      }
    }
    return send(res, 404, 'Not found');
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const { port: listening } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${listening}${base}/`,
    items: () => sources.map(({ item }) => item),
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  };
};
