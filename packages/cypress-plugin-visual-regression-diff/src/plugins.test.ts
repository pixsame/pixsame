import { it, expect, describe, vi } from 'vitest';
import { initTaskHook } from './task.hook';
import { initAfterScreenshotHook } from './afterScreenshot.hook';
import {
  getBrowserLaunchPresets,
  initBrowserLaunchHook,
} from './browserLaunch.utils';
import { initPlugin } from './plugins';

vi.mock('./task.hook.ts', () => ({
  initTaskHook: vi.fn().mockReturnValue('task'),
}));
vi.mock('./afterScreenshot.hook.ts', () => ({
  initAfterScreenshotHook: vi.fn().mockReturnValue('after:screenshot'),
}));
vi.mock('./browserLaunch.utils.ts', () => ({
  getBrowserLaunchPresets: vi.fn(() => ({
    forceDeviceScaleFactor: true,
    deterministicRendering: false,
  })),
  initBrowserLaunchHook: vi.fn().mockReturnValue('before:browser:launch'),
}));

describe('initPlugin', () => {
  it.each([
    {
      api: 'env (Cypress <15.10)',
      config: {
        version: '13.17.0',
        env: { pluginVisualRegressionForceDeviceScaleFactor: false },
      },
    },
    {
      api: 'expose (Cypress 15.10+)',
      config: {
        version: '15.10.0',
        expose: { pluginVisualRegressionForceDeviceScaleFactor: false },
        env: {},
      },
    },
  ])('registers every hook exactly once with the $api config', ({ config }) => {
    vi.clearAllMocks();
    const onMock = vi.fn();
    const pluginConfig = config as unknown as Cypress.PluginConfigOptions;

    initPlugin(onMock, pluginConfig);

    expect(onMock).toBeCalledTimes(3);
    expect(onMock).toBeCalledWith(
      'before:browser:launch',
      'before:browser:launch',
    );
    expect(onMock).toBeCalledWith('task', 'task');
    expect(onMock).toBeCalledWith('after:screenshot', 'after:screenshot');
    expect(getBrowserLaunchPresets).toBeCalledWith(pluginConfig);
    expect(initBrowserLaunchHook).toBeCalledWith(pluginConfig);
    expect(initTaskHook).toBeCalledWith(pluginConfig);
    expect(initAfterScreenshotHook).toBeCalledWith(pluginConfig);
  });

  it('leaves before:browser:launch alone when both launch presets are off', () => {
    vi.clearAllMocks();
    vi.mocked(getBrowserLaunchPresets).mockReturnValueOnce({
      forceDeviceScaleFactor: false,
      deterministicRendering: false,
    });
    const onMock = vi.fn();

    initPlugin(onMock, {} as Cypress.PluginConfigOptions);

    expect(onMock).toBeCalledTimes(2);
    expect(onMock).not.toBeCalledWith(
      'before:browser:launch',
      expect.anything(),
    );
    expect(initBrowserLaunchHook).not.toBeCalled();
  });

  it('registers before:browser:launch when only deterministic rendering is on', () => {
    vi.clearAllMocks();
    vi.mocked(getBrowserLaunchPresets).mockReturnValueOnce({
      forceDeviceScaleFactor: false,
      deterministicRendering: true,
    });
    const onMock = vi.fn();

    initPlugin(onMock, {} as Cypress.PluginConfigOptions);

    expect(onMock).toBeCalledWith(
      'before:browser:launch',
      'before:browser:launch',
    );
  });
});
