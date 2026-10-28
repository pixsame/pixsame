import { createRequire } from 'module';

export const supportsExpose = (version: string): boolean => {
  const [major, minor] = version.split('.').map(Number);
  return major > 15 || (major === 15 && minor >= 10);
};

export const getPluginConfig = (
  config: Cypress.PluginConfigOptions,
  key: string,
): unknown => {
  if (supportsExpose(config.version ?? '')) {
    return config.expose?.[key];
  }
  return config.env?.[key];
};

/**
 * This package's own version, for the manifest's `tool` block. Read from the
 * published `package.json` next to `dist`; `undefined` when it cannot be
 * resolved (e.g. from an ESM bundle without `__filename`).
 */
export const getPluginVersion = (): string | undefined => {
  try {
    return (
      createRequire(__filename)('../package.json') as { version?: string }
    ).version;
  } catch {
    /* c8 ignore next */
    return undefined;
  }
};
