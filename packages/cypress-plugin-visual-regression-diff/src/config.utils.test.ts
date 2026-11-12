import { it, expect, describe, beforeEach, afterEach } from 'vitest';
import { Cypress } from '@mocks/cypress.mock';
import {
  getBatchReviewMode,
  getExposedOption,
  getShowPassingImagesConfig,
} from './config.utils';

describe('config getters', () => {
  const installedCypressVersion = Cypress.version;

  beforeEach(() => {
    Cypress.expose.mockReset();
    Cypress.env.mockReset();
  });

  afterEach(() => {
    Cypress.version = installedCypressVersion;
  });

  describe('getExposedOption', () => {
    it('reads from Cypress.expose on the installed Cypress version', () => {
      Cypress.expose.mockReturnValue('exposed');
      Cypress.env.mockReturnValue('env');

      expect(getExposedOption('someKey')).toBe('exposed');
      expect(Cypress.expose).toHaveBeenCalledWith('someKey');
      expect(Cypress.env).not.toHaveBeenCalled();
    });

    it('falls back to Cypress.env on older Cypress', () => {
      Cypress.version = '15.9.0';
      Cypress.env.mockReturnValue('env');

      expect(getExposedOption('someKey')).toBe('env');
      expect(Cypress.env).toHaveBeenCalledWith('someKey');
      expect(Cypress.expose).not.toHaveBeenCalled();
    });
  });

  describe('getShowPassingImagesConfig', () => {
    it('reads pluginVisualRegressionBatchReviewModeShowPassingImages', () => {
      Cypress.expose.mockReturnValue(true);

      expect(getShowPassingImagesConfig()).toBe(true);
      expect(Cypress.expose).toHaveBeenCalledWith(
        'pluginVisualRegressionBatchReviewModeShowPassingImages',
      );
    });

    it('coerces missing values to false', () => {
      Cypress.expose.mockReturnValue(undefined);
      expect(getShowPassingImagesConfig()).toBe(false);
    });
  });

  describe('getBatchReviewMode', () => {
    it('reads pluginVisualRegressionBatchReviewMode', () => {
      Cypress.expose.mockReturnValue(true);

      expect(getBatchReviewMode()).toBe(true);
      expect(Cypress.expose).toHaveBeenCalledWith(
        'pluginVisualRegressionBatchReviewMode',
      );
    });

    it('is enabled by default when the option is not set', () => {
      Cypress.expose.mockReturnValue(undefined);
      expect(getBatchReviewMode()).toBe(true);
    });

    it.each([[false], ['false']])('is disabled when set to %j', (value) => {
      Cypress.expose.mockReturnValue(value);
      expect(getBatchReviewMode()).toBe(false);
    });

    it('is disabled via Cypress.env on older Cypress', () => {
      Cypress.version = '15.9.0';
      Cypress.env.mockReturnValue(false);

      expect(getBatchReviewMode()).toBe(false);
      expect(Cypress.env).toHaveBeenCalledWith(
        'pluginVisualRegressionBatchReviewMode',
      );
    });
  });
});
