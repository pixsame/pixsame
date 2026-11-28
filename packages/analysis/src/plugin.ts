import { AsyncLocalStorage } from 'node:async_hooks';
import { analyze } from './analyze';
import type { Descriptions } from './describe';
import { facts } from './facts';
import { maskFromPixelmatchDiff } from './regions';
import type { Environment, Layout } from './layout/types';
import type { Analysis, RgbaImage, Size } from './types';

type Color = [number, number, number];

/** As many facts are kept with an entry. */
const MAX_FACTS = 20;
/** As many of them are printed in the message of a failed comparison. */
const MAX_LINES = 10;

/**
 * The facts of an analysis as lines for a failure message: `""` when there
 * are none.
 */
export const factLines = ({
  facts: found = [],
  factsOmitted = 0,
}: Pick<Analysis, 'facts' | 'factsOmitted'>): string => {
  if (found.length === 0) return '';
  const more = found.length - MAX_LINES + factsOmitted;
  return [
    'What changed:',
    ...found.slice(0, MAX_LINES).map(({ text }) => `  - ${text}`),
    ...(more > 0 ? [`  - and ${more} more`] : []),
  ].join('\n');
};
type Captured = { baseline: RgbaImage; actual: RgbaImage; mask: Uint8Array };

/** One comparison's hand-over point between the engine (which has the pixels) and the hook (which has the entry). */
const comparison = new AsyncLocalStorage<{
  layout?: { baseline: Layout; actual: Layout };
  environment?: { baseline?: Environment; actual?: Environment };
  captured?: Captured;
  analysis?: Analysis;
}>();

/**
 * Runs one `comparer.compare()` call so that the images its engine sees can
 * be analyzed for that call's entry. Without it nothing is recorded.
 * `layout` is what the page looked like when the baseline and the screenshot
 * were taken (see `readLayout`); both are needed for it to be used.
 * `environment` is what rendered each image (a layout's `env`, or the
 * adapter's own for the screenshot); it can be given without a layout.
 */
export const withAnalysis = <T>(
  compare: () => Promise<T>,
  {
    layout,
    environment,
  }: {
    layout?: { baseline: Layout; actual: Layout };
    environment?: { baseline?: Environment; actual?: Environment };
  } = {},
): Promise<T> => comparison.run({ layout, environment }, compare);

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
 * and a failed comparison's message ends with the description and, when the page's layout is known on both sides, with one line per change. It needs `withAnalysis` around the call and `captureComparison` in the
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
      const sizes = measurement.baselineSize &&
        measurement.actualSize && {
          baseline: measurement.baselineSize,
          actual: measurement.actualSize,
        };
      const analysis: Analysis = analyze({
        ...captured,
        layout: slot.layout,
        environment: slot.environment,
        descriptions,
        ...(sizes && { sizes }),
      });
      // with the page's layout on both sides: each change by element and by
      // style. Only pixels that count for the test are looked at. On another
      // system every line of text sits a little differently, which the
      // description says in one sentence.
      if (
        slot.layout &&
        slot.layout.baseline.size.width > 0 &&
        slot.layout.actual.size.width > 0 &&
        analysis.label !== 'cross-os'
      ) {
        const found = facts({
          ...captured,
          layout: slot.layout,
          ...(sizes && { sizes }),
        });
        if (found.length > 0) {
          analysis.facts = found.slice(0, MAX_FACTS);
          analysis.scale = slot.layout.actual.scale;
        }
        if (found.length > MAX_FACTS)
          analysis.factsOmitted = found.length - MAX_FACTS;
      }
      slot.analysis = analysis;
      ctx.input.extra = {
        ...ctx.input.extra,
        pixsame: { ...ctx.input.extra?.pixsame, analysis },
      };
    });
    api.on('decide', (_ctx, decision) => {
      const analysis = comparison.getStore()?.analysis;
      if (!analysis || decision.status !== 'failed') return decision;
      const lines = factLines(analysis);
      return {
        ...decision,
        message: `${decision.message} ${analysis.description}${lines && `\n${lines}`}`,
      };
    });
  },
});
