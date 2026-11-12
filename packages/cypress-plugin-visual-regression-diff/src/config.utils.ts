import { supportsExpose } from './version.utils';

/** `Cypress.env()` was removed from Cypress 16 (and its typings); it is still called on older Cypress. */
type LegacyCypress = { env: (key: string) => unknown };

/** Reads a plugin option from `Cypress.expose()` or, on older Cypress, `Cypress.env()`. */
export const getExposedOption = (key: string): unknown =>
  supportsExpose(Cypress.version)
    ? (Cypress.expose(key) as unknown)
    : (Cypress as unknown as LegacyCypress).env(key);

export const getShowPassingImagesConfig = (): boolean =>
  !!getExposedOption('pluginVisualRegressionBatchReviewModeShowPassingImages');

/**
 * Batch Review Mode is enabled by default. It is turned off only when
 * `pluginVisualRegressionBatchReviewMode` is explicitly set to `false`
 * (or the string `'false'`, as passed from the CLI).
 */
export const getBatchReviewMode = (): boolean => {
  const value = getExposedOption('pluginVisualRegressionBatchReviewMode');
  return value !== false && value !== 'false';
};
