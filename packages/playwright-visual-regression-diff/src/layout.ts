import { snapshotLayout, type Layout } from '@pixsame/analysis';
import type { Locator, Page } from '@playwright/test';

/** Width in pixels of a PNG, from its header. */
const pngWidth = (png: Buffer): number | undefined =>
  png.length >= 24 && png.readUInt32BE(12) === 0x49484452
    ? png.readUInt32BE(16)
    : undefined;

/**
 * What the page looks like right after `target` was screenshotted, in the
 * coordinates of that screenshot. `undefined` when it cannot be mapped to the
 * image (a `clip`) or the page cannot be read; analysis then uses the pixels
 * alone. It never throws: a snapshot must not fail a test.
 */
export const captureLayout = async ({
  page,
  target,
  png,
  fullPage,
  clip,
}: {
  page: Page;
  target: Page | Locator;
  png: Buffer;
  fullPage?: boolean;
  clip?: unknown;
}): Promise<Layout | undefined> => {
  try {
    if (clip) return undefined;
    const imageWidth = pngWidth(png);
    if (!imageWidth) return undefined;
    let origin: [number, number];
    let size: { width: number; height: number };
    if (target === page) {
      if (fullPage) {
        // a string: this package has no DOM typings
        const doc = (await page.evaluate(
          `({ scroll: [window.scrollX, window.scrollY], width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight })`,
        )) as { scroll: [number, number]; width: number; height: number };
        origin = [-doc.scroll[0], -doc.scroll[1]];
        size = { width: doc.width, height: doc.height };
      } else {
        const view = page.viewportSize();
        if (!view) return undefined;
        origin = [0, 0];
        size = view;
      }
    } else {
      // the screenshot scrolled the element into view
      const box = await (target as Locator).boundingBox();
      if (!box) return undefined;
      origin = [box.x, box.y];
      size = { width: box.width, height: box.height };
    }
    if (size.width <= 0) return undefined;
    const raw = await page.evaluate(snapshotLayout, origin);
    return {
      size,
      // measured from the image: device scale, `scale: 'css'` and cropping all show up here
      scale: imageWidth / size.width,
      count: raw.count,
      root: raw.root,
    };
  } catch {
    return undefined;
  }
};
