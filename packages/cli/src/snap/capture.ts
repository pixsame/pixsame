import { createRequire } from 'node:module';
import path from 'node:path';
import { pngSize, type Layout, type Rect } from '@pixsame/analysis';
import { snapshotLayout } from '@pixsame/analysis/snapshot';

export type Viewport = { width: number; height: number };

/** One screenshot and what the page looked like when it was taken. */
export type Shot = {
  png: Uint8Array;
  layout?: Layout;
  /** For each selector of `marks`: where its elements are in the screenshot, in CSS pixels. */
  marks?: Record<string, Rect[]>;
};

export type CaptureInput = {
  url: string;
  selector?: string;
  viewport: Viewport;
  /** A Playwright storage state file: the cookies and local storage of a signed-in session. */
  storageState?: string;
  /** Take a second screenshot a moment later, to find what changes by itself. */
  twice: boolean;
  /** Selectors of elements to find in the screenshot. */
  marks?: string[];
};

export type Browser = {
  /** One shot, or two when `twice`. Throws `CaptureError` with a message for the user. */
  capture: (input: CaptureInput) => Promise<Shot[]>;
  close: () => Promise<void>;
};

/** A failure the user can act on; its message is printed as it is. */
export class CaptureError extends Error {}

/** Between the two screenshots: long enough for a carousel, a clock or a late font to show. */
const SETTLE_MS = 300;
const IDLE_TIMEOUT_MS = 3000;

// the parts of playwright-core this uses; the package is loaded at run time
type Locator = {
  screenshot: (options: object) => Promise<Buffer>;
  boundingBox: () => Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>;
  count: () => Promise<number>;
  first: () => Locator;
};
type Page = {
  goto: (url: string, options: object) => Promise<unknown>;
  evaluate: <T, A>(fn: ((arg: A) => T) | string, arg?: A) => Promise<T>;
  waitForLoadState: (state: string, options: object) => Promise<void>;
  waitForTimeout: (ms: number) => Promise<void>;
  screenshot: (options: object) => Promise<Buffer>;
  locator: (selector: string) => Locator;
};
type Context = { newPage: () => Promise<Page>; close: () => Promise<void> };
type Launched = {
  newContext: (options: object) => Promise<Context>;
  close: () => Promise<void>;
};
type Chromium = { launch: (options?: object) => Promise<Launched> };

/** Playwright from the project when it has one, otherwise the one this package depends on. */
const loadChromium = (cwd: string): Chromium => {
  const fromProject = createRequire(path.join(cwd, 'package.json'));
  for (const load of [fromProject, require]) {
    for (const name of ['playwright-core', 'playwright', '@playwright/test']) {
      try {
        const { chromium } = load(name) as { chromium?: Chromium };
        if (chromium) return chromium;
      } catch {
        // not there: try the next one
      }
    }
  }
  throw new CaptureError(
    'playwright-core is not installed. Add it: npm install --save-dev playwright-core',
  );
};

const SCREENSHOT = { animations: 'disabled', caret: 'hide', scale: 'css' };

const layoutOf = async (
  page: Page,
  png: Uint8Array,
  origin: [number, number],
  size: Viewport,
): Promise<Layout | undefined> => {
  try {
    const image = pngSize(png);
    if (!image) return undefined;
    const raw = await page.evaluate(snapshotLayout, {
      origin,
      area: [size.width, size.height] as [number, number],
    });
    return {
      size,
      // measured from the image, as the test adapters do
      scale: image.width / size.width,
      count: raw.count,
      root: raw.root,
    };
  } catch {
    // a page that cannot be read is still compared by its pixels
    return undefined;
  }
};

/**
 * Starts the Chrome that is installed on the machine (no download); when
 * there is none, a Chromium that Playwright installed.
 */
export const openBrowser = async (cwd: string): Promise<Browser> => {
  const chromium = loadChromium(cwd);
  let launched: Launched;
  try {
    launched = await chromium.launch({ channel: 'chrome' });
  } catch {
    try {
      launched = await chromium.launch();
    } catch {
      throw new CaptureError(
        'No browser to take the screenshot with. Install Google Chrome, or run: npx playwright install chromium',
      );
    }
  }
  return {
    close: () => launched.close(),
    capture: async ({
      url,
      selector,
      viewport,
      storageState,
      twice,
      marks,
    }) => {
      const context = await launched.newContext({
        viewport,
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
        ...(storageState && { storageState }),
      });
      try {
        const page = await context.newPage();
        try {
          await page.goto(url, { waitUntil: 'load' });
        } catch (error) {
          throw new CaptureError(
            `Could not open ${url}: ${error instanceof Error ? error.message.split('\n')[0] : error}. Is the dev server running?`,
          );
        }
        await page
          .waitForLoadState('networkidle', { timeout: IDLE_TIMEOUT_MS })
          .catch(() => undefined);
        await page
          .evaluate('document.fonts.ready.then(() => true)')
          .catch(() => undefined);
        const matches = selector ? page.locator(selector) : undefined;
        const target = matches?.first();
        if (matches && (await matches.count()) === 0) {
          throw new CaptureError(`Nothing on ${url} matches ${selector}.`);
        }
        const marksAt = async ([x, y]: [number, number]) => {
          if (!marks?.length) return undefined;
          const found: Record<string, Rect[]> = {};
          for (const mark of marks) {
            let rects: Rect[];
            try {
              // a string: this package has no DOM typings
              rects = await page.evaluate<Rect[], undefined>(
                `[...document.querySelectorAll(${JSON.stringify(mark)})].map((element) => { const r = element.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })`,
              );
            } catch {
              throw new CaptureError(`${mark} is not a selector.`);
            }
            found[mark] = rects.map(([rx, ry, w, h]) => [rx - x, ry - y, w, h]);
          }
          return found;
        };
        const shoot = async (): Promise<Shot> => {
          const png = await (target ?? page).screenshot(SCREENSHOT);
          if (!target) {
            return {
              png,
              layout: await layoutOf(page, png, [0, 0], viewport),
              marks: await marksAt([0, 0]),
            };
          }
          // the screenshot scrolled the element into view
          const box = await target.boundingBox();
          return {
            png,
            layout:
              box && box.width > 0
                ? await layoutOf(page, png, [box.x, box.y], {
                    width: box.width,
                    height: box.height,
                  })
                : undefined,
            marks: box ? await marksAt([box.x, box.y]) : undefined,
          };
        };
        const first = await shoot();
        if (!twice) return [first];
        await page.waitForTimeout(SETTLE_MS);
        return [first, await shoot()];
      } finally {
        await context.close();
      }
    },
  };
};
