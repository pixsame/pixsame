import { describe, expect, it, vi } from 'vitest';
import { placementOf, samePlacement, takeLayout } from './layout.utils';

const win = (
  over: {
    innerWidth?: number;
    innerHeight?: number;
    scrollHeight?: number;
    scrollWidth?: number;
    scrollX?: number;
    scrollY?: number;
    eval?: (code: string) => unknown;
  } = {},
) =>
  ({
    innerWidth: 640,
    innerHeight: 400,
    scrollX: 0,
    scrollY: 0,
    document: {
      documentElement: {
        scrollHeight: over.scrollHeight ?? 300,
        scrollWidth: over.scrollWidth ?? 640,
      },
    },
    eval:
      over.eval ??
      (() => ({
        count: 1,
        root: { tag: 'html', rect: [0, 0, 1, 1], kids: [] },
      })),
    ...over,
  }) as unknown as Window & { eval: (code: string) => unknown };

const element = (x: number, y: number, width: number, height: number) =>
  ({
    getBoundingClientRect: () => ({ x, y, width, height }),
  }) as unknown as HTMLElement;

describe('placementOf', () => {
  it('maps a full-page capture of a page that fits the window', () => {
    expect(placementOf(win({ scrollY: 0 }), {})).toEqual({
      origin: [-0, -0],
      size: { width: 640, height: 300 },
    });
  });

  it('leaves a page taller than the window alone: Cypress stitches it', () => {
    expect(placementOf(win({ scrollHeight: 1500 }), {})).toBeUndefined();
    expect(
      placementOf(win({ scrollHeight: 1500 }), { capture: 'fullPage' }),
    ).toBeUndefined();
  });

  it('maps a viewport capture of a tall page', () => {
    expect(
      placementOf(win({ scrollHeight: 1500 }), { capture: 'viewport' }),
    ).toEqual({ origin: [0, 0], size: { width: 640, height: 400 } });
  });

  it('maps an element that fits the window, at the position it has now', () => {
    expect(placementOf(win(), { subject: element(32, 90, 320, 120) })).toEqual({
      origin: [32, 90],
      size: { width: 320, height: 120 },
    });
  });

  it('leaves an element taller than the window alone', () => {
    expect(
      placementOf(win(), { subject: element(0, 0, 320, 900) }),
    ).toBeUndefined();
  });

  it('leaves a clip and a capture of the runner alone', () => {
    expect(placementOf(win(), { clip: { x: 0 } })).toBeUndefined();
    expect(placementOf(win(), { capture: 'runner' })).toBeUndefined();
  });
});

describe('takeLayout', () => {
  it('evaluates the snapshot function in the page with the origin and the area', () => {
    const run = vi.fn(() => ({
      count: 3,
      root: { tag: 'html', rect: [0, 0, 1, 1], kids: [] },
    }));
    const result = takeLayout(win({ eval: run }), { capture: 'viewport' });
    expect(result).toMatchObject({
      size: { width: 640, height: 400 },
      count: 3,
    });
    const code = String(run.mock.calls[0]);
    expect(code).toContain('getComputedStyle');
    expect(code.endsWith('({"origin":[0,0],"area":[640,400]})')).toBe(true);
  });

  it('goes without a layout when the page forbids eval', () => {
    const forbidden = () => {
      throw new EvalError('blocked by CSP');
    };
    expect(takeLayout(win({ eval: forbidden }), {})).toBeUndefined();
  });
});

describe('samePlacement', () => {
  it('is false once the element has changed size or the capture no longer applies', () => {
    const before = {
      size: { width: 320, height: 120 },
      count: 1,
      root: {
        tag: 'html',
        rect: [0, 0, 1, 1] as [number, number, number, number],
        kids: [],
      },
    };
    expect(
      samePlacement(win(), { subject: element(32, 90, 320, 120) }, before),
    ).toBe(true);
    expect(
      samePlacement(win(), { subject: element(32, 90, 320, 130) }, before),
    ).toBe(false);
    expect(samePlacement(win({ scrollHeight: 1500 }), {}, before)).toBe(false);
  });
});
