import { it, expect, describe, vi, beforeEach, afterEach } from 'vitest';
import { Cypress } from '@mocks/cypress.mock';
import { getConfig, getPathVariables } from './commands';

const installedCypressVersion = Cypress.version;
const KEY = 'pluginVisualRegressionDeterministicRendering';

// `getConfig` computes the scale factor from the window
vi.stubGlobal('window', { devicePixelRatio: 2 });

beforeEach(() => {
  Cypress.expose.mockReset();
  Cypress.env.mockReset();
});

afterEach(() => {
  Cypress.version = installedCypressVersion;
});

describe('getConfig deterministicRendering (browser side)', () => {
  it('is off when the option is not set anywhere', () => {
    expect(getConfig({}).deterministicRendering).toBe(false);
    expect(Cypress.expose).toHaveBeenCalledWith(KEY);
  });

  it.each([true, 'true'])(
    'is on when the global option arrives as %j through Cypress.expose (Cypress 15.10+)',
    (value) => {
      Cypress.expose.mockImplementation((key: string) =>
        key === KEY ? value : undefined,
      );

      expect(getConfig({}).deterministicRendering).toBe(true);
      expect(Cypress.env).not.toHaveBeenCalled();
    },
  );

  it.each([true, 'true'])(
    'is on when the global option arrives as %j through Cypress.env (Cypress <15.10)',
    (value) => {
      Cypress.version = '15.9.0';
      Cypress.env.mockImplementation((key: string) =>
        key === KEY ? value : undefined,
      );

      expect(getConfig({}).deterministicRendering).toBe(true);
      expect(Cypress.expose).not.toHaveBeenCalled();
    },
  );

  it.each([false, 'false', 1, 'yes'])(
    'stays off when the global option is %j',
    (value) => {
      Cypress.expose.mockImplementation((key: string) =>
        key === KEY ? value : undefined,
      );

      expect(getConfig({}).deterministicRendering).toBe(false);
    },
  );

  it('can be turned on per call without the global option', () => {
    expect(
      getConfig({ deterministicRendering: true }).deterministicRendering,
    ).toBe(true);
  });

  it('can be turned off per call while the global option is on', () => {
    Cypress.expose.mockImplementation((key: string) =>
      key === KEY ? 'true' : undefined,
    );

    expect(
      getConfig({ deterministicRendering: false }).deterministicRendering,
    ).toBe(false);
  });
});

describe('getPathVariables', () => {
  it('names the OS and the browser Cypress drives', () => {
    expect(getPathVariables()).toEqual({ os: 'darwin', browser: 'electron' });
  });
});
