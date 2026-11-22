import type { LayoutNode } from '@pixsame/analysis';
import { snapshotLayout, type RawLayout } from '@pixsame/analysis/snapshot';

/** What the browser sends to the plugin for one screenshot; the plugin adds the scale once it sees the image. */
export type LayoutPayload = {
  size: { width: number; height: number };
  count: number;
  root: LayoutNode;
};

type Placement = {
  origin: [number, number];
  size: { width: number; height: number };
};

type Options = {
  /** The element of `cy.get(...).matchImage()`. */
  subject?: HTMLElement;
  /** `cy.screenshot`'s `capture`; Cypress's default is `fullPage`. */
  capture?: string;
  clip?: unknown;
};

// a rectangle that is this much taller than the window still fits it
const SLACK = 1;

/**
 * Where the screenshot's top left is in the page and how large its area is, in
 * CSS pixels. `undefined` when one snapshot cannot describe the picture:
 * Cypress stitches full-page captures and elements taller than the window
 * from several scroll positions, so those are left to the pixels alone, and
 * so is a `clip` or a capture of the runner.
 */
export const placementOf = (
  win: Window,
  { subject, capture = 'fullPage', clip }: Options,
): Placement | undefined => {
  if (clip) return;
  if (subject) {
    const r = subject.getBoundingClientRect();
    if (
      r.width <= 0 ||
      r.height <= 0 ||
      r.width > win.innerWidth + SLACK ||
      r.height > win.innerHeight + SLACK
    ) {
      return;
    }
    return {
      origin: [r.x, r.y],
      size: { width: r.width, height: r.height },
    };
  }
  if (capture === 'viewport') {
    return {
      origin: [0, 0],
      size: { width: win.innerWidth, height: win.innerHeight },
    };
  }
  if (capture !== 'fullPage') return;
  const doc = win.document.documentElement;
  // taller than the window: Cypress scrolls and stitches
  if (doc.scrollHeight > win.innerHeight + SLACK) return;
  return {
    origin: [-win.scrollX, -win.scrollY],
    size: { width: doc.scrollWidth, height: doc.scrollHeight },
  };
};

/**
 * A snapshot of the page under test, or `undefined`. Never throws: a page
 * that forbids `eval` (a strict CSP) just goes without one.
 */
export const takeLayout = (
  win: Window & { eval: (code: string) => unknown },
  options: Options,
): LayoutPayload | undefined => {
  try {
    const placement = placementOf(win, options);
    if (!placement) return;
    // the function runs in the page, whose globals it reads, so it goes over as source
    const raw = win.eval(
      `(${snapshotLayout.toString()})(${JSON.stringify({
        origin: placement.origin,
        area: [placement.size.width, placement.size.height],
      })})`,
    ) as RawLayout;
    return { size: placement.size, count: raw.count, root: raw.root };
  } catch {
    return;
  }
};

/** Whether the screenshot still shows the same part of the page as when the snapshot was taken (nothing scrolled in between). */
export const samePlacement = (
  win: Window,
  options: Options,
  before: LayoutPayload,
): boolean => {
  const now = placementOf(win, options);
  return (
    !!now &&
    now.size.width === before.size.width &&
    now.size.height === before.size.height
  );
};
