import { it, expect, describe, vi, afterEach } from 'vitest';
import {
  ELECTRON_DETERMINISTIC_RENDERING_MESSAGE,
  HEADED_ELECTRON_SCALE_FACTOR_MESSAGE,
  getBrowserLaunchOptions,
  getBrowserLaunchPresets,
  initBrowserLaunchHook,
  isOptionDisabled,
} from './browserLaunch.utils';
import {
  DETERMINISTIC_RENDERING_CHROMIUM_ARGS,
  FORCE_DEVICE_SCALE_FACTOR_CHROMIUM_ARGS,
} from './constants';

const browser = (
  overrides: Partial<Cypress.Browser> & Pick<Cypress.Browser, 'name'>,
): Cypress.Browser =>
  ({
    family: 'chromium',
    channel: 'stable',
    displayName: overrides.name,
    version: '130.0.0.0',
    majorVersion: '130',
    path: '/usr/bin/browser',
    isHeaded: false,
    isHeadless: true,
    ...overrides,
  }) as Cypress.Browser;

const launchOptions = (
  overrides: Partial<Cypress.BeforeBrowserLaunchOptions> = {},
): Cypress.BeforeBrowserLaunchOptions => ({
  args: [],
  preferences: {},
  extensions: [],
  env: {},
  ...overrides,
});

const both = { forceDeviceScaleFactor: true, deterministicRendering: true };
const config = (cfg: Record<string, unknown>) =>
  cfg as unknown as Cypress.PluginConfigOptions;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('getBrowserLaunchOptions', () => {
  it('gives headless chrome the scale factor and rendering switches, scrollbars hidden', () => {
    const { launchOptions: result, messages } = getBrowserLaunchOptions(
      browser({ name: 'chrome' }),
      launchOptions({ args: ['--existing'] }),
      both,
    );

    expect(result.args).toEqual([
      '--existing',
      ...FORCE_DEVICE_SCALE_FACTOR_CHROMIUM_ARGS,
      ...DETERMINISTIC_RENDERING_CHROMIUM_ARGS,
      '--hide-scrollbars',
    ]);
    expect(result.preferences).toEqual({});
    expect(messages).toEqual([]);
  });

  it('keeps the scrollbars of a headed chrome (the flag would hit the runner UI too)', () => {
    const { launchOptions: result } = getBrowserLaunchOptions(
      browser({ name: 'chrome', isHeaded: true, isHeadless: false }),
      launchOptions(),
      both,
    );

    expect(result.args).not.toContain('--hide-scrollbars');
    expect(result.args).toEqual(
      expect.arrayContaining([...DETERMINISTIC_RENDERING_CHROMIUM_ARGS]),
    );
  });

  it.each(['chromium', 'edge'])('treats %s like chrome', (name) => {
    const { launchOptions: result } = getBrowserLaunchOptions(
      browser({ name: name as Cypress.BrowserName }),
      launchOptions(),
      both,
    );
    expect(result.args).toContain('--force-device-scale-factor=1');
    expect(result.args).toContain('--font-render-hinting=none');
  });

  it('does not duplicate switches that are already there', () => {
    const { launchOptions: result } = getBrowserLaunchOptions(
      browser({ name: 'chrome' }),
      launchOptions({
        args: ['--disable-gpu', '--force-device-scale-factor=1'],
      }),
      both,
    );
    expect(result.args.filter((arg) => arg === '--disable-gpu')).toHaveLength(
      1,
    );
    expect(
      result.args.filter((arg) => arg === '--force-device-scale-factor=1'),
    ).toHaveLength(1);
  });

  it('applies only the scale factor switches when deterministic rendering is off', () => {
    const { launchOptions: result } = getBrowserLaunchOptions(
      browser({ name: 'chrome' }),
      launchOptions(),
      { forceDeviceScaleFactor: true, deterministicRendering: false },
    );
    expect(result.args).toEqual([...FORCE_DEVICE_SCALE_FACTOR_CHROMIUM_ARGS]);
  });

  it('applies only the rendering switches when the scale factor preset is off', () => {
    const { launchOptions: result } = getBrowserLaunchOptions(
      browser({ name: 'chrome' }),
      launchOptions(),
      { forceDeviceScaleFactor: false, deterministicRendering: true },
    );
    expect(result.args).toEqual([
      ...DETERMINISTIC_RENDERING_CHROMIUM_ARGS,
      '--hide-scrollbars',
    ]);
  });

  it('returns equal launch options when both presets are off', () => {
    const input = launchOptions({ args: ['--a'], preferences: { p: 1 } });
    const { launchOptions: result, messages } = getBrowserLaunchOptions(
      browser({ name: 'chrome' }),
      input,
      { forceDeviceScaleFactor: false, deterministicRendering: false },
    );
    expect(result).toEqual(input);
    expect(result).not.toBe(input);
    expect(messages).toEqual([]);
  });

  it('does not mutate the launch options it was given', () => {
    const input = launchOptions();
    getBrowserLaunchOptions(browser({ name: 'chrome' }), input, both);
    expect(input).toEqual(launchOptions());
  });

  it('configures firefox through preferences only', () => {
    const { launchOptions: result, messages } = getBrowserLaunchOptions(
      browser({ name: 'firefox', family: 'firefox' }),
      launchOptions({ preferences: { existing: true } }),
      both,
    );

    expect(result.args).toEqual([]);
    expect(result.preferences).toEqual({
      existing: true,
      'layout.css.devPixelsPerPx': '1',
      'gfx.webrender.software': true,
    });
    expect(messages).toEqual([]);
  });

  it('skips the firefox scale factor preference when that preset is off', () => {
    const { launchOptions: result } = getBrowserLaunchOptions(
      browser({ name: 'firefox', family: 'firefox' }),
      launchOptions(),
      { forceDeviceScaleFactor: false, deterministicRendering: true },
    );
    expect(result.preferences).toEqual({ 'gfx.webrender.software': true });
  });

  it('leaves webkit untouched', () => {
    const input = launchOptions({ args: ['--a'] });
    const { launchOptions: result, messages } = getBrowserLaunchOptions(
      browser({ name: 'webkit', family: 'webkit' }),
      input,
      both,
    );
    expect(result).toEqual(input);
    expect(messages).toEqual([]);
  });

  describe('electron', () => {
    it('gets no switches, only the hint about ELECTRON_EXTRA_LAUNCH_ARGS', () => {
      const { launchOptions: result, messages } = getBrowserLaunchOptions(
        browser({ name: 'electron' }),
        launchOptions(),
        both,
        {},
      );
      expect(result.args).toEqual([]);
      expect(messages).toEqual([ELECTRON_DETERMINISTIC_RENDERING_MESSAGE]);
    });

    it('stays quiet when the switches are passed through ELECTRON_EXTRA_LAUNCH_ARGS', () => {
      const { messages } = getBrowserLaunchOptions(
        browser({ name: 'electron' }),
        launchOptions(),
        both,
        { ELECTRON_EXTRA_LAUNCH_ARGS: '--font-render-hinting=none' },
      );
      expect(messages).toEqual([]);
    });

    it('reads ELECTRON_EXTRA_LAUNCH_ARGS from process.env by default', () => {
      vi.stubEnv('ELECTRON_EXTRA_LAUNCH_ARGS', '--font-render-hinting=none');
      const { messages } = getBrowserLaunchOptions(
        browser({ name: 'electron' }),
        launchOptions(),
        both,
      );
      expect(messages).toEqual([]);
    });

    it('keeps the headed scale factor warning', () => {
      const { messages } = getBrowserLaunchOptions(
        browser({ name: 'electron', isHeaded: true, isHeadless: false }),
        launchOptions(),
        both,
        { ELECTRON_EXTRA_LAUNCH_ARGS: '--font-render-hinting=none' },
      );
      expect(messages).toEqual([HEADED_ELECTRON_SCALE_FACTOR_MESSAGE]);
    });

    it('says nothing when both presets are off', () => {
      const { messages } = getBrowserLaunchOptions(
        browser({ name: 'electron', isHeaded: true, isHeadless: false }),
        launchOptions(),
        { forceDeviceScaleFactor: false, deterministicRendering: false },
        {},
      );
      expect(messages).toEqual([]);
    });
  });
});

describe('isOptionDisabled', () => {
  it.each([
    { value: false, disabled: true },
    { value: 'false', disabled: true },
    { value: true, disabled: false },
    { value: 'true', disabled: false },
    { value: undefined, disabled: false },
    { value: 0, disabled: false },
  ])('treats $value as disabled: $disabled', ({ value, disabled }) => {
    expect(
      isOptionDisabled(
        config({ version: '16.1.0', expose: { key: value }, env: {} }),
        'key',
      ),
    ).toBe(disabled);
  });

  it('reads env on Cypress <15.10 and expose on 15.10+', () => {
    const cfg = { env: { key: false }, expose: { key: true } };
    expect(
      isOptionDisabled(config({ version: '13.17.0', ...cfg }), 'key'),
    ).toBe(true);
    expect(
      isOptionDisabled(config({ version: '15.10.0', ...cfg }), 'key'),
    ).toBe(false);
  });
});

describe('getBrowserLaunchPresets', () => {
  it('enables both presets by default', () => {
    expect(
      getBrowserLaunchPresets(config({ version: '16.1.0', expose: {} })),
    ).toEqual(both);
  });

  it('maps the exposed options onto the presets', () => {
    expect(
      getBrowserLaunchPresets(
        config({
          version: '16.1.0',
          expose: {
            pluginVisualRegressionForceDeviceScaleFactor: 'false',
            pluginVisualRegressionDeterministicRendering: false,
          },
        }),
      ),
    ).toEqual({ forceDeviceScaleFactor: false, deterministicRendering: false });
  });
});

describe('initBrowserLaunchHook', () => {
  it('applies the presets from the config and logs the messages', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const hook = initBrowserLaunchHook(
      config({ version: '16.1.0', expose: {}, env: {} }),
    );

    const result = hook(browser({ name: 'chrome' }), launchOptions());
    expect(result.args).toEqual([
      ...FORCE_DEVICE_SCALE_FACTOR_CHROMIUM_ARGS,
      ...DETERMINISTIC_RENDERING_CHROMIUM_ARGS,
      '--hide-scrollbars',
    ]);
    expect(log).not.toBeCalled();

    hook(
      browser({ name: 'electron', isHeaded: true, isHeadless: false }),
      launchOptions(),
    );
    expect(log).toBeCalledWith(HEADED_ELECTRON_SCALE_FACTOR_MESSAGE);
    expect(log).toBeCalledWith(ELECTRON_DETERMINISTIC_RENDERING_MESSAGE);
  });

  it('honours disabled presets', () => {
    const hook = initBrowserLaunchHook(
      config({
        version: '16.1.0',
        expose: {
          pluginVisualRegressionForceDeviceScaleFactor: false,
          pluginVisualRegressionDeterministicRendering: 'false',
        },
      }),
    );
    expect(hook(browser({ name: 'chrome' }), launchOptions()).args).toEqual([]);
  });
});
