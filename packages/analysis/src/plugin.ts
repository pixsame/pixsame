import { AsyncLocalStorage } from 'node:async_hooks';
import { analyze } from './analyze';
import type { Descriptions } from './describe';
import { maskFromPixelmatchDiff } from './regions';
import type { Analysis, RgbaImage, Size } from './types';

type Color = [number, number, number];
type Captured = { baseline: RgbaImage; actual: RgbaImage; mask: Uint8Array };

/** One comparison's hand-over point between the engine (which has the pixels) and the hook (which has the entry). */
const comparison = new AsyncLocalStorage<{
  captured?: Captured;
  analysis?: Analysis;
}>();

/**
 * Runs one `comparer.compare()` call so that the images its engine sees can
 * be analyzed for that call's entry. Without it nothing is recorded.
 */
export const withAnalysis = <T>(compare: () => Promise<T>): Promise<T> =>
  comparison.run({}, compare);

/**
 * For a pixelmatch engine to call with the images it compared and the diff
 * image pixelmatch drew. `options` are pixelmatch's, for the diff colors.
 */
export const captureComparison = (
  baseline: RgbaImage,
  actual: RgbaImage,
  diff: RgbaImage,
  options: { diffColor?: Color; diffColorAlt?: Color } = {},
): void => {
  const slot = comparison.getStore();
  if (!slot) return;
  slot.captured = {
    baseline,
    actual,
    mask: maskFromPixelmatchDiff(diff, options),
  };
};

// the parts of visual-regression-compare's plugin types this needs, so the
// package has no dependency on it
type Measured = {
  kind: string;
  baselineSize?: Size;
  actualSize?: Size;
  result?: { diffPixels: number };
};
type Context = {
  input: { extra?: Record<string, Record<string, unknown>> };
};
type Decided = { status: string; message: string };
export type AnalysisPlugin = {
  name: string;
  setup(api: {
    on(
      event: 'afterCompare',
      fn: (ctx: Context, measurement: Measured) => void,
    ): void;
    on(
      event: 'decide',
      fn: <D extends Decided>(ctx: Context, decision: D) => D,
    ): void;
  }): void;
};

/**
 * A `visual-regression-compare` plugin: after a comparison that found
 * differences it writes the analysis to the entry's `extra.pixsame.analysis`,
 * and a failed comparison's message ends with the description. It needs `withAnalysis` around the call and `captureComparison` in the
 * engine; pass or fail is not touched.
 */
export const analysisPlugin = ({
  descriptions,
}: { descriptions?: Partial<Descriptions> } = {}): AnalysisPlugin => ({
  name: '@pixsame/analysis',
  setup: (api) => {
    api.on('afterCompare', (ctx, measurement) => {
      const slot = comparison.getStore();
      const captured = slot?.captured;
      if (
        !slot ||
        !captured ||
        measurement.kind !== 'compared' ||
        !measurement.result?.diffPixels
      ) {
        return;
      }
      const analysis: Analysis = analyze({
        ...captured,
        descriptions,
        ...(measurement.baselineSize &&
          measurement.actualSize && {
            sizes: {
              baseline: measurement.baselineSize,
              actual: measurement.actualSize,
            },
          }),
      });
      slot.analysis = analysis;
      ctx.input.extra = {
        ...ctx.input.extra,
        pixsame: { ...ctx.input.extra?.pixsame, analysis },
      };
    });
    api.on('decide', (_ctx, decision) => {
      const analysis = comparison.getStore()?.analysis;
      return analysis && decision.status === 'failed'
        ? {
            ...decision,
            message: `${decision.message} ${analysis.description}`,
          }
        : decision;
    });
  },
});
